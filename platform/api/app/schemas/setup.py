"""Setup wizard request/response schemas.

The JSON shapes in this module are the FIXED contract shared with the
`/setup` frontend — do not rename or restructure without coordinating.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class DatabaseTestIn(BaseModel):
    host: str = Field(min_length=1, max_length=255)
    port: int = Field(default=5432, ge=1, le=65535)
    database: str = Field(min_length=1, max_length=128)
    username: str = Field(min_length=1, max_length=128)
    password: str = Field(default="", max_length=256)
    ssl: bool = False
    connection_type: Literal["direct", "pgbouncer"] = "direct"


class SetupCheck(BaseModel):
    name: str
    ok: bool
    detail: str | None = None


class DatabaseTestOut(BaseModel):
    ok: bool
    checks: list[SetupCheck]
    postgres_version: str | None = None
    pgvector_installed: bool = False
    pgbouncer_detected: bool = False
    error: str | None = None
    hint: str | None = None


class RedisTestIn(BaseModel):
    host: str = Field(min_length=1, max_length=255)
    port: int = Field(default=6379, ge=1, le=65535)
    password: str | None = Field(default=None, max_length=256)


class RedisTestOut(BaseModel):
    ok: bool
    error: str | None = None


class SetupApplyIn(BaseModel):
    database: DatabaseTestIn
    redis: RedisTestIn | None = None
    admin_email: EmailStr
    admin_password: str = Field(min_length=8, max_length=128)
    admin_name: str = Field(min_length=1, max_length=200)
    # Institute identity — pushed into env-backed core settings on apply.
    institute_name: str = Field(min_length=1, max_length=200)
    institute_tagline: str = Field(default="", max_length=300)
    # Optional logo as a `data:image/{png|jpeg|webp};base64,…` URL.
    institute_logo: str | None = Field(default=None, max_length=750_000)


class BrandingOut(BaseModel):
    """Public institute identity — readable before and after setup."""

    name: str
    tagline: str
    logo_url: str | None = None


class SetupApplyOut(BaseModel):
    ok: bool
    configured: bool
    error: str | None = None


class SetupStatusOut(BaseModel):
    configured: bool
