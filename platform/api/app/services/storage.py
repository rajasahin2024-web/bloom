"""Cloudflare R2 object storage — settings-driven S3 client and admin ops.

R2 speaks the S3 API at ``https://<account-id>.r2.cloudflarestorage.com``
(region ``auto``). Configuration lives in the ``storage.r2.*`` settings
keys; the boto3 client is built lazily from resolved settings and cached
per credential set so hot paths (media serving) don't rebuild it.

Every S3 failure is normalised to :class:`StorageError` — routers surface
those as clean 4xx/502 responses. Raw AWS/botocore messages and the stored
credentials never reach an API response or a log line.
"""

from __future__ import annotations

import logging
from collections.abc import Callable, Iterator
from dataclasses import dataclass
from typing import Any, TypeVar

import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import BotoCoreError, ClientError
from sqlalchemy.orm import Session

from app.services import settings as settings_service

logger = logging.getLogger(__name__)

_ENDPOINT_TEMPLATE = "https://{account_id}.r2.cloudflarestorage.com"
_USAGE_OBJECT_CAP = 10_000
_FOLDER_OP_CAP = 10_000
_DELETE_BATCH = 1_000
_STREAM_CHUNK_BYTES = 64 * 1024
_CONTENT_CAP_BYTES = 1024 * 1024
_MAX_KEY_LENGTH = 1024

# Mimes that are safe to read/edit as text; anything else is rejected
# before a byte is read. Extension allowlist covers objects stored with a
# generic application/octet-stream type.
_TEXT_MIMES = {
    "application/json",
    "application/xml",
    "application/javascript",
    "application/x-javascript",
    "application/yaml",
    "application/x-yaml",
    "application/toml",
    "application/sql",
    "application/x-sh",
    "image/svg+xml",
}
_TEXT_EXTS = {
    "txt", "md", "markdown", "json", "js", "mjs", "cjs", "css", "html",
    "htm", "xml", "yaml", "yml", "csv", "tsv", "svg", "log", "ini", "cfg",
    "conf", "toml", "env", "py", "ts", "tsx", "jsx", "sql", "sh",
    "gitignore", "htaccess",
}
_GENERIC_MIMES = {"", "application/octet-stream", "binary/octet-stream"}

T = TypeVar("T")


class StorageError(Exception):
    """API-safe storage failure — ``http_status`` is the code to surface."""

    def __init__(self, detail: str, http_status: int = 502) -> None:
        super().__init__(detail)
        self.detail = detail
        self.http_status = http_status


@dataclass(frozen=True)
class R2Config:
    """Effective R2 configuration resolved from the settings registry."""

    enabled: bool
    account_id: str
    access_key_id: str
    secret_access_key: str
    bucket: str
    prefix_media: str
    prefix_public_uploads: str
    prefix_files: str

    @property
    def configured(self) -> bool:
        return bool(
            self.account_id and self.access_key_id and self.secret_access_key
        )

    @property
    def active(self) -> bool:
        """New uploads go to R2 only when enabled, credentialed and bucketed."""
        return self.enabled and self.configured and bool(self.bucket)

    @property
    def prefixes(self) -> dict[str, str]:
        return {
            "media": self.prefix_media,
            "public_uploads": self.prefix_public_uploads,
            "files": self.prefix_files,
        }


def resolve_config(db: Session) -> R2Config:
    m = settings_service.resolved_map(db)
    return R2Config(
        enabled=bool(m.get("storage.r2.enabled")),
        account_id=m.get("storage.r2.account_id") or "",
        access_key_id=m.get("storage.r2.access_key_id") or "",
        secret_access_key=m.get("storage.r2.secret_access_key") or "",
        bucket=m.get("storage.r2.bucket") or "",
        prefix_media=m.get("storage.r2.prefix_media") or "media/",
        prefix_public_uploads=m.get("storage.r2.prefix_public_uploads")
        or "uploads/",
        prefix_files=m.get("storage.r2.prefix_files") or "files/",
    )


