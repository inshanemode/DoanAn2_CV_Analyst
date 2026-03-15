from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.permissions import allow_admin, check_user_ownership_or_admin
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])


@router.get(
    "/",
    response_model=List[UserResponse],
    summary="Danh sách người dùng",
    description="Lấy danh sách tất cả người dùng (chỉ admin).",
    dependencies=[Depends(allow_admin)]
)
def list_users(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    users = db.query(User).offset(skip).limit(limit).all()
    return users


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="Thông tin người dùng theo ID",
)
def get_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Users can only view their own profile; admins can view any
    check_user_ownership_or_admin(current_user, user_id, action="truy cập thông tin")

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy người dùng.",
        )
    return user


@router.patch(
    "/{user_id}",
    response_model=UserResponse,
    summary="Cập nhật thông tin người dùng",
)
def update_user(
    user_id: UUID,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_user_ownership_or_admin(current_user, user_id, action="cập nhật")

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy người dùng.")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user
