"""Mail provisioning adapter — contract client for TEC-184.

Implements the frozen contract in `contracts/mail-provisioning.yaml`: the
platform-facing operations (`check_username`, `create_mailbox`, `suspend`,
`unsuspend`, `reset_password`, `set_quota`, `list_mailboxes`), the closed error
taxonomy, and the bearer-auth transport.

Adapter rule (arch doc §12): modules call `mail_api.*`, never raw HTTP. The
only provider-specific code lives here — `StalwartProvisioner` maps each
contract operation onto Stalwart's management REST API (`/api/principal`
CRUD); swapping the mail engine means swapping this file.

Config via env (`MAIL_API_URL`, `MAIL_API_TOKEN` from the secrets store) —
never hardcoded, never logged. When `MAIL_API_URL` is unset the factory
returns `NullProvisioner`, which fails every call as `unavailable` so signup
queueing still works and admins see the real state.

`transport` is injectable for tests:
`transport(method, url, headers, body) -> (status, parsed_json, headers)`.
The default uses stdlib urllib like the WAISE adapter — no new dependency.
"""

from __future__ import annotations

import json
import logging
import re
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any, NoReturn, Protocol

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# ── Localpart rules — keep in lockstep with contracts/mail-provisioning.yaml ──
LOCALPART_RE = re.compile(r"^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$")
RESERVED_LOCALPARTS = frozenset(
    {
        "postmaster",
        "abuse",
        "hostmaster",
        "webmaster",
        "root",
        "admin",
        "administrator",
        "mailer-daemon",
        "noreply",
        "no-reply",
        "dmarc",
        "security",
        "support",
    }
)


def normalize_localpart(raw: str) -> str:
    """Canonical form: stripped + lowercased (comparison is case-insensitive)."""
    return raw.strip().lower()


def localpart_error(raw: str) -> str | None:
    """None if valid, else the contract reason ('invalid' | 'reserved').

    Normalizes internally — callers can pass raw user input.
    """
    localpart = normalize_localpart(raw)
    if not LOCALPART_RE.match(localpart) or ".." in localpart:
        return "invalid"
    if localpart in RESERVED_LOCALPARTS:
        return "reserved"
    return None


# ── Error taxonomy (contract §Errors) ─────────────────────────────────────────


class MailError(Exception):
    """Base provisioning error — `code` is the contract taxonomy value."""

    code = "unavailable"
    retryable = True
    retry_after: float | None = None

    def __init__(self, message: str, retry_after: float | None = None) -> None:
        super().__init__(message)
        self.retry_after = retry_after


class MailUnavailableError(MailError):
    code = "unavailable"
    retryable = True


class MailRateLimitedError(MailError):
    code = "rate_limited"
    retryable = True


class MailInvalidLocalpartError(MailError):
    code = "invalid_localpart"
    retryable = False


class MailConflictError(MailError):
    code = "conflict"
    retryable = False


class MailNotFoundError(MailError):
    code = "not_found"
    retryable = False


class MailUnauthorizedError(MailError):
    code = "unauthorized"
    retryable = False


class MailInvalidRequestError(MailError):
    code = "invalid_request"
    retryable = False


_STATUS_MAP: dict[int, type[MailError]] = {
    400: MailInvalidRequestError,
    401: MailUnauthorizedError,
    403: MailUnauthorizedError,
    404: MailNotFoundError,
    409: MailConflictError,
    422: MailInvalidLocalpartError,
}


# ── Return shapes ──────────────────────────────────────────────────────────────


@dataclass
class MailboxInfo:
    localpart: str
    address: str
    status: str  # "active" | "suspended" (provider-side vocabulary)
    quota_mb: int


@dataclass
class MailboxPage:
    items: list[MailboxInfo] = field(default_factory=list)
    total: int = 0


# ── Protocol ──────────────────────────────────────────────────────────────────


class MailProvisioner(Protocol):
    """The contract surface the platform consumes (mail_api.* only)."""

    def check_username(self, localpart: str) -> bool:
        """True if the localpart is free to provision."""
        ...

    def create_mailbox(
        self,
        localpart: str,
        secret: str,
        quota_mb: int,
        display_name: str | None = None,
    ) -> MailboxInfo:
        """Idempotent on localpart — replay returns the stored mailbox."""
        ...

    def suspend(self, localpart: str) -> MailboxInfo: ...

    def unsuspend(self, localpart: str) -> MailboxInfo: ...

    def reset_password(self, localpart: str, secret: str) -> MailboxInfo: ...

    def set_quota(self, localpart: str, quota_mb: int) -> MailboxInfo: ...

    def list_mailboxes(self, page: int, limit: int) -> MailboxPage: ...