# ── client ───────────────────────────────────────────────────────────────

# One client per credential set — boto3 clients are thread-safe and cheap
# to reuse; rebuilding per request would re-run endpoint resolution every
# time. Bounded so churned/bad credentials can't grow the map forever.
_clients: dict[tuple[str, str, str], Any] = {}
_CLIENT_CACHE_MAX = 16


def get_client(cfg: R2Config) -> Any:
    """S3 client for the config's credential set (cached, lazy)."""
    key = (cfg.account_id, cfg.access_key_id, cfg.secret_access_key)
    client = _clients.get(key)
    if client is None:
        if len(_clients) >= _CLIENT_CACHE_MAX:
            _clients.clear()
        client = boto3.client(
            "s3",
            endpoint_url=_ENDPOINT_TEMPLATE.format(account_id=cfg.account_id),
            aws_access_key_id=cfg.access_key_id,
            aws_secret_access_key=cfg.secret_access_key,
            region_name="auto",
            config=BotoConfig(
                signature_version="s3v4",
                connect_timeout=5,
                read_timeout=30,
                retries={"max_attempts": 2},
            ),
        )
        _clients[key] = client
    return client


# ── error mapping ────────────────────────────────────────────────────────

_NOT_FOUND_CODES = {"NoSuchBucket", "NoSuchKey", "NotFound", "404"}
_AUTH_CODES = {
    "AccessDenied",
    "InvalidAccessKeyId",
    "SignatureDoesNotMatch",
    "InvalidToken",
    "Forbidden",
}
_CONFLICT_CODES = {"BucketAlreadyExists", "BucketAlreadyOwnedByYou"}


def _map_error(exc: ClientError, context: str) -> StorageError:
    code = str(exc.response.get("Error", {}).get("Code", ""))
    status = int(exc.response.get("ResponseMetadata", {}).get("HTTPStatusCode") or 0)
    if code in _NOT_FOUND_CODES or status == 404:
        return StorageError(f"{context}: not found", 404)
    if code in _CONFLICT_CODES or status == 409:
        return StorageError(f"{context}: name conflict", 409)
    if code in _AUTH_CODES or status in (401, 403):
        return StorageError(f"{context}: credentials rejected", 502)
    return StorageError(f"{context}: storage backend error", 502)


def _call(fn: Callable[..., T], context: str, **kwargs: Any) -> T:
    """Run one S3 call, normalising every failure mode to StorageError."""
    try:
        return fn(**kwargs)
    except ClientError as exc:
        raise _map_error(exc, context) from exc
    except BotoCoreError as exc:
        # DNS/connect/timeout/TLS failures — the R2 endpoint is unreachable.
        raise StorageError(
            f"{context}: storage backend unreachable", 502
        ) from exc


def check_reachable(cfg: R2Config) -> bool:
    """ListBuckets probe — False on any failure (network, auth, …)."""
    if not cfg.configured:
        return False
    try:
        get_client(cfg).list_buckets()
        return True
    except Exception:  # noqa: BLE001 - reachability must never throw
        return False


# ── bucket / object operations ───────────────────────────────────────────


def list_buckets(client: Any) -> list[dict[str, Any]]:
    resp = _call(client.list_buckets, "list buckets")
    return [
        {
            "name": b["Name"],
            "created_at": (
                b["CreationDate"].isoformat() if b.get("CreationDate") else None
            ),
        }
        for b in resp.get("Buckets", [])
    ]


def create_bucket(client: Any, name: str, location: str | None = None) -> None:
    kwargs: dict[str, Any] = {"Bucket": name}
    if location:
        kwargs["CreateBucketConfiguration"] = {"LocationConstraint": location}
    _call(client.create_bucket, "create bucket", **kwargs)


def head_bucket(client: Any, bucket: str) -> None:
    """Existence+access check — raises StorageError on failure."""
    _call(client.head_bucket, "check bucket", Bucket=bucket)


