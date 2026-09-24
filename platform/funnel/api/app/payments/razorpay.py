"""Razorpay rail — REST order create + webhook signature verification.

Docs: https://razorpay.com/docs/api/orders/  ·  webhooks are HMAC-SHA256 of
the RAW body with RAZORPAY_WEBHOOK_SECRET, sent as `X-Razorpay-Signature`.
Test mode uses rzp_test_* keys and adds `X-Razorpay-Test: true` on webhooks —
signature verification is identical, we just surface the flag in logs.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
from typing import Any

import httpx

from app.config import get_settings
from app.payments.base import RailError

log = logging.getLogger("funnel.razorpay")

API = "https://api.razorpay.com/v1"


class RazorpayRail:
    name = "razorpay"

    def __init__(self) -> None:
        self.settings = get_settings()

    def create_checkout(
        self, *, order: dict[str, Any], payment: dict[str, Any], base_url: str
    ) -> dict[str, Any]:
        s = self.settings
        if not (s.razorpay_key_id and s.razorpay_key_secret):
            raise RailError("razorpay keys not configured (RAZORPAY_KEY_ID/SECRET)")
        body = {
            "amount": payment["amount_paise"],
            "currency": "INR",
            "receipt": payment["id"],
            "notes": {
                "order_id": order["id"],
                "payment_id": payment["id"],
                "kind": payment["kind"],
                "email": order["email"],
            },
        }
        try:
            resp = httpx.post(
                f"{API}/orders",
                json=body,
                auth=(s.razorpay_key_id, s.razorpay_key_secret),
                timeout=10.0,
            )
        except Exception as exc:  # noqa: BLE001
            raise RailError(f"razorpay unreachable: {exc}") from exc
        if resp.status_code >= 400:
            log.warning("razorpay order create failed %s: %s", resp.status_code, resp.text[:300])
            raise RailError(f"razorpay error {resp.status_code}")
        rz_order = resp.json()
        return {
            "rail_ref": rz_order["id"],
            "razorpay": {"order_id": rz_order["id"], "key_id": s.razorpay_key_id},
        }


def verify_webhook_signature(raw_body: bytes, signature: str | None) -> bool:
    """HMAC-SHA256(webhook_secret, raw_body) == X-Razorpay-Signature."""
    s = get_settings()
    if not s.razorpay_webhook_secret or not signature:
        return False
    expected = hmac.new(
        s.razorpay_webhook_secret.encode(), raw_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
