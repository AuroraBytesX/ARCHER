from typing import Optional, List
from pydantic import BaseModel, Field

class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    collection_id: Optional[str] = None
    document_ids: Optional[List[str]] = None
    year_min: Optional[int] = None
    year_max: Optional[int] = None
    top_k: int = Field(default=8, ge=1, le=50)
    mode: str = Field(default="hybrid", pattern="^(hybrid|vector|keyword)$")

class SearchResultItem(BaseModel):
    chunk_id: str
    document_id: str
    paper_title: str
    authors: Optional[str] = None
    year: Optional[int] = None
    page_number: int
    section: Optional[str] = "General"
    excerpt: str
    relevance_score: float

class SearchResponse(BaseModel):
    query: str
    mode: str
    total_results: int
    page: int = 1
    limit: int = 8
    results: List[SearchResultItem]
