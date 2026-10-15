"""pgvector retrieval — ANN search over `tutor.kb_chunks` (HNSW, cosine ops).

Single join query; no per-row lookups. Returns ordered chunk dicts the graph
turns into numbered citations.
"""

from __future__ import annotations

from typing import Any, TypedDict

from sqlalchemy import inspect, select
from sqlalchemy.orm import Session

from tutor.models import KbChunk, KbDocument


class RetrievedChunk(TypedDict):
    chunk_id: str
    doc_title: str
    source: str
    content: str
    distance: float


def search(db: Session, query_vector: list[float], top_k: int) -> list[RetrievedChunk]:
    """Top-k nearest chunks by cosine distance. Empty list if KB not migrated."""
    try:
        if not inspect(db.get_bind()).has_table(KbChunk.__tablename__, schema="tutor"):
            return []
        distance = KbChunk.embedding.cosine_distance(query_vector).label("distance")
        stmt = (
            select(
                KbChunk.id,
                KbChunk.content,
                KbDocument.title,
                KbDocument.source,
                distance,
            )
            .join(KbDocument, KbChunk.document_id == KbDocument.id)
            .order_by(distance)
            .limit(top_k)
        )
        return [
            RetrievedChunk(
                chunk_id=str(row.id),
                doc_title=row.title,
                source=row.source,
                content=row.content,
                distance=float(row.distance),
            )
            for row in db.execute(stmt)
        ]
    except Exception:  # noqa: BLE001 - retrieval degrades to no-context answer
        return []


def as_citations(chunks: list[RetrievedChunk]) -> list[dict[str, Any]]:
    return [
        {
            "n": i + 1,
            "chunk_id": c["chunk_id"],
            "doc_title": c["doc_title"],
            "source": c["source"],
            "distance": round(c["distance"], 4),
        }
        for i, c in enumerate(chunks)
    ]
