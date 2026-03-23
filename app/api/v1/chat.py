from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.analysis import AnalysisResult
from app.models.cv import CV
from app.models.job_description import JobDescription
from app.models.user import User
from app.services.gemini_service import gemini_service


router = APIRouter(prefix="/chat", tags=["Chatbox AI"])


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = Field(default_factory=list)
    result_id: Optional[UUID] = None


class ChatResponse(BaseModel):
    reply: str


def _format_score_details(chi_tiet_diem: Any) -> str:
    if not chi_tiet_diem:
        return "Khong co chi tiet diem"

    if isinstance(chi_tiet_diem, list):
        lines: List[str] = []
        for item in chi_tiet_diem:
            if isinstance(item, dict):
                tieu_chi = item.get("tieu_chi", "?")
                diem = item.get("diem", "?")
                nhan_xet = item.get("nhan_xet", "")
                lines.append(f"- {tieu_chi}: {diem}/100 - {nhan_xet}")
        return "\n".join(lines) if lines else "Khong co"

    return str(chi_tiet_diem)


def _build_context_prompt(
    message: str,
    history: List[ChatMessage],
    result: Optional[AnalysisResult] = None,
    cv: Optional[CV] = None,
    jd: Optional[JobDescription] = None,
) -> str:
    system_intro = """Ban la tro ly tu van CV thong minh cua he thong CV Intelligence.
Nhiem vu cua ban:
1. Neu co ket qua phan tich CV-JD, hay tra loi dua tren ngu canh do - giai thich diem so, phan tich diem yeu, dua ra goi y cu the.
2. Neu khong co ket qua phan tich, hay tu van CV chung: cach viet CV hay, cach cai thien tung muc, kinh nghiem trinh bay, v.v.
Luon tra loi bang tieng Viet, ngan gon, thuc te va de hieu.
Khong bia thong tin neu khong co du lieu. Khong tra loi cac cau hoi khong lien quan den CV/tuyen dung."""

    context_block = ""
    if result:
        cv_data = cv.du_lieu_trich_xuat if cv and cv.du_lieu_trich_xuat else {}
        cv_text = cv_data.get("raw_text", "Khong co") if isinstance(cv_data, dict) else str(cv_data)
        jd_text = jd.noi_dung or "Khong co" if jd else "Khong co"
        jd_title = jd.tieu_de if jd else "Khong ro"

        context_block = f"""
--- NGU CANH KET QUA PHAN TICH ---
Vi tri ung tuyen: {jd_title}
Diem tong: {result.diem_tong}/100
Trang thai: {result.trang_thai}

Chi tiet diem:
{_format_score_details(result.chi_tiet_diem)}

Goi y he thong da dua ra:
{result.goi_y or "Chua co goi y"}

Noi dung CV (tom tat):
{cv_text[:2000] if len(cv_text) > 2000 else cv_text}

Noi dung JD (tom tat):
{jd_text[:1500] if len(jd_text) > 1500 else jd_text}
--- HET NGU CANH ---
"""

    history_block = ""
    if history:
        history_block = "\n--- LICH SU HOI THOAI ---\n"
        for msg in history[-8:]:
            role_label = "Nguoi dung" if msg.role == "user" else "Tro ly"
            history_block += f"{role_label}: {msg.content}\n"
        history_block += "--- HET LICH SU ---\n"

    return f"""{system_intro}
{context_block}
{history_block}
Nguoi dung hoi: {message}

Tro ly tra loi:"""


@router.post("/", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ChatResponse:
    result: Optional[AnalysisResult] = None
    cv: Optional[CV] = None
    jd: Optional[JobDescription] = None

    if payload.result_id:
        result = (
            db.query(AnalysisResult)
            .join(CV, CV.cv_id == AnalysisResult.cv_id)
            .filter(
                AnalysisResult.result_id == payload.result_id,
                CV.user_id == current_user.user_id,
            )
            .first()
        )
        if result:
            cv = db.query(CV).filter(CV.cv_id == result.cv_id).first()
            jd = db.query(JobDescription).filter(JobDescription.jd_id == result.jd_id).first()

    prompt = _build_context_prompt(
        message=payload.message,
        history=payload.history,
        result=result,
        cv=cv,
        jd=jd,
    )

    reply = await gemini_service.generate_content(prompt)
    if not reply:
        reply = (
            "Xin loi, tro ly AI hien dang tam thoi khong kha dung. "
            "Ban co the thu lai sau it phut hoac xem goi y trong ket qua phan tich."
        )

    # Luu lich su chat vao DB
    try:
        from app.models.chat import ChatSession

        all_messages = [
            *[msg.model_dump() for msg in payload.history],
            {"role": "user", "content": payload.message},
            {"role": "assistant", "content": reply},
        ]

        existing_session = None
        # Tim session hien tai neu co (dua vao result_id + user)
        if payload.result_id:
            existing_session = (
                db.query(ChatSession)
                .filter(
                    ChatSession.user_id == current_user.user_id,
                    ChatSession.result_id == payload.result_id,
                )
                .first()
            )

        if existing_session:
            existing_session.messages = all_messages
            db.commit()
        else:
            new_session = ChatSession(
                user_id=current_user.user_id,
                result_id=payload.result_id,
                messages=all_messages,
            )
            db.add(new_session)
            db.commit()
    except Exception as exc:
        print(f"[Chat] Khong the luu lich su chat: {exc}")

    return ChatResponse(reply=reply)