"""Application configuration via pydantic-settings.

All settings are read from environment variables (see `platform/.env.example`).
Secrets (LLM_API_KEY / OPENAI_API_KEY) are never logged or echoed.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # Runtime
    tutor_env: str = Field(default="development", alias="TUTOR_ENV")
    tutor_host: str = Field(default="0.0.0.0", alias="TUTOR_HOST")
    tutor_port: int = Field(default=8000, alias="TUTOR_PORT")

    # Database — runtime goes through PgBouncer (transaction pooling).
    database_url: str = Field(..., alias="DATABASE_URL")
    # Migrations / admin connect directly to Postgres (session mode, safe for DDL).
    database_url_direct: str | None = Field(default=None, alias="DATABASE_URL_DIRECT")

    # Redis — job queue + per-job event streams + rate limiting.
    redis_url: str = Field(default="redis://redis:6379/0", alias="REDIS_URL")

    # CORS — comma-separated list of allowed origins.
    cors_origins: str = Field(
        default="http://localhost:5173,http://localhost:4173",
        alias="CORS_ORIGINS",
    )

    # Auth passthrough — the gateway accepts the platform's bearer token plus an
    # `X-Student-Id` header and forwards the student identity to the job payload.
    # Token *validation* stays with the platform API (auth lands in TEC-61); when
    # TUTOR_AUTH_REQUIRED=true the gateway rejects requests without credentials.
    auth_required: bool = Field(default=False, alias="TUTOR_AUTH_REQUIRED")

    # Rate limiting — fixed window per student (falls back to client IP).
    rate_limit_requests: int = Field(default=30, alias="TUTOR_RATE_LIMIT_REQUESTS")
    rate_limit_window_seconds: int = Field(default=60, alias="TUTOR_RATE_LIMIT_WINDOW_SECONDS")

    # Queue / job lifecycle
    chat_queue_key: str = Field(default="tutor:queue:chat", alias="TUTOR_CHAT_QUEUE_KEY")
    job_ttl_seconds: int = Field(default=3600, alias="TUTOR_JOB_TTL_SECONDS")
    # Max time the gateway streams a single job before closing the SSE response.
    job_timeout_seconds: int = Field(default=120, alias="TUTOR_JOB_TIMEOUT_SECONDS")
    # Entries stuck in the processing list longer than this are re-queued.
    worker_stale_seconds: int = Field(default=300, alias="TUTOR_WORKER_STALE_SECONDS")
    job_max_attempts: int = Field(default=3, alias="TUTOR_JOB_MAX_ATTEMPTS")

    # Retrieval
    retrieval_top_k: int = Field(default=5, alias="TUTOR_RETRIEVAL_TOP_K")

    # Embeddings — `mock` is a deterministic local embedder for dev/test with no
    # external calls; `openai` uses an OpenAI-compatible embeddings endpoint.
    embedding_provider: str = Field(default="mock", alias="EMBEDDING_PROVIDER")
    embedding_model: str = Field(default="text-embedding-3-small", alias="EMBEDDING_MODEL")
    embedding_dim: int = Field(default=1536, alias="EMBEDDING_DIM")

    # LLM — `mock` streams a deterministic grounded answer for dev/test;
    # `openai` streams from an OpenAI-compatible chat-completions endpoint.
    llm_provider: str = Field(default="mock", alias="LLM_PROVIDER")
    llm_model: str = Field(default="gpt-4o-mini", alias="LLM_MODEL")
    llm_api_key: str | None = Field(
        default=None, validation_alias=AliasChoices("LLM_API_KEY", "OPENAI_API_KEY")
    )
    llm_base_url: str | None = Field(
        default=None, validation_alias=AliasChoices("LLM_BASE_URL", "OPENAI_BASE_URL")
    )
    llm_temperature: float = Field(default=0.3, alias="LLM_TEMPERATURE")

    # Ingestion chunking
    chunk_size: int = Field(default=900, alias="TUTOR_CHUNK_SIZE")
    chunk_overlap: int = Field(default=150, alias="TUTOR_CHUNK_OVERLAP")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_dev(self) -> bool:
        return self.tutor_env == "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
