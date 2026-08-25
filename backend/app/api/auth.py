import hashlib
import secrets
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ResetPasswordResponse,
    AuthResponse,
    ForgotPasswordResponse,
    UserMeResponse
)
from app.services.email_service import EmailService
from app.api.deps import get_current_user_required, rate_limiter
from app.core.logging import logger

router = APIRouter()

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

@router.post("/auth/register", response_model=AuthResponse)
def register_user(payload: UserRegisterRequest, db: Session = Depends(get_db)):
    email_clean = payload.email.lower().strip()
    if not email_clean or "@" not in email_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid email address is required."
        )
    if len(payload.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters in length."
        )

    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please sign in."
        )

    new_user = User(
        email=email_clean,
        name=payload.name or email_clean.split("@")[0],
        hashed_password=hash_password(payload.password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return AuthResponse(
        access_token=new_user.id,
        user_id=new_user.id,
        email=new_user.email,
        name=new_user.name,
        tier="registered",
        message="Account created successfully."
    )

@router.post("/auth/login", response_model=AuthResponse)
def login_user(payload: UserLoginRequest, db: Session = Depends(get_db)):
    email_clean = payload.email.lower().strip()
    user = db.query(User).filter(User.email == email_clean).first()
    if not user or user.hashed_password != hash_password(payload.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    return AuthResponse(
        access_token=user.id,
        user_id=user.id,
        email=user.email,
        name=user.name,
        tier="registered",
        message="Sign in successful."
    )

@router.post("/auth/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    email_clean = payload.email.lower().strip()
    user = db.query(User).filter(User.email == email_clean).first()
    
    if not user:
        # Avoid user enumeration while returning positive confirmation
        return ForgotPasswordResponse(
            email=email_clean,
            message=f"If an account exists for {email_clean}, recovery instructions have been dispatched."
        )

    # Generate a clean 6-digit numeric OTP code
    reset_token = f"{secrets.randbelow(900000) + 100000}"
    user.reset_token = reset_token
    user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=2)
    db.commit()

    logger.info(f"6-digit password reset OTP generated for {email_clean}: {reset_token}")
    
    subject = "ARCHER: Your 6-Digit Password Reset Code"
    body_text = (
        f"Hello {user.name or 'Researcher'},\n\n"
        f"You requested a password reset for your ARCHER account ({email_clean}).\n\n"
        f"Your 6-Digit Verification Code is:\n"
        f"----------------------------------------\n"
        f"             {reset_token}\n"
        f"----------------------------------------\n\n"
        f"This 6-digit code is valid for 2 hours. Enter this code on the ARCHER reset password window to set your new password.\n\n"
        f"If you did not request this change, you can safely ignore this email.\n\n"
        f"Best regards,\n"
        f"The ARCHER Research Intelligence Team"
    )
    
    EmailService.send_email(to_email=email_clean, subject=subject, body_text=body_text)
    
    return ForgotPasswordResponse(
        email=email_clean,
        message=f"A 6-digit recovery code has been dispatched to {email_clean}."
    )

@router.post("/auth/reset-password", response_model=ResetPasswordResponse)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    email_clean = payload.email.lower().strip()
    user = db.query(User).filter(User.email == email_clean).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email or recovery code."
        )

    clean_token = payload.token.strip()
    if not user.reset_token or user.reset_token.strip() != clean_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired 6-digit recovery code."
        )

    if user.reset_token_expires and user.reset_token_expires.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Recovery token has expired. Please request a new one."
        )

    if len(payload.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters."
        )

    user.hashed_password = hash_password(payload.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()

    return ResetPasswordResponse(
        message="Password updated successfully. You may now sign in with your new password.",
        success=True
    )

@router.get("/auth/me", response_model=UserMeResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user_required)):
    return UserMeResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        tier="registered",
        created_at=current_user.created_at.isoformat()
    )
