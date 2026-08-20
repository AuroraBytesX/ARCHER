from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.insights import (
    InsightsResponse,
    ResearchGapResponse,
    ResearchGapRequest,
    MultiPaperSummarizeRequest,
    MultiPaperSummarizeResponse
)
from app.services.insight_service import InsightService

router = APIRouter()

@router.get("/insights", response_model=InsightsResponse)
async def get_system_insights(db: Session = Depends(get_db)):
    svc = InsightService(db)
    return await svc.get_insights()

@router.post("/insights/gaps", response_model=ResearchGapResponse)
async def get_research_gaps(
    payload: ResearchGapRequest = Body(default=ResearchGapRequest()),
    db: Session = Depends(get_db)
):
    svc = InsightService(db)
    gaps = await svc.generate_research_gaps(payload.document_ids)
    return ResearchGapResponse(gaps=gaps)

@router.post("/insights/summarize", response_model=MultiPaperSummarizeResponse)
@router.post("/insights/summarize-selected", response_model=MultiPaperSummarizeResponse)
async def summarize_multi_papers(
    payload: MultiPaperSummarizeRequest,
    db: Session = Depends(get_db)
):
    svc = InsightService(db)
    res = await svc.summarize_selected_papers(payload.document_ids)
    return MultiPaperSummarizeResponse(**res)
