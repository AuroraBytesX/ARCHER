from datetime import datetime, timezone
import enum
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.models.user import generate_uuid

class DocumentStatus(str, enum.Enum):
    UPLOADED = "UPLOADED"
    PROCESSING = "PROCESSING"
    INDEXING = "INDEXING"
    READY = "READY"
    FAILED = "FAILED"

class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    collection_id = Column(String(36), ForeignKey("collections.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(500), nullable=False, index=True)
    authors = Column(String(500), nullable=True)
    abstract = Column(Text, nullable=True)
    year = Column(Integer, nullable=True, index=True)
    doi = Column(String(255), nullable=True)
    filename = Column(String(255), nullable=False)
    file_url = Column(String(1000), nullable=True)
    page_count = Column(Integer, default=0, nullable=False)
    status = Column(String(50), default=DocumentStatus.UPLOADED.value, nullable=False, index=True)
    error_message = Column(Text, nullable=True)
    content_hash = Column(String(64), nullable=False, unique=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    user = relationship("User", back_populates="documents")
    collection = relationship("Collection", back_populates="documents")
    chunks = relationship("Chunk", back_populates="document", cascade="all, delete-orphan")
    summary = relationship("Summary", back_populates="document", uselist=False, cascade="all, delete-orphan")
