from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional, Any, List


class AnalysisRequest(BaseModel):
    cv_id: UUID
    jd_id: UUID


class AnalysisDetail(BaseModel):
    tieu_chi: str
    diem: float
    nhan_xet: str


class AnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    result_id: UUID
    cv_id: UUID
    jd_id: UUID
    diem_tong: Optional[float] = None
    chi_tiet_diem: Optional[Any] = None
    goi_y: Optional[str] = None
    trang_thai: str
    created_at: datetime
    updated_at: datetime
