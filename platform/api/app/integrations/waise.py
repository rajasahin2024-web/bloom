"""WAISE.in WhatsApp alert adapter — the integration point for TEC-64.

Contract kept deliberately identical to the prototype's webhook stubs
(`prototype/contact.html`, `prototype/careers.html`): a POST of
`{event, to, message, enquiry|application, sentAt}` to the configured
webhook URL.

The `get_*_notifier` functions are FastAPI dependencies — tests override
them with spies, and TEC-64 swaps in the real WAISE client without touching
the endpoints.
"""

from __future__ import annotations

import json
import logging
import urllib.request
from datetime import UTC, datetime
from typing import Any, Protocol

from app.core.config import get_settings
from app.models.application import Application
from app.models.enquiry import Enquiry

logger = logging.getLogger(__name__)


class EnquiryNotifier(Protocol):
    """Adapter interface for enquiry → WhatsApp alerting."""

    def send_enquiry_alert(self, enquiry: Enquiry) -> None:
        """Raise on failure — the caller records alert_error."""
        ...


class ApplicationNotifier(Protocol):
    """Adapter interface for job application → WhatsApp alerting."""

    def send_application_alert(self, application: Application) -> None:
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


def build_application_alert_payload(
    application: Application, team_number: str
) -> dict[str, Any]:
    """Prototype-compatible webhook payload (careers.html `apTemplate`)."""
    cv_line = f"CV: {application.cv}\n" if application.cv else ""
    message = (
        "New job application — Bloom\n\n"
        f"Role: {application.role_title or 'Speculative application'}\n"
        f"Name: {application.name}\n"
        f"Country: {application.country or '—'}\n"
        f"Experience: {application.years or 0} years\n"
        f"Examiner status: {application.examiner or '—'}\n"
        f"Can teach from: {application.office_name or application.office or '—'}\n"
        f"Email: {application.email}\n"
        f"Phone: {application.phone or '—'}\n"
        f"{cv_line}"
        f'\n"{application.note or ""}"\n\n'
        f"Received {application.created_at.date().isoformat() if application.created_at else ''} "
        f"· ref {application.ref}"
    )
    return {
        "event": "application.created",
        "to": "".join(ch for ch in team_number if ch.isdigit()),
        "message": message,
        "application": {
            "ref": application.ref,
            "name": application.name,
            "email": application.email,
            "phone": application.phone,
            "country": application.country,
            "vacancy": application.vacancy,
            "roleTitle": application.role_title,
            "years": application.years,
            "examiner": application.examiner,
            "office": application.office,
            "officeName": application.office_name,
            "cv": application.cv,
            "note": application.note,
            "stage": application.stage.value if application.stage else None,
        },
        "sentAt": datetime.now(UTC).isoformat(),
    }


class NullNotifier:
    """Default when no webhook is configured — logs only. Records are still
    stored; nothing is delivered until WAISE_WEBHOOK_URL is set."""

    def send_enquiry_alert(self, enquiry: Enquiry) -> None:
        logger.info("enquiry alert (no WAISE webhook configured): ref=%s", enquiry.ref)

    def send_application_alert(self, application: Application) -> None:
        logger.info(
            "application alert (no WAISE webhook configured): ref=%s", application.ref
        )


class WaiseWebhookNotifier:
    """POSTs alert payloads to WAISE_WEBHOOK_URL (stdlib only, short timeout)."""

    def __init__(self, webhook_url: str, timeout: float, team_number: str) -> None:
        self._webhook_url = webhook_url
        self._timeout = timeout
        self._team_number = team_number

    def _post(self, payload: dict[str, Any]) -> None:
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

    def send_enquiry_alert(self, enquiry: Enquiry) -> None:
        self._post(build_alert_payload(enquiry, self._team_number))

    def send_application_alert(self, application: Application) -> None:
        self._post(build_application_alert_payload(application, self._team_number))


def _build_notifier() -> NullNotifier | WaiseWebhookNotifier:
    settings = get_settings()
    if settings.waise_webhook_url:
        return WaiseWebhookNotifier(
            webhook_url=settings.waise_webhook_url,
            timeout=settings.waise_webhook_timeout_seconds,
            team_number=settings.waise_team_number,
        )
    return NullNotifier()


def get_enquiry_notifier() -> EnquiryNotifier:
    """FastAPI dependency — picks the adapter from settings."""
    return _build_notifier()


def get_application_notifier() -> ApplicationNotifier:
    """FastAPI dependency — picks the adapter from settings."""
    return _build_notifier()
