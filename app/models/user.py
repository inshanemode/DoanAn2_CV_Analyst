import uuid
from sqlalchemy import Column, String, Boolean, DateTime, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    user_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
        default=uuid.uuid4,
    )
    email = Column(String(255), unique=True, nullable=False, index=True)
    ho_ten = Column(String(200), nullable=False)
    mat_khau = Column(String(255), nullable=False)
    vai_tro = Column(String(50), nullable=False, default="CANDIDATE")  # 'CANDIDATE' | 'ADMIN'
    hoat_dong = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    cvs = relationship("CV", back_populates="owner", cascade="all, delete-orphan")
    job_descriptions = relationship(
        "JobDescription", back_populates="creator", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User user_id={self.user_id} email={self.email}>"
