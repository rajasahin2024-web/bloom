"""Public institute branding — core settings written by the IELTS installer.

Unlike `/api/setup/*` these routes stay readable after setup completes: the
admin console and public pages resolve the institute name/logo from them.
Values resolve DB-first (admin edits in Settings → General win) and fall
back to the installer's `INSTITUTE_*` env when the database isn't up yet.
"""

from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.core.config import get_settings
from app.core.database import new_session
from app.schemas.setup import BrandingOut
from app.services import settings as settings_service
from app.services import setup as setup_service

router = APIRouter(prefix="/api/branding", tags=["branding"])

_IMAGE_MEDIA = {"png": "image/png", "jpg": "image/jpeg", "webp": "image/webp"}


@router.get("", response_model=BrandingOut)
def branding() -> BrandingOut:
    env = get_settings()
    db = new_session()
    if db is None:
        # Pre-setup / DB down: serve the installer env values directly.
        return BrandingOut(
            name=env.institute_name,
            tagline=env.institute_tagline,
            logo_url=env.institute_logo_url or None,
        )
    try:
        # resolved_map already falls back to env/prototype defaults for keys
        # with no row; a present-but-null value (admin cleared it) wins.
        values = settings_service.resolved_map(db)
    finally:
        db.close()
    return BrandingOut(
        name=values.get("institute.name") or env.institute_name,
        tagline=values.get("institute.tagline") or env.institute_tagline,
        logo_url=values.get("institute.logo_url"),
    )


def _branding_file(stem: str) -> Path | None:
    for ext in _IMAGE_MEDIA:
        candidate = setup_service.UPLOADS_DIR / "branding" / f"{stem}.{ext}"
        if candidate.is_file():
            return candidate
    return None


@router.get("/logo")
def branding_logo() -> FileResponse:
    path = _branding_file("logo")
    if path is None:
        raise HTTPException(status_code=404, detail="No institute logo configured")
    return FileResponse(path, media_type=_IMAGE_MEDIA[path.suffix.lstrip(".")])


@router.get("/favicon")
def branding_favicon() -> FileResponse:
    path = _branding_file("favicon")
    if path is None:
        raise HTTPException(status_code=404, detail="No favicon configured")
    return FileResponse(path, media_type=_IMAGE_MEDIA[path.suffix.lstrip(".")])
