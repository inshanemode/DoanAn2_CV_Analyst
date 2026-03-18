from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.analysis import AnalysisResult
from app.models.cv import CV
from app.models.job_description import JobDescription
from app.models.user import User
from app.schemas.analysis import AnalysisRequest, AnalysisResponse, AnalysisUpdate
from app.services.matching_service import matching_service

router = APIRouter(prefix="/analysis", tags=["AI CV-JD Matching"])


@router.post("/", response_model=AnalysisResponse, status_code=status.HTTP_201_CREATED)
async def analyze_cv_matching(
    payload: AnalysisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Tiến hành phân tích mức độ phù hợp giữa CV và JD.
    """
    cv = db.query(CV).filter(CV.cv_id == payload.cv_id, CV.user_id == current_user.user_id).first()
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy CV hoặc bạn không có quyền truy cập.",
        )

    jd = db.query(JobDescription).filter(
        JobDescription.jd_id == payload.jd_id,
        JobDescription.user_id == current_user.user_id,
    ).first()
    if not jd:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy JD hoặc bạn không có quyền truy cập.",
        )

    try:
        return await matching_service.analyze_cv_jd(
            db=db,
            cv_id=payload.cv_id,
            jd_id=payload.jd_id,
        )
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể hoàn tất phân tích CV/JD.",
        )


@router.get("/result/{result_id}", response_model=AnalysisResponse)
def get_analysis_result(
    result_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lấy kết quả phân tích theo ID.
    """
    result = (
        db.query(AnalysisResult)
        .join(CV, CV.cv_id == AnalysisResult.cv_id)
        .filter(AnalysisResult.result_id == result_id, CV.user_id == current_user.user_id)
        .first()
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy kết quả phân tích.")
    return result


@router.patch("/result/{result_id}", response_model=AnalysisResponse)
def update_analysis_result(
    result_id: UUID,
    payload: AnalysisUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Cập nhật nội dung gợi ý của một kết quả phân tích.
    """
    result = (
        db.query(AnalysisResult)
        .join(CV, CV.cv_id == AnalysisResult.cv_id)
        .filter(AnalysisResult.result_id == result_id, CV.user_id == current_user.user_id)
        .first()
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy kết quả phân tích.")

    result.goi_y = payload.goi_y.strip()
    db.commit()
    db.refresh(result)
    return result


@router.delete("/result/{result_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_analysis_result(
    result_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Xóa một kết quả phân tích theo ID.
    """
    result = (
        db.query(AnalysisResult)
        .join(CV, CV.cv_id == AnalysisResult.cv_id)
        .filter(AnalysisResult.result_id == result_id, CV.user_id == current_user.user_id)
        .first()
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy kết quả phân tích.")

    db.delete(result)
    db.commit()
    return None


@router.get("/cv/{cv_id}", response_model=List[AnalysisResponse])
def list_analysis_for_cv(
    cv_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lấy danh sách tất cả các phân tích liên quan đến một CV cụ thể.
    """
    cv = db.query(CV).filter(CV.cv_id == cv_id, CV.user_id == current_user.user_id).first()
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy CV.")

    return db.query(AnalysisResult).filter(AnalysisResult.cv_id == cv_id).all()
