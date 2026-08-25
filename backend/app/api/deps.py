import time
from typing import Optional, Dict, List
from fastapi import Header, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.core.logging import logger

RATE_LIMIT_WINDOW = 60.0
MAX_REQUESTS_PER_WINDOW = 40
_request_history: Dict[str, List[float]] = {}

def rate_limiter(request: Request):
    """
    Enforces rate limit across endpoints.
    Properly extracts real client IP behind reverse proxies (Render/Cloudflare/Vercel)
    using X-Forwarded-For, X-User-Email, or Authorization.
    """
    client_key = None
    
    # 1. User email header (if authenticated or guest session email)
    user_email = request.headers.get("X-User-Email")
    if user_email and user_email.strip():
        client_key = user_email.strip().lower()
    
    # 2. Authorization header
    if not client_key:
        auth_header = request.headers.get("Authorization")
        if auth_header:
            client_key = auth_header.strip()
            
    # 3. Real client IP from proxy headers
    if not client_key:
        x_forwarded_for = request.headers.get("X-Forwarded-For")
        if x_forwarded_for:
            client_key = x_forwarded_for.split(",")[0].strip()
        elif request.headers.get("CF-Connecting-IP"):
            client_key = request.headers.get("CF-Connecting-IP")
        elif request.client:
            client_key = request.client.host
        else:
            client_key = "default_client"

    current_time = time.time()
    if client_key not in _request_history:
        _request_history[client_key] = []

    _request_history[client_key] = [
        t for t in _request_history[client_key] if current_time - t < RATE_LIMIT_WINDOW
    ]

    if len(_request_history[client_key]) >= MAX_REQUESTS_PER_WINDOW:
        logger.warning(f"Rate limit exceeded for client {client_key}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. ARCHER allows up to 40 requests per minute. Please try again shortly."
        )

    _request_history[client_key].append(current_time)


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
