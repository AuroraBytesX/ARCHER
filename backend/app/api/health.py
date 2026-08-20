from fastapi import APIRouter
from sqlalchemy import text
from app.core.config import settings
from app.db.session import engine
from app.rag.llm_provider import get_llm_provider
from app.services.embedding_service import get_embedding_provider
from app.core.logging import logger

router = APIRouter()

@router.get("/health")
async def health_check():
    # 1. Database Check
    db_status = "connected"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        logger.warning(f"Health check: database connection check failed: {e}")
        db_status = f"unreachable: {str(e)}"

    # 2. Embedding Provider Check
    embed_status = "ready"
    try:
        embed_provider = get_embedding_provider()
        if not embed_provider:
            embed_status = "unavailable"
    except Exception as e:
        embed_status = f"error: {str(e)}"

    # 3. LLM Provider Check
    llm = get_llm_provider()
    llm_health = await llm.check_health()

    overall_status = "online"
    if db_status != "connected" or llm_health.get("status") not in ["healthy", "configured"]:
        overall_status = "degraded" if db_status == "connected" else "offline"

    return {
        "status": overall_status,
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": db_status,
        "embedding_provider": settings.EMBEDDING_PROVIDER,
        "embedding_status": embed_status,
        "llm": llm_health
    }
