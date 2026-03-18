import json
import re
from collections import Counter
from decimal import Decimal
from typing import Any

from sqlalchemy.orm import Session

from app.models.analysis import AnalysisResult
from app.models.cv import CV
from app.models.job_description import JobDescription
from app.services.document_service import document_service
from app.services.gemini_service import gemini_service


class MatchingService:
    _TECH_KEYWORDS = {
        "python", "java", "javascript", "typescript", "react", "vue", "angular",
        "node", "nodejs", "fastapi", "django", "flask", "spring", "dotnet", "c#",
        "sql", "postgresql", "mysql", "mongodb", "redis", "docker", "kubernetes",
        "aws", "azure", "gcp", "git", "linux", "rest", "api", "microservices",
        "ci/cd", "jenkins", "terraform", "pandas", "numpy", "pytorch", "tensorflow",
    }

    _STOPWORDS = {
        "và", "hoặc", "là", "có", "cho", "trong", "các", "một", "được", "với",
        "the", "and", "or", "for", "with", "from", "your", "you", "that", "this",
        "as", "are", "was", "were", "will", "can", "to", "of", "on", "in",
    }

    _MULTILINGUAL_CONCEPTS = [
        (r"\bkinh\s*nghiệm\b", "experience"),
        (r"\bexperience\b", "experience"),
        (r"\bkỹ\s*năng\b", "skills"),
        (r"\bky\s*nang\b", "skills"),
        (r"\bskill[s]?\b", "skills"),
        (r"\bhọc\s*vấn\b", "education"),
        (r"\bhoc\s*van\b", "education"),
        (r"\beducation\b", "education"),
        (r"\bchứng\s*chỉ\b", "certificate"),
        (r"\bchung\s*chi\b", "certificate"),
        (r"\bcertificate[s]?\b", "certificate"),
        (r"\btiếng\s*anh\b", "english"),
        (r"\btieng\s*anh\b", "english"),
        (r"\benglish\b", "english"),
        (r"\bfast\s*api\b", "fastapi"),
    ]

    async def analyze_cv_jd(self, db: Session, cv_id, jd_id) -> AnalysisResult:
        """
        Phân tích CV và JD, ưu tiên AI nếu sẵn sàng, fallback về chấm điểm nội bộ.
        """
        cv = db.query(CV).filter(CV.cv_id == cv_id).first()
        jd = db.query(JobDescription).filter(JobDescription.jd_id == jd_id).first()

        if not cv or not jd:
            raise ValueError("CV hoặc Job Description không tồn tại.")

        cv_text = self._resolve_cv_text(db=db, cv=cv)
        jd_text = (jd.noi_dung or "").strip()
        if not jd_text:
            raise ValueError("JD chưa có nội dung để phân tích.")

        analysis = db.query(AnalysisResult).filter(
            AnalysisResult.cv_id == cv_id,
            AnalysisResult.jd_id == jd_id,
        ).first()

        if not analysis:
            analysis = AnalysisResult(cv_id=cv_id, jd_id=jd_id)
            db.add(analysis)

        analysis.trang_thai = "PROCESSING"
        db.commit()

        try:
            result_data = await self._analyze_with_ai_or_fallback(cv_text=cv_text, jd_text=jd_text)
            result_data = self._normalize_result_data(
                result_data=result_data,
                cv_text=cv_text,
                jd_text=jd_text,
            )

            analysis.diem_tong = Decimal(str(result_data.get("diem_tong", 0.0))).quantize(Decimal("0.01"))
            analysis.chi_tiet_diem = result_data.get("chi_tiet_diem", [])
            analysis.goi_y = result_data.get("goi_y", "")
            analysis.trang_thai = "COMPLETED"
            db.commit()
            db.refresh(analysis)
            return analysis
        except Exception as exc:
            analysis.trang_thai = "FAILED"
            analysis.goi_y = f"Không thể phân tích CV/JD: {str(exc)}"
            db.commit()
            raise

    def _resolve_cv_text(self, db: Session, cv: CV) -> str:
        extracted = cv.du_lieu_trich_xuat or {}
        if isinstance(extracted, dict):
            raw_text = (extracted.get("raw_text") or "").strip()
            if raw_text:
                return raw_text

        cv_text = document_service.extract_text(cv.duong_dan).strip()
        if not cv_text:
            raise ValueError("CV không có nội dung để phân tích.")

        cv.du_lieu_trich_xuat = {
            "raw_text": cv_text,
            "source_file": extracted.get("source_file") if isinstance(extracted, dict) else None,
            "file_path": cv.duong_dan,
        }
        if cv.trang_thai_phan_tich != "DONE":
            cv.trang_thai_phan_tich = "DONE"
        db.commit()
        return cv_text

    async def _analyze_with_ai_or_fallback(self, cv_text: str, jd_text: str) -> dict[str, Any]:
        ai_result = await self._try_ai_analysis(cv_text=cv_text, jd_text=jd_text)
        if ai_result:
            return ai_result
        return self._rule_based_analysis(cv_text=cv_text, jd_text=jd_text)

    async def _try_ai_analysis(self, cv_text: str, jd_text: str) -> dict[str, Any] | None:
        prompt = f"""
Bạn là chuyên gia tuyển dụng + NLP recruiter assistant. Hãy chấm độ phù hợp giữa CV và JD.

Yêu cầu bắt buộc:
1) Luôn trích dẫn bằng chứng trực tiếp từ CV/JD (evidence), không kết luận chung chung.
2) Bốc tách thực thể (Named Entity) theo ngữ nghĩa: kỹ năng công nghệ, ngoại ngữ + level (ví dụ B1 English), chứng chỉ, số năm kinh nghiệm, domain/project.
3) Đối chiếu đa ngôn ngữ Việt-Anh:
     - "Kinh nghiệm" ~ "Experience"
     - "Kỹ năng" ~ "Skills"
     - "Học vấn" ~ "Education"
     - "Chứng chỉ" ~ "Certificate"
     Không được coi khác ngôn ngữ là không khớp.
4) Với mỗi điểm số phải có giải thích vì sao ra điểm (scoring rationale), có số liệu nếu có.
     Ví dụ tốt: "80 điểm vì CV có 2 năm FastAPI gần yêu cầu 3 năm trong JD".

CV:
{cv_text}

JD:
{jd_text}

Trả về JSON duy nhất:
{{
  "diem_tong": 0-100,
  "chi_tiet_diem": [
        {{
            "tieu_chi": "Kỹ năng chuyên môn",
            "diem": 0-100,
            "nhan_xet": "Giải thích ngắn gọn theo ngữ cảnh.",
            "bang_chung": [
                {{"tu_cv": "trích nguyên văn ngắn từ CV", "tu_jd": "trích nguyên văn ngắn từ JD", "giai_thich": "vì sao khớp/chưa khớp"}}
            ],
            "thuc_the": {{
                "ky_nang": ["Python", "FastAPI"],
                "ngoai_ngu": [{{"ten": "English", "muc_do": "B1"}}],
                "chung_chi": ["AWS CCP"],
                "so_nam_kinh_nghiem": ["2 năm backend"]
            }},
            "ly_do_cho_diem": "Nêu rõ lý do cho điểm bằng số liệu/bằng chứng"
        }},
        {{
            "tieu_chi": "Kinh nghiệm làm việc",
            "diem": 0-100,
            "nhan_xet": "...",
            "bang_chung": [{{"tu_cv": "...", "tu_jd": "...", "giai_thich": "..."}}],
            "thuc_the": {{"so_nam_kinh_nghiem": ["..."], "domain": ["..."]}},
            "ly_do_cho_diem": "..."
        }},
        {{
            "tieu_chi": "Học vấn & Chứng chỉ",
            "diem": 0-100,
            "nhan_xet": "...",
            "bang_chung": [{{"tu_cv": "...", "tu_jd": "...", "giai_thich": "..."}}],
            "thuc_the": {{"hoc_van": ["..."], "chung_chi": ["..."]}},
            "ly_do_cho_diem": "..."
        }}
  ],
    "goi_y": "Gợi ý cải thiện dạng markdown, cụ thể và dễ làm theo",
    "tom_tat_bang_chung": [
        "- Có 2 năm FastAPI trong CV; JD yêu cầu 2-3 năm backend Python",
        "- Có English B1 trong CV; JD yêu cầu giao tiếp tiếng Anh"
    ]
}}

Quy tắc xuất:
- Chỉ trả JSON hợp lệ, không thêm markdown/code fence.
- Nếu thiếu dữ liệu thì ghi rõ "không thấy bằng chứng" thay vì tự suy diễn.
""".strip()

        ai_response = await gemini_service.generate_content(prompt)
        if not ai_response or "temporarily disabled" in ai_response.lower():
            return None

        clean_json = ai_response.strip()
        if clean_json.startswith("```json"):
            clean_json = clean_json.split("```json", 1)[1].split("```", 1)[0].strip()
        elif clean_json.startswith("```"):
            clean_json = clean_json.split("```", 1)[1].split("```", 1)[0].strip()

        try:
            parsed = json.loads(clean_json)
        except Exception:
            return None

        if not isinstance(parsed, dict):
            return None
        if "diem_tong" not in parsed:
            return None

        parsed["diem_tong"] = self._clamp_score(parsed.get("diem_tong", 0))
        parsed["chi_tiet_diem"] = parsed.get("chi_tiet_diem", [])
        parsed["goi_y"] = parsed.get("goi_y", "")
        return parsed

    def _rule_based_analysis(self, cv_text: str, jd_text: str) -> dict[str, Any]:
        cv_tokens = self._tokenize(cv_text)
        jd_tokens = self._tokenize(jd_text)
        cv_set = set(cv_tokens)
        jd_set = set(jd_tokens)

        jd_keywords = self._extract_keywords(jd_tokens, limit=40)
        if not jd_keywords:
            jd_keywords = list(jd_set)[:20]

        matched_keywords = [keyword for keyword in jd_keywords if keyword in cv_set]
        keyword_coverage = len(matched_keywords) / max(len(jd_keywords), 1)

        tech_jd = {keyword for keyword in jd_set if keyword in self._TECH_KEYWORDS}
        tech_cv = {keyword for keyword in cv_set if keyword in self._TECH_KEYWORDS}
        tech_overlap = len(tech_jd.intersection(tech_cv)) / max(len(tech_jd), 1)

        skills_score = self._clamp_score((keyword_coverage * 70) + (tech_overlap * 30))

        jd_years = self._extract_max_years(jd_text)
        cv_years = self._extract_max_years(cv_text)
        if jd_years == 0:
            exp_ratio = 1.0 if cv_years > 0 else 0.7
        else:
            exp_ratio = min(cv_years / jd_years, 1.0)
        experience_score = self._clamp_score(exp_ratio * 100)

        edu_keywords = {
            "bachelor", "master", "phd", "chứng", "certificate", "cử", "nhân", "thạc", "sĩ", "đại", "học",
        }
        jd_edu = {keyword for keyword in jd_set if keyword in edu_keywords}
        cv_edu = {keyword for keyword in cv_set if keyword in edu_keywords}
        edu_overlap = len(jd_edu.intersection(cv_edu)) / max(len(jd_edu), 1)
        if not jd_edu:
            edu_score = 75.0 if cv_edu else 60.0
        else:
            edu_score = self._clamp_score(edu_overlap * 100)

        overall = self._clamp_score((skills_score * 0.6) + (experience_score * 0.25) + (edu_score * 0.15))

        detail = [
            {
                "tieu_chi": "Kỹ năng chuyên môn",
                "diem": round(skills_score, 2),
                "nhan_xet": (
                    f"Khớp {len(matched_keywords)}/{len(jd_keywords)} từ khóa JD. "
                    f"Kỹ năng kỹ thuật trùng: {', '.join(sorted(tech_jd.intersection(tech_cv))) or 'chưa rõ'}."
                ),
            },
            {
                "tieu_chi": "Kinh nghiệm làm việc",
                "diem": round(experience_score, 2),
                "nhan_xet": (
                    f"JD yêu cầu khoảng {jd_years} năm; CV thể hiện khoảng {cv_years} năm kinh nghiệm."
                    if jd_years > 0
                    else "JD không nêu rõ số năm kinh nghiệm, điểm dựa trên tín hiệu kinh nghiệm trong CV."
                ),
            },
            {
                "tieu_chi": "Học vấn & Chứng chỉ",
                "diem": round(edu_score, 2),
                "nhan_xet": "Mức độ khớp về học vấn/chứng chỉ được suy ra từ từ khóa liên quan trong CV và JD.",
            },
        ]

        suggestions = self._build_suggestions(
            overall=overall,
            skills_score=skills_score,
            experience_score=experience_score,
            edu_score=edu_score,
            missing_keywords=[keyword for keyword in jd_keywords if keyword not in cv_set][:10],
        )

        return {
            "diem_tong": round(overall, 2),
            "chi_tiet_diem": detail,
            "goi_y": suggestions,
        }

    def _normalize_result_data(self, result_data: dict[str, Any], cv_text: str, jd_text: str) -> dict[str, Any]:
        cv_tokens = self._tokenize(cv_text)
        jd_tokens = self._tokenize(jd_text)
        cv_set = set(cv_tokens)
        jd_keywords = self._extract_keywords(jd_tokens, limit=40)
        missing_keywords = [keyword for keyword in jd_keywords if keyword not in cv_set][:10]

        incoming_detail = result_data.get("chi_tiet_diem") or []
        skill_item = self._extract_detail_item(incoming_detail, ["kỹ năng", "skill"])
        exp_item = self._extract_detail_item(incoming_detail, ["kinh nghiệm", "experience"])
        edu_item = self._extract_detail_item(incoming_detail, ["học vấn", "chứng chỉ", "education", "certificate"])

        skills_score = skill_item["diem"]
        exp_score = exp_item["diem"]
        edu_score = edu_item["diem"]

        overall = self._clamp_score(result_data.get("diem_tong", 0.0))

        # Nếu AI không trả đủ cấu trúc thì dựng lại chi tiết từ điểm tổng.
        if skills_score is None:
            skills_score = self._clamp_score(overall)
        if exp_score is None:
            exp_score = self._clamp_score(overall)
        if edu_score is None:
            edu_score = self._clamp_score(overall)

        normalized_detail = [
            {
                "tieu_chi": "Kỹ năng chuyên môn",
                "diem": round(float(skills_score), 2),
                "nhan_xet": skill_item["nhan_xet"] or "So sánh các kỹ năng chính trong CV với yêu cầu kỹ năng của JD.",
                "bang_chung": skill_item["bang_chung"],
                "thuc_the": skill_item["thuc_the"],
                "ly_do_cho_diem": skill_item["ly_do_cho_diem"],
            },
            {
                "tieu_chi": "Kinh nghiệm làm việc",
                "diem": round(float(exp_score), 2),
                "nhan_xet": exp_item["nhan_xet"] or "Đối chiếu số năm kinh nghiệm và mức độ liên quan dự án với JD.",
                "bang_chung": exp_item["bang_chung"],
                "thuc_the": exp_item["thuc_the"],
                "ly_do_cho_diem": exp_item["ly_do_cho_diem"],
            },
            {
                "tieu_chi": "Học vấn & Chứng chỉ",
                "diem": round(float(edu_score), 2),
                "nhan_xet": edu_item["nhan_xet"] or "Đánh giá mức phù hợp giữa học vấn/chứng chỉ và yêu cầu JD.",
                "bang_chung": edu_item["bang_chung"],
                "thuc_the": edu_item["thuc_the"],
                "ly_do_cho_diem": edu_item["ly_do_cho_diem"],
            },
        ]

        summary_evidence = result_data.get("tom_tat_bang_chung") or []
        if summary_evidence and isinstance(summary_evidence, list):
            summary_block = "\n".join(f"- {str(item).lstrip('- ').strip()}" for item in summary_evidence if str(item).strip())
            if summary_block:
                if result_data.get("goi_y"):
                    result_data["goi_y"] = f"{result_data.get('goi_y')}\n\nBằng chứng chính:\n{summary_block}"
                else:
                    result_data["goi_y"] = f"Bằng chứng chính:\n{summary_block}"

        suggestions = self._build_suggestions(
            overall=overall,
            skills_score=float(skills_score),
            experience_score=float(exp_score),
            edu_score=float(edu_score),
            missing_keywords=missing_keywords,
            current_suggestions=result_data.get("goi_y", ""),
        )

        return {
            "diem_tong": round(overall, 2),
            "chi_tiet_diem": normalized_detail,
            "goi_y": suggestions,
        }

    def _extract_detail_item(self, detail_items: list[dict[str, Any]], keywords: list[str]) -> dict[str, Any]:
        for item in detail_items:
            title = str(item.get("tieu_chi", "")).lower()
            if any(keyword in title for keyword in keywords):
                return {
                    "diem": self._clamp_score(item.get("diem", 0)),
                    "nhan_xet": str(item.get("nhan_xet", "")).strip(),
                    "bang_chung": item.get("bang_chung", []) if isinstance(item.get("bang_chung", []), list) else [],
                    "thuc_the": item.get("thuc_the", {}) if isinstance(item.get("thuc_the", {}), dict) else {},
                    "ly_do_cho_diem": str(item.get("ly_do_cho_diem", "")).strip(),
                }
        return {
            "diem": None,
            "nhan_xet": "",
            "bang_chung": [],
            "thuc_the": {},
            "ly_do_cho_diem": "",
        }

    def _build_suggestions(
        self,
        overall: float,
        skills_score: float,
        experience_score: float,
        edu_score: float,
        missing_keywords: list[str],
        current_suggestions: str = "",
    ) -> str:
        current_suggestions = (current_suggestions or "").strip()
        if current_suggestions:
            return current_suggestions

        lines: list[str] = []

        lines.append("Tóm tắt mức phù hợp:")
        if overall >= 80:
            lines.append("- CV đang phù hợp tốt với JD (mức cao).")
        elif overall >= 60:
            lines.append("- CV phù hợp mức khá, vẫn cần chỉnh để tăng khả năng qua vòng lọc.")
        else:
            lines.append("- CV chưa khớp tốt với JD, nên chỉnh sửa theo các mục ưu tiên dưới đây.")

        lines.append("")
        lines.append("Việc cần làm cụ thể:")

        if skills_score < 70 and missing_keywords:
            lines.append(f"1) Bổ sung hoặc làm nổi bật các kỹ năng còn thiếu: {', '.join(missing_keywords)}.")
        elif skills_score < 70:
            lines.append("1) Làm rõ hơn nhóm kỹ năng cốt lõi đang dùng trong dự án gần đây.")
        else:
            lines.append("1) Giữ phần kỹ năng ngắn gọn, ưu tiên kỹ năng trùng với JD ở phần đầu CV.")

        if experience_score < 65:
            lines.append("2) Mô tả rõ số năm kinh nghiệm, vai trò và kết quả đạt được cho từng dự án liên quan.")
        else:
            lines.append("2) Duy trì phần kinh nghiệm theo cấu trúc: Bối cảnh - Hành động - Kết quả.")

        if edu_score < 60:
            lines.append("3) Bổ sung học vấn/chứng chỉ liên quan hoặc các khóa học gần nhất có giá trị với JD.")
        else:
            lines.append("3) Giữ mục học vấn/chứng chỉ ngắn gọn, ưu tiên nội dung liên quan trực tiếp vị trí ứng tuyển.")

        lines.append("")
        lines.append("Mẹo trình bày dễ đọc cho nhà tuyển dụng:")
        lines.append("- Đặt phần Tóm tắt năng lực và Kỹ năng chính ở đầu CV.")
        lines.append("- Mỗi kinh nghiệm nên có số liệu cụ thể (%, thời gian, quy mô dự án).")
        return "\n".join(lines)

    def _extract_keywords(self, tokens: list[str], limit: int = 40) -> list[str]:
        filtered = [token for token in tokens if token not in self._STOPWORDS and len(token) >= 2]
        counts = Counter(filtered)
        return [token for token, _ in counts.most_common(limit)]

    def _tokenize(self, text: str) -> list[str]:
        lowered = text.lower()
        token_pattern = r"[a-z0-9]+(?:[+#./-][a-z0-9]+)*|[^\W\d_]+(?:[-'][^\W\d_]+)*"
        tokens = re.findall(token_pattern, lowered, flags=re.UNICODE)
        return self._augment_multilingual_tokens(lowered, tokens)

    def _augment_multilingual_tokens(self, lowered_text: str, tokens: list[str]) -> list[str]:
        enriched_tokens = list(tokens)
        for pattern, concept in self._MULTILINGUAL_CONCEPTS:
            if re.search(pattern, lowered_text, flags=re.UNICODE):
                enriched_tokens.append(concept)

        if re.search(r"\bb\s*1\b", lowered_text, flags=re.UNICODE) and re.search(r"english|tiếng\s*anh|tieng\s*anh", lowered_text, flags=re.UNICODE):
            enriched_tokens.extend(["english", "english_b1"])

        return enriched_tokens

    def _extract_max_years(self, text: str) -> int:
        matches = re.findall(r"(\d{1,2})\s*\+?\s*(?:năm|year|years)", text.lower())
        if not matches:
            return 0
        return max(int(item) for item in matches)

    def _clamp_score(self, value: Any) -> float:
        try:
            score = float(value)
        except (TypeError, ValueError):
            score = 0.0
        return max(0.0, min(100.0, score))


matching_service = MatchingService()
