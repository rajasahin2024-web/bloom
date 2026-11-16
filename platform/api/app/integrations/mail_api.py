"""Mail provisioning adapter — contract client for TEC-184.

Implements the frozen contract in `contracts/mail-provisioning.yaml`: the
platform-facing operations (`check_username`, `create_mailbox`, `suspend`,
`unsuspend`, `reset_password`, `set_quota`, `list_mailboxes`), the closed error
taxonomy, and the bearer-auth transport.

Adapter rule (arch doc §12): modules call `mail_api.*`, never raw HTTP. The
only provider-specific code lives here — `StalwartProvisioner` maps each
contract operation onto Stalwart's JMAP management surface
(`POST /jmap/`, `urn:stalwart:jmap` — `x:Account/*`, `x:Domain/*`,
`x:QueuedMessage/*`); swapping the mail engine means swapping this file.

Provider floor: **Stalwart ≥0.16** (TEC-191/TEC-192). v0.16 removed the legacy
`/api/*` management REST surface entirely; management is JMAP method calls
under the same bearer token. Management objects use Stalwart's object encoding
(lists/sets are JSON objects keyed by index/`true`, unions carry `@type`).

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
from datetime import UTC, datetime
from typing import Any, NoReturn, Protocol, cast

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


# ── Engine-admin return shapes (contracts/mail-admin.yaml, TEC-188) ───────────


@dataclass
class QueueMessage:
    """One deferred queue entry (`x:QueuedMessage` on the JMAP surface)."""

    id: str
    return_path: str | None
    size: int | None
    created: str | None
    status: str | None
    next_retry: str | None
    recipients: int | None
    in_flight: bool  # True when the engine is actively delivering it


@dataclass
class QueueSnapshot:
    items: list[QueueMessage] = field(default_factory=list)
    total: int = 0
    active: int = 0
    deferred: int = 0


@dataclass
class DnsRecord:
    """Expected record parsed from the domain's `dnsZoneFile`."""

    type: str
    name: str
    content: str


@dataclass
class DeliveryItem:
    """Metadata-only delivery row — subject/folder are engine metadata,
    never message body (approved inspector scope on TEC-188)."""

    id: str
    direction: str | None  # "inbound" | "outbound"
    sender: str | None
    to: list[str] = field(default_factory=list)
    subject: str | None = None
    received_at: str | None = None
    status: str | None = None
    folder: str | None = None
    # Mailbox this row was read from — set on every item since TEC-201's
    # engine-wide view aggregates per-account inspections.
    account: str | None = None


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

    def delete_mailbox(self, localpart: str) -> None:
        """Destroy the engine account. `MailNotFoundError` when the localpart
        was never provisioned — the router tolerates it so mirror cleanup
        still proceeds (TEC-201)."""
        ...


class MailEngineInspector(Protocol):
    """Read-mostly engine surface behind `/api/admin/mail/*` (TEC-188).

    Distinct from `MailProvisioner` — diagnostic reads + queue ops, not
    provisioning lifecycle. `None` returns mean "not exposed by this
    engine build" (the contract's `available:false` path), as opposed to
    `MailError` raises which mean "the call itself failed".
    """

    def ping(self) -> bool:
        """False only when the engine can't be reached at all."""
        ...

    def queue_snapshot(self, limit: int = 100) -> QueueSnapshot | None: ...

    def queue_retry_all(self) -> bool: ...

    def queue_retry_one(self, message_id: str) -> bool: ...

    def dns_records(self, domain: str) -> list[DnsRecord] | None: ...

    def delivery_items(self, account: str | None, limit: int) -> list[DeliveryItem] | None: ...

    def send_mail_message(
        self, localpart: str, to: str, subject: str, body: str
    ) -> str | None:
        """Submit a message on behalf of a mailbox — admin token, no
        mailbox password (TEC-201 send-test). Returns the EmailSubmission
        id; `None` when the surface isn't exposed."""
        ...


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


# ── JMAP plumbing (Stalwart ≥0.16 management surface) ─────────────────────

_USING_MGMT = ["urn:ietf:params:jmap:core", "urn:stalwart:jmap"]
_USING_MAIL = ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"]
# Identity/get + EmailSubmission/set live under the submission capability —
# _USING_MAIL alone gets unknownMethod on this engine build (verified live).
_USING_SUBMISSION = [*_USING_MAIL, "urn:ietf:params:jmap:submission"]

