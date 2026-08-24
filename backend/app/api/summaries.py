from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.summary import SummaryResponse, GenerateSummaryRequest
from app.services.summary_service import SummaryService

router = APIRouter()

@router.get("/summaries/{document_id}", response_model=SummaryResponse)
@router.get("/documents/{document_id}/summary", response_model=SummaryResponse)
async def get_summary(document_id: str, db: Session = Depends(get_db)):
    svc = SummaryService(db)
    try:
        return await svc.get_or_generate_summary(document_id, force_regenerate=False)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/summaries/{document_id}", response_model=SummaryResponse)
@router.post("/documents/{document_id}/summary", response_model=SummaryResponse)
async def generate_summary(
    document_id: str,
    payload: GenerateSummaryRequest = Body(default=GenerateSummaryRequest()),
    db: Session = Depends(get_db)
):
    svc = SummaryService(db)
    try:
        return await svc.get_or_generate_summary(document_id, force_regenerate=payload.force_regenerate)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
