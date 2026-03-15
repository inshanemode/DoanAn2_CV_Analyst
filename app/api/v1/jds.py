import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.job_description import JobDescription
from app.schemas.job_description import JDCreate, JDUpdate, JDResponse

router = APIRouter(prefix="/jds", tags=["JD Management"])


@router.post("/", response_model=JDResponse, status_code=status.HTTP_201_CREATED)
def create_jd(
    payload: JDCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Tạo một mô tả công việc (JD) mới.
    """
    new_jd = JobDescription(
        user_id=current_user.user_id,
        tieu_de=payload.tieu_de,
        ten_cong_ty=payload.ten_cong_ty,
        noi_dung=payload.noi_dung
    )
    db.add(new_jd)
    db.commit()
    db.refresh(new_jd)
    return new_jd


@router.get("/", response_model=List[JDResponse])
def list_my_jds(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lấy danh sách JD của người dùng hiện tại.
    """
    return db.query(JobDescription).filter(JobDescription.user_id == current_user.user_id).all()


@router.get("/{jd_id}", response_model=JDResponse)
def get_jd(
    jd_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lấy thông tin chi tiết một JD.
    """
    jd = db.query(JobDescription).filter(
        JobDescription.jd_id == jd_id,
        JobDescription.user_id == current_user.user_id
    ).first()
    if not jd:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy JD.")
    return jd


@router.patch("/{jd_id}", response_model=JDResponse)
def update_jd(
    jd_id: uuid.UUID,
    payload: JDUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Cập nhật thông tin JD.
    """
    jd = db.query(JobDescription).filter(
        JobDescription.jd_id == jd_id,
        JobDescription.user_id == current_user.user_id
    ).first()
    if not jd:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy JD.")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(jd, field, value)

    db.commit()
    db.refresh(jd)
    return jd


@router.delete("/{jd_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_jd(
    jd_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Xóa JD.
    """
    jd = db.query(JobDescription).filter(
        JobDescription.jd_id == jd_id,
        JobDescription.user_id == current_user.user_id
    ).first()
    if not jd:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy JD.")

    db.delete(jd)
    db.commit()
    return None
