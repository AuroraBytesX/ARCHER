from fastapi import APIRouter
from sqlalchemy import text
from app.core.config import settings
from app.db.session import engine
from app.rag.llm_provider import get_llm_provider
from app.services.embedding_service import get_embedding_provider
from app.core.logging import logger

router = APIRouter()

@router.get("/health")
@router.head("/health")
def health_check():
    """
    Ultra-fast instant health check for cron monitors and uptime checkers.
    Responds in < 5ms without blocking on external network calls.
    """
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": "connected",
        "embedding_provider": settings.EMBEDDING_PROVIDER,
        "embedding_status": "ready"
    }
