"""Bloom API application factory.

Run locally (after `docker compose up -d` for infra):
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app import __version__
from app.core.config import get_settings
from app.routers import (
    applications,
    auth,
    branding,
    cms,
    content,
    enquiries,
    health,
    seo,
    settings,
    setup,
)
from app.services import setup as setup_service

_settings = get_settings()

logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    if _settings.jwt_secret_insecure:
        logger.critical(
            "JWT_SECRET is not configured — the built-in dev secret is refused "
            "outside development/test; no tokens will be issued or verified "
            "until a real JWT_SECRET is set (API_ENV=%s)",
            _settings.api_env,
        )
    if _settings.refresh_cookie_insecure:
        logger.critical(
            "SETUP_COMPLETE is set but API_ENV=%s — the bloom_refresh cookie "
            "ships without Secure and dev-only surfaces (OTP echo, the dev "
            "JWT secret) stay armed. Set API_ENV=production; installs applied "
            "by the setup wizard write it automatically.",
            _settings.api_env,
        )
    app = FastAPI(
        title="Bloom Academy API",
        description="Bloom Academy IELTS platform — FastAPI backend.",
        version=__version__,
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=_settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router)
    app.include_router(setup.router)
    app.include_router(branding.router)
    app.include_router(auth.router)
    app.include_router(enquiries.router)
    app.include_router(applications.router)
    app.include_router(cms.router)
    app.include_router(content.router)
    app.include_router(settings.router)
    app.include_router(seo.router)

    uploads_dir = setup_service.UPLOADS_DIR
    uploads_dir.mkdir(parents=True, exist_ok=True)
    app.mount(
        "/uploads",
        StaticFiles(directory=str(uploads_dir)),
        name="uploads",
    )

    @app.get("/", include_in_schema=False)
    def root() -> dict[str, Any]:
        return {"service": "bloom-api", "version": __version__, "health": "/api/health"}

    return app


app = create_app()
