"""Storage admin router + public media serving.

`/api/admin/storage/*` manages the Cloudflare R2 connection, buckets,
folder-prefix map and usage — admin-only. `/api/media/serve/{key}` is the
public byte stream media URLs point at when R2 is active; it also serves
local-disk uploads so old media keeps working. Keys are unguessable UUID
paths, so no auth — S3 errors are never echoed back raw.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any, NoReturn

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    Response,
    UploadFile,
    status,
)
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
    StorageContentIn,
    StorageContentOut,
    StorageContentPutOut,
    StorageMkdirIn,
    StorageMkdirOut,
    StorageObjectsOut,
    StoragePrefixesIn,
    StoragePrefixesOut,
    StorageRenameIn,
    StorageRenameOut,
    StorageSelectIn,
    StorageShareIn,
    StorageShareOut,
    StorageStatusOut,
    StorageUploadOut,
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
_UPLOAD_MAX_BYTES = 10 * 1024 * 1024
_UPLOAD_CHUNK = 256 * 1024
_CONTENT_CAP_BYTES = 1024 * 1024
_DELETE_BATCH = 1_000


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


# ── object write ops (TEC-174) ───────────────────────────────────────────
#
# Explorer actions for the admin file browser. Every handler validates the
# key before touching S3 — ``..`` segments, leading ``/`` and >1024 chars
# are 422. Folder ops require an explicit ``recursive`` flag; a failure
# mid-way through a folder rename/delete returns 502 with progress counts
# so the UI can warn instead of guessing.


def _validated_key(key: str) -> str:
    try:
        return storage_service.validate_key(key)
    except StorageError as exc:
        _raise(exc)


def _validated_prefix(prefix: str) -> str:
    try:
        return storage_service.validate_prefix(prefix)
    except StorageError as exc:
        _raise(exc)


def _partial(op: str, counts: dict[str, int]) -> NoReturn:
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail={"error": f"partial_{op}", **counts},
    )


@admin_router.post(
    "/objects/upload",
    status_code=status.HTTP_201_CREATED,
    response_model=StorageUploadOut,
)
async def upload_object(
    file: UploadFile = File(...),
    bucket: str | None = Query(default=None),
    prefix: str = Query(default=""),
    overwrite: bool = Query(default=False),
    db: Session = Depends(get_db),
) -> StorageUploadOut:
    cfg, client = _require_client(db)
    bucket_name = _require_bucket(cfg, bucket)
    clean_prefix = _validated_prefix(prefix)
    try:
        name = storage_service.sanitize_filename(file.filename or "")
        key = storage_service.validate_key(f"{clean_prefix}{name}")
    except StorageError as exc:
        _raise(exc)
    data = bytearray()
    while chunk := await file.read(_UPLOAD_CHUNK):
        data += chunk
        if len(data) > _UPLOAD_MAX_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail="file_too_large",
            )
    mime = file.content_type or "application/octet-stream"
    try:
        if not overwrite and storage_service.object_exists(
            client, bucket_name, key
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="key_exists"
            )
        storage_service.put_object(client, bucket_name, key, bytes(data), mime)
    except StorageError as exc:
        _raise(exc)
    return StorageUploadOut(key=key, size=len(data), mime=mime)


@admin_router.post(
    "/objects/mkdir",
    status_code=status.HTTP_201_CREATED,
    response_model=StorageMkdirOut,
)
def mkdir_object(
    payload: StorageMkdirIn, db: Session = Depends(get_db)
) -> StorageMkdirOut:
    cfg, client = _require_client(db)
    bucket = _require_bucket(cfg, payload.bucket)
    prefix = _validated_prefix(payload.prefix.rstrip("/"))
    if not prefix:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="invalid prefix",
        )
    marker = f"{prefix}/"
    try:
        storage_service.put_object(
            client, bucket, marker, b"", "application/x-directory"
        )
    except StorageError as exc:
        _raise(exc)
    return StorageMkdirOut(prefix=marker)


@admin_router.post("/objects/rename", response_model=StorageRenameOut)
def rename_object(
    payload: StorageRenameIn, db: Session = Depends(get_db)
) -> StorageRenameOut:
    cfg, client = _require_client(db)
    bucket = _require_bucket(cfg, payload.bucket)
    src = _validated_key(payload.key)
    dst = _validated_key(payload.new_key)
    if src == dst:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="same_key",
        )
    if not src.endswith("/"):
        # a destination ending in "/" means "move into that folder"
        if dst.endswith("/"):
            dst = _validated_key(f"{dst}{src.rsplit('/', 1)[-1]}")
        try:
            storage_service.copy_object(client, bucket, src, dst)
        except StorageError as exc:
            _raise(exc)
        try:
            storage_service.delete_object(client, bucket, src)
        except StorageError:
            _partial("move", {"moved": 1, "deleted": 0})
        return StorageRenameOut(key=dst, moved=1)

    # folder move — S3 has no rename, so copy+delete every child
    if not payload.recursive:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="recursive_required"
        )
    dst_prefix = dst if dst.endswith("/") else f"{dst}/"
    if dst_prefix.startswith(src):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="cannot_move_into_itself",
        )
    try:
        keys = storage_service.list_all_keys(client, bucket, src)
    except StorageError as exc:
        _raise(exc)
    moved = 0
    for key in keys:
        try:
            storage_service.copy_object(
                client, bucket, key, f"{dst_prefix}{key[len(src):]}"
            )
        except StorageError:
            _partial("move", {"moved": moved, "deleted": 0})
        moved += 1
    deleted = 0
    for i in range(0, len(keys), _DELETE_BATCH):
        try:
            deleted += storage_service.delete_objects(
                client, bucket, keys[i : i + _DELETE_BATCH]
            )
        except StorageError:
            _partial("move", {"moved": moved, "deleted": deleted})
    return StorageRenameOut(key=dst_prefix, moved=moved)


@admin_router.delete("/objects", status_code=status.HTTP_204_NO_CONTENT)
def delete_object(
    bucket: str | None = Query(default=None),
    key: str = Query(...),
    recursive: bool = Query(default=False),
    db: Session = Depends(get_db),
) -> Response:
    cfg, client = _require_client(db)
    bucket_name = _require_bucket(cfg, bucket)
    key = _validated_key(key)
    if key.endswith("/"):
        if not recursive:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="recursive_required",
            )
        try:
            keys = storage_service.list_all_keys(client, bucket_name, key)
        except StorageError as exc:
            _raise(exc)
        deleted = 0
        for i in range(0, len(keys), _DELETE_BATCH):
            try:
                deleted += storage_service.delete_objects(
                    client, bucket_name, keys[i : i + _DELETE_BATCH]
                )
            except StorageError:
                _partial("delete", {"deleted": deleted})
    else:
        try:
            storage_service.delete_object(client, bucket_name, key)
        except StorageError as exc:
            _raise(exc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@admin_router.get("/objects/content", response_model=StorageContentOut)
def get_object_content(
    bucket: str | None = Query(default=None),
    key: str = Query(...),
    db: Session = Depends(get_db),
) -> StorageContentOut:
    cfg, client = _require_client(db)
    bucket_name = _require_bucket(cfg, bucket)
    key = _validated_key(key)
    try:
        return StorageContentOut(
            **storage_service.read_text_content(client, bucket_name, key)
        )
    except StorageError as exc:
        _raise(exc)


@admin_router.put("/objects/content", response_model=StorageContentPutOut)
def put_object_content(
    payload: StorageContentIn, db: Session = Depends(get_db)
) -> StorageContentPutOut:
    cfg, client = _require_client(db)
    bucket = _require_bucket(cfg, payload.bucket)
    key = _validated_key(payload.key)
    data = payload.content.encode("utf-8")
    if len(data) > _CONTENT_CAP_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="content_too_large",
        )
    try:
        head = storage_service.head_object(client, bucket, key)
        mime = head.get("ContentType") or "text/plain"
        if not storage_service.is_text_mime(mime, key):
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="not_a_text_object",
            )
    except StorageError as exc:
        if exc.http_status != 404:
            _raise(exc)
        mime = "text/plain"
    try:
        storage_service.put_object(client, bucket, key, data, mime)
    except StorageError as exc:
        _raise(exc)
    return StorageContentPutOut(key=key, size=len(data))


@admin_router.post("/objects/share", response_model=StorageShareOut)
def share_object(
    payload: StorageShareIn, db: Session = Depends(get_db)
) -> StorageShareOut:
    cfg, client = _require_client(db)
    bucket = _require_bucket(cfg, payload.bucket)
    key = _validated_key(payload.key)
    try:
        # never hand out a link to an object that isn't there
        storage_service.head_object(client, bucket, key)
        url = storage_service.presigned_get_url(
            client, bucket, key, payload.expires_in
        )
    except StorageError as exc:
        _raise(exc)
    expires_at = (
        datetime.now(UTC) + timedelta(seconds=payload.expires_in)
    ).isoformat()
    return StorageShareOut(url=url, expires_at=expires_at)


@admin_router.get("/objects/preview")
def preview_object(
    bucket: str | None = Query(default=None),
    key: str = Query(...),
    db: Session = Depends(get_db),
) -> Response:
    cfg, client = _require_client(db)
    bucket_name = _require_bucket(cfg, bucket)
    key = _validated_key(key)
    try:
        obj = storage_service.get_object(client, bucket_name, key)
    except StorageError as exc:
        _raise(exc)
    body = obj.get("Body")
    if body is None:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="storage_unavailable",
        )
    mime = obj.get("ContentType") or "application/octet-stream"
    name = key.rsplit("/", 1)[-1].replace('"', "")
    headers = {
        "Content-Disposition": f'inline; filename="{name}"',
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
    }
    if obj.get("ContentLength"):
        headers["Content-Length"] = str(obj["ContentLength"])
    return StreamingResponse(
        storage_service.stream_body(body), media_type=mime, headers=headers
    )


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
