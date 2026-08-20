from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.search import SearchResponse, SearchResultItem
from app.rag.retriever import HybridRetriever

router = APIRouter()

@router.get("/search", response_model=SearchResponse)
def search_documents(
    q: str = Query(..., min_length=1, description="Search query string"),
    mode: str = Query("hybrid", pattern="^(hybrid|vector|keyword)$"),
    collection_id: Optional[str] = Query(None),
    document_ids: Optional[str] = Query(None, description="Comma-separated document IDs"),
    year_min: Optional[int] = Query(None),
    year_max: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(8, ge=1, le=50),
    db: Session = Depends(get_db)
):
    doc_id_list = [d.strip() for d in document_ids.split(",")] if document_ids else None
    
    retriever = HybridRetriever(db)
    # Retrieve top K candidates
    fetch_k = page * limit
    results = retriever.retrieve(
        query=q,
        top_k=fetch_k,
        collection_id=collection_id,
        document_ids=doc_id_list,
        year_min=year_min,
        year_max=year_max,
        mode=mode
    )

    # Slice for pagination
    start_idx = (page - 1) * limit
    paged_results = results[start_idx:start_idx + limit]

    items = [
        SearchResultItem(
            chunk_id=r["chunk_id"],
            document_id=r["document_id"],
            paper_title=r["paper_title"],
            authors=r.get("authors"),
            year=r.get("year"),
            page_number=r["page_number"],
            section=r.get("section", "General"),
            excerpt=r["content"],
            relevance_score=r["score"]
        )
        for r in paged_results
    ]

    return SearchResponse(
        query=q,
        mode=mode,
        total_results=len(results),
        page=page,
        limit=limit,
        results=items
    )
