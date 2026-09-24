"""Funnel orders router — checkout create, mock settle, upsell, downloads."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Request, status

from app import capi, catalog, signing, store
from app.config import get_settings
from app.payments import RailError, get_rail
from app.schemas import (
    CreateOrderRequest,
    MockSettleRequest,
    OrderResponse,
    OrderStatusResponse,
    UpsellRequest,
)

log = logging.getLogger("funnel.orders")

router = APIRouter(prefix="/api/funnel", tags=["funnel"])


def purchase_event_id(order_id: str, kind: str) -> str:
    """Shared pixel/CAPI dedup id — mirrors web/public/assets/funnel.js."""
    return f"purchase_{order_id}" + ("_upsell" if kind == "upsell" else "")


def _client_ctx(request: Request) -> dict[str, str | None]:
    fwd = request.headers.get("x-forwarded-for")
    return {
        "client_ip": (fwd.split(",")[0].strip() if fwd else None)
        or (request.client.host if request.client else None),
        "client_ua": request.headers.get("user-agent"),
    }


def _base_url(request: Request) -> str:
    configured = get_settings().base_url.rstrip("/")
    return configured or str(request.base_url).rstrip("/")


def _checkout_response(
    *, order: dict[str, Any], payment: dict[str, Any], base_url: str
) -> OrderResponse:
    rail = get_rail()
    try:
        extras = rail.create_checkout(order=order, payment=payment, base_url=base_url)
    except RailError as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)) from exc
    if extras.get("rail_ref"):
        store.set_payment_rail_ref(payment["id"], extras["rail_ref"])
    return OrderResponse(
        order_id=order["id"],
        amount_paise=payment["amount_paise"],
        currency="INR",
        rail=rail.name,
        razorpay=extras.get("razorpay"),
        mock=extras.get("mock"),
    )


def _payments_summary(order_id: str) -> list[dict[str, Any]]:
    return [
        {k: p[k] for k in ("id", "kind", "amount_paise", "currency", "status", "paid_at")}
        for p in store.get_payments(order_id)
    ]


def _fire_purchase(order: dict[str, Any], payment: dict[str, Any],
                   amount_paise: int, ctx: dict[str, str | None]) -> None:
    capi.send_event(
        "Purchase",
        event_id=purchase_event_id(order["id"], payment["kind"]),
        email=order["email"],
        value_paise=amount_paise,
        order_id=order["id"],
        **ctx,
    )


@router.post("/orders", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(body: CreateOrderRequest, request: Request) -> OrderResponse:
    items = catalog.base_items(body.bump)
    amount = sum(i["amount_paise"] for i in items)
    order, payment = store.create_order(
        email=body.email,
        items=items,
        event_id=body.event_id,
        utm=body.utm,
        payment_kind="base",
        amount_paise=amount,
        rail=get_rail().name,
    )
    resp = _checkout_response(order=order, payment=payment, base_url=_base_url(request))
    capi.send_event(
        "InitiateCheckout",
        event_id=payment.get("event_id"),
        email=order["email"],
        value_paise=payment["amount_paise"],
        order_id=order["id"],
        fbp=body.fbp,
        fbc=body.fbc,
        **_client_ctx(request),
    )
    return resp


@router.get("/orders/{order_id}", response_model=OrderStatusResponse)
def get_order(order_id: str) -> OrderStatusResponse:
    order = store.get_order(order_id)
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "order not found")
    return OrderStatusResponse(**order, payments=_payments_summary(order_id))


@router.post("/orders/{order_id}/mock-settle", response_model=OrderStatusResponse)
def mock_settle(order_id: str, request: Request,
                body: MockSettleRequest | None = None,
                payment_id: str | None = None) -> OrderStatusResponse:
    """Mock rail only — marks the pending payment paid, fires CAPI Purchase."""
    if get_rail().name != "mock":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "mock rail not enabled")
    pid = payment_id or (body.payment_id if body else None)
    payment = store.pending_payment(order_id, pid)
    if not payment:
        if not store.get_order(order_id):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "order not found")
        raise HTTPException(status.HTTP_409_CONFLICT, "no pending payment")
    add = [dict(catalog.UPSELL)] if payment["kind"] == "upsell" else None
    order = store.mark_payment_paid(payment["id"], add_items=add)
    _fire_purchase(order, payment, payment["amount_paise"], _client_ctx(request))
    return OrderStatusResponse(**order, payments=_payments_summary(order_id))


@router.post("/orders/{order_id}/upsell", response_model=OrderResponse)
def create_upsell(order_id: str, body: UpsellRequest, request: Request) -> OrderResponse:
    order = store.get_order(order_id)
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "order not found")
    if order["status"] != "paid":
        raise HTTPException(status.HTTP_409_CONFLICT, "base order not paid yet")
    payment, created = store.create_upsell_payment(
        order_id=order_id, amount_paise=catalog.UPSELL["amount_paise"],
        rail=get_rail().name, event_id=body.event_id,
    )
    resp = _checkout_response(order=order, payment=payment, base_url=_base_url(request))
    if created:
        capi.send_event(
            "InitiateCheckout",
            event_id=payment.get("event_id"),
            email=order["email"],
            value_paise=payment["amount_paise"],
            order_id=order["id"],
            fbp=body.fbp,
            fbc=body.fbc,
            **_client_ctx(request),
        )
    return resp


@router.get("/orders/{order_id}/downloads")
def get_downloads(order_id: str, request: Request) -> dict[str, Any]:
    order = store.get_order(order_id)
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "order not found")
    if order["status"] != "paid":
        raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED, "order not paid")
    paid_skus = {i["sku"] for i in order["items"]}
    assets_dir = Path(get_settings().assets_dir)
    base = _base_url(request)
    downloads = []
    for sku in sorted(paid_skus):
        for rel in catalog.assets_for_sku(assets_dir, sku):
            token, exp = signing.sign_download(order_id, rel)
            downloads.append({
                "sku": sku,
                "file": Path(rel).name,
                "url": f"{base}/api/funnel/assets/{order_id}/{token}",
                "expires_at": exp,
            })
    return {"order_id": order_id, "downloads": downloads}
