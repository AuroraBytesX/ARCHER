import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

_base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
_env_candidates = [
    os.path.join(_base_dir, ".env"),
    os.path.abspath(os.path.join(_base_dir, "../.env")),
    ".env"
]
for _p in _env_candidates:
    if os.path.exists(_p):
        load_dotenv(_p, override=True)

class Settings(BaseSettings):
    PROJECT_NAME: str = "ARCHER (ResearchAI)"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    API_HOST: str = "127.0.0.1"
    API_PORT: int = 8000
    

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://archer:archerpassword@localhost:5432/archer_db"
    )

    # LLM Settings (Ollama default with provider abstraction)
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "ollama")
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3:latest")
    
    # Groq Cloud LLM Provider (Ultra-fast Llama-3 in the cloud)
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

    # Generic / BYO OpenAI compatible API fallback
    OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "llama-3.3-70b-versatile")

    # Embedding Provider (Cloud API = 0MB RAM, zero file downloads, instant responses)
    EMBEDDING_PROVIDER: str = os.getenv("EMBEDDING_PROVIDER", "cloud")
    EMBEDDING_MODEL_NAME: str = os.getenv("EMBEDDING_MODEL_NAME", "BAAI/bge-small-en-v1.5")
    EMBEDDING_DEVICE: str = os.getenv("EMBEDDING_DEVICE", "cpu")
    EMBEDDING_DIMENSION: int = 384

    # Ingestion & Chunking
    UPLOAD_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../uploads"))
    CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "800"))
    CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "120"))

    # Retrieval
    RETRIEVAL_TOP_K: int = int(os.getenv("RETRIEVAL_TOP_K", "8"))
    HYBRID_ALPHA: float = float(os.getenv("HYBRID_ALPHA", "0.6")) # 0.6 vector, 0.4 keyword

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "https://archer-research-nine.vercel.app",
    ]

    # Email & SMTP / Resend Settings
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
    RESEND_FROM_EMAIL: str = os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev")
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "")
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "tapashidhar2004@gmail.com")

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "allow"

settings = Settings()

# Ensure uploads directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

