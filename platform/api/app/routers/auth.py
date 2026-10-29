"""Auth router — register / login / refresh / logout / me + OTP hooks."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request, status
from redis import Redis
from sqlalchemy.orm import Session

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


@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=RegisterOut)
def register(payload: RegisterIn, db: Session = Depends(get_db)) -> RegisterOut:
    user, tokens = auth_service.register(db, payload)
    return RegisterOut(user=UserOut.model_validate(user), tokens=tokens)


@router.post("/login", response_model=RegisterOut)
def login(
    payload: LoginIn,
    request: Request,
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> RegisterOut:
    auth_service.enforce_login_rate_limit(
        redis, request.client.host if request.client else None, payload.email
    )
    user, tokens = auth_service.login(db, payload)
    return RegisterOut(user=UserOut.model_validate(user), tokens=tokens)


@router.post("/refresh", response_model=TokenPair)
def refresh(payload: RefreshIn, db: Session = Depends(get_db)) -> TokenPair:
    _, tokens = auth_service.refresh(db, payload.refresh_token)
    return tokens


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(payload: LogoutIn, db: Session = Depends(get_db)) -> None:
    auth_service.logout(db, payload.refresh_token)


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
