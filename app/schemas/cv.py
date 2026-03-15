from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional, Any


class CVBase(BaseModel):
    pass


class CVCreate(CVBase):
    # For creation, we mostly just need the file via multipart/form-data
    # so this might stay empty for base properties
    pass


class CVUpdate(CVBase):
    trang_thai_phan_tich: Optional[str] = None
    du_lieu_trich_xuat: Optional[dict[str, Any]] = None


class CVResponse(CVBase):
    model_config = ConfigDict(from_attributes=True)

    cv_id: UUID
    user_id: UUID
    duong_dan: str
    du_lieu_trich_xuat: Optional[dict[str, Any]] = None
    trang_thai_phan_tich: str
    created_at: datetime
    updated_at: datetime
