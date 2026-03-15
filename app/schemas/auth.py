from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class RegisterRequest(BaseModel):
    ho_ten: str = Field(..., min_length=2, max_length=200, example="Nguyen Van A")
    email: EmailStr = Field(..., example="user@example.com")
    mat_khau: str = Field(..., min_length=8, max_length=128, example="SecurePass123!")
    vai_tro: Optional[str] = Field(default="CANDIDATE", example="CANDIDATE")


class LoginRequest(BaseModel):
    email: EmailStr = Field(..., example="user@example.com")
    mat_khau: str = Field(..., example="SecurePass123!")
