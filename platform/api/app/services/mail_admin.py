"""Mail admin probes + helpers (TEC-188, contracts/mail-admin.yaml).

Everything here is injectable — the low-level functions are module-level so
tests can patch them, and the composed helpers take their dependencies as
arguments. Credential probes (SMTP AUTH / IMAP LOGIN / test-send) use
default CA verification: a cert failure is a real finding the contract
reports in `error`, and mailbox passwords never transit an unverified
channel.
"""

from __future__ import annotations

import imaplib
import logging
import secrets
import smtplib
import socket
import ssl
import string
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from email.message import EmailMessage
from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.integrations.mail_api import DnsRecord, MailEngineInspector
from app.models.mail_audit import MailAdminAudit
from app.models.user import User

logger = logging.getLogger(__name__)

# name → port, in contract order
LISTENERS: tuple[tuple[str, int], ...] = (
    ("smtp", 25),
    ("submission", 587),
    ("smtps", 465),
    ("imaps", 993),
)
IMAPS_PORT = 993
SMTPS_PORT = 465

_PASSWORD_ALPHABET = string.ascii_letters + string.digits


def generate_password() -> str:
    """16-char password for reset-password — returned to the admin exactly
    once, then only its argon2id hash ever crosses the wire."""
    return "".join(secrets.choice(_PASSWORD_ALPHABET) for _ in range(16))


def write_audit(
    db: Session,
    admin: User,
    action: str,
    target: str,
    detail: dict[str, Any] | None = None,
) -> None:
    """Append one audit row into the caller's transaction — the route
    commits once, so the audit and the mutation land atomically."""
    if detail:
        for key in detail:
            if key in ("password", "secret", "token", "mail_secret"):
                raise ValueError(f"audit detail must not carry {key!r}")
    db.add(
        MailAdminAudit(
            admin_user_id=admin.id,
            action=action,
            target=target,
            detail=detail,
        )
    )


# ── Socket / TLS / auth probes ────────────────────────────────────────────────


def tcp_probe(host: str, port: int, timeout: float) -> bool:
    try:
        socket.create_connection((host, port), timeout=timeout).close()
        return True
    except OSError:
        return False


def tls_cert_info(host: str, port: int, timeout: float) -> dict[str, Any] | None:
    """The certificate the engine *presents* — captured unverified because
    this field is an inventory of served state, not a trust decision.
    Credential probes verify trust independently."""
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    try:
        with socket.create_connection((host, port), timeout=timeout) as raw:
            with ctx.wrap_socket(raw, server_hostname=host) as sock:
                cert = sock.getpeercert(binary_form=True)
    except OSError:
        return None
    if not cert:
        return None
    not_after = _der_not_after(cert)
    if not_after is None:
        return None
    days = (not_after - datetime.now(UTC)).days
    return {"host": host, "expires_at": not_after, "days_remaining": days}


def _der_not_after(der: bytes) -> datetime | None:
    """Extract notAfter from a DER cert without a crypto dependency.

    The validity SEQUENCE {notBefore, notAfter} holds the only *adjacent
    pair* of time encodings (UTCTime 0x17 / GeneralizedTime 0x18) in the
    certificate — scan for the first adjacent pair and take the second.
    """
    times: list[bytes] = []
    i = 0
    n = len(der)
    while i + 2 < n:
        tag = der[i]
        if tag not in (0x17, 0x18):
            i += 1
            continue
        length = der[i + 1]
        if length & 0x80:
            i += 1
            continue
        end = i + 2 + length
        if end > n:
            break
        times.append(der[i + 2 : end])
        if len(times) >= 2:
            break
        i = end
    if len(times) < 2:
        return None
    for fmt in ("%y%m%d%H%M%SZ", "%Y%m%d%H%M%SZ"):
        try:
            return datetime.strptime(times[1].decode("ascii"), fmt).replace(tzinfo=UTC)
        except (ValueError, UnicodeDecodeError):
            continue
    return None


