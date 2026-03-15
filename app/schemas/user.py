from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


class UserResponse(BaseModel):
    user_id: UUID
    email: EmailStr
    ho_ten: str
    vai_tro: str
    hoat_dong: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    ho_ten: Optional[str] = Field(None, min_length=2, max_length=255)
    email: Optional[EmailStr] = None
