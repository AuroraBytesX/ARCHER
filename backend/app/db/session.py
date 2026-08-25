from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings
from app.core.logging import logger

db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+psycopg://", 1)
elif db_url.startswith("postgresql://") and not db_url.startswith("postgresql+"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)

connect_args = {}
if "sqlite" in db_url:
    connect_args["check_same_thread"] = False
elif "postgresql" in db_url:
    connect_args["connect_timeout"] = 15

engine = create_engine(
    db_url,
    echo=False,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_recycle=300
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    from app.db.base import Base
    import app.models # noqa
    
    try:
        # If using postgresql, ensure pgvector extension and column migrations exist
        if "postgresql" in settings.DATABASE_URL:
            try:
                with engine.connect() as conn:
                    conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
                    # Auto-migrate user columns if table previously created without them
                    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);"))
                    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS hashed_password VARCHAR(255);"))
                    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);"))
                    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;"))
                    conn.commit()
                    logger.info("pgvector extension and user schema verified on PostgreSQL.")
            except Exception as e:
                logger.warning(f"Database migration note: {e}")

        Base.metadata.create_all(bind=engine)
        logger.info("Database tables verified/created.")
    except Exception as e:
        logger.warning(f"Database connection not established during init_db: {e}. (Will retry upon incoming requests)")

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
