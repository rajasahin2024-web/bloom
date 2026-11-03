"""CMS media service — base64 data-URL uploads for the site builder.

Generalises the ``_save_image`` pattern from the setup/settings services
into a reusable upload + delete pair backed by the ``cms_media`` table.
Files land under ``uploads/cms/<uuid>.<ext>`` and are served from
``/uploads/cms/<uuid>.<ext>`` (the static mount in ``main.py``).
"""

from __future__ import annotations

import base64
import logging
import re
import uuid
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.cms import CmsMedia
from app.services import setup as setup_service
from app.services import storage as storage_service

logger = logging.getLogger(__name__)

_IMAGE_DATA_URL = re.compile(
    r"^data:image/(png|jpeg|webp);base64,(?P<data>.+)$", re.S
)
_IMAGE_EXT = {"png": "png", "jpeg": "jpg", "webp": "webp"}
_IMAGE_MAX_BYTES = 512 * 1024

# MIME types the public serve endpoint will ever emit — a stored row whose
# mime_type is anything else is served as application/octet-stream (and the
# response always carries X-Content-Type-Options: nosniff).
ALLOWED_MIME_TYPES = frozenset({"image/png", "image/jpeg", "image/webp"})

# Server-generated storage keys are always ``<prefix>/<uuid-hex>.<img-ext>``
# — the local ``cms/`` dir or the configured R2 media prefix.
_SERVABLE_KEY_RE = re.compile(r"^[0-9a-f]{32}\.(png|jpe?g|webp)$")

_UPLOAD_SUBDIR = "cms"


def save_cms_media(
    data_url: str,
    filename: str,
    mime_type: str | None,
    user_id: uuid.UUID,
    db: Session,
) -> CmsMedia:
    """Validate, persist and record a CMS media upload.

    Raises ``ValueError`` when the data URL is malformed or the payload
    exceeds the size cap; the router turns that into a 422.
    """
    match = _IMAGE_DATA_URL.match(data_url.strip())
    if not match:
        raise ValueError("image must be a PNG, JPEG or WebP data URL")
    raw = base64.b64decode(match.group("data"), validate=True)
    if len(raw) > _IMAGE_MAX_BYTES:
        raise ValueError("image must be 512KB or smaller")

    ext = _IMAGE_EXT[match.group(1)]
    stem = uuid.uuid4().hex
    # Caller-supplied mime_type is only honoured when it's a servable image
    # type — anything else falls back to the type implied by the data URL.
    detected_mime = (
        mime_type
        if mime_type in ALLOWED_MIME_TYPES
        else f"image/{match.group(1)}"
    )

    storage_key, url = _store_bytes(db, stem, ext, raw, detected_mime)

    row = CmsMedia(
        storage_key=storage_key,
        url=url,
        filename=filename,
        mime_type=detected_mime,
        size_bytes=len(raw),
        uploaded_by_id=user_id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _store_bytes(
    db: Session, stem: str, ext: str, raw: bytes, mime: str
) -> tuple[str, str]:
    """Persist bytes to R2 when active, else local disk; return (key, url).

    R2 failures degrade to the local path so an upload never dies on a
    storage outage — the row URL always reflects where the bytes went.
    """
    cfg = storage_service.resolve_config(db)
    if cfg.active:
        key = f"{cfg.prefix_media}{stem}.{ext}"
        try:
            storage_service.put_object(
                storage_service.get_client(cfg), cfg.bucket, key, raw, mime
            )
            return key, f"/api/media/serve/{key}"
        except storage_service.StorageError as exc:
            # exc.detail is already sanitised — never log the chained
            # ClientError, it can carry raw AWS internals / key ids.
            logger.warning(
                "R2 PutObject failed (%s) — falling back to local disk",
                exc.detail,
            )
    storage_key = f"{_UPLOAD_SUBDIR}/{stem}.{ext}"
    dest = setup_service.UPLOADS_DIR / _UPLOAD_SUBDIR
    dest.mkdir(parents=True, exist_ok=True)
    (dest / f"{stem}.{ext}").write_bytes(raw)
    return storage_key, f"/uploads/{storage_key}"


def _resolve_upload(storage_key: str) -> Path | None:
    """Resolve a storage key under UPLOADS_DIR — ``None`` when the resolved
    path escapes the uploads root (absolute path, ``..`` segments, …)."""
    root = setup_service.UPLOADS_DIR.resolve()
    path = (root / storage_key).resolve()
    if not path.is_relative_to(root):
        return None
    return path


def delete_cms_media(media_id: uuid.UUID, db: Session) -> None:
    """Delete a media row and the file it points at on disk."""
    row = db.get(CmsMedia, media_id)
    if row is None:
        return
    path = _resolve_upload(row.storage_key)
    if path is not None and path.is_file():
        try:
            path.unlink()
        except OSError:
            pass
    db.delete(row)
    db.commit()


def media_file(storage_key: str) -> Path | None:
    """Resolve a stored media file path, if it still exists on disk and
    stays inside the uploads directory."""
    path = _resolve_upload(storage_key)
    return path if path is not None and path.is_file() else None


def is_servable_key(storage_key: str, media_prefix: str) -> bool:
    """True only for server-generated keys — ``<public-prefix>/<uuid>.<img>``
    under the local ``cms/`` dir or the configured R2 media prefix. Rows
    pointing anywhere else (absolute paths, traversal, internal ``files/``
    prefixes, arbitrary shapes) are not servable."""
    for prefix in ("cms/", media_prefix):
        if storage_key.startswith(prefix) and _SERVABLE_KEY_RE.match(
            storage_key[len(prefix) :]
        ):
            return True
    return False


def storage_key_from_url(url: str) -> str | None:
    """Recover the relative storage key from a served ``/uploads/...`` URL."""
    prefix = "/uploads/"
    if url.startswith(prefix):
        return url[len(prefix) :]
    return None


def find_by_storage_key(storage_key: str, db: Session) -> CmsMedia | None:
    return db.scalar(select(CmsMedia).where(CmsMedia.storage_key == storage_key))
