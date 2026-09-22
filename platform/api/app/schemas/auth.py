"""Auth request/response schemas."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import OtpChannel, UserRole


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=200)
    phone: str | None = Field(default=None, max_length=32)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RefreshIn(BaseModel):
    refresh_token: str = Field(min_length=1)


class LogoutIn(BaseModel):
    refresh_token: str = Field(min_length=1)


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # access-token lifetime, seconds


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    phone: str | None
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime


class RegisterOut(BaseModel):
    user: UserOut
    tokens: TokenPair


class OtpRequestIn(BaseModel):
    channel: OtpChannel
    destination: str = Field(min_length=3, max_length=320)
    purpose: str = Field(default="login", max_length=50, pattern=r"^[a-z0-9_-]+$")


class OtpRequestOut(BaseModel):
    sent: bool
    ttl_seconds: int
    # Only populated when OTP_DEV_ECHO is on (local dev / tests).
    dev_code: str | None = None


class OtpVerifyIn(BaseModel):
    channel: OtpChannel
    destination: str = Field(min_length=3, max_length=320)
    code: str = Field(min_length=4, max_length=10, pattern=r"^\d+$")
    purpose: str = Field(default="login", max_length=50, pattern=r"^[a-z0-9_-]+$")


class OtpVerifyOut(BaseModel):
    verified: bool