# Method-level ["error",{type},callId] responses inside HTTP 200 → taxonomy.
_METHOD_ERROR_MAP: dict[str, type[MailError]] = {
    "forbidden": MailUnauthorizedError,
    "notFound": MailNotFoundError,
    "accountNotFound": MailNotFoundError,
    "serverUnavailable": MailUnavailableError,
    "serverFail": MailUnavailableError,
    "unknownMethod": MailUnavailableError,  # provisioning paths; inspector
    # reads treat it as "not exposed" → available:false via _jmap_lenient.
}

# Foo/set per-record notCreated/notUpdated/notDestroyed `type` → taxonomy.
_SET_ERROR_MAP: dict[str, type[MailError]] = {
    "alreadyExists": MailConflictError,
    "primaryKeyViolation": MailConflictError,  # v0.16+ name for alreadyExists
    "forbidden": MailUnauthorizedError,
    "notFound": MailNotFoundError,
}

_CREATE_CONFLICT_TYPES = frozenset({"alreadyExists", "primaryKeyViolation"})


def _err_detail(raw: Any) -> str:
    if isinstance(raw, dict):
        return str(raw.get("description") or raw.get("detail") or raw.get("title") or "")
    return ""


def _method_error(raw: Any) -> MailError:
    etype = str(raw.get("type") or "") if isinstance(raw, dict) else ""
    cls = _METHOD_ERROR_MAP.get(etype, MailInvalidRequestError)
    return cls(_err_detail(raw) or etype or "JMAP method error")


def _set_error(raw: Any) -> MailError:
    etype = str(raw.get("type") or "") if isinstance(raw, dict) else ""
    cls = _SET_ERROR_MAP.get(etype, MailInvalidRequestError)
    return cls(_err_detail(raw) or etype or "JMAP set error")


def _raise_set_errors(args: dict[str, Any], err_key: str) -> None:
    """Foo/set result: raise the first notCreated/notUpdated/notDestroyed
    entry's mapped contract error (they're per-record, not method errors)."""
    errs = args.get(err_key) or {}
    if errs:
        raise _set_error(next(iter(errs.values())))


def _utc_now() -> str:
    """JMAP UTCDateTime for `nextRetry` reschedules."""
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


