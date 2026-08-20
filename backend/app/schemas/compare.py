from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class CompareRequest(BaseModel):
    document_ids: List[str] = Field(..., min_length=2, max_length=10)

class ComparePaperProfile(BaseModel):
    document_id: str
    title: str
    authors: Optional[str] = None
    year: Optional[int] = None
    objective: str
    methodology: str
    dataset: str
    model: str
    metrics: str
    results: str
    limitations: str

class CompareMatrixRow(BaseModel):
    aspect: str
    values: Dict[str, str] # map of document_id -> value string

class CompareResponse(BaseModel):
    papers: List[ComparePaperProfile]
    comparison_table: List[CompareMatrixRow]
    synthesis_summary: Optional[str] = None
