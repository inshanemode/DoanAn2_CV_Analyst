import os
import shutil
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.core.security import get_current_user
from app.models.user import User
from app.models.cv import CV
from app.schemas.cv import CVResponse

router = APIRouter(prefix="/cvs", tags=["CV Management"])

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


@router.post("/", response_model=CVResponse, status_code=status.HTTP_201_CREATED)
async def upload_cv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Tải lên file CV (PDF, DOCX). Lưu file vào server và tạo record trong DB.
    """
    # Validation: File extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".pdf", ".docx"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ chấp nhận file định dạng .pdf hoặc .docx"
        )

    # Generate unique filename
    filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi lưu file: {str(e)}"
        )

    # Create DB record
    new_cv = CV(
        user_id=current_user.user_id,
        duong_dan=file_path,
        trang_thai_phan_tich="PENDING"
    )
    db.add(new_cv)
    db.commit()
    db.refresh(new_cv)

    return new_cv


@router.get("/", response_model=List[CVResponse])
def list_my_cvs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lấy danh sách CV của người dùng hiện tại.
    """
    return db.query(CV).filter(CV.user_id == current_user.user_id).all()


@router.get("/{cv_id}", response_model=CVResponse)
def get_cv(
    cv_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lấy thông tin chi tiết một CV.
    """
    cv = db.query(CV).filter(CV.cv_id == cv_id, CV.user_id == current_user.user_id).first()
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy CV.")
    return cv


@router.delete("/{cv_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cv(
    cv_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Xóa CV khỏi DB và xóa file vật lý trên server.
    """
    cv = db.query(CV).filter(CV.cv_id == cv_id, CV.user_id == current_user.user_id).first()
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy CV.")

    # Remove file from disk
    if os.path.exists(cv.duong_dan):
        os.remove(cv.duong_dan)

    db.delete(cv)
    db.commit()
    return None
