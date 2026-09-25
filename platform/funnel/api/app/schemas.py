"""Request/response schemas - validate at the edge."""

from __future__ import annotations

import re
from typing import Any

from pydantic import BaseModel, Field, field_validator

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class CreateOrderRequest(BaseModel):
    email: str
    bump: bool = False
    event_id: str | None = None
    utm: dict[str, Any] | None = None
    # Optional Meta browser identifiers - improve CAPI match quality.
    fbp: str | None = None
    fbc: str | None = None

    @field_validator("email")
    @classmethod
    def _valid_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not EMAIL_RE.match(v):
            raise ValueError("valid email required")
        return v


class UpsellRequest(BaseModel):
    event_id: str | None = None
    fbp: str | None = None
    fbc: str | None = None


class MockSettleRequest(BaseModel):
    payment_id: str | None = None


class OrderResponse(BaseModel):
    order_id: str
    amount_paise: int
    currency: str = "INR"
    rail: str
    razorpay: dict[str, Any] | None = None
    mock: dict[str, Any] | None = None


class OrderStatusResponse(BaseModel):
    id: str
    status: str
    email: str
    items: list[dict[str, Any]]
    utm: dict[str, Any] | None = None
    created_at: str
    paid_at: str | None = None
    payments: list[dict[str, Any]] = Field(default_factory=list)


# ---------- Gated delivery area (TEC-121) ----------


class BuyerLoginRequest(BaseModel):
    email: str
    order_id: str

    @field_validator("email")
    @classmethod
    def _valid_buyer_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not EMAIL_RE.match(v):
            raise ValueError("valid email required")
        return v

    @field_validator("order_id")
    @classmethod
    def _valid_order_id(cls, v: str) -> str:
        v = v.strip()
        if not v or len(v) > 64:
            raise ValueError("order_id required")
        return v


class Entitlements(BaseModel):
    course: bool
    prompt_library: bool
    second_course: bool


class LoginResponse(BaseModel):
    token: str
    expires_at: str
    order_id: str
    email: str
    entitlements: Entitlements
    course: dict[str, Any]


class QuizSubmitRequest(BaseModel):
    answers: dict[str, str] = Field(default_factory=dict)


class CertificateRequest(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def _valid_name(cls, v: str) -> str:
        v = " ".join(v.split())
        if not (2 <= len(v) <= 80):
            raise ValueError("name must be 2-80 characters")
        return v
