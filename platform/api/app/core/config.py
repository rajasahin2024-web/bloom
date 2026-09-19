"""Application configuration via pydantic-settings.

All settings are read from environment variables and `platform/.env` (see
`.env.example`). Secrets are never logged or echoed.

`DATABASE_URL` is optional: the app must boot unconfigured so the first-run
setup wizard (`/api/setup/*`) can serve. Non-setup routes return 503 until
setup writes `.env` — picked up lazily without a restart.
"""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Canonical env file is `platform/.env` (this file lives at
# platform/api/app/core/config.py). BLOOM_ENV_FILE overrides it — used by
# first-run installs and tests that need a clean/unconfigured environment.
PLATFORM_ENV_FILE = Path(
    os.environ.get("BLOOM_ENV_FILE") or Path(__file__).resolve().parents[3] / ".env"
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(PLATFORM_ENV_FILE, ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # Runtime
    api_env: str = Field(default="development", alias="API_ENV")
    api_host: str = Field(default="0.0.0.0", alias="API_HOST")
    api_port: int = Field(default=8000, alias="API_PORT")

    # Database — app runtime goes through PgBouncer (transaction pooling).
    # Optional so the app can boot unconfigured and serve the setup wizard.
    database_url: str | None = Field(default=None, alias="DATABASE_URL")
    # Migrations / admin connect directly to Postgres (session mode, safe for DDL).
    database_url_direct: str | None = Field(default=None, alias="DATABASE_URL_DIRECT")

    # Redis
    redis_url: str = Field(default="redis://redis:6379/0", alias="REDIS_URL")

    # Auth / JWT
    jwt_secret: str = Field(default="dev-only-insecure-secret", alias="JWT_SECRET")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    access_token_ttl_minutes: int = Field(default=30, alias="ACCESS_TOKEN_TTL_MINUTES")
    refresh_token_ttl_days: int = Field(default=30, alias="REFRESH_TOKEN_TTL_DAYS")

    # OTP (phone/email verification hooks)
    otp_ttl_seconds: int = Field(default=300, alias="OTP_TTL_SECONDS")
    otp_max_attempts: int = Field(default=5, alias="OTP_MAX_ATTEMPTS")
    # Dev/test convenience: echo the issued code back in the API response so the
    # flow can be exercised without an SMS/email provider. Never enable in prod.
    otp_dev_echo: bool = Field(default=False, alias="OTP_DEV_ECHO")

    # WAISE / WhatsApp alert webhook (adapter for TEC-64). When unset, alerts
    # are logged via the null notifier instead of POSTed anywhere.
    waise_webhook_url: str | None = Field(default=None, alias="WAISE_WEBHOOK_URL")
    waise_webhook_timeout_seconds: float = Field(
        default=5.0, alias="WAISE_WEBHOOK_TIMEOUT_SECONDS"
    )
    waise_team_number: str = Field(default="", alias="WAISE_TEAM_NUMBER")

    # First-run setup — written to `.env` by the setup wizard's apply step.
    # Once true, all /api/setup/* endpoints refuse with 410.
    setup_complete: bool = Field(default=False, alias="SETUP_COMPLETE")

    # CORS — comma-separated list of allowed origins.
    cors_origins: str = Field(
        default="http://localhost:5173,http://localhost:4173",
        alias="CORS_ORIGINS",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_dev(self) -> bool:
        return self.api_env == "development"

    @property
    def is_test(self) -> bool:
        return self.api_env == "test"


@lru_cache
def get_settings() -> Settings:
    return Settings()
