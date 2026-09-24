"""HMAC-signed, time-limited download tokens for purchased assets."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time

from app.config import get_settings


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _unb64(data: str) -> bytes:
    pad = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + pad)


def sign_download(order_id: str, rel_path: str, ttl_seconds: int | None = None) -> tuple[str, int]:
    """Return (token, expires_at_epoch)."""
    settings = get_settings()
    ttl = ttl_seconds or settings.download_url_ttl_seconds
    exp = int(time.time()) + ttl
    payload = _b64(
        json.dumps({"oid": order_id, "path": rel_path, "exp": exp},
                   separators=(",", ":")).encode()
    )
    sig = hmac.new(settings.signing_secret.encode(), payload.encode(),
                   hashlib.sha256).hexdigest()
    return f"{payload}.{sig}", exp


def verify_download(token: str, order_id: str) -> str | None:
    """Return the asset rel_path if the token is valid for order_id, else None."""
    try:
        payload_b64, sig = token.rsplit(".", 1)
    except ValueError:
        return None
    settings = get_settings()
    expected = hmac.new(settings.signing_secret.encode(), payload_b64.encode(),
                        hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected):
        return None
    try:
        payload = json.loads(_unb64(payload_b64))
    except Exception:  # noqa: BLE001
        return None
    if payload.get("oid") != order_id:
        return None
    if int(payload.get("exp", 0)) < int(time.time()):
        return None
    return payload.get("path")
