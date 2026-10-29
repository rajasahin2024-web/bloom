"""Auth service — registration, login, refresh-token rotation, logout."""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from redis import Redis
from redis.exceptions import RedisError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.models.enums import UserRole
from app.models.user import RefreshToken, Student, User
from app.schemas.auth import LoginIn, RegisterIn, TokenPair, UserOut
from app.services import rate_limit

logger = logging.getLogger(__name__)


def enforce_login_rate_limit(redis: Redis, client_ip: str | None, email: str) -> None:
    """Brute-force guard for POST /api/auth/login.

    Fixed-window limits on BOTH the caller IP and the target email. On a trip
    the response is a generic 429 — identical regardless of which bucket
    fired — so the limiter can't be used to enumerate anything. Fails closed
    (503) when Redis is unreachable: a brute-force control that silently
    disables itself is worse than a login outage.
    """
    settings = get_settings()
    window = settings.login_rate_limit_window_seconds
    try:
        ip_ok = rate_limit.hit(
            redis,
            "login:ip",
            client_ip or "unknown",
            settings.login_rate_limit_ip,
            window,
        )
        email_ok = rate_limit.hit(
            redis,
            "login:email",
            email.strip().lower(),
            settings.login_rate_limit_email,
            window,
        )
    except RedisError:
        logger.exception("Login rate limiter unavailable — refusing attempt")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Login is temporarily unavailable",
        ) from None
    if not (ip_ok and email_ok):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts — please try again later.",
            headers={"Retry-After": str(window)},
        )


def _issue_token_pair(db: Session, user: User) -> TokenPair:
    settings = get_settings()
    access_token, expires_in = create_access_token(user.id, user.role)
    refresh_token = generate_refresh_token()
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_refresh_token(refresh_token),
            expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_ttl_days),
        )
    )
    return TokenPair(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
    )


def register(db: Session, payload: RegisterIn) -> tuple[User, TokenPair]:
    """Self-registration creates a student account (role=student + profile).

    Teacher/admin accounts are provisioned by admins, not via this endpoint.
    """
    existing = db.scalar(select(User.id).where(User.email == payload.email))
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )
    user = User(
        email=payload.email,
        phone=payload.phone,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        role=UserRole.student,
    )
    db.add(user)
    db.flush()  # assign user.id before creating the profile
    db.add(Student(user_id=user.id))
    tokens = _issue_token_pair(db, user)
    db.commit()
    db.refresh(user)
    return user, tokens


def login(db: Session, payload: LoginIn) -> tuple[User, TokenPair]:
    user = db.scalar(select(User).where(User.email == payload.email))
    if (
        user is None
        or user.password_hash is None
        or not verify_password(payload.password, user.password_hash)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")
    tokens = _issue_token_pair(db, user)
    db.commit()
    return user, tokens


def refresh(db: Session, presented_token: str) -> tuple[User, TokenPair]:
    """Rotate a refresh token: revoke the presented one, issue a new pair."""
    token_hash = hash_refresh_token(presented_token)
    stored = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    now = datetime.now(UTC)
    if (
        stored is None
        or stored.revoked_at is not None
        or stored.expires_at <= now
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )
    user = db.get(User, stored.user_id)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )
    stored.revoked_at = now
    tokens = _issue_token_pair(db, user)
    db.commit()
    return user, tokens


def logout(db: Session, presented_token: str) -> None:
    """Revoke a refresh token. Idempotent — unknown tokens are a no-op."""
    token_hash = hash_refresh_token(presented_token)
    stored = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    if stored is not None and stored.revoked_at is None:
        stored.revoked_at = datetime.now(UTC)
        db.commit()


def get_user(db: Session, user_id: uuid.UUID) -> User | None:
    return db.get(User, user_id)


def to_user_out(user: User) -> UserOut:
    return UserOut.model_validate(user)
