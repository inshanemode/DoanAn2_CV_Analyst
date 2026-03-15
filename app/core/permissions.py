from typing import List
from uuid import UUID
from fastapi import Depends, HTTPException, status
from app.models.user import User
from app.core.security import get_current_user

class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: User = Depends(get_current_user)):
        if user.vai_tro not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền thực hiện thao tác này."
            )
        return user

allow_admin = RoleChecker(["ADMIN"])
allow_manager_and_admin = RoleChecker(["MANAGER", "ADMIN"])

def check_user_ownership_or_admin(current_user: User, target_user_id: UUID, action: str = "truy cập"):
    if current_user.vai_tro != "ADMIN" and current_user.user_id != target_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Không có quyền {action} người dùng này."
        )