def smtp_auth_probe(
    host: str, address: str, password: str, timeout: float
) -> tuple[bool, str | None]:
    """SMTP-SSL AUTH on :465 — (ok, error).

    smtplib's default is `ssl._create_stdlib_context` — UNVERIFIED. An
    explicit verified context is mandatory here: the password must never
    transit a channel whose peer wasn't authenticated.
    """
    try:
        ctx = ssl.create_default_context()
        with smtplib.SMTP_SSL(host, SMTPS_PORT, timeout=timeout, context=ctx) as smtp:
            smtp.login(address, password)
        return True, None
    except smtplib.SMTPAuthenticationError as exc:
        return False, f"smtpAuth: auth rejected ({exc.smtp_code})"
    except (smtplib.SMTPException, ssl.SSLError, OSError) as exc:
        return False, f"smtpAuth: {exc}"


def imap_login_probe(
    host: str, address: str, password: str, timeout: float
) -> tuple[bool, str | None]:
    """IMAP-SSL LOGIN on :993 — (ok, error). Same verified-context rule as
    smtp_auth_probe (imaplib defaults to unverified TLS)."""
    try:
        ctx = ssl.create_default_context()
        client = imaplib.IMAP4_SSL(host, IMAPS_PORT, ssl_context=ctx, timeout=timeout)
        try:
            client.login(address, password)
        finally:
            try:
                client.logout()
            except OSError:
                pass
        return True, None
    except (imaplib.IMAP4.error, ssl.SSLError, OSError) as exc:
        return False, f"imap: {exc}"


def send_test_message(
    host: str,
    from_address: str,
    password: str,
    to: str,
    timeout: float,
    subject: str | None = None,
    body: str | None = None,
) -> str:
    """Submit a test mail on :465 — returns the Message-ID on acceptance.

    Raises smtplib/ssl/OSError on any failure; the route maps it into the
    contract's `error` field. `subject`/`body` optional since TEC-201.
    """
    domain = from_address.rsplit("@", 1)[-1]
    message_id = f"<{uuid.uuid4().hex}@{domain}>"
    msg = EmailMessage()
    msg["From"] = from_address
    msg["To"] = to
    msg["Subject"] = subject or "Bloom mail engine test"
    msg["Message-ID"] = message_id
    msg.set_content(
        body
        or "This is an automated test message from the Bloom admin Mail Engine panel.\n"
    )
    ctx = ssl.create_default_context()
    with smtplib.SMTP_SSL(host, SMTPS_PORT, timeout=timeout, context=ctx) as smtp:
        smtp.login(from_address, password)
        smtp.send_message(msg)
    return message_id


# ── DoH resolution + DNS comparison ───────────────────────────────────────────


def doh_lookup(client: httpx.Client, base_url: str, name: str, rdtype: str) -> list[str] | None:
    """dns-json lookup → list of answer data strings; None on transport
    failure, [] on NXDOMAIN/no answers."""
    try:
        resp = client.get(
            base_url,
            params={"name": name, "type": rdtype},
            headers={"accept": "application/dns-json"},
        )
        parsed = resp.json()
    except (httpx.HTTPError, ValueError):
        return None
    answers = parsed.get("Answer") if isinstance(parsed, dict) else None
    if not answers:
        return []
    return [str(a.get("data", "")) for a in answers if isinstance(a, dict)]


def _norm_fqdn(value: str) -> str:
    return value.strip().rstrip(".").lower()


def _txt_tokens(value: str) -> set[str]:
    # `;` joins directives in DMARC/DKIM-style records — treat it as a
    # separator so `v=DMARC1` expected ⊆ `v=DMARC1; p=reject` found.
    return {t for t in value.replace('"', "").replace(";", " ").split() if t}


def _dkim_key(value: str) -> str | None:
    """Extract the p= public key, whitespace-free (keys may span strings)."""
    for part in value.replace('"', "").split(";"):
        part = part.strip()
        if part.startswith("p="):
            return part[2:].replace(" ", "") or None
    return None


@dataclass
class DnsCheck:
    name: str
    rdtype: str
    expected: str


