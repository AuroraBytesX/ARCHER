from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.compare import CompareRequest, CompareResponse
from app.services.comparison_service import ComparisonService

router = APIRouter()

@router.post("/compare", response_model=CompareResponse)
async def compare_documents(payload: CompareRequest, db: Session = Depends(get_db)):
    svc = ComparisonService(db)
    try:
        return await svc.compare_papers(payload.document_ids)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
