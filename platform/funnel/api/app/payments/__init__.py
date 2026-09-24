"""Payment rail adapter — PAYMENT_RAIL=razorpay|mock."""

from __future__ import annotations

from app.config import get_settings
from app.payments.base import PaymentRail, RailError
from app.payments.mock import MockRail
from app.payments.razorpay import RazorpayRail


def get_rail() -> PaymentRail:
    rail = get_settings().payment_rail.lower()
    if rail == "razorpay":
        return RazorpayRail()
    return MockRail()


__all__ = ["get_rail", "PaymentRail", "RailError", "MockRail", "RazorpayRail"]
