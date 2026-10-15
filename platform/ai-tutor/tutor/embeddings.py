"""Embedding providers.

- `DeterministicEmbedder` (EMBEDDING_PROVIDER=mock): local, dependency-free
  hashed n-gram embedder. Deterministic and token-overlap-sensitive, so dev and
  CI exercise the full pgvector path with zero external calls. NOT semantically
  meaningful — swap to a real provider before judging retrieval quality.
- `OpenAIEmbedder` (EMBEDDING_PROVIDER=openai): OpenAI-compatible embeddings API
  (works with OpenAI, OpenRouter, vLLM, etc. via LLM_BASE_URL).
"""

from __future__ import annotations

import hashlib
import math
import re
from typing import Protocol, runtime_checkable

from tutor.core.config import Settings

_TOKEN_RE = re.compile(r"[a-z0-9']+")


def _tokenize(text: str) -> list[str]:
    return _TOKEN_RE.findall(text.lower())


@runtime_checkable
class EmbeddingProvider(Protocol):
    @property
    def dim(self) -> int: ...

    def embed(self, texts: list[str]) -> list[list[float]]: ...


class DeterministicEmbedder:
    """Hashed bag-of-ngrams embedder — deterministic stand-in for dev/test."""

    def __init__(self, dim: int = 1536) -> None:
        self._dim = dim

    @property
    def dim(self) -> int:
        return self._dim

    def _embed_one(self, text: str) -> list[float]:
        vec = [0.0] * self._dim
        tokens = _tokenize(text)
        # Unigrams + bigrams; sign from a second hash bit decorrelates collisions.
        features = list(tokens)
        features.extend(f"{a} {b}" for a, b in zip(tokens, tokens[1:], strict=False))
        for feat in features:
            digest = hashlib.blake2b(feat.encode(), digest_size=8).digest()
            slot = int.from_bytes(digest[:4], "little") % self._dim
            sign = 1.0 if digest[4] & 1 else -1.0
            vec[slot] += sign
        norm = math.sqrt(sum(v * v for v in vec)) or 1.0
        return [v / norm for v in vec]

    def embed(self, texts: list[str]) -> list[list[float]]:
        return [self._embed_one(t) for t in texts]


class OpenAIEmbedder:
    """OpenAI-compatible embeddings endpoint (batched)."""

    def __init__(self, model: str, dim: int, api_key: str | None, base_url: str | None) -> None:
        from openai import OpenAI

        self._model = model
        self._dim = dim
        self._client = OpenAI(api_key=api_key, base_url=base_url)

    @property
    def dim(self) -> int:
        return self._dim

    def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        resp = self._client.embeddings.create(model=self._model, input=texts)
        # API returns items in arbitrary order in some implementations — sort.
        ordered = sorted(resp.data, key=lambda d: d.index)
        return [list(d.embedding) for d in ordered]


def get_embedder(settings: Settings) -> EmbeddingProvider:
    if settings.embedding_provider == "openai":
        return OpenAIEmbedder(
            model=settings.embedding_model,
            dim=settings.embedding_dim,
            api_key=settings.llm_api_key,
            base_url=settings.llm_base_url,
        )
    if settings.embedding_provider != "mock":
        raise ValueError(
            f"Unknown EMBEDDING_PROVIDER {settings.embedding_provider!r} "
            "(expected 'mock' or 'openai')"
        )
    return DeterministicEmbedder(dim=settings.embedding_dim)
