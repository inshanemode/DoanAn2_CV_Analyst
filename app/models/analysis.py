import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Numeric, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    result_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
        default=uuid.uuid4,
    )
    cv_id = Column(
        UUID(as_uuid=True),
        ForeignKey("cvs.cv_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    jd_id = Column(
        UUID(as_uuid=True),
        ForeignKey("job_descriptions.jd_id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    diem_tong = Column(Numeric(5, 2), nullable=True)          # Overall match score 0-100
    chi_tiet_diem = Column(JSONB, nullable=True)              # Detailed JSON scoring
    goi_y = Column(Text, nullable=True)                       # Improvement suggestions (Markdown)
    trang_thai = Column(String(50), nullable=False, default="PROCESSING")
    # 'PROCESSING' | 'COMPLETED' | 'FAILED'
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    cv = relationship("CV", back_populates="analysis_results")
    job_description = relationship("JobDescription", back_populates="analysis_results")

    def __repr__(self) -> str:
        return f"<AnalysisResult result_id={self.result_id} diem_tong={self.diem_tong}>"
