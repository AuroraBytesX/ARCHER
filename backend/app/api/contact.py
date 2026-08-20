from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import Optional
from app.services.email_service import EmailService
from app.api.deps import rate_limiter
from app.core.config import settings
from app.core.logging import logger

router = APIRouter()

class ContactMessageRequest(BaseModel):
    name: str
    email: str
    subject: Optional[str] = "ARCHER Research Inquiry"
    message: str

class ContactMessageResponse(BaseModel):
    success: bool
    message: str

@router.post("/contact", response_model=ContactMessageResponse, dependencies=[Depends(rate_limiter)])
def submit_contact_message(payload: ContactMessageRequest):
    if not payload.name.strip() or not payload.email.strip() or not payload.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name, email, and message are all required fields."
        )

    logger.info(f"Contact submission received from {payload.name} ({payload.email})")

    subject = f"[ARCHER Contact] {payload.subject}: From {payload.name}"
    body_text = (
        f"You have received a new contact inquiry through ARCHER:\n\n"
        f"Sender Name: {payload.name}\n"
        f"Sender Email: {payload.email}\n"
        f"Subject: {payload.subject}\n\n"
        f"Message:\n{payload.message}\n\n"
        f"--- Delivered via ARCHER Research Intelligence Platform ---"
    )

    dest_email = settings.ADMIN_EMAIL or settings.SMTP_USER or "tapashidhar2004@gmail.com"
    EmailService.send_email(to_email=dest_email, subject=subject, body_text=body_text)

    return ContactMessageResponse(
        success=True,
        message="Thank you. Your message has been dispatched directly to tapashidhar2004@gmail.com."
    )
