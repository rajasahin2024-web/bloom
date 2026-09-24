"""Bloom funnel API — standalone checkout service for the IELTS eBook funnel.

Run:
    uvicorn app.main:app --host 0.0.0.0 --port 8090
Config via env / platform/funnel/api/.env (see .env.example).
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__, store
from app.config import get_settings
from app.routers import admin, assets, orders, webhooks

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

_settings = get_settings()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Bloom Funnel API",
        description="IELTS eBook funnel — orders, payments, Meta CAPI, downloads.",
        version=__version__,
        docs_url="/api/funnel/docs",
        openapi_url="/api/funnel/openapi.json",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_settings.cors_origin_list,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    store.init_db()

    @app.get("/api/funnel/health")
    def health() -> dict[str, Any]:
        return {
            "status": "ok",
            "version": __version__,
            "rail": _settings.payment_rail,
            "capi_dry_run": _settings.meta_capi_dry_run
            or not (_settings.meta_pixel_id and _settings.meta_capi_token),
        }

    app.include_router(orders.router)
    app.include_router(webhooks.router)
    app.include_router(assets.router)
    app.include_router(admin.router)
    return app


app = create_app()
