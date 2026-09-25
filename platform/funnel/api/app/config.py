"""Funnel API configuration via pydantic-settings.

All settings are read from environment variables and `platform/funnel/api/.env`
(see `.env.example`). Secrets are never logged or echoed.
"""

from __future__ import annotations

import secrets
from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

API_DIR = Path(__file__).resolve().parents[1]          # platform/funnel/api
FUNNEL_DIR = API_DIR.parent                             # platform/funnel
ENV_FILE = API_DIR / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(ENV_FILE, ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # Runtime
    api_host: str = Field(default="0.0.0.0", alias="API_HOST")
    api_port: int = Field(default=8090, alias="API_PORT")
    cors_origins: str = Field(default="*", alias="FUNNEL_CORS_ORIGINS")
    # Public base URL used to build absolute download/settle links.
    base_url: str = Field(default="", alias="FUNNEL_BASE_URL")

    # Storage
    db_path: str = Field(
        default=str(API_DIR / "data" / "funnel.db"), alias="FUNNEL_DB_PATH"
    )
    assets_dir: str = Field(
        default=str(FUNNEL_DIR / "assets"), alias="FUNNEL_ASSETS_DIR"
    )

    # Payment rail: "mock" (auto-settle, no keys) or "razorpay".
    payment_rail: str = Field(default="mock", alias="PAYMENT_RAIL")
    razorpay_key_id: str | None = Field(default=None, alias="RAZORPAY_KEY_ID")
    razorpay_key_secret: str | None = Field(default=None, alias="RAZORPAY_KEY_SECRET")
    razorpay_webhook_secret: str | None = Field(
        default=None, alias="RAZORPAY_WEBHOOK_SECRET"
    )
    # Razorpay sends `X-Razorpay-Test: true` on test-mode webhooks; surfaced in
    # logs. Signature verification is identical in both modes.
    razorpay_test: bool = Field(default=False, alias="RAZORPAY_X_RAZORPAY_TEST")

    # Meta Conversions API
    meta_pixel_id: str | None = Field(default=None, alias="META_PIXEL_ID")
    meta_capi_token: str | None = Field(default=None, alias="META_CAPI_TOKEN")
    meta_test_event_code: str | None = Field(default=None, alias="META_TEST_EVENT_CODE")
    # Default ON until real creds exist: logs the exact payload instead of sending.
    meta_capi_dry_run: bool = Field(default=True, alias="META_CAPI_DRY_RUN")

    # Admin / signing
    admin_token: str | None = Field(default=None, alias="ADMIN_TOKEN")
    download_signing_secret: str | None = Field(
        default=None, alias="DOWNLOAD_SIGNING_SECRET"
    )
    download_url_ttl_seconds: int = Field(
        default=24 * 3600, alias="DOWNLOAD_URL_TTL_SECONDS"
    )

    # Gated delivery area (buyer portal)
    gated_session_ttl_seconds: int = Field(
        default=30 * 24 * 3600, alias="GATED_SESSION_TTL_SECONDS"
    )
    # Failed-login budget per (ip, email) per 60s window.
    gated_login_max_attempts: int = Field(
        default=20, alias="GATED_LOGIN_MAX_ATTEMPTS"
    )
    certificates_dir: str = Field(
        default=str(API_DIR / "data" / "certificates"),
        alias="FUNNEL_CERTIFICATES_DIR",
    )
    # Optional explicit course manifest path; default search is
    # {assets_dir}/course/manifest.json then the bundled placeholder.
    course_manifest: str | None = Field(
        default=None, alias="FUNNEL_COURSE_MANIFEST"
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def signing_secret(self) -> str:
        # Ephemeral per-boot secret if unset: links break on restart, which is
        # acceptable in dev; production must set DOWNLOAD_SIGNING_SECRET.
        if self.download_signing_secret:
            return self.download_signing_secret
        return _ephemeral_secret()


@lru_cache
def _ephemeral_secret() -> str:
    return "ephemeral-" + secrets.token_hex(32)


@lru_cache
def get_settings() -> Settings:
    return Settings()
