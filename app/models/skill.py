import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base


class Skill(Base):
    __tablename__ = "skills"

    skill_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
        default=uuid.uuid4,
    )
    ten_ky_nang = Column(String(150), unique=True, nullable=False, index=True)
    danh_muc = Column(String(50), nullable=False)
    # 'TECHNICAL' | 'SOFT' | 'LANGUAGE' | 'TOOL'
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    cv_skills = relationship("CVSkill", back_populates="skill", cascade="all, delete-orphan")
    jd_skills = relationship("JDSkill", back_populates="skill", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Skill skill_id={self.skill_id} ten_ky_nang={self.ten_ky_nang}>"


class CVSkill(Base):
    """Junction table: maps extracted skills to a CV (composite PK, no surrogate key)."""

    __tablename__ = "cv_skills"

    cv_id = Column(
        UUID(as_uuid=True),
        ForeignKey("cvs.cv_id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    )
    skill_id = Column(
        UUID(as_uuid=True),
        ForeignKey("skills.skill_id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    )
    muc_do_thao_tao = Column(String(50), nullable=True)
    # 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'

    # Relationships
    cv = relationship("CV", back_populates="cv_skills")
    skill = relationship("Skill", back_populates="cv_skills")


class JDSkill(Base):
    """Junction table: maps required skills to a Job Description (composite PK)."""

    __tablename__ = "jd_skills"

    jd_id = Column(
        UUID(as_uuid=True),
        ForeignKey("job_descriptions.jd_id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    )
    skill_id = Column(
        UUID(as_uuid=True),
        ForeignKey("skills.skill_id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    )
    loai_yeu_cau = Column(String(50), nullable=False, default="REQUIRED")
    # 'REQUIRED' | 'PREFERRED'

    # Relationships
    job_description = relationship("JobDescription", back_populates="jd_skills")
    skill = relationship("Skill", back_populates="jd_skills")
