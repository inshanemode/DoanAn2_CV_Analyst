import os
import shutil
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.core.config import settings
from app.core.security import get_current_user
from app.models.user import User
from app.services.document_service import IMAGE_EXTENSIONS, document_service

router = APIRouter(prefix="/ocr", tags=["OCR"])


@router.post("/image")
async def extract_image_text(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    extension = os.path.splitext(file.filename or "")[1].lower()
    if extension not in IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ chấp nhận ảnh .jpg, .png, .webp, .bmp, .tif",
        )

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    temp_path = os.path.join(settings.UPLOAD_DIR, f"ocr_{uuid.uuid4()}{extension}")

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        extracted_text = await document_service.extract_text_async(temp_path)
        return {
            "text": extracted_text,
            "source_file": file.filename,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi đọc chữ từ ảnh: {str(exc)}",
        )
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
