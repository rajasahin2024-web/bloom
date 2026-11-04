"""Storage admin API schemas — R2 connection, buckets, objects, usage.

Contract per TEC-163 analysis (A3/A4): account/key identifiers are masked
in responses; the secret never leaves the server.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class StorageConnectionIn(BaseModel):
    # Cloudflare account IDs are 32-char lowercase hex — the value becomes
    # the S3 endpoint host, so URL delimiters must be impossible here.
    account_id: str = Field(pattern=r"^[a-z0-9]{32}$")
    access_key_id: str = Field(min_length=1, max_length=100)
    secret_access_key: str = Field(min_length=1, max_length=200)


class StoragePrefixesOut(BaseModel):
    media: str
    public_uploads: str
    files: str


class StorageStatusOut(BaseModel):
    configured: bool
    account_id: str | None = None  # masked — last 4 chars only
    access_key_id: str | None = None  # masked — last 4 chars only
    bucket: str
    prefixes: StoragePrefixesOut
    reachable: bool


class StorageBucketIn(BaseModel):
    name: str = Field(
        min_length=3, max_length=63, pattern=r"^[a-z0-9][a-z0-9.\-]*$"
    )
    location: str | None = Field(default=None, max_length=20)


class StorageBucketOut(BaseModel):
    name: str
    created_at: str | None = None


class StorageSelectIn(BaseModel):
    bucket: str = Field(min_length=1, max_length=63)


class StorageObjectOut(BaseModel):
    key: str
    size: int
    last_modified: str | None = None


class StorageObjectsOut(BaseModel):
    folders: list[str]
    objects: list[StorageObjectOut]
    next_token: str | None = None
    truncated: bool


class StoragePrefixesIn(BaseModel):
    media: str | None = Field(default=None, max_length=200)
    public_uploads: str | None = Field(default=None, max_length=200)
    files: str | None = Field(default=None, max_length=200)


class StorageUsageOut(BaseModel):
    bytes: int
    object_count: int
    truncated: bool


# ── explorer object ops (TEC-174) ────────────────────────────────────────


class StorageUploadOut(BaseModel):
    key: str
    size: int
    mime: str


class StorageMkdirIn(BaseModel):
    bucket: str | None = Field(default=None, max_length=63)
    prefix: str = Field(min_length=1, max_length=1024)


class StorageMkdirOut(BaseModel):
    prefix: str


class StorageRenameIn(BaseModel):
    bucket: str | None = Field(default=None, max_length=63)
    key: str = Field(min_length=1, max_length=1024)
    new_key: str = Field(min_length=1, max_length=1024)
    recursive: bool = False


class StorageRenameOut(BaseModel):
    key: str
    moved: int


class StorageContentOut(BaseModel):
    content: str
    mime: str
    size: int
    truncated: bool


class StorageContentIn(BaseModel):
    bucket: str | None = Field(default=None, max_length=63)
    key: str = Field(min_length=1, max_length=1024)
    content: str = Field(max_length=1_048_576)


class StorageContentPutOut(BaseModel):
    key: str
    size: int


class StorageShareIn(BaseModel):
    bucket: str | None = Field(default=None, max_length=63)
    key: str = Field(min_length=1, max_length=1024)
    expires_in: Literal[3600, 86400, 604800]


class StorageShareOut(BaseModel):
    url: str
    expires_at: str
