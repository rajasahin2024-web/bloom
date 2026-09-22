"""WAISE.in WhatsApp alert adapter — the integration point for TEC-64.

Contract kept deliberately identical to the prototype's webhook stub
(`FMAHTML/contact.html`, `bloom-sitecms.js`): a POST of
`{event, to, message, enquiry, sentAt}` to the configured webhook URL.

`get_enquiry_notifier` is a FastAPI dependency — tests override it with a spy,
and TEC-64 swaps in the real WAISE client without touching the endpoint.
"""

from __future__ import annotations

import json
import logging
import urllib.request
from datetime import UTC, datetime
from typing import Any, Protocol

from app.core.config import get_settings
from app.models.enquiry import Enquiry

logger = logging.getLogger(__name__)


class EnquiryNotifier(Protocol):
    """Adapter interface for enquiry → WhatsApp alerting."""

    def send_enquiry_alert(self, enquiry: Enquiry) -> None:
        """Raise on failure — the caller records alert_error."""
        ...


def build_alert_payload(enquiry: Enquiry, team_number: str) -> dict[str, Any]:
    """Prototype-compatible webhook payload."""
    message = (
        "New Bloom enquiry\n\n"
        f"Name: {enquiry.name}\n"
        f"Country: {enquiry.country or '—'}\n"
        f"Interested in: {enquiry.interest or '—'}\n"
        f"Current band: {enquiry.band or '—'} → target {enquiry.target or '—'}\n"
        f"Email: {enquiry.email}\n"
        f"Phone: {enquiry.phone or '—'}\n\n"
        f'"{enquiry.message or "No message"}"\n\n'
        f"Received {enquiry.created_at.isoformat() if enquiry.created_at else ''} "
        f"· ref {enquiry.ref}"
    )
    return {
        "event": "enquiry.created",
        "to": "".join(ch for ch in team_number if ch.isdigit()),
        "message": message,
        "enquiry": {
            "ref": enquiry.ref,
            "name": enquiry.name,
            "email": enquiry.email,
            "phone": enquiry.phone,
            "country": enquiry.country,
            "interest": enquiry.interest,
            "band": enquiry.band,
            "target": enquiry.target,
            "msg": enquiry.message,
        },
        "sentAt": datetime.now(UTC).isoformat(),
    }


class NullEnquiryNotifier:
    """Default when no webhook is configured — logs only. The enquiry is still
    stored; nothing is delivered until WAISE_WEBHOOK_URL is set."""

    def send_enquiry_alert(self, enquiry: Enquiry) -> None:
        logger.info("enquiry alert (no WAISE webhook configured): ref=%s", enquiry.ref)


class WaiseWebhookNotifier:
    """POSTs the alert payload to WAISE_WEBHOOK_URL (stdlib only, short timeout)."""

    def __init__(self, webhook_url: str, timeout: float, team_number: str) -> None:
        self._webhook_url = webhook_url
        self._timeout = timeout
        self._team_number = team_number

    def send_enquiry_alert(self, enquiry: Enquiry) -> None:
        payload = build_alert_payload(enquiry, self._team_number)
        body = json.dumps(payload).encode("utf-8")
        request = urllib.request.Request(
            self._webhook_url,
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=self._timeout) as response:
            if response.status >= 400:
                raise RuntimeError(f"WAISE webhook returned HTTP {response.status}")


def get_enquiry_notifier() -> EnquiryNotifier:
    """FastAPI dependency — picks the adapter from settings."""
    settings = get_settings()
    if settings.waise_webhook_url:
        return WaiseWebhookNotifier(
            webhook_url=settings.waise_webhook_url,
            timeout=settings.waise_webhook_timeout_seconds,
            team_number=settings.waise_team_number,
        )
    return NullEnquiryNotifier()
