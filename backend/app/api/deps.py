import time
from typing import Optional, Dict, List
from fastapi import Header, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.core.logging import logger

def get_current_user_optional(
    authorization: Optional[str] = Header(None),
    x_user_email: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Returns the authenticated User if valid token or email header is provided.
    Returns None for guest users.
    """
    if x_user_email:
        clean_email = x_user_email.strip().lower()
        user = db.query(User).filter(User.email == clean_email).first()
        if user:
            return user

    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1].strip()
        user = db.query(User).filter(
            (User.id == token) | (User.reset_token == token)
        ).first()
        if user:
            return user

    return None


def get_current_user_required(
    current_user: Optional[User] = Depends(get_current_user_optional)
) -> User:
    """
    Enforces authentication for protected endpoints.
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in to access this feature."
        )
    return current_user


QUERY_RATE_LIMIT_WINDOW = 60.0
GUEST_MAX_QUERIES = 40
REGISTERED_MAX_QUERIES = 500
_query_history: Dict[str, List[float]] = {}

def query_rate_limiter(
    request: Request,
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Enforces AI inquiry rate limits:
    - Guest users: 40 queries per minute
    - Registered accounts: 500 queries quota
    Only applied to AI inference/chat endpoints (/api/chat, /api/compare, etc.).
    Never throttles document status polling, file uploads, or dashboard navigation.
    """
    # Identify client
    if current_user:
        client_key = f"user_{current_user.id}"
        max_queries = REGISTERED_MAX_QUERIES
    else:
        user_email = request.headers.get("X-User-Email")
        if user_email and user_email.strip():
            client_key = f"guest_{user_email.strip().lower()}"
        else:
            x_forwarded_for = request.headers.get("X-Forwarded-For")
            if x_forwarded_for:
                client_key = f"ip_{x_forwarded_for.split(',')[0].strip()}"
            elif request.client:
                client_key = f"ip_{request.client.host}"
            else:
                client_key = "guest_default"
        max_queries = GUEST_MAX_QUERIES

    current_time = time.time()
    if client_key not in _query_history:
        _query_history[client_key] = []

    # Filter out entries older than the window
    _query_history[client_key] = [
        t for t in _query_history[client_key] if current_time - t < QUERY_RATE_LIMIT_WINDOW
    ]

    if len(_query_history[client_key]) >= max_queries:
        logger.warning(f"Query rate limit exceeded for client {client_key} ({len(_query_history[client_key])}/{max_queries})")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Query limit reached ({max_queries} queries/minute). " + 
                   ("Please wait a moment before sending your next inquiry." if current_user else "Sign in to upgrade to 500 queries.")
        )

    _query_history[client_key].append(current_time)

def reset_user_rate_limit(user_id: str):
    """Resets the query quota when a user logs in."""
    client_key = f"user_{user_id}"
    if client_key in _query_history:
        _query_history[client_key] = []

# Backward-compatibility alias
rate_limiter = query_rate_limiter

