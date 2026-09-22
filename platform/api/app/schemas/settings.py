"""Admin settings API schemas.

Response shapes for `GET/PATCH /api/admin/settings` — the grouped registry
view the General Settings page renders. `value`/`default` are free-form JSON
because setting types differ per key (string, bool, number, null).
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel


class SettingItemOut(BaseModel):
    key: str
    group: str
    label: str
    type: str
    value: Any = None
    default: Any = None
    source: Literal["db", "env"]
    options: list[str] | None = None
    description: str = ""
    updated_at: str | None = None


class SettingGroupOut(BaseModel):
    id: str
    label: str
    description: str
    items: list[SettingItemOut]


class PlatformStatusOut(BaseModel):
    ok: bool
    detail: str | None = None


class PlatformInfoOut(BaseModel):
    env: str
    version: str
    storage: PlatformStatusOut
    mail_engine: PlatformStatusOut


class SettingsOut(BaseModel):
    groups: list[SettingGroupOut]
    platform: PlatformInfoOut
