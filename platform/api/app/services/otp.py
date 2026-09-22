"""OTP hooks — phone/email one-time codes backed by Redis TTL keys.

This is the integration point for the real SMS/email providers (Stage 1b+ /
mail stack in TEC-63). The sender is an adapter interface: today the default
`DevOtpSender` only logs the code (and optionally echoes it when
OTP_DEV_ECHO=true); swapping in a real provider requires no endpoint changes.

Storage layout (Redis):
  otp:code:{purpose}:{channel}:{destination}     → sha256(code), TTL-limited
  otp:attempts:{purpose}:{channel}:{destination} → attempt counter, same TTL
"""

from __future__ import annotations

import logging
import secrets
from typing import Protocol

from redis import Redis

from app.core.config import get_settings
from app.core.security import hash_otp_code
from app.models.enums import OtpChannel

logger = logging.getLogger(__name__)


class OtpSender(Protocol):
    """Delivery adapter — implementations must not raise on send failure;
    return False instead so the API can respond honestly."""

    def send(self, channel: OtpChannel, destination: str, code: str) -> bool: ...


class DevOtpSender:
    """Default sender: no real delivery — the code reaches the caller via the
    OTP_DEV_ECHO response field (dev/test only). Codes are never logged.
    Real SMS/email senders plug in behind this interface."""

    def send(self, channel: OtpChannel, destination: str, code: str) -> bool:
        logger.info("OTP issued channel=%s destination=%s", channel, destination)
        return True


def _code_key(purpose: str, channel: OtpChannel, destination: str) -> str:
    return f"otp:code:{purpose}:{channel.value}:{destination.lower()}"


def _attempts_key(purpose: str, channel: OtpChannel, destination: str) -> str:
    return f"otp:attempts:{purpose}:{channel.value}:{destination.lower()}"


def request_otp(
    redis: Redis,
    sender: OtpSender,
    channel: OtpChannel,
    destination: str,
    purpose: str = "login",
) -> tuple[int, str | None]:
    """Issue a 6-digit code. Returns (ttl_seconds, dev_code_or_none)."""
    settings = get_settings()
    code = f"{secrets.randbelow(900000) + 100000}"
    sent = sender.send(channel, destination, code)
    if not sent:
        raise RuntimeError("OTP delivery failed")

    pipe = redis.pipeline()
    pipe.set(
        _code_key(purpose, channel, destination),
        hash_otp_code(code),
        ex=settings.otp_ttl_seconds,
    )
    pipe.delete(_attempts_key(purpose, channel, destination))
    pipe.execute()

    dev_code = code if (settings.otp_dev_echo or settings.is_dev or settings.is_test) else None
    return settings.otp_ttl_seconds, dev_code


def verify_otp(
    redis: Redis,
    channel: OtpChannel,
    destination: str,
    code: str,
    purpose: str = "login",
) -> bool:
    """Check a code. Consumes it on success; bounded attempts on failure."""
    settings = get_settings()
    code_key = _code_key(purpose, channel, destination)
    attempts_key = _attempts_key(purpose, channel, destination)

    stored_hash = redis.get(code_key)
    if stored_hash is None:
        return False

    attempts = int(redis.incr(attempts_key))
    redis.expire(attempts_key, settings.otp_ttl_seconds)
    if attempts > settings.otp_max_attempts:
        redis.delete(code_key, attempts_key)
        return False

    if secrets.compare_digest(str(stored_hash), hash_otp_code(code)):
        redis.delete(code_key, attempts_key)
        return True
    return False
