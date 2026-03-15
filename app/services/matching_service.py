import json
from sqlalchemy.orm import Session
from app.models.analysis import AnalysisResult
from app.models.cv import CV
from app.models.job_description import JobDescription
from app.services.gemini_service import gemini_service
from app.services.document_service import document_service

class MatchingService:
    async def analyze_cv_jd(self, db: Session, cv_id: str, jd_id: str) -> AnalysisResult:
        """
        Phân tích CV và JD bằng Gemini AI.
        """
        # Get data
        cv = db.query(CV).filter(CV.cv_id == cv_id).first()
        jd = db.query(JobDescription).filter(JobDescription.jd_id == jd_id).first()

        if not cv or not jd:
            raise ValueError("CV hoặc Job Description không tồn tại.")

        # Extract text from CV
        cv_text = document_service.extract_text(cv.duong_dan)
        jd_text = jd.noi_dung or ""

        # Prepare prompt
        prompt = f"""
        Bạn là một chuyên gia tuyển dụng AI. Hãy phân tích mức độ phù hợp giữa CV và Mô tả công việc (JD) sau đây.
        
        Nội dung CV:
        {cv_text}
        
        Nội dung JD:
        {jd_text}
        
        Hãy trả về kết quả dưới định dạng JSON duy nhất với cấu trúc sau:
        {{
            "diem_tong": (số từ 0-100),
            "chi_tiet_diem": [
                {{
                    "tieu_chi": "Kỹ năng chuyên môn",
                    "diem": (số 0-100),
                    "nhan_xet": "..."
                }},
                {{
                    "tieu_chi": "Kinh nghiệm làm việc",
                    "diem": (số 0-100),
                    "nhan_xet": "..."
                }},
                {{
                    "tieu_chi": "Học vấn & Chứng chỉ",
                    "diem": (số 0-100),
                    "nhan_xet": "..."
                }}
            ],
            "goi_y": "Các điểm cần cải thiện trong CV để phù hợp hơn với JD này (Markdown format)"
        }}
        """

        # Call Gemini
        ai_response = await gemini_service.generate_content(prompt)
        
        # Parse result (ensure it's clean JSON)
        try:
            # Simple cleanup for Gemini response if it includes markdown blocks
            clean_json = ai_response.strip()
            if clean_json.startswith("```json"):
                clean_json = clean_json.split("```json")[1].split("```")[0].strip()
            elif clean_json.startswith("```"):
                clean_json = clean_json.split("```")[1].split("```")[0].strip()
            
            result_data = json.loads(clean_json)
        except Exception as e:
            # Fallback if AI fails to return valid JSON
            result_data = {
                "diem_tong": 0,
                "chi_tiet_diem": [],
                "goi_y": f"Lỗi xử lý kết quả AI: {str(e)}. Phản hồi gốc: {ai_response[:500]}"
            }

        # Create/Update Analysis Result
        analysis = db.query(AnalysisResult).filter(
            AnalysisResult.cv_id == cv_id, 
            AnalysisResult.jd_id == jd_id
        ).first()

        if not analysis:
            analysis = AnalysisResult(cv_id=cv_id, jd_id=jd_id)
            db.add(analysis)

        analysis.diem_tong = result_data.get("diem_tong")
        analysis.chi_tiet_diem = result_data.get("chi_tiet_diem")
        analysis.goi_y = result_data.get("goi_y")
        analysis.trang_thai = "COMPLETED"

        db.commit()
        db.refresh(analysis)
        
        return analysis

matching_service = MatchingService()