Transport = Callable[[str, str, dict[str, str], Any], tuple[int, Any, dict[str, str]]]


def _urllib_transport(timeout: float) -> Transport:
    def call(
        method: str, url: str, headers: dict[str, str], body: Any
    ) -> tuple[int, Any, dict[str, str]]:
        data = json.dumps(body).encode("utf-8") if body is not None else None
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw = resp.read()
                parsed = json.loads(raw) if raw else None
                return resp.status, parsed, dict(resp.headers.items())
        except urllib.error.HTTPError as exc:
            raw = exc.read()
            try:
                parsed = json.loads(raw) if raw else None
            except json.JSONDecodeError:
                parsed = None
            return exc.code, parsed, dict(exc.headers.items() if exc.headers else {})
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            raise MailUnavailableError(f"mail API unreachable: {exc!r}") from exc

    return call


class StalwartProvisioner:
    """Contract operations over Stalwart's /api/principal management API."""

    # Suspension = disabled permissions that override every role (contract):
    # blocks sign-in and send; inbound delivery continues so mail isn't lost.
    _SUSPENDED_PERMS = ("authenticate", "emailSend")

    def __init__(
        self,
        base_url: str,
        token: str,
        domain: str,
        timeout: float,
        transport: Transport | None = None,
    ) -> None:
        self._base = base_url.rstrip("/")
        self._token = token
        self._domain = domain
        self._call = transport or _urllib_transport(timeout)

    def _address(self, localpart: str) -> str:
        return f"{localpart}@{self._domain}"

    def _request(self, method: str, path: str, body: Any = None) -> Any:
        url = f"{self._base}{path}"
        headers = {
            "Authorization": f"Bearer {self._token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        status, parsed, resp_headers = self._call(method, url, headers, body)
        if status == 429:
            retry_after = None
            raw = resp_headers.get("Retry-After") or resp_headers.get("retry-after")
            if raw:
                try:
                    retry_after = float(raw)
                except ValueError:
                    retry_after = None
            raise MailRateLimitedError("mail API rate limited", retry_after=retry_after)
        if status >= 500:
            raise MailUnavailableError(f"mail API HTTP {status}")
        if status >= 400:
            err_cls = _STATUS_MAP.get(status, MailInvalidRequestError)
            detail = ""
            if isinstance(parsed, dict):
                detail = str(parsed.get("detail") or parsed.get("title") or "")
            raise err_cls(detail or f"mail API HTTP {status}")
        return parsed

    def _fetch(self, address: str) -> MailboxInfo:
        parsed = self._request("GET", f"/api/principal/{address}")
        data = parsed.get("data", {}) if isinstance(parsed, dict) else {}
        disabled = data.get("disabledPermissions") or []
        suspended = "authenticate" in disabled
        localpart = address.split("@", 1)[0]
        return MailboxInfo(
            localpart=localpart,
            address=address,
            status="suspended" if suspended else "active",
            quota_mb=int(data.get("quota") or 0) // 1_048_576,
        )

    # ── contract operations ────────────────────────────────────────────────

    def check_username(self, localpart: str) -> bool:
        try:
            self._request("GET", f"/api/principal/{self._address(localpart)}")
        except MailNotFoundError:
            return True
        return False

    def create_mailbox(
        self,
        localpart: str,
        secret: str,
        quota_mb: int,
        display_name: str | None = None,
    ) -> MailboxInfo:
        address = self._address(localpart)
        payload = {
            "type": "individual",
            "name": address,
            "description": display_name or "",
            "secrets": [secret],
            "emails": [address],
            "quota": quota_mb * 1_048_576,
            "urls": [],
            "memberOf": [],
            "roles": ["user"],
            "lists": [],
            "members": [],
            "enabledPermissions": [],
            "disabledPermissions": [],
            "externalMembers": [],
        }
        try:
            self._request("POST", "/api/principal", payload)
        except MailConflictError:
            # Idempotent-on-localpart: a replay sees the stored mailbox.
            logger.info("create_mailbox conflict for %s — verifying existing", address)
            return self._fetch(address)
        logger.info("create_mailbox ok: %s", address)
        return MailboxInfo(localpart, address, "active", quota_mb)

    def _set_suspension(self, localpart: str, suspended: bool) -> MailboxInfo:
        address = self._address(localpart)
        action = "addItem" if suspended else "removeItem"
        ops = [
            {"action": action, "field": "disabledPermissions", "value": perm}
            for perm in self._SUSPENDED_PERMS
        ]
        self._request("PATCH", f"/api/principal/{address}", ops)
        return self._fetch(address)

    def suspend(self, localpart: str) -> MailboxInfo:
        return self._set_suspension(localpart, True)

    def unsuspend(self, localpart: str) -> MailboxInfo:
        return self._set_suspension(localpart, False)

    def reset_password(self, localpart: str, secret: str) -> MailboxInfo:
        address = self._address(localpart)
        self._request(
            "PATCH",
            f"/api/principal/{address}",
            [{"action": "set", "field": "secrets", "value": secret}],
        )
        return self._fetch(address)

    def set_quota(self, localpart: str, quota_mb: int) -> MailboxInfo:
        address = self._address(localpart)
        self._request(
            "PATCH",
            f"/api/principal/{address}",
            [{"action": "set", "field": "quota", "value": quota_mb * 1_048_576}],
        )
        return self._fetch(address)

    def list_mailboxes(self, page: int, limit: int) -> MailboxPage:
        parsed = self._request(
            "GET", f"/api/principal?types=individual&page={page}&limit={limit}"
        )
        data = parsed.get("data", {}) if isinstance(parsed, dict) else {}
        items: list[MailboxInfo] = []
        suffix = f"@{self._domain}"
        for raw in data.get("items") or []:
            if not isinstance(raw, dict):
                continue
            name = str(raw.get("name", ""))
            if not name.endswith(suffix):
                continue
            disabled = raw.get("disabledPermissions") or []
            items.append(
                MailboxInfo(
                    localpart=name[: -len(suffix)],
                    address=name,
                    status="suspended" if "authenticate" in disabled else "active",
                    quota_mb=int(raw.get("quota") or 0) // 1_048_576,
                )
            )
        return MailboxPage(items=items, total=int(data.get("total") or 0))


class NullProvisioner:
    """Used when MAIL_API_URL is unset — every call reports `unavailable`.

    Signup still succeeds and the mirror row stays `pending`/`queued` so the
    queue delivers once provisioning is configured; admins see real state.
    """

    def _unconfigured(self) -> NoReturn:
        raise MailUnavailableError("mail provisioning API is not configured")

    def check_username(self, localpart: str) -> bool:
        self._unconfigured()

    def create_mailbox(
        self,
        localpart: str,
        secret: str,
        quota_mb: int,
        display_name: str | None = None,
    ) -> MailboxInfo:
        self._unconfigured()

    def suspend(self, localpart: str) -> MailboxInfo:
        self._unconfigured()

    def unsuspend(self, localpart: str) -> MailboxInfo:
        self._unconfigured()

    def reset_password(self, localpart: str, secret: str) -> MailboxInfo:
        self._unconfigured()

    def set_quota(self, localpart: str, quota_mb: int) -> MailboxInfo:
        self._unconfigured()

    def list_mailboxes(self, page: int, limit: int) -> MailboxPage:
        self._unconfigured()



# Transport is HTTPS-only per contract; plain http is accepted only for
# loopback targets (tests/dev) so a misconfigured URL can never leak the
# bearer token onto the network in cleartext (Security gate C1).
_LOOPBACK_HOSTS = {"localhost", "127.0.0.1", "::1", "0.0.0.0"}


def _mail_url_allowed(url: str) -> bool:
    parsed = urllib.parse.urlparse(url)
    scheme = parsed.scheme.lower()
    if scheme == "https":
        return True
    return scheme == "http" and (parsed.hostname or "").lower() in _LOOPBACK_HOSTS


def _build_provisioner() -> MailProvisioner:
    settings = get_settings()
    if settings.mail_api_url:
        if not _mail_url_allowed(settings.mail_api_url):
            logger.error(
                "MAIL_API_URL must be https (loopback http allowed for "
                "dev/tests) — refusing to send the token over plaintext: %s",
                urllib.parse.urlparse(settings.mail_api_url).netloc,
            )
            return NullProvisioner()  # fail closed
        return StalwartProvisioner(
            base_url=settings.mail_api_url,
            token=settings.mail_api_token or "",
            domain=settings.mail_domain,
            timeout=settings.mail_api_timeout_seconds,
        )
    return NullProvisioner()


def get_mail_provisioner() -> MailProvisioner:
    """FastAPI dependency — picks the adapter from settings (tests override)."""
    return _build_provisioner()
