"""Auth router — register / login / refresh / logout / me + OTP hooks."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from redis import Redis
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.redis import get_redis
from app.deps import get_current_user
from app.models.user import User
from app.schemas.auth import (
    LoginIn,
    LogoutIn,
    OtpRequestIn,
    OtpRequestOut,
    OtpVerifyIn,
    OtpVerifyOut,
    RefreshIn,
    RegisterIn,
    RegisterOut,
    TokenPair,
    UserOut,
)
from app.services import auth as auth_service
from app.services import otp as otp_service
from app.services.otp import DevOtpSender

router = APIRouter(prefix="/api/auth", tags=["auth"])

# HttpOnly carrier for the refresh token (TEC-155 MEDIUM-2). Scoped to the
# auth endpoints so it is never sent to unrelated routes; SameSite=Strict
# keeps it off cross-site requests entirely.
REFRESH_COOKIE_NAME = "bloom_refresh"
REFRESH_COOKIE_PATH = "/api/auth"


def _refresh_cookie_secure() -> bool:
    """Secure outside dev/test — httpx/TestClient won't echo a Secure cookie
    over plain http, and local dev runs http://localhost only."""
    settings = get_settings()
    return not (settings.is_dev or settings.is_test)


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        REFRESH_COOKIE_NAME,
        refresh_token,
        max_age=get_settings().refresh_token_ttl_days * 86400,
        path=REFRESH_COOKIE_PATH,
        httponly=True,
        secure=_refresh_cookie_secure(),
        samesite="strict",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        REFRESH_COOKIE_NAME,
        path=REFRESH_COOKIE_PATH,
        httponly=True,
        secure=_refresh_cookie_secure(),
        samesite="strict",
    )


@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=RegisterOut)
def register(
    payload: RegisterIn,
    response: Response,
    db: Session = Depends(get_db),
) -> RegisterOut:
    user, tokens = auth_service.register(db, payload)
    _set_refresh_cookie(response, tokens.refresh_token)
    return RegisterOut(user=UserOut.model_validate(user), tokens=tokens)


@router.post("/login", response_model=RegisterOut)
def login(
    payload: LoginIn,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> RegisterOut:
    auth_service.enforce_login_rate_limit(
        redis, request.client.host if request.client else None, payload.email
    )
    user, tokens = auth_service.login(db, payload)
    _set_refresh_cookie(response, tokens.refresh_token)
    return RegisterOut(user=UserOut.model_validate(user), tokens=tokens)


@router.post("/refresh", response_model=TokenPair, response_model_exclude_none=True)
def refresh(
    request: Request,
    response: Response,
    payload: RefreshIn | None = None,
    db: Session = Depends(get_db),
) -> TokenPair:
    """Rotate a refresh token. Body transport stays for non-browser clients;
    browser clients present the HttpOnly cookie and get the rotated value
    back via Set-Cookie — the JSON response carries the access token only."""
    via_cookie = not (payload and payload.refresh_token)
    presented = (
        payload.refresh_token if payload else None
    ) or request.cookies.get(REFRESH_COOKIE_NAME)
    if not presented:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )
    _, tokens = auth_service.refresh(db, presented)
    _set_refresh_cookie(response, tokens.refresh_token)
    if via_cookie:
        return tokens.model_copy(update={"refresh_token": None})
    return tokens


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    request: Request,
    response: Response,
    payload: LogoutIn | None = None,
    db: Session = Depends(get_db),
) -> None:
    presented = (
        payload.refresh_token if payload else None
    ) or request.cookies.get(REFRESH_COOKIE_NAME)
    if presented:
        auth_service.logout(db, presented)
    _clear_refresh_cookie(response)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(user)


@router.post("/otp/request", response_model=OtpRequestOut)
def otp_request(
    payload: OtpRequestIn,
    redis: Redis = Depends(get_redis),
) -> OtpRequestOut:
    ttl, dev_code = otp_service.request_otp(
        redis, DevOtpSender(), payload.channel, payload.destination, payload.purpose
    )
    return OtpRequestOut(sent=True, ttl_seconds=ttl, dev_code=dev_code)


@router.post("/otp/verify", response_model=OtpVerifyOut)
def otp_verify(
    payload: OtpVerifyIn,
    redis: Redis = Depends(get_redis),
) -> OtpVerifyOut:
    verified = otp_service.verify_otp(
        redis, payload.channel, payload.destination, payload.code, payload.purpose
    )
    return OtpVerifyOut(verified=verified)
