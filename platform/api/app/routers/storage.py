"""Storage admin router + public media serving.

`/api/admin/storage/*` manages the Cloudflare R2 connection, buckets,
folder-prefix map and usage — admin-only. `/api/media/serve/{key}` is the
public byte stream media URLs point at when R2 is active; it also serves
local-disk uploads so old media keeps working. Keys are unguessable UUID
paths, so no auth — S3 errors are never echoed back raw.
"""

from __future__ import annotations

from typing import Any, NoReturn

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import FileResponse, StreamingResponse
from redis import Redis
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.redis import get_redis
from app.deps import require_admin
from app.models.user import User
from app.schemas.storage import (
    StorageBucketIn,
    StorageBucketOut,
    StorageConnectionIn,
    StorageObjectsOut,
    StoragePrefixesIn,
    StoragePrefixesOut,
    StorageSelectIn,
    StorageStatusOut,
    StorageUsageOut,
)
from app.services import media as media_service
from app.services import settings as settings_service
from app.services import storage as storage_service
from app.services.storage import R2Config, StorageError

admin_router = APIRouter(
    prefix="/api/admin/storage",
    tags=["storage"],
    dependencies=[Depends(require_admin)],
)
media_router = APIRouter(prefix="/api/media", tags=["media"])

_IMMUTABLE_CACHE = "public, max-age=31536000, immutable"
_SHORT_CACHE = "public, max-age=30"
_MAX_OBJECTS_PAGE = 100


def _optional_redis() -> Redis | None:
    try:
        return get_redis()
    except Exception:  # noqa: BLE001
        return None


def _mask(value: str) -> str | None:
    """Show just enough to identify which credential is stored."""
    if not value:
        return None
    return f"••••{value[-4:]}" if len(value) > 4 else "••••"


def _status_payload(db: Session) -> StorageStatusOut:
    cfg = storage_service.resolve_config(db)
    return StorageStatusOut(
        configured=cfg.configured,
        account_id=_mask(cfg.account_id),
        access_key_id=_mask(cfg.access_key_id),
        bucket=cfg.bucket,
        prefixes=StoragePrefixesOut(**cfg.prefixes),
        reachable=storage_service.check_reachable(cfg),
    )


def _save(db: Session, changes: dict[str, Any], user: User) -> None:
    settings_service.write_values(db, changes, user)
    settings_service.invalidate(_optional_redis())


def _require_client(db: Session) -> tuple[R2Config, Any]:
    cfg = storage_service.resolve_config(db)
    if not cfg.configured:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="storage_not_configured",
        )
    return cfg, storage_service.get_client(cfg)


def _require_bucket(cfg: R2Config, bucket: str | None) -> str:
    name = bucket or cfg.bucket
    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="no_bucket_selected"
        )
    return name


def _raise(exc: StorageError) -> NoReturn:
    raise HTTPException(status_code=exc.http_status, detail=exc.detail) from exc


@admin_router.get("/status", response_model=StorageStatusOut)
def storage_status(db: Session = Depends(get_db)) -> StorageStatusOut:
    return _status_payload(db)


@admin_router.put("/connection", response_model=StorageStatusOut)
def connect_storage(
    payload: StorageConnectionIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
) -> StorageStatusOut:
    cfg = R2Config(
        enabled=True,
        account_id=payload.account_id.strip(),
        access_key_id=payload.access_key_id.strip(),
        secret_access_key=payload.secret_access_key.strip(),
        bucket="",
        prefix_media="media/",
        prefix_public_uploads="uploads/",
        prefix_files="files/",
    )
    try:
        storage_service.get_client(cfg).list_buckets()
    except Exception as exc:  # noqa: BLE001 - any S3/transport failure = bad creds
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="connection_failed",
        ) from exc
    _save(
        db,
        {
            "storage.r2.account_id": cfg.account_id,
            "storage.r2.access_key_id": cfg.access_key_id,
            "storage.r2.secret_access_key": cfg.secret_access_key,
            "storage.r2.enabled": True,
        },
        user,
    )
    return _status_payload(db)


@admin_router.delete("/connection", response_model=StorageStatusOut)
def disconnect_storage(
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
) -> StorageStatusOut:
    _save(
        db,
        {
            "storage.r2.account_id": "",
            "storage.r2.access_key_id": "",
            "storage.r2.secret_access_key": "",
            "storage.r2.bucket": "",
            "storage.r2.enabled": False,
        },
        user,
    )
    return _status_payload(db)


@admin_router.get("/buckets", response_model=list[StorageBucketOut])
def list_buckets(db: Session = Depends(get_db)) -> list[StorageBucketOut]:
    _, client = _require_client(db)
    try:
        return [StorageBucketOut(**b) for b in storage_service.list_buckets(client)]
    except StorageError as exc:
        _raise(exc)


