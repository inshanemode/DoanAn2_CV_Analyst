import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base


class JobDescription(Base):
    __tablename__ = "job_descriptions"

    jd_id = Column(
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
    tieu_de = Column(String(300), nullable=False)
    ten_cong_ty = Column(String(200), nullable=True)
    noi_dung = Column(Text, nullable=True)
    yeu_cau_phan_tich = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    creator = relationship("User", back_populates="job_descriptions")
    jd_skills = relationship("JDSkill", back_populates="job_description", cascade="all, delete-orphan")
    analysis_results = relationship(
        "AnalysisResult", back_populates="job_description", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<JobDescription jd_id={self.jd_id} tieu_de={self.tieu_de}>"