def _evaluate(check: DnsCheck, found: list[str] | None) -> tuple[str | None, bool]:
    if found is None:
        return None, False  # resolver failure — inconclusive
    joined = "; ".join(found) if found else None
    if not found:
        return joined, False
    if check.rdtype == "MX":
        expected_exch = _norm_fqdn(check.expected.split()[-1])
        ok = any(
            len(parts) >= 2 and _norm_fqdn(parts[-1]) == expected_exch
            for parts in (f.split() for f in found)
        )
    elif check.rdtype == "TXT" and "_domainkey." in check.name:
        expected_key = _dkim_key(check.expected)
        ok = expected_key is not None and any(
            expected_key == _dkim_key(f) and "v=DKIM1" in f for f in found
        )
    elif check.rdtype == "TXT":
        # Token-subset match: found must carry every expected token —
        # flags genuine drift (e.g. missing `ra=postmaster`) without
        # breaking on ordering/quoting differences.
        expected_tokens = _txt_tokens(check.expected)
        ok = any(expected_tokens <= _txt_tokens(f) for f in found)
    else:
        ok = any(_norm_fqdn(f) == _norm_fqdn(check.expected) for f in found)
    return joined, ok


def expected_dns_checks(
    engine_records: list[DnsRecord] | None,
) -> list[DnsCheck]:
    """Contract record list: MX + apex SPF + _dmarc + PTR + DKIM selectors.

    Engine records (Stalwart's /api/dns/records) are authoritative when
    reachable; static platform expectations fill the gaps they don't cover
    (_dmarc, PTR) and stand in entirely when the engine is down.
    """
    settings = get_settings()
    domain = settings.mail_domain
    mail_host = settings.mail_service_host
    checks: list[DnsCheck] = []

    mx_expected = f"10 {_norm_fqdn(mail_host)}."
    spf_expected = "v=spf1"
    dkim: list[DnsRecord] = []
    for rec in engine_records or []:
        if rec.type == "MX" and _norm_fqdn(rec.name) == domain:
            mx_expected = rec.content
        elif rec.type == "TXT" and "v=spf1" in rec.content.lower():
            spf_expected = rec.content
        elif rec.type == "TXT" and "_domainkey." in rec.name:
            dkim.append(rec)
    checks.append(DnsCheck(f"{domain}.", "MX", mx_expected))
    checks.append(DnsCheck(f"{domain}.", "TXT", spf_expected))
    checks.append(DnsCheck(f"_dmarc.{domain}.", "TXT", "v=DMARC1"))
    for rec in dkim:
        checks.append(DnsCheck(rec.name, "TXT", rec.content))
    return checks


def ptr_check_for_ip(ip: str, expected_host: str) -> DnsCheck:
    octets = ip.split(".")
    name = ".".join(reversed(octets)) + ".in-addr.arpa"
    return DnsCheck(name, "PTR", f"{_norm_fqdn(expected_host)}.")


def run_dns_check(
    client: httpx.Client,
    inspector: MailEngineInspector,
) -> dict[str, Any]:
    """Compose the GET /dns report — expected set from the engine when
    reachable, static expectations plus DKIM discovery otherwise."""
    settings = get_settings()
    records: list[dict[str, Any]] = []

    try:
        engine_records = inspector.dns_records(settings.mail_domain)
    except Exception:
        logger.info("mail dns: engine record discovery unavailable")
        engine_records = None

    checks = expected_dns_checks(engine_records)

    # PTR is derived from the mail host's live A record — the engine's
    # domain records don't cover it.
    mail_a = doh_lookup(client, settings.mail_doh_url, settings.mail_service_host, "A")
    if mail_a:
        checks.append(ptr_check_for_ip(mail_a[0], settings.mail_service_host))

    for check in checks:
        found = doh_lookup(client, settings.mail_doh_url, check.name, check.rdtype)
        found_str, ok = _evaluate(check, found)
        records.append(
            {
                "name": check.name,
                "expected": check.expected,
                "found": found_str,
                "ok": ok,
            }
        )
    return {"checked_at": datetime.now(UTC), "records": records}
