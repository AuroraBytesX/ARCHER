from fastapi import APIRouter
from app.api.health import router as health_router
from app.api.documents import router as documents_router
from app.api.search import router as search_router
from app.api.chat import router as chat_router
from app.api.summaries import router as summaries_router
from app.api.compare import router as compare_router
from app.api.insights import router as insights_router
from app.api.auth import router as auth_router
from app.api.contact import router as contact_router

api_router = APIRouter()

api_router.include_router(health_router, tags=["Health"])
api_router.include_router(auth_router, tags=["Authentication"])
api_router.include_router(contact_router, tags=["Contact & Support"])
api_router.include_router(documents_router, tags=["Documents & Collections"])
api_router.include_router(search_router, tags=["Search"])
api_router.include_router(chat_router, tags=["RAG Chat & Conversations"])
api_router.include_router(summaries_router, tags=["Paper Summarization"])
api_router.include_router(compare_router, tags=["Multi-Paper Comparison"])
api_router.include_router(insights_router, tags=["Research Insights & Gaps"])