@admin_router.post(
    "/buckets", status_code=status.HTTP_201_CREATED, response_model=StorageBucketOut
)
def create_bucket(
    payload: StorageBucketIn,
    db: Session = Depends(get_db),
) -> StorageBucketOut:
    _, client = _require_client(db)
    try:
        storage_service.create_bucket(client, payload.name, payload.location)
    except StorageError as exc:
        _raise(exc)
    return StorageBucketOut(name=payload.name)


@admin_router.post("/select", response_model=StorageStatusOut)
def select_bucket(
    payload: StorageSelectIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
) -> StorageStatusOut:
    _, client = _require_client(db)
    try:
        storage_service.head_bucket(client, payload.bucket)
    except StorageError as exc:
        _raise(exc)
    _save(db, {"storage.r2.bucket": payload.bucket}, user)
    return _status_payload(db)


@admin_router.get("/objects", response_model=StorageObjectsOut)
def list_objects(
    bucket: str | None = Query(default=None),
    prefix: str = Query(default=""),
    continuation_token: str | None = Query(default=None),
    max_keys: int = Query(default=50, ge=1, le=_MAX_OBJECTS_PAGE),
    db: Session = Depends(get_db),
) -> StorageObjectsOut:
    cfg, client = _require_client(db)
    try:
        return StorageObjectsOut(
            **storage_service.list_objects(
                client,
                _require_bucket(cfg, bucket),
                prefix,
                continuation_token,
                max_keys,
            )
        )
    except StorageError as exc:
        _raise(exc)


@admin_router.put("/prefixes", response_model=StorageStatusOut)
def update_prefixes(
    payload: StoragePrefixesIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
) -> StorageStatusOut:
    mapping = {
        "media": "storage.r2.prefix_media",
        "public_uploads": "storage.r2.prefix_public_uploads",
        "files": "storage.r2.prefix_files",
    }
    changes: dict[str, Any] = {}
    errors: dict[str, str] = {}
    for field, key in mapping.items():
        value = getattr(payload, field)
        if value is None:
            continue
        if (
            not value.endswith("/")
            or value.startswith("/")
            or ".." in value.split("/")
        ):
            errors[key] = "must be a relative folder prefix ending in '/'"
            continue
        changes[key] = value
    if errors:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={"errors": errors},
        )
    if changes:
        _save(db, changes, user)
    return _status_payload(db)


@admin_router.get("/usage", response_model=StorageUsageOut)
def storage_usage(
    bucket: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> StorageUsageOut:
    cfg, client = _require_client(db)
    try:
        return StorageUsageOut(
            **storage_service.usage(client, _require_bucket(cfg, bucket))
        )
    except StorageError as exc:
        _raise(exc)


# ── public media serving ─────────────────────────────────────────────────

# Content-Type never comes straight from the DB field — a stored row can
# claim anything. Only the servable image allowlist goes out, derived from
# the key extension when the stored value is unusable.
_EXT_MIME = {
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "webp": "image/webp",
}


def _media_type_for(row: Any) -> str:
    if row.mime_type in media_service.ALLOWED_MIME_TYPES:
        return str(row.mime_type)
    ext = row.storage_key.rsplit(".", 1)[-1].lower()
    return _EXT_MIME.get(ext, "application/octet-stream")


@media_router.get("/serve/{key:path}")
def serve_media(key: str, db: Session = Depends(get_db)) -> Response:
    row = media_service.find_by_storage_key(key, db)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Not found"
        )
    cfg = storage_service.resolve_config(db)
    # Only server-generated keys under the public media prefixes are
    # servable — anything else is a 404 even though a row exists.
    if not media_service.is_servable_key(key, cfg.prefix_media):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Not found"
        )
    media_type = _media_type_for(row)
    headers = {
        "Cache-Control": _IMMUTABLE_CACHE,
        "X-Content-Type-Options": "nosniff",
    }

    path = media_service.media_file(key)
    if path is not None:
        return FileResponse(path, media_type=media_type, headers=headers)

    if cfg.configured and cfg.bucket:
        try:
            obj = storage_service.get_object(
                storage_service.get_client(cfg), cfg.bucket, key
            )
        except StorageError as exc:
            if exc.http_status == 404:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Not found"
                ) from exc
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="storage_unavailable",
                headers={"Cache-Control": _SHORT_CACHE},
            ) from exc
        body = obj.get("Body")
        if body is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="storage_unavailable",
                headers={"Cache-Control": _SHORT_CACHE},
            )
        length = obj.get("ContentLength")
        if length:
            headers["Content-Length"] = str(length)
        return StreamingResponse(
            storage_service.stream_body(body),
            media_type=media_type,
            headers=headers,
        )

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
