from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional, Any


class JDBase(BaseModel):
    tieu_de: str
    ten_cong_ty: Optional[str] = None
    noi_dung: Optional[str] = None


class JDCreate(JDBase):
    pass


class JDUpdate(BaseModel):
    tieu_de: Optional[str] = None
    ten_cong_ty: Optional[str] = None
    noi_dung: Optional[str] = None
    yeu_cau_phan_tich: Optional[dict[str, Any]] = None


class JDResponse(JDBase):
    model_config = ConfigDict(from_attributes=True)

    jd_id: UUID
    user_id: UUID
    yeu_cau_phan_tich: Optional[dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
