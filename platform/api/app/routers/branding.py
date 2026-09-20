"""Public institute branding — core settings written by the IELTS installer.

Unlike `/api/setup/*` these routes stay readable after setup completes: the
admin console and public pages resolve the institute name/logo from them.
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.core.config import get_settings
from app.schemas.setup import BrandingOut
from app.services import setup as setup_service

router = APIRouter(prefix="/api/branding", tags=["branding"])

_LOGO_MEDIA = {"png": "image/png", "jpg": "image/jpeg", "webp": "image/webp"}


@router.get("", response_model=BrandingOut)
def branding() -> BrandingOut:
    settings = get_settings()
    return BrandingOut(
        name=settings.institute_name,
        tagline=settings.institute_tagline,
        logo_url=settings.institute_logo_url or None,
    )


@router.get("/logo")
def branding_logo() -> FileResponse:
    path = setup_service.logo_file()
    if path is None:
        raise HTTPException(status_code=404, detail="No institute logo configured")
    return FileResponse(path, media_type=_LOGO_MEDIA[path.suffix.lstrip(".")])
