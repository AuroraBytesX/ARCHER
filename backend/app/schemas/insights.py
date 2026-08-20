from typing import List, Dict, Optional
from pydantic import BaseModel

class YearCountItem(BaseModel):
    year: int
    count: int

class NameCountItem(BaseModel):
    name: str
    count: int

class ResearchGapItem(BaseModel):
    title: str
    domain: str
    identified_gap: str
    supporting_evidence: str
    suggested_direction: str
    referenced_papers: List[str]

class ResearchGapRequest(BaseModel):
    document_ids: Optional[List[str]] = None

class ResearchGapResponse(BaseModel):
    disclaimer: str = "AI-generated research-gap suggestions. These require human verification."
    gaps: List[ResearchGapItem]

class InsightsResponse(BaseModel):
    total_papers: int
    total_chunks: int
    total_collections: int
    years_distribution: List[YearCountItem]
    top_methodologies: List[NameCountItem]
    top_datasets: List[NameCountItem]
    top_topics: List[NameCountItem]
    research_gaps: List[ResearchGapItem]
    disclaimer: str = "AI-generated research-gap suggestions. These require human verification."

class MultiPaperSummarizeRequest(BaseModel):
    document_ids: List[str]

class IndividualPaperSummary(BaseModel):
    document_id: str
    paper_title: str
    objective: Optional[str] = None
    methodology: Optional[str] = None
    findings: Optional[str] = None
    limitations: Optional[str] = None
    summary: Optional[str] = None

class MultiPaperSummarizeResponse(BaseModel):
    synthesis_title: str
    papers_count: int
    executive_synthesis: str
    methodological_takeaways: List[str]
    joint_empirical_findings: List[str]
    paper_summaries: List[IndividualPaperSummary]

