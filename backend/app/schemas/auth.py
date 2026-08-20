from pydantic import BaseModel, EmailStr
from typing import Optional

class UserRegisterRequest(BaseModel):
    name: Optional[str] = None
    email: str
    password: str

class UserLoginRequest(BaseModel):
    email: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    token: str
    new_password: str

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    name: Optional[str] = None
    tier: str = "registered"
    message: str = "Authentication successful"

class ForgotPasswordResponse(BaseModel):
    message: str
    email: str

class ResetPasswordResponse(BaseModel):
    message: str
    success: bool

class UserMeResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    tier: str = "registered"
    created_at: str
