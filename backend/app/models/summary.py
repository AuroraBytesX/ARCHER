from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.models.user import generate_uuid

class Summary(Base):
    __tablename__ = "summaries"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    objective = Column(Text, nullable=True)
    methodology = Column(Text, nullable=True)
    datasets = Column(Text, nullable=True)
    findings = Column(Text, nullable=True)
    limitations = Column(Text, nullable=True)
    future_work = Column(Text, nullable=True)
    summary = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    document = relationship("Document", back_populates="summary")