def list_objects(
    client: Any,
    bucket: str,
    prefix: str,
    continuation_token: str | None,
    max_keys: int,
) -> dict[str, Any]:
    """One ListObjectsV2 page, folder-style (``Delimiter="/"``)."""
    kwargs: dict[str, Any] = {
        "Bucket": bucket,
        "Prefix": prefix,
        "Delimiter": "/",
        "MaxKeys": max_keys,
    }
    if continuation_token:
        kwargs["ContinuationToken"] = continuation_token
    resp = _call(client.list_objects_v2, "list objects", **kwargs)
    return {
        "folders": [p["Prefix"] for p in resp.get("CommonPrefixes", [])],
        "objects": [
            {
                "key": o["Key"],
                "size": o.get("Size", 0),
                "last_modified": (
                    o["LastModified"].isoformat()
                    if o.get("LastModified")
                    else None
                ),
            }
            for o in resp.get("Contents", [])
        ],
        "next_token": resp.get("NextContinuationToken"),
        "truncated": bool(resp.get("IsTruncated")),
    }


def usage(client: Any, bucket: str) -> dict[str, Any]:
    """Bucket byte/object totals — paginated, capped at 10k objects."""
    total_bytes = 0
    count = 0
    token: str | None = None
    truncated = False
    while True:
        kwargs: dict[str, Any] = {"Bucket": bucket, "MaxKeys": 1000}
        if token:
            kwargs["ContinuationToken"] = token
        resp = _call(client.list_objects_v2, "read usage", **kwargs)
        for obj in resp.get("Contents", []):
            total_bytes += obj.get("Size", 0)
            count += 1
            if count >= _USAGE_OBJECT_CAP:
                truncated = True
                break
        if truncated or not resp.get("IsTruncated"):
            break
        token = resp.get("NextContinuationToken")
        if not token:
            break
    return {"bytes": total_bytes, "object_count": count, "truncated": truncated}


def put_object(
    client: Any, bucket: str, key: str, body: bytes, content_type: str
) -> None:
    _call(
        client.put_object,
        "upload object",
        Bucket=bucket,
        Key=key,
        Body=body,
        ContentType=content_type,
    )


def get_object(client: Any, bucket: str, key: str) -> dict[str, Any]:
    return _call(client.get_object, "read object", Bucket=bucket, Key=key)


def stream_body(body: Any) -> Iterator[bytes]:
    """Chunk a GetObject ``Body`` — boto3 StreamingBody or any file-like."""
    if hasattr(body, "iter_chunks"):
        yield from body.iter_chunks(chunk_size=_STREAM_CHUNK_BYTES)
    elif hasattr(body, "read"):
        while chunk := body.read(_STREAM_CHUNK_BYTES):
            yield chunk
    else:
        yield from body


# ── explorer object ops (TEC-174) ────────────────────────────────────────


def validate_key(key: str) -> str:
    """Traversal guard for object keys — ``..`` segments, leading ``/``
    and oversized keys are rejected as 422 before any S3 call."""
    if (
        not key
        or key.startswith("/")
        or len(key) > _MAX_KEY_LENGTH
        or ".." in key.split("/")
    ):
        raise StorageError("invalid object key", 422)
    return key


def validate_prefix(prefix: str) -> str:
    """Same rules as keys but empty is fine (bucket root)."""
    if (
        prefix.startswith("/")
        or len(prefix) > _MAX_KEY_LENGTH
        or ".." in prefix.split("/")
    ):
        raise StorageError("invalid prefix", 422)
    return prefix


def sanitize_filename(name: str) -> str:
    """Reduce an upload filename to a plain basename — browsers and
    clients can send path separators or ``..`` components."""
    base = name.replace("\\", "/").rsplit("/", 1)[-1].strip()
    if not base or base in {".", ".."}:
        raise StorageError("invalid filename", 422)
    return base


