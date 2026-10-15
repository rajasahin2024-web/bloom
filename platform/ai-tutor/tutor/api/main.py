"""Bloom AI Tutor gateway — FastAPI application factory.

Run locally (after `docker compose up -d` for infra):
    uvicorn tutor.api.main:app --reload --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from tutor import __version__
from tutor.api.routes import chat, health
from tutor.core.config import get_settings

_settings = get_settings()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Bloom AI Tutor",
        description=(
            "Bloom Academy AI Tutor — FastAPI gateway in front of a Redis queue "
            "and a LangGraph worker pool (RAG over pgvector)."
        ),
        version=__version__,
        docs_url="/docs",
        openapi_url="/openapi.json",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=_settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router)
    app.include_router(chat.router)

    @app.get("/", include_in_schema=False)
    def root() -> dict[str, Any]:
        return {"service": "bloom-ai-tutor", "version": __version__, "health": "/health"}

    return app


app = create_app()
