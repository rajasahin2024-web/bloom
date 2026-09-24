"""Admin endpoints — buyers.csv export (the buyer email list deliverable)."""

from __future__ import annotations

import csv
import hashlib
import hmac
import io

from fastapi import APIRouter, HTTPException, Query, Request, status
from fastapi.responses import PlainTextResponse

from app import store
from app.config import get_settings

router = APIRouter(prefix="/api/funnel", tags=["funnel-admin"])


def _authorized(request: Request, token: str | None) -> bool:
    expected = get_settings().admin_token
    if not expected:
        return False
    auth = request.headers.get("authorization", "")
    provided = token or (auth[7:] if auth.lower().startswith("bearer ") else "")
    return bool(provided) and hmac.compare_digest(
        hashlib.sha256(provided.encode()).digest(),
        hashlib.sha256(expected.encode()).digest(),
    )


@router.get("/payment-stats")
def payment_stats(request: Request, token: str | None = Query(default=None)) -> dict:
    """Attempt-level payment metrics — feeds the day-18 UPI success-rate check."""
    if not _authorized(request, token):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "admin token required")
    return store.payment_stats()


@router.get("/buyers.csv")
def buyers_csv(request: Request, token: str | None = Query(default=None)) -> PlainTextResponse:
    if not _authorized(request, token):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "admin token required")
    orders = store.list_paid_orders()
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["email", "items", "amount_paise", "paid_at"])
    for o in orders:
        paid = [p for p in store.get_payments(o["id"]) if p["status"] == "paid"]
        w.writerow([
            o["email"],
            "|".join(i["sku"] for i in o["items"]),
            sum(p["amount_paise"] for p in paid),
            o["paid_at"],
        ])
    return PlainTextResponse(
        buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=buyers.csv"},
    )
