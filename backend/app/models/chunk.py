from sqlalchemy import Column, String, Integer, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.models.user import generate_uuid
from app.models.types import SafeVector
from app.core.config import settings

class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False, index=True)
    page_number = Column(Integer, nullable=False, index=True)
    section = Column(String(255), nullable=True, default="General", index=True)
    content = Column(Text, nullable=False)
    token_count = Column(Integer, default=0, nullable=False)
    embedding = Column(SafeVector(dim=settings.EMBEDDING_DIMENSION), nullable=True)

    document = relationship("Document", back_populates="chunks")

    __table_args__ = (
        Index("ix_chunks_doc_page", "document_id", "page_number"),
        Index("ix_chunks_doc_chunk_idx", "document_id", "chunk_index"),
    )
