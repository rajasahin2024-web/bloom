"""Meta Conversions API (CAPI) client.

Fires server-side events that mirror the browser pixel so Meta can dedup on
`event_id`. Until real creds exist, META_CAPI_DRY_RUN=1 (default) logs the
exact payload that WOULD be sent - the log line is the verification artifact.

Live mode: POST https://graph.facebook.com/v21.0/{PIXEL_ID}/events
"""

from __future__ import annotations

import hashlib
import json
import logging
import time
from typing import Any

import httpx

from app.config import get_settings

log = logging.getLogger("funnel.capi")

GRAPH_VERSION = "v21.0"


def _sha256(value: str) -> str:
    return hashlib.sha256(value.strip().lower().encode()).hexdigest()


def build_event(
    event_name: str,
    *,
    event_id: str | None,
    email: str,
    value_inr: float,
    order_id: str,
    currency: str = "INR",
    client_ip: str | None = None,
    client_ua: str | None = None,
    fbp: str | None = None,
    fbc: str | None = None,
) -> dict[str, Any]:
    user_data: dict[str, Any] = {"em": [_sha256(email)]}
    if client_ip:
        user_data["client_ip_address"] = client_ip
    if client_ua:
        user_data["client_user_agent"] = client_ua
    if fbp:
        user_data["fbp"] = fbp
    if fbc:
        user_data["fbc"] = fbc
    return {
        "event_name": event_name,
        "event_time": int(time.time()),
        "event_id": event_id,
        "action_source": "website",
        "user_data": user_data,
        "custom_data": {
            "value": round(value_inr, 2),
            "currency": currency,
            "content_type": "product",
            "order_id": order_id,
        },
    }


def send_event(
    event_name: str,
    *,
    event_id: str | None,
    email: str,
    value_paise: int,
    order_id: str,
    client_ip: str | None = None,
    client_ua: str | None = None,
    fbp: str | None = None,
    fbc: str | None = None,
) -> None:
    """Send one CAPI event. Never raises - funnel must not break on Meta."""
    settings = get_settings()
    event = build_event(
        event_name,
        event_id=event_id,
        email=email,
        value_inr=value_paise / 100.0,
        order_id=order_id,
        client_ip=client_ip,
        client_ua=client_ua,
        fbp=fbp,
        fbc=fbc,
    )
    payload: dict[str, Any] = {"data": [event]}
    if settings.meta_test_event_code:
        payload["test_event_code"] = settings.meta_test_event_code

    if settings.meta_capi_dry_run or not (
        settings.meta_pixel_id and settings.meta_capi_token
    ):
        log.info("CAPI_DRY_RUN %s", json.dumps(payload, sort_keys=True))
        return

    url = (
        f"https://graph.facebook.com/{GRAPH_VERSION}/{settings.meta_pixel_id}/events"
        f"?access_token={settings.meta_capi_token}"
    )
    try:
        resp = httpx.post(url, json=payload, timeout=5.0)
        if resp.status_code >= 400:
            log.warning("capi send failed status=%s body=%s", resp.status_code, resp.text[:500])
        else:
            log.info("capi sent event=%s event_id=%s", event_name, event_id)
    except Exception as exc:  # noqa: BLE001 - never break checkout on Meta
        log.warning("capi send error event=%s: %s", event_name, exc)
