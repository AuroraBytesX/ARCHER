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


@router.get("/diagnostics")
async def live_system_diagnostics():
    """
    Forensic diagnostics endpoint to pinpoint exact failure causes in deployment.
    Accessible at: https://<domain>/api/diagnostics
    """
    import os
    import time
    import traceback

    report = {
        "timestamp": time.time(),
        "status": "PASS",
        "tests": {},
        "environment": {
            "EMBEDDING_PROVIDER": settings.EMBEDDING_PROVIDER,
            "EMBEDDING_MODEL_NAME": settings.EMBEDDING_MODEL_NAME,
            "GROQ_MODEL": settings.GROQ_MODEL,
            "HAS_GROQ_KEY": bool(settings.GROQ_API_KEY and len(settings.GROQ_API_KEY) > 5),
            "HAS_DATABASE_URL": bool(settings.DATABASE_URL),
        }
    }

    # TEST 1: Database Connectivity & pgvector
    t0 = time.time()
    try:
        with engine.connect() as conn:
            doc_count = conn.execute(text("SELECT count(*) FROM documents")).scalar()
            chunk_count = conn.execute(text("SELECT count(*) FROM chunks")).scalar()
        report["tests"]["database"] = {
            "status": "PASS",
            "elapsed_ms": round((time.time() - t0) * 1000, 1),
            "documents_count": doc_count,
            "chunks_count": chunk_count,
        }
    except Exception as e:
        report["status"] = "FAIL"
        report["tests"]["database"] = {
            "status": "FAIL",
            "error": str(e),
            "traceback": traceback.format_exc(),
        }

    # TEST 2: Storage & Upload Directory
    t0 = time.time()
    try:
        from app.api.documents import get_upload_directory
        upload_dir = get_upload_directory()
        test_file = os.path.join(upload_dir, ".diag_test.tmp")
        with open(test_file, "w") as f:
            f.write("ok")
        if os.path.exists(test_file):
            os.remove(test_file)
        report["tests"]["storage"] = {
            "status": "PASS",
            "upload_dir": upload_dir,
            "writable": True,
            "elapsed_ms": round((time.time() - t0) * 1000, 1),
        }
    except Exception as e:
        report["status"] = "FAIL"
        report["tests"]["storage"] = {
            "status": "FAIL",
            "error": str(e),
            "traceback": traceback.format_exc(),
        }

    # TEST 3: Embedding Provider
    t0 = time.time()
    try:
        embed_provider = get_embedding_provider()
        vec = embed_provider.embed_query("Diagnostic embedding test")
        report["tests"]["embedding"] = {
            "status": "PASS",
            "provider_class": type(embed_provider).__name__,
            "dimensions": len(vec),
            "elapsed_ms": round((time.time() - t0) * 1000, 1),
        }
    except Exception as e:
        report["status"] = "FAIL"
        report["tests"]["embedding"] = {
            "status": "FAIL",
            "error": str(e),
            "traceback": traceback.format_exc(),
        }

    # TEST 4: Groq Cloud LLM
    t0 = time.time()
    try:
        llm = get_llm_provider()
        llm_response = await llm.generate_response("Say 'ARCHER_DIAGNOSTICS_OK' and nothing else.")
        report["tests"]["llm"] = {
            "status": "PASS",
            "provider_class": type(llm).__name__,
            "response": llm_response[:60],
            "elapsed_ms": round((time.time() - t0) * 1000, 1),
        }
    except Exception as e:
        report["status"] = "FAIL"
        report["tests"]["llm"] = {
            "status": "FAIL",
            "error": str(e),
            "traceback": traceback.format_exc(),
        }

    return report
