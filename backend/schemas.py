from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, EmailStr, Field, ConfigDict

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = Field(None, max_length=120)
    phone_number: Optional[str] = Field(None, max_length=30)
    avatar_url: Optional[str] = Field(None, max_length=500)
    auth_provider: Optional[str] = Field("local", max_length=50)

class UserRegister(UserBase):
    password: str = Field(..., min_length=8, max_length=128, description="Password must be between 8 and 128 characters")
    phone_number: Optional[str] = Field(None, max_length=30, description="Mobile number (optional or for SMS verification)")
    otp_code: Optional[str] = Field(None, min_length=4, max_length=10, description="Optional verification OTP code")

class UserLogin(BaseModel):
    identifier: Optional[str] = Field(None, max_length=255, description="Email address or Mobile number")
    email: Optional[EmailStr] = Field(None, description="Legacy email field for backward compatibility")
    password: Optional[str] = Field(None, max_length=128, description="Password for credential authentication")
    otp_code: Optional[str] = Field(None, min_length=4, max_length=10, description="OTP code for passwordless/verified login")

class GoogleAuthRequest(BaseModel):
    credential: str = Field(..., max_length=4096, description="Google ID Token JWT from Google Identity Services")
    client_id: Optional[str] = Field(None, max_length=255)
    user_info: Optional[Dict[str, Any]] = None

class SendOtpRequest(BaseModel):
    target: str = Field(..., min_length=3, max_length=255, description="Email address or Mobile number")
    purpose: str = Field("login", max_length=50, description="Purpose: 'login', 'register', or 'verify'")

class VerifyOtpRequest(BaseModel):
    target: str = Field(..., min_length=3, max_length=255, description="Email address or Mobile number")
    otp_code: str = Field(..., min_length=4, max_length=10, description="Verification OTP code")
    purpose: str = Field("login", max_length=50, description="Purpose: 'login', 'register', or 'verify'")
    full_name: Optional[str] = Field(None, max_length=120)

class OtpResponse(BaseModel):
    message: str
    target: str
    dev_otp: Optional[str] = None

class UserResponse(UserBase):
    id: int
    role: str
    is_active: bool
    is_verified: bool = False
    phone_verified: bool = False
    auth_provider: str = "local"
    avatar_url: Optional[str] = None
    phone_number: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class TokenData(BaseModel):
    email: Optional[str] = None

# Watchlist Schemas
class WatchlistCreate(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=255)
    symbol: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = Field(None, max_length=2000)

class WatchlistResponse(BaseModel):
    id: int
    company_name: str
    symbol: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Saved Simulations Schemas
class SimulationCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    inputs: Dict[str, Any]
    results: Dict[str, Any]

class SimulationResponse(BaseModel):
    id: int
    title: str
    inputs: Dict[str, Any]
    results: Dict[str, Any]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Feedback & Contact Schemas
class FeedbackCreate(BaseModel):
    name: Optional[str] = Field(None, max_length=120)
    email: EmailStr = Field(..., description="Customer email for reply")
    category: str = Field(..., max_length=50, description="bug | feature | data | general")
    subject: str = Field(..., min_length=2, max_length=255)
    message: str = Field(..., min_length=5, max_length=5000)
    rating: Optional[int] = Field(None, ge=1, le=5)

class FeedbackResponse(BaseModel):
    success: bool
    feedback_id: str
    message: str
    target_email: str
    delivery_status: Optional[str] = None
    delivery_channel: Optional[str] = None
    created_at: datetime

class ContactInfoResponse(BaseModel):
    email: str
    project_name: str
    version: str
    support_sla: str
    channels: Dict[str, str]

