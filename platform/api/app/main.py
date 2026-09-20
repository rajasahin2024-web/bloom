"""Bloom API application factory.

Run locally (after `docker compose up -d` for infra):
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.core.config import get_settings
from app.routers import auth, branding, cms, content, enquiries, health, setup

_settings = get_settings()


def create_app() -> FastAPI:
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
    app.include_router(cms.router)
    app.include_router(content.router)

    @app.get("/", include_in_schema=False)
    def root() -> dict[str, Any]:
        return {"service": "bloom-api", "version": __version__, "health": "/api/health"}

    return app


app = create_app()
