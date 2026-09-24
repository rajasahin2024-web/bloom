"""Signed asset delivery — time-limited HMAC tokens, path-traversal safe."""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse

from app import signing
from app.config import get_settings

router = APIRouter(prefix="/api/funnel", tags=["funnel-assets"])


@router.get("/assets/{order_id}/{token}")
def serve_asset(order_id: str, token: str) -> FileResponse:
    rel = signing.verify_download(token, order_id)
    if not rel:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "invalid or expired link")
    root = Path(get_settings().assets_dir).resolve()
    path = (root / rel).resolve()
    if root not in path.parents or not path.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "asset not found")
    return FileResponse(path, filename=path.name)
