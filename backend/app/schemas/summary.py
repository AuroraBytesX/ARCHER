from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class SummaryResponse(BaseModel):
    id: str
    document_id: str
    paper_title: Optional[str] = None
    objective: Optional[str] = None
    methodology: Optional[str] = None
    datasets: Optional[str] = None
    findings: Optional[str] = None
    limitations: Optional[str] = None
    future_work: Optional[str] = None
    summary: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class GenerateSummaryRequest(BaseModel):
    force_regenerate: bool = False
