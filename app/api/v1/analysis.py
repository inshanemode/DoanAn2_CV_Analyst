from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.analysis import AnalysisResult
from app.services.matching_service import matching_service
from app.schemas.analysis import AnalysisRequest, AnalysisResponse

router = APIRouter(prefix="/analysis", tags=["AI CV-JD Matching"])


@router.post("/", response_model=AnalysisResponse, status_code=status.HTTP_201_CREATED)
async def analyze_cv_matching(
    payload: AnalysisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Tiến hành phân tích sự phù hợp giữa CV và JD bằng AI.
    """
    try:
        result = await matching_service.analyze_cv_jd(
            db=db, 
            cv_id=payload.cv_id, 
            jd_id=payload.jd_id
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/{result_id}", response_model=AnalysisResponse)
def get_analysis_result(
    result_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lấy kết quả phân tích theo ID.
    """
    result = db.query(AnalysisResult).filter(AnalysisResult.result_id == result_id).first()
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy kết quả phân tích.")
    return result


@router.get("/cv/{cv_id}", response_model=List[AnalysisResponse])
def list_analysis_for_cv(
    cv_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lấy danh sách tất cả các phân tích liên quan đến một CV cụ thể.
    """
    return db.query(AnalysisResult).filter(AnalysisResult.cv_id == cv_id).all()
