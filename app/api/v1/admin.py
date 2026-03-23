from datetime import datetime, timedelta, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.permissions import allow_admin
from app.models.analysis import AnalysisResult
from app.models.cv import CV
from app.models.job_description import JobDescription
from app.models.user import User


router = APIRouter(prefix="/admin", tags=["Admin"])


class DashboardStats(BaseModel):
    tong_nguoi_dung: int
    tong_cv: int
    tong_jd: int
    tong_phan_tich: int
    phan_tich_hom_nay: int
    diem_trung_binh: Optional[float]
    nguoi_dung_moi_7_ngay: int
    phan_tich_7_ngay: List[dict]


class UserAdminResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: UUID
    email: str
    ho_ten: str
    vai_tro: str
    hoat_dong: bool
    created_at: datetime
    so_cv: int = 0
    so_jd: int = 0
    so_phan_tich: int = 0


class ToggleUserRequest(BaseModel):
    hoat_dong: bool


@router.get(
    "/dashboard",
    response_model=DashboardStats,
    dependencies=[Depends(allow_admin)],
    summary="Thong ke tong quan he thong",
)
def get_dashboard(db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    seven_days_ago = now - timedelta(days=7)

    tong_nguoi_dung = db.query(func.count(User.user_id)).scalar() or 0
    tong_cv = db.query(func.count(CV.cv_id)).scalar() or 0
    tong_jd = db.query(func.count(JobDescription.jd_id)).scalar() or 0
    tong_phan_tich = db.query(func.count(AnalysisResult.result_id)).scalar() or 0

    phan_tich_hom_nay = (
        db.query(func.count(AnalysisResult.result_id))
        .filter(AnalysisResult.created_at >= today_start)
        .scalar()
        or 0
    )

    diem_trung_binh_raw = (
        db.query(func.avg(AnalysisResult.diem_tong))
        .filter(
            AnalysisResult.trang_thai == "COMPLETED",
            AnalysisResult.diem_tong.isnot(None),
        )
        .scalar()
    )
    diem_trung_binh = round(float(diem_trung_binh_raw), 2) if diem_trung_binh_raw else None

    nguoi_dung_moi_7_ngay = (
        db.query(func.count(User.user_id)).filter(User.created_at >= seven_days_ago).scalar() or 0
    )

    phan_tich_7_ngay = []
    for i in range(6, -1, -1):
        ngay = now - timedelta(days=i)
        ngay_start = ngay.replace(hour=0, minute=0, second=0, microsecond=0)
        ngay_end = ngay_start + timedelta(days=1)
        so_luong = (
            db.query(func.count(AnalysisResult.result_id))
            .filter(
                AnalysisResult.created_at >= ngay_start,
                AnalysisResult.created_at < ngay_end,
            )
            .scalar()
            or 0
        )
        phan_tich_7_ngay.append({
            "ngay": ngay.strftime("%d/%m"),
            "so_luong": so_luong,
        })

    return DashboardStats(
        tong_nguoi_dung=tong_nguoi_dung,
        tong_cv=tong_cv,
        tong_jd=tong_jd,
        tong_phan_tich=tong_phan_tich,
        phan_tich_hom_nay=phan_tich_hom_nay,
        diem_trung_binh=diem_trung_binh,
        nguoi_dung_moi_7_ngay=nguoi_dung_moi_7_ngay,
        phan_tich_7_ngay=phan_tich_7_ngay,
    )


@router.get(
    "/users",
    response_model=List[UserAdminResponse],
    dependencies=[Depends(allow_admin)],
    summary="Danh sach tat ca nguoi dung kem thong ke",
)
def list_all_users(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(User)
    if search:
        query = query.filter(
            (User.email.ilike(f"%{search}%"))
            | (User.ho_ten.ilike(f"%{search}%"))
        )
    users = query.order_by(desc(User.created_at)).offset(skip).limit(limit).all()

    result = []
    for user in users:
        so_cv = db.query(func.count(CV.cv_id)).filter(CV.user_id == user.user_id).scalar() or 0
        so_jd = (
            db.query(func.count(JobDescription.jd_id))
            .filter(JobDescription.user_id == user.user_id)
            .scalar()
            or 0
        )
        so_phan_tich = (
            db.query(func.count(AnalysisResult.result_id))
            .join(CV, CV.cv_id == AnalysisResult.cv_id)
            .filter(CV.user_id == user.user_id)
            .scalar()
            or 0
        )
        result.append(
            UserAdminResponse(
                user_id=user.user_id,
                email=user.email,
                ho_ten=user.ho_ten,
                vai_tro=user.vai_tro,
                hoat_dong=user.hoat_dong,
                created_at=user.created_at,
                so_cv=so_cv,
                so_jd=so_jd,
                so_phan_tich=so_phan_tich,
            )
        )
    return result


@router.patch(
    "/users/{user_id}/toggle",
    dependencies=[Depends(allow_admin)],
    summary="Khoa hoac mo khoa tai khoan nguoi dung",
)
def toggle_user_status(
    user_id: UUID,
    payload: ToggleUserRequest,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Khong tim thay nguoi dung.")
    if user.vai_tro == "ADMIN":
        raise HTTPException(
            status_code=400,
            detail="Khong the khoa tai khoan Admin.",
        )
    user.hoat_dong = payload.hoat_dong
    db.commit()
    return {
        "message": f"Tai khoan da duoc {'mo khoa' if payload.hoat_dong else 'khoa'} thanh cong.",
        "hoat_dong": user.hoat_dong,
    }


@router.get(
    "/analyses",
    dependencies=[Depends(allow_admin)],
    summary="Lich su phan tich cua tat ca nguoi dung",
)
def list_all_analyses(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    results = (
        db.query(AnalysisResult)
        .order_by(desc(AnalysisResult.created_at))
        .offset(skip)
        .limit(limit)
        .all()
    )

    output = []
    for r in results:
        cv = db.query(CV).filter(CV.cv_id == r.cv_id).first()
        jd = db.query(JobDescription).filter(JobDescription.jd_id == r.jd_id).first()
        user = db.query(User).filter(User.user_id == cv.user_id).first() if cv else None

        ten_cv = (cv.du_lieu_trich_xuat or {}).get("source_file", str(cv.duong_dan)) if cv else "N/A"

        output.append({
            "result_id": str(r.result_id),
            "diem_tong": float(r.diem_tong) if r.diem_tong else None,
            "trang_thai": r.trang_thai,
            "created_at": r.created_at.isoformat(),
            "ten_nguoi_dung": user.ho_ten if user else "N/A",
            "email_nguoi_dung": user.email if user else "N/A",
            "ten_cv": ten_cv,
            "ten_jd": jd.tieu_de if jd else "N/A",
        })
    return output


@router.get(
    "/chats",
    dependencies=[Depends(allow_admin)],
    summary="Xem lich su chat AI cua tat ca nguoi dung",
)
def list_all_chats(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    # Import o day de tranh circular import
    try:
        from app.models.chat import ChatSession

        sessions = (
            db.query(ChatSession)
            .order_by(desc(ChatSession.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )
        output = []
        for s in sessions:
            user = db.query(User).filter(User.user_id == s.user_id).first()
            output.append({
                "session_id": str(s.session_id),
                "ten_nguoi_dung": user.ho_ten if user else "N/A",
                "email": user.email if user else "N/A",
                "so_tin_nhan": len(s.messages) if s.messages else 0,
                "tin_nhan_cuoi": s.messages[-1]["content"][:100] if s.messages else "",
                "created_at": s.created_at.isoformat(),
                "messages": s.messages or [],
            })
        return output
    except Exception:
        return []