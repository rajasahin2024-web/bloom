"""Razorpay webhook receiver — signature-verified payment.captured -> paid."""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter, HTTPException, Request, status

from app import capi, catalog, store
from app.payments.razorpay import verify_webhook_signature
from app.routers.orders import purchase_event_id

log = logging.getLogger("funnel.webhooks")

router = APIRouter(prefix="/api/funnel", tags=["funnel-webhooks"])


@router.post("/webhooks/razorpay")
async def razorpay_webhook(request: Request) -> dict[str, str]:
    raw = await request.body()
    sig = request.headers.get("x-razorpay-signature")
    if not verify_webhook_signature(raw, sig):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "bad signature")

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "invalid json") from None

    event = payload.get("event")
    test_mode = request.headers.get("x-razorpay-test") == "true"
    log.info("razorpay webhook event=%s test=%s", event, test_mode)

    if event not in ("payment.captured", "payment.failed"):
        return {"status": "ignored"}

    entity = (payload.get("payload") or {}).get("payment", {}).get("entity") or {}
    rz_order_id = entity.get("order_id")
    amount_paise = entity.get("amount")
    if not rz_order_id:
        return {"status": "ignored"}

    payment = store.get_payment_by_rail_ref(rz_order_id)
    if not payment:
        log.warning("razorpay webhook: unknown order %s", rz_order_id)
        return {"status": "unknown_order"}

    # Every rail-reported attempt is persisted so the day-18 UPI success-rate
    # metric (captured / attempts) is computable. Idempotent on the razorpay
    # payment id; a failed attempt leaves the payment 'created' for retry.
    store.record_attempt(
        payment_id=payment["id"],
        order_id=payment["order_id"],
        rail="razorpay",
        status="captured" if event == "payment.captured" else "failed",
        rail_payment_id=entity.get("id"),
        method=entity.get("method"),
        amount_paise=int(amount_paise) if amount_paise is not None else None,
        error_code=entity.get("error_code"),
        error_reason=entity.get("error_description"),
    )

    if event == "payment.failed":
        return {"status": "attempt_failed"}

    if payment["status"] == "paid":
        return {"status": "already_paid"}  # idempotent: webhook retries safe

    add = [dict(catalog.UPSELL)] if payment["kind"] == "upsell" else None
    order = store.mark_payment_paid(payment["id"], add_items=add)
    capi.send_event(
        "Purchase",
        event_id=purchase_event_id(order["id"], payment["kind"]),
        email=order["email"],
        value_paise=int(amount_paise or payment["amount_paise"]),
        order_id=order["id"],
        client_ip=request.client.host if request.client else None,
        client_ua=request.headers.get("user-agent"),
    )
    return {"status": "paid"}
