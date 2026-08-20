from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class CitationItem(BaseModel):
    document_id: str
    paper_title: str
    page_number: int
    chunk_id: str
    section: Optional[str] = "General"
    quote: Optional[str] = None
    citation_label: str # e.g. "[Attention Is All You Need, p. 3]"

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    conversation_id: Optional[str] = None
    collection_id: Optional[str] = None
    document_ids: Optional[List[str]] = None
    top_k: int = Field(default=8, ge=1, le=20)
    temperature: float = Field(default=0.2, ge=0.0, le=1.0)

class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    citations: Optional[List[CitationItem]] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ChatResponse(BaseModel):
    conversation_id: str
    message_id: str
    answer: str
    citations: List[CitationItem]
    evidence_score: float # 0.0 to 1.0 based on retrieved source relevance & coverage
    retrieved_chunks_count: int

class ConversationResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    messages: List[MessageResponse] = []
    model_config = ConfigDict(from_attributes=True)
