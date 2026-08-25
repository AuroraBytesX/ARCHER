import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.logging import logger
from app.db.session import init_db
from app.api.router import api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION}...")
    init_db()
    
    # Non-blocking async background warmup so port binds in <0.5 seconds
    import threading
    def _warmup():
        try:
            from app.services.embedding_service import get_embedding_provider
            provider = get_embedding_provider()
            provider.embed_query("warmup query")
            logger.info("Embedding provider pre-warmed successfully in background.")

            # Idempotent benchmark library initialization for cloud/local deployment
            from app.db.session import SessionLocal
            from app.models.document import Document, DocumentStatus
            db = SessionLocal()
            try:
                ready_count = db.query(Document).filter(Document.status == DocumentStatus.READY.value).count()
                if ready_count == 0:
                    logger.info("[SEED] Empty database detected. Auto-seeding benchmark research papers...")
                    try:
                        from scripts.seed_database import seed
                        seed()
                    except Exception as seed_err:
                        logger.warning(f"[SEED] Auto-seed warning: {seed_err}")
            finally:
                db.close()
        except Exception as e:
            logger.warning(f"Embedding warmup / auto-seed note: {e}")

    threading.Thread(target=_warmup, daemon=True).start()
    yield
    logger.info(f"Shutting down {settings.PROJECT_NAME}...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AI-Powered, Citation-Grounded Hybrid Extraction and Retrieval System for Multi-Document Research Summarization",
    lifespan=lifespan
)

# CORS middleware (permits all Vercel domains, preview branches, Render and local hosts)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app|https://.*\.onrender\.com|http://localhost:\d+|http://127\.0\.0\.1:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "service": settings.PROJECT_NAME,
        "product": "ARCHER",
        "version": settings.VERSION,
        "docs_url": "/docs",
        "health_url": f"{settings.API_V1_STR}/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.API_HOST, port=settings.API_PORT, reload=True)
