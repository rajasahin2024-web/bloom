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