class StalwartProvisioner:
    """Contract operations over Stalwart's JMAP management surface (≥0.16).

    Verified live against mailengine.bloomieltsacademy.com (v1.0.0, TEC-192):
    management calls take no `accountId` (server injects the caller's);
    `Password.secret` stores a well-formed `$argon2id$` hash verbatim;
    `x:Account/query` `name` filter is exact; ids are opaque; duplicate
    create lands in `notCreated` as `primaryKeyViolation`.
    """

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
        self._domain_id_cache: str | None = None  # resolved once, cached

    def _address(self, localpart: str) -> str:
        return f"{localpart}@{self._domain}"

    def _request(self, method: str, path: str, body: Any = None) -> Any:
        url = f"{self._base}{path}"
        headers = {
            "Authorization": f"Bearer {self._token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            # The engine sits behind Cloudflare: its signature ban (error
            # 1010) rejects urllib's default `Python-urllib/3.11` UA — send an
            # explicit one (verified live: any non-banned UA passes).
            "User-Agent": "bloom-platform/1.0",
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
            detail = _err_detail(parsed)
            raise err_cls(detail or f"mail API HTTP {status}")
        return parsed

    # ── JMAP plumbing ─────────────────────────────────────────────────────

    def _jmap_send(self, method_calls: list[list[Any]], using: list[str]) -> list[Any]:
        parsed = self._request(
            "POST", "/jmap/", {"using": using, "methodCalls": method_calls}
        )
        responses = parsed.get("methodResponses") if isinstance(parsed, dict) else None
        if not isinstance(responses, list):
            raise MailUnavailableError("mail API: malformed JMAP response")
        return responses

    @staticmethod
    def _collect(responses: list[Any]) -> dict[str, Any]:
        """Index methodResponses by call id; raise on method-level errors."""
        out: dict[str, Any] = {}
        for resp in responses:
            if not isinstance(resp, list) or len(resp) < 3:
                raise MailUnavailableError("mail API: malformed JMAP method response")
            name, args, call_id = resp[0], resp[1], str(resp[2])
            if name == "error":
                raise _method_error(args)
            out[call_id] = args if isinstance(args, dict) else {}
        return out

    def _jmap(
        self, method_calls: list[list[Any]], using: list[str] | None = None
    ) -> dict[str, Any]:
        return self._collect(self._jmap_send(method_calls, using or _USING_MGMT))

    def _jmap_lenient(
        self, method_calls: list[list[Any]], using: list[str] | None = None
    ) -> dict[str, Any] | None:
        """Inspector variant: `unknownMethod` → None (the contract's
        `available:false` for surfaces an engine build doesn't expose).
        Other method errors still raise the mapped taxonomy error."""
        responses = self._jmap_send(method_calls, using or _USING_MGMT)
        for resp in responses:
            if (
                isinstance(resp, list)
                and len(resp) >= 2
                and resp[0] == "error"
                and isinstance(resp[1], dict)
                and resp[1].get("type") == "unknownMethod"
            ):
                return None
        return self._collect(responses)

    # ── object resolution (batched query+get, one roundtrip) ─────────────

    def _domain_id(self) -> str:
        """Id of the MAIL_DOMAIN Domain object — resolved once, cached.
        Missing domain = engine misconfiguration → `unavailable`."""
        if self._domain_id_cache is None:
            res = self._jmap(
                [["x:Domain/query", {"filter": {"name": self._domain}}, "dq"]]
            )
            ids = res.get("dq", {}).get("ids") or []
            if not ids:
                raise MailUnavailableError(
                    f"mail domain {self._domain} is not configured on the engine"
                )
            self._domain_id_cache = str(ids[0])
        return self._domain_id_cache

    def _account_lookup(self, localpart: str) -> dict[str, Any] | None:
        """`x:Account/query{name,domainId}` + `x:Account/get` in one batch →
        the account dict whose `name` exactly matches (the engine's name
        filter is exact — verified — but the contract requires an
        adapter-side exact match regardless)."""
        res = self._jmap(
            [
                [
                    "x:Account/query",
                    {"filter": {"name": localpart, "domainId": self._domain_id()}},
                    "aq",
                ],
                [
                    "x:Account/get",
                    {
                        "#ids": {
                            "resultOf": "aq",
                            "name": "x:Account/query",
                            "path": "/ids",
                        }
                    },
                    "ag",
                ],
            ]
        )
        lp = localpart.lower()
        for item in res.get("ag", {}).get("list") or []:
            if isinstance(item, dict) and str(item.get("name") or "").lower() == lp:
                return item
        return None

    def _mailbox_info(self, localpart: str, acct: dict[str, Any]) -> MailboxInfo:
        perms = acct.get("permissions")
        disabled: dict[str, Any] = {}
        if isinstance(perms, dict) and perms.get("@type") in ("Merge", "Replace"):
            disabled = perms.get("disabledPermissions") or {}
        quotas = acct.get("quotas") or {}
        return MailboxInfo(
            localpart=str(acct.get("name") or localpart),
            address=str(acct.get("emailAddress") or self._address(localpart)),
            status="suspended" if "authenticate" in disabled else "active",
            quota_mb=int(quotas.get("maxDiskQuota") or 0) // 1_048_576,
        )

    def _fetch(self, localpart: str) -> MailboxInfo:
        acct = self._account_lookup(localpart)
        if acct is None:
            raise MailNotFoundError(f"mailbox {self._address(localpart)} not found")
        return self._mailbox_info(localpart, acct)

    def _update_account(self, localpart: str, patch: dict[str, Any]) -> MailboxInfo:
        acct = self._account_lookup(localpart)
        if acct is None:
            raise MailNotFoundError(f"mailbox {self._address(localpart)} not found")
        res = self._jmap(
            [["x:Account/set", {"update": {str(acct["id"]): patch}}, "s"]]
        )
        args = res.get("s") or {}
        _raise_set_errors(args, "notUpdated")
        return self._fetch(localpart)

    # ── contract operations ────────────────────────────────────────────────

    def check_username(self, localpart: str) -> bool:
        return self._account_lookup(normalize_localpart(localpart)) is None

    def create_mailbox(
        self,
        localpart: str,
        secret: str,
        quota_mb: int,
        display_name: str | None = None,
    ) -> MailboxInfo:
        address = self._address(localpart)
        create_obj = {
            "@type": "User",
            "name": localpart,
            "domainId": self._domain_id(),
            "credentials": {"0": {"@type": "Password", "secret": secret}},
            "quotas": {"maxDiskQuota": quota_mb * 1_048_576},
            "roles": {"@type": "User"},
            "permissions": {"@type": "Inherit"},
            "memberGroupIds": {},
            "aliases": {},
            "encryptionAtRest": {"@type": "Disabled"},
        }
        if display_name:
            # Empty-string description is rejected (`invalidPatch`) and would
            # mask the real `primaryKeyViolation` on idempotent replays.
            create_obj["description"] = display_name
        res = self._jmap([["x:Account/set", {"create": {"c1": create_obj}}, "s"]])
        args = res.get("s") or {}
        if "c1" in (args.get("created") or {}):
            logger.info("create_mailbox ok: %s", address)
            return MailboxInfo(localpart, address, "active", quota_mb)
        err = (args.get("notCreated") or {}).get("c1")
        if err is not None:
            etype = str(err.get("type") or "") if isinstance(err, dict) else ""
            if etype in _CREATE_CONFLICT_TYPES:
                # Idempotent-on-localpart: a replay sees the stored mailbox.
                logger.info(
                    "create_mailbox conflict for %s — verifying existing", address
                )
                return self._fetch(localpart)
            raise _set_error(err)
        raise MailUnavailableError("mail API: unexpected x:Account/set response")

    def suspend(self, localpart: str) -> MailboxInfo:
        return self._update_account(
            localpart,
            {
                "permissions": {
                    "@type": "Merge",
                    "disabledPermissions": {
                        perm: True for perm in self._SUSPENDED_PERMS
                    },
                }
            },
        )

    def unsuspend(self, localpart: str) -> MailboxInfo:
        return self._update_account(
            localpart, {"permissions": {"@type": "Inherit"}}
        )

    def reset_password(self, localpart: str, secret: str) -> MailboxInfo:
        # Replaces the primary Password credential (slot "0" — verified live:
        # old password rejects, new one authenticates).
        return self._update_account(
            localpart,
            {"credentials": {"0": {"@type": "Password", "secret": secret}}},
        )

    def set_quota(self, localpart: str, quota_mb: int) -> MailboxInfo:
        return self._update_account(
            localpart, {"quotas": {"maxDiskQuota": quota_mb * 1_048_576}}
        )

    def list_mailboxes(self, page: int, limit: int) -> MailboxPage:
        res = self._jmap(
            [
                [
                    "x:Account/query",
                    {
                        "filter": {"domainId": self._domain_id()},
                        "sort": [{"property": "name"}],
                        "position": max(page - 1, 0) * limit,
                        "limit": limit,
                        "calculateTotal": True,
                    },
                    "aq",
                ],
                [
                    "x:Account/get",
                    {
                        "#ids": {
                            "resultOf": "aq",
                            "name": "x:Account/query",
                            "path": "/ids",
                        }
                    },
                    "ag",
                ],
            ]
        )
        items = [
            self._mailbox_info(str(item.get("name") or ""), item)
            for item in res.get("ag", {}).get("list") or []
            if isinstance(item, dict) and item.get("@type") == "User"
        ]
        return MailboxPage(items=items, total=int(res.get("aq", {}).get("total") or 0))

    def delete_mailbox(self, localpart: str) -> None:
        """Destroy the engine account via `x:Account/set` destroy (TEC-201).

        `MailNotFoundError` propagates — the router tolerates it so mirror
        rows for never-provisioned mailboxes can still be cleaned up."""
        acct = self._account_lookup(normalize_localpart(localpart))
        if acct is None:
            raise MailNotFoundError(
                f"mailbox {self._address(localpart)} not found on the engine"
            )
        res = self._jmap(
            [["x:Account/set", {"destroy": {str(acct["id"]): None}}, "s"]]
        )
        args = res.get("s") or {}
        _raise_set_errors(args, "notDestroyed")

    # ── engine-admin operations (contracts/mail-admin.yaml, TEC-188) ──────

    def ping(self) -> bool:
        try:
            self._request("GET", "/jmap/session")
        except MailUnavailableError:
            return False
        except MailError:
            return True  # engine answered — even an auth rejection counts
        return True

    def queue_snapshot(self, limit: int = 100) -> QueueSnapshot | None:
        res = self._jmap_lenient(
            [
                [
                    "x:QueuedMessage/query",
                    {"position": 0, "limit": limit, "calculateTotal": True},
                    "q",
                ],
                [
                    "x:QueuedMessage/get",
                    {
                        "#ids": {
                            "resultOf": "q",
                            "name": "x:QueuedMessage/query",
                            "path": "/ids",
                        },
                        "properties": [
                            "id",
                            "returnPath",
                            "size",
                            "createdAt",
                            "nextRetry",
                            "recipients",
                            "priority",
                            "flags",
                        ],
                    },
                    "g",
                ],
            ]
        )
        if res is None:
            return None
        snap = QueueSnapshot(total=int(res.get("q", {}).get("total") or 0))
        for raw in res.get("g", {}).get("list") or []:
            msg = _queue_message(raw)
            snap.items.append(msg)
            if msg.in_flight:
                snap.active += 1
            elif msg.status != "completed":
                snap.deferred += 1
        if not snap.items:
            # Item detail unavailable (or queue empty) — report the total as
            # deferred; `active` inflight split needs per-item statuses.
            snap.deferred = snap.total
        return snap

    def queue_retry_all(self) -> bool:
        """Reschedule every queued message's next attempt to now.

        Pages `x:QueuedMessage/query` for ids (bounded), then batches
        `x:QueuedMessage/set` updates (≤500 objects per call, ≤16 calls per
        request — inside the engine's published limits)."""
        ids: list[str] = []
        position = 0
        while len(ids) < _QUEUE_RETRY_MAX:
            res = self._jmap_lenient(
                [
                    [
                        "x:QueuedMessage/query",
                        {
                            "position": position,
                            "limit": _QUEUE_PAGE,
                            "calculateTotal": True,
                        },
                        "q",
                    ]
                ]
            )
            if res is None:
                return False
            q = res.get("q") or {}
            page = [str(i) for i in q.get("ids") or []]
            ids.extend(page)
            position += len(page)
            total = int(q.get("total") or 0)
            if not page or position >= total:
                break
        if not ids:
            return True  # empty queue — vacuous success
        now = _utc_now()
        calls = [
            [
                "x:QueuedMessage/set",
                {
                    "update": {
                        mid: {"nextRetry": now}
                        for mid in ids[i : i + _QUEUE_PAGE]
                    }
                },
                f"s{i // _QUEUE_PAGE}",
            ]
            for i in range(0, min(len(ids), _QUEUE_RETRY_MAX), _QUEUE_PAGE)
        ]
        res = self._jmap(calls)
        for call_id in (f"s{i // _QUEUE_PAGE}" for i in range(0, len(ids), _QUEUE_PAGE)):
            if (res.get(call_id) or {}).get("notUpdated"):
                return False
        return True

    def queue_retry_one(self, message_id: str) -> bool:
        res = self._jmap_lenient(
            [
                [
                    "x:QueuedMessage/set",
                    {"update": {message_id: {"nextRetry": _utc_now()}}},
                    "s",
                ]
            ]
        )
        if res is None:
            return False
        args = res.get("s") or {}
        return message_id in (args.get("updated") or {})

    def dns_records(self, domain: str) -> list[DnsRecord] | None:
        """Stalwart's canonical DNS list for the domain — the server-set
        `dnsZoneFile` on the Domain object (zone-file text) parsed into
        records; includes the DKIM `_domainkey` TXT records the engine
        expects to be published."""
        res = self._jmap_lenient(
            [
                ["x:Domain/query", {"filter": {"name": domain}}, "dq"],
                [
                    "x:Domain/get",
                    {
                        "#ids": {
                            "resultOf": "dq",
                            "name": "x:Domain/query",
                            "path": "/ids",
                        }
                    },
                    "dg",
                ],
            ]
        )
        if res is None:
            return None
        records: list[DnsRecord] = []
        for item in res.get("dg", {}).get("list") or []:
            if not isinstance(item, dict):
                continue
            zone = item.get("dnsZoneFile")
            if isinstance(zone, str):
                records.extend(_parse_zone(zone))
        return records

    def delivery_items(self, account: str | None, limit: int) -> list[DeliveryItem] | None:
        if not account:
            # Engine-wide tracing is Enterprise-only in v0.16+, so TEC-201
            # aggregates the OSS-safe per-account inspections instead.
            return self._delivery_recent(limit)
        localpart = normalize_localpart(account.split("@", 1)[0])
        acct = self._account_lookup(localpart)
        if acct is None:
            return None  # unknown account → same no-data surface as before
        account_id = str(acct.get("id") or "")
        address = str(acct.get("emailAddress") or self._address(localpart))
        return self._jmap_delivery(account_id, address, limit)

    def _domain_accounts(self, cap: int) -> list[dict[str, Any]]:
        """Raw `User` account dicts for the domain — one query+get roundtrip
        (the `_account_lookup` shape, fanned out)."""
        res = self._jmap(
            [
                [
                    "x:Account/query",
                    {
                        "filter": {"domainId": self._domain_id()},
                        "sort": [{"property": "name"}],
                        "limit": cap,
                    },
                    "aq",
                ],
                [
                    "x:Account/get",
                    {
                        "#ids": {
                            "resultOf": "aq",
                            "name": "x:Account/query",
                            "path": "/ids",
                        }
                    },
                    "ag",
                ],
            ]
        )
        return [
            item
            for item in res.get("ag", {}).get("list") or []
            if isinstance(item, dict) and item.get("@type") == "User"
        ]

    def _delivery_recent(self, limit: int) -> list[DeliveryItem]:
        """Engine-wide inspector on OSS: merge each mailbox's recent mail.

        One account roundtrip + one `_jmap_delivery` call per mailbox,
        bounded by `_DELIVERY_ACCOUNTS_CAP` — N+1 by design (Enterprise
        traces are the alternative), so the caps keep the fan-out cheap."""
        accounts = self._domain_accounts(_DELIVERY_ACCOUNTS_CAP)
        per_account = max(1, min(limit, _DELIVERY_PER_ACCOUNT))
        merged: list[DeliveryItem] = []
        for acct in accounts:
            name = str(acct.get("name") or "")
            address = str(acct.get("emailAddress") or self._address(name))
            part = self._jmap_delivery(str(acct.get("id") or ""), address, per_account)
            if part:
                merged.extend(part)
        merged.sort(key=lambda i: i.received_at or "", reverse=True)
        return merged[:limit]

    def send_mail_message(
        self, localpart: str, to: str, subject: str, body: str
    ) -> str | None:
        """Send a message as the mailbox — admin-token JMAP submission.

        TEC-201's password-free send-test: `Email/set` drafts the message in
        the account's Drafts folder and `EmailSubmission/set` sends it via
        the account's own identity — no mailbox password crosses the wire.
        Returns the EmailSubmission id; `None` if the mail surface isn't
        exposed (unknownMethod)."""
        localpart = normalize_localpart(localpart)
        acct = self._account_lookup(localpart)
        if acct is None:
            raise MailNotFoundError(
                f"mailbox {self._address(localpart)} not found on the engine"
            )
        account_id = str(acct.get("id") or "")
        address = str(acct.get("emailAddress") or self._address(localpart))
        res = self._jmap_lenient(
            [
                [
                    "Identity/get",
                    {"accountId": account_id, "properties": ["id", "email"]},
                    "i",
                ],
                ["Mailbox/query", {"accountId": account_id}, "mq"],
                [
                    "Mailbox/get",
                    {
                        "accountId": account_id,
                        "#ids": {
                            "resultOf": "mq",
                            "name": "Mailbox/query",
                            "path": "/ids",
                        },
                        "properties": ["id", "role", "name"],
                    },
                    "m",
                ],
            ],
            using=_USING_SUBMISSION,
        )
        if res is None:
            return None
        identities = res.get("i", {}).get("list") or []
        if not identities:
            raise MailUnavailableError(f"mailbox {address} has no send identity")
        identity_id = str(
            next(
                (
                    i.get("id")
                    for i in identities
                    if isinstance(i, dict)
                    and str(i.get("email") or "").lower() == address.lower()
                ),
                identities[0].get("id"),
            )
        )
        mailboxes = {
            str(mb.get("role")): str(mb.get("id"))
            for mb in res.get("m", {}).get("list") or []
            if isinstance(mb, dict) and mb.get("id") and mb.get("role")
        }
        drafts_id = (
            mailboxes.get("drafts") or mailboxes.get("sent") or mailboxes.get("inbox")
        )
        if drafts_id is None:
            raise MailUnavailableError(f"mailbox {address} has no folder to draft in")
        # Stalwart rejects the spec's `#emailId` result-reference on
        # EmailSubmission/set (invalidProperties, verified live), so the
        # draft and the submission go in two calls with a literal emailId.
        draft_res = self._jmap_lenient(
            [
                [
                    "Email/set",
                    {
                        "accountId": account_id,
                        "create": {
                            "m1": {
                                "mailboxIds": {drafts_id: True},
                                "from": [{"email": address}],
                                "to": [{"email": to}],
                                "subject": subject,
                                "keywords": {"$draft": True},
                                "textBody": [{"partId": "t1", "type": "text/plain"}],
                                "bodyValues": {"t1": {"value": body}},
                            }
                        },
                    },
                    "e",
                ]
            ],
            using=_USING_SUBMISSION,
        )
        if draft_res is None:
            return None
        email_args = draft_res.get("e") or {}
        _raise_set_errors(email_args, "notCreated")
        email_id = str(
            (email_args.get("created") or {}).get("m1", {}).get("id") or ""
        )
        sub_res = self._jmap_lenient(
            [
                [
                    "EmailSubmission/set",
                    {
                        "accountId": account_id,
                        "create": {
                            "s1": {
                                "identityId": identity_id,
                                "emailId": email_id,
                            }
                        },
                    },
                    "s",
                ]
            ],
            using=_USING_SUBMISSION,
        )
        if sub_res is None:
            return None  # submission surface not exposed
        sub_args = sub_res.get("s") or {}
        _raise_set_errors(sub_args, "notCreated")
        created = sub_args.get("created") or {}
        submission = created.get("s1") or {}
        return str(submission.get("id") or "")

    # ── per-account delivery inspector (mail JMAP) ────────────────────────

    def _jmap_delivery(
        self, account_id: str, address: str, limit: int
    ) -> list[DeliveryItem] | None:
        """Per-account inspector: what arrived/left and where it landed.

        One JMAP roundtrip — Email/query + Email/get (metadata properties
        only, never `body`/`textBody`/`htmlBody`) + mailbox names via a
        result reference. No N+1 fan-out. `accountId` is the engine's opaque
        account id (v0.16: not an email address) resolved by the caller.
        """
        method_calls = [
            [
                "Email/query",
                {
                    "accountId": account_id,
                    "sort": [{"property": "receivedAt", "isAscending": False}],
                    "limit": limit,
                    "position": 0,
                },
                "q",
            ],
            [
                "Email/get",
                {
                    "accountId": account_id,
                    "#ids": {
                        "resultOf": "q",
                        "name": "Email/query",
                        "path": "/ids",
                    },
                    "properties": [
                        "id",
                        "subject",
                        "receivedAt",
                        "from",
                        "to",
                        "mailboxIds",
                        "keywords",
                    ],
                },
                "e",
            ],
            ["Mailbox/query", {"accountId": account_id}, "mq"],
            [
                "Mailbox/get",
                {
                    "accountId": account_id,
                    "#ids": {
                        "resultOf": "mq",
                        "name": "Mailbox/query",
                        "path": "/ids",
                    },
                    "properties": ["id", "name"],
                },
                "m",
            ],
        ]
        responses = self._jmap_send(method_calls, _USING_MAIL)
        by_call: dict[str, Any] = {}
        for resp in responses:
            if not isinstance(resp, list) or len(resp) < 3:
                continue
            if resp[0] == "error":
                return None  # accountNotFound / forbidden / unknownMethod
            by_call[str(resp[2])] = resp[1]
        emails = (by_call.get("e") or {}).get("list") or []
        folders = {
            str(mb.get("id")): str(mb.get("name") or "")
            for mb in (by_call.get("m") or {}).get("list") or []
            if isinstance(mb, dict)
        }
        account_l = address.lower()
        items: list[DeliveryItem] = []
        for em in emails:
            if not isinstance(em, dict):
                continue
            sender = None
            senders = em.get("from") or []
            if senders and isinstance(senders[0], dict):
                sender = senders[0].get("email")
            mailbox_ids = em.get("mailboxIds") or {}
            folder = next((folders[mid] for mid in mailbox_ids if mid in folders), None)
            items.append(
                DeliveryItem(
                    id=str(em.get("id") or ""),
                    direction=("outbound" if sender and sender.lower() == account_l else "inbound"),
                    sender=sender,
                    to=[
                        str(t.get("email"))
                        for t in em.get("to") or []
                        if isinstance(t, dict) and t.get("email")
                    ],
                    subject=em.get("subject"),
                    received_at=em.get("receivedAt"),
                    status=("seen" if "$seen" in (em.get("keywords") or {}) else "unseen"),
                    folder=folder,
                    account=address,
                )
            )
        return items


# Queue page/cap bounds — inside Stalwart's published limits
# (maxObjectsInGet/Set=500, maxCallsInRequest=16).
_QUEUE_PAGE = 500
_QUEUE_RETRY_MAX = 4_000

# Engine-wide delivery aggregation (TEC-201): N+1 fan-out caps.
_DELIVERY_ACCOUNTS_CAP = 50
_DELIVERY_PER_ACCOUNT = 10

# Recipient @type → representative status precedence (worst wins).
_RECIPIENT_STATUS_PRECEDENCE = (
    "permanent_failure",
    "temporary_failure",
    "scheduled",
    "completed",
)


def _snake(name: str) -> str:
    return re.sub(r"(?<!^)(?=[A-Z])", "_", name).lower()


def _queue_message(raw: Any) -> QueueMessage:
    """Parse an `x:QueuedMessage` (recipients is a map of address →
    QueuedRecipient{status:{@type},retryDue,queueName,...}).

    v0.16 exposes no in-flight delivery signal — `in_flight` is always
    False; per-recipient `status` drives the deferred classification."""
    if not isinstance(raw, dict):
        return QueueMessage(
            id=str(raw),
            return_path=None,
            size=None,
            created=None,
            status=None,
            next_retry=None,
            recipients=None,
            in_flight=False,
        )
    statuses: set[str] = set()
    next_retry = raw.get("nextRetry")
    recipients = 0
    for rcpt in (raw.get("recipients") or {}).values():
        recipients += 1
        if not isinstance(rcpt, dict):
            continue
        st = rcpt.get("status")
        etype = st.get("@type") if isinstance(st, dict) else st
        if etype:
            statuses.add(_snake(str(etype)))
        next_retry = next_retry or rcpt.get("retryDue")
    status = next(
        (s for s in _RECIPIENT_STATUS_PRECEDENCE if s in statuses), None
    ) or ("completed" if statuses else None)
    return QueueMessage(
        id=str(raw.get("id") or ""),
        return_path=raw.get("returnPath"),
        size=int(raw["size"]) if raw.get("size") is not None else None,
        created=raw.get("createdAt"),
        status=status,
        next_retry=next_retry,
        recipients=recipients or None,
        in_flight=False,
    )


_ZONE_RECORD_RE = re.compile(
    r"^(?P<name>\S+)"                       # owner name (absolute or relative)
    r"(?:\s+(?P<ttl>\d+[smhdwSMHDW]?))?"    # optional TTL
    r"(?:\s+(?P<class>[Ii][Nn]))?"          # optional class
    r"\s+(?P<type>[A-Za-z]+)\s+(?P<rdata>.*)$"
)
_ZONE_TYPES = frozenset(
    {"A", "AAAA", "MX", "TXT", "SRV", "CAA", "CNAME", "NS", "PTR", "TLSA"}
)


def _zone_logical_lines(zone: str) -> list[str]:
    """Collapse RFC 1035 continuation groups `( ... )` into single lines and
    strip `;` comments (which run to end of physical line) outside quotes."""
    lines: list[str] = []
    buf = ""
    depth = 0
    in_quote = False
    in_comment = False
    for ch in zone:
        if in_comment:
            if ch == "\n":
                in_comment = False
                if depth == 0:
                    lines.append(buf)
                    buf = ""
            continue
        if in_quote:
            buf += ch
            if ch == '"':
                in_quote = False
            continue
        if ch == '"':
            in_quote = True
            buf += ch
        elif ch == ";":
            in_comment = True
        elif ch == "(":
            depth += 1
            buf += " "
        elif ch == ")":
            depth = max(0, depth - 1)
            buf += " "
        elif ch == "\n":
            if depth == 0:
                lines.append(buf)
                buf = ""
            else:
                buf += " "
        else:
            buf += ch
    if buf.strip():
        lines.append(buf)
    return lines


def _zone_txt(rdata: str) -> str:
    """TXT rdata → content: concat quoted char-strings, else raw."""
    quoted = re.findall(r'"((?:[^"\\]|\\.)*)"', rdata)
    if quoted:
        return "".join(quoted)
    return rdata.strip()


def _parse_zone(zone: str) -> list[DnsRecord]:
    """Parse Stalwart's `dnsZoneFile` text into contract DnsRecords."""
    records: list[DnsRecord] = []
    for line in _zone_logical_lines(zone):
        line = line.strip()
        if not line or line.startswith(("$", "@ ")):
            continue
        m = _ZONE_RECORD_RE.match(line)
        if not m:
            continue
        rtype = m.group("type").upper()
        if rtype not in _ZONE_TYPES:
            continue
        rdata = m.group("rdata").strip()
        content = _zone_txt(rdata) if rtype == "TXT" else rdata
        records.append(
            DnsRecord(type=rtype, name=m.group("name"), content=content)
        )
    return records


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

    def delete_mailbox(self, localpart: str) -> None:
        self._unconfigured()

    # ── engine-admin operations (TEC-188) — all report unavailable ────────

    def ping(self) -> bool:
        return False

    def queue_snapshot(self, limit: int = 100) -> QueueSnapshot | None:
        self._unconfigured()

    def queue_retry_all(self) -> bool:
        self._unconfigured()

    def queue_retry_one(self, message_id: str) -> bool:
        self._unconfigured()

    def dns_records(self, domain: str) -> list[DnsRecord] | None:
        self._unconfigured()

    def delivery_items(self, account: str | None, limit: int) -> list[DeliveryItem] | None:
        self._unconfigured()

    def send_mail_message(
        self, localpart: str, to: str, subject: str, body: str
    ) -> str | None:
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


def get_mail_inspector() -> MailEngineInspector:
    """FastAPI dependency — the engine-admin surface (TEC-188). Both
    implementations satisfy both protocols, so this is the same factory."""
    return cast(MailEngineInspector, _build_provisioner())
