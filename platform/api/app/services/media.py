"""CMS media service — base64 data-URL uploads for the site builder.

Generalises the ``_save_image`` pattern from the setup/settings services
into a reusable upload + delete pair backed by the ``cms_media`` table.
Files land under ``uploads/cms/<uuid>.<ext>`` and are served from
``/uploads/cms/<uuid>.<ext>`` (the static mount in ``main.py``).
"""

from __future__ import annotations

import base64
import re
import uuid
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.cms import CmsMedia
from app.services import setup as setup_service

_IMAGE_DATA_URL = re.compile(
    r"^data:image/(png|jpeg|webp);base64,(?P<data>.+)$", re.S
)
_IMAGE_EXT = {"png": "png", "jpeg": "jpg", "webp": "webp"}
_IMAGE_MAX_BYTES = 512 * 1024

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
    dest = setup_service.UPLOADS_DIR / _UPLOAD_SUBDIR
    dest.mkdir(parents=True, exist_ok=True)
    storage_key = f"{_UPLOAD_SUBDIR}/{stem}.{ext}"
    (dest / f"{stem}.{ext}").write_bytes(raw)

    detected_mime = mime_type or f"image/{match.group(1)}"
    row = CmsMedia(
        storage_key=storage_key,
        url=f"/uploads/{storage_key}",
        filename=filename,
        mime_type=detected_mime,
        size_bytes=len(raw),
        uploaded_by_id=user_id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def delete_cms_media(media_id: uuid.UUID, db: Session) -> None:
    """Delete a media row and the file it points at on disk."""
    row = db.get(CmsMedia, media_id)
    if row is None:
        return
    path = setup_service.UPLOADS_DIR / row.storage_key
    if path.is_file():
        try:
            path.unlink()
        except OSError:
            pass
    db.delete(row)
    db.commit()


def media_file(storage_key: str) -> Path | None:
    """Resolve a stored media file path, if it still exists on disk."""
    path = setup_service.UPLOADS_DIR / storage_key
    return path if path.is_file() else None


def storage_key_from_url(url: str) -> str | None:
    """Recover the relative storage key from a served ``/uploads/...`` URL."""
    prefix = "/uploads/"
    if url.startswith(prefix):
        return url[len(prefix) :]
    return None


def find_by_storage_key(storage_key: str, db: Session) -> CmsMedia | None:
    return db.scalar(select(CmsMedia).where(CmsMedia.storage_key == storage_key))