def is_text_mime(mime: str | None, key: str) -> bool:
    """Whether an object is safe to read/write through the text editor."""
    base = (mime or "").split(";", 1)[0].strip().lower()
    if base.startswith("text/") or base in _TEXT_MIMES:
        return True
    if base in _GENERIC_MIMES:
        ext = key.rsplit(".", 1)[-1].lower() if "." in key else ""
        return ext in _TEXT_EXTS
    return False


def head_object(client: Any, bucket: str, key: str) -> dict[str, Any]:
    """Metadata for one key — StorageError 404 when missing."""
    return _call(client.head_object, "check object", Bucket=bucket, Key=key)


def object_exists(client: Any, bucket: str, key: str) -> bool:
    try:
        head_object(client, bucket, key)
        return True
    except StorageError as exc:
        if exc.http_status == 404:
            return False
        raise


def copy_object(client: Any, bucket: str, source: str, dest: str) -> None:
    _call(
        client.copy_object,
        "copy object",
        Bucket=bucket,
        Key=dest,
        CopySource={"Bucket": bucket, "Key": source},
    )


def delete_object(client: Any, bucket: str, key: str) -> None:
    _call(client.delete_object, "delete object", Bucket=bucket, Key=key)


def delete_objects(client: Any, bucket: str, keys: list[str]) -> int:
    """One DeleteObjects batch (caller keeps ≤1000 keys). Returns the
    number deleted; raises on any per-object error."""
    resp = _call(
        client.delete_objects,
        "delete objects",
        Bucket=bucket,
        Delete={
            "Objects": [{"Key": k} for k in keys],
            "Quiet": True,
        },
    )
    errors = resp.get("Errors") or []
    if errors:
        raise StorageError("delete objects: partial failure", 502)
    return len(keys)


def list_all_keys(
    client: Any, bucket: str, prefix: str, cap: int = _FOLDER_OP_CAP
) -> list[str]:
    """Every key under a prefix (no delimiter) — used by recursive
    folder ops. Bounded at ``cap`` so a runaway prefix fails cleanly
    instead of streaming forever."""
    keys: list[str] = []
    token: str | None = None
    while True:
        kwargs: dict[str, Any] = {
            "Bucket": bucket,
            "Prefix": prefix,
            "MaxKeys": 1000,
        }
        if token:
            kwargs["ContinuationToken"] = token
        resp = _call(client.list_objects_v2, "list objects", **kwargs)
        keys.extend(o["Key"] for o in resp.get("Contents", []))
        if len(keys) > cap:
            raise StorageError(
                "too many objects under prefix", 502
            )
        if not resp.get("IsTruncated"):
            break
        token = resp.get("NextContinuationToken")
        if not token:
            break
    return keys


def read_text_content(
    client: Any, bucket: str, key: str, cap: int = _CONTENT_CAP_BYTES
) -> dict[str, Any]:
    """GetObject + text checks for the editor endpoints. Non-text mime →
    415 before a byte is read; reads at most ``cap`` bytes and flags
    truncation."""
    obj = get_object(client, bucket, key)
    mime = obj.get("ContentType") or "application/octet-stream"
    if not is_text_mime(mime, key):
        raise StorageError("not a text object", 415)
    size = int(obj.get("ContentLength") or 0)
    body = obj.get("Body")
    raw = b""
    if body is not None:
        raw = body.read(cap + 1) if hasattr(body, "read") else bytes(body)
    truncated = len(raw) > cap or size > cap
    raw = raw[:cap]
    return {
        "content": raw.decode("utf-8", errors="replace"),
        "mime": mime,
        "size": size or len(raw),
        "truncated": truncated,
    }


def presigned_get_url(
    client: Any, bucket: str, key: str, expires_in: int
) -> str:
    """Time-bounded public GET URL — the "share" primitive for the
    explorer. Anyone holding it can read the object until expiry."""
    try:
        return str(
            client.generate_presigned_url(
                "get_object",
                Params={"Bucket": bucket, "Key": key},
                ExpiresIn=expires_in,
            )
        )
    except (ClientError, BotoCoreError) as exc:
        raise StorageError(
            "share object: storage backend error", 502
        ) from exc
