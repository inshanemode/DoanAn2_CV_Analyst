import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base


class CV(Base):
    __tablename__ = "cvs"

    cv_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
        default=uuid.uuid4,
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    duong_dan = Column(String(500), nullable=False, unique=True)
    du_lieu_trich_xuat = Column(JSONB, nullable=True)
    trang_thai_phan_tich = Column(String(50), nullable=False, default="PENDING")
    # 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED'
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    owner = relationship("User", back_populates="cvs")
    cv_skills = relationship("CVSkill", back_populates="cv", cascade="all, delete-orphan")
    analysis_results = relationship(
        "AnalysisResult", back_populates="cv", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<CV cv_id={self.cv_id} duong_dan={self.duong_dan}>"
