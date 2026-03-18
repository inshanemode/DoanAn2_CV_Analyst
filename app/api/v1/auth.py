from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError

from app.core.database import get_db
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)
from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest
from app.schemas.token import Token
from app.schemas.user import UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Đăng ký tài khoản mới",
    description="Tạo tài khoản người dùng mới. Mật khẩu sẽ được mã hóa bằng bcrypt trước khi lưu.",
)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    try:
        # Check duplicate email
        existing = db.query(User).filter(User.email == payload.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Email '{payload.email}' đã được sử dụng.",
            )

        hashed = hash_password(payload.mat_khau)
        new_user = User(
            ho_ten=payload.ho_ten,
            email=payload.email,
            mat_khau=hashed,
            vai_tro=payload.vai_tro or "CANDIDATE",
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user
    except HTTPException:
        raise
    except OperationalError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Không thể kết nối cơ sở dữ liệu. "
                "Vui lòng kiểm tra DATABASE_URL trong file .env."
            ),
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Đã xảy ra lỗi trong quá trình đăng ký.",
        )


@router.post(
    "/login",
    response_model=Token,
    summary="Đăng nhập",
    description="Xác thực email và mật khẩu, trả về JWT access token.",
)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.mat_khau, user.mat_khau):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không đúng.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.hoat_dong:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị vô hiệu hóa.",
        )

    access_token = create_access_token(data={"sub": str(user.user_id)})
    return Token(access_token=access_token)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Thông tin người dùng hiện tại",
    description="Trả về thông tin người dùng đang đăng nhập dựa trên JWT token.",
)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
