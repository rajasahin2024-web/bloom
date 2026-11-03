"""Storage admin API schemas — R2 connection, buckets, objects, usage.

Contract per TEC-163 analysis (A3/A4): account/key identifiers are masked
in responses; the secret never leaves the server.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class StorageConnectionIn(BaseModel):
    account_id: str = Field(min_length=1, max_length=100)
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
