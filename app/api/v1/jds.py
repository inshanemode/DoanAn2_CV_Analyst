import uuid
import os
import shutil
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.job_description import JobDescription
from app.schemas.job_description import JDCreate, JDUpdate, JDResponse
from app.services.document_service import document_service

router = APIRouter(prefix="/jds", tags=["JD Management"])


@router.post("/upload", response_model=JDResponse, status_code=status.HTTP_201_CREATED)
async def upload_jd_file(
    file: UploadFile = File(...),
    tieu_de: str | None = Form(None),
    ten_cong_ty: str | None = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Tải lên JD từ file (.pdf, .docx), trích xuất nội dung và lưu vào DB.
    """
    extension = os.path.splitext(file.filename or "")[1].lower()
    if extension not in [".pdf", ".docx"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ chấp nhận file JD định dạng .pdf hoặc .docx",
        )

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    temp_filename = f"jd_{uuid.uuid4()}{extension}"
    temp_path = os.path.join(settings.UPLOAD_DIR, temp_filename)

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        extracted_text = document_service.extract_text(temp_path)
        resolved_title = (tieu_de or os.path.splitext(file.filename or "JD Upload")[0]).strip() or "JD Upload"

        new_jd = JobDescription(
            user_id=current_user.user_id,
            tieu_de=resolved_title,
            ten_cong_ty=ten_cong_ty,
            noi_dung=extracted_text,
        )
        db.add(new_jd)
        db.commit()
        db.refresh(new_jd)
        return new_jd
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi xử lý file JD: {str(exc)}",
        )
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


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
