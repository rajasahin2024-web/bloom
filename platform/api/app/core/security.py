"""Security primitives: password hashing, JWT access tokens, refresh tokens.

- Passwords: argon2id via pwdlib (bcrypt kept on the hasher for legacy hashes).
- Access tokens: short-lived signed JWTs (sub=user id, role claim).
- Refresh tokens: opaque random strings; only the SHA-256 hash is stored so a
  DB leak does not compromise live sessions.
"""

from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from pwdlib import PasswordHash

from app.core.config import get_settings
from app.models.enums import UserRole

_password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return _password_hash.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _password_hash.verify(password, password_hash)
    except Exception:  # noqa: BLE001 - unknown/legacy hash format
        return False


def create_access_token(user_id: uuid.UUID, role: UserRole) -> tuple[str, int]:
    """Return (signed JWT, expires_in seconds)."""
    settings = get_settings()
    ttl = settings.access_token_ttl_minutes * 60
    now = datetime.now(UTC)
    claims: dict[str, Any] = {
        "sub": str(user_id),
        "role": role.value,
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=ttl)).timestamp()),
    }
    return jwt.encode(claims, settings.jwt_secret, algorithm=settings.jwt_algorithm), ttl


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Decode and validate an access token; return claims or None."""
    settings = get_settings()
    try:
        claims: dict[str, Any] = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            options={"require": ["sub", "exp", "iat"]},
        )
    except jwt.PyJWTError:
        return None
    if claims.get("type") != "access":
        return None
    return claims


def generate_refresh_token() -> str:
    """Opaque refresh token presented by clients; only its hash is stored."""
    return secrets.token_urlsafe(48)


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def hash_otp_code(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()
