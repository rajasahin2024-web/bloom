"""Text chunking for KB ingestion.

Paragraph-aware splitter: packs whole paragraphs up to `chunk_size`, hard-splits
overlong paragraphs, and carries `chunk_overlap` characters of tail context into
the next chunk so retrieval units keep local coherence.
"""

from __future__ import annotations


def _hard_split(text: str, size: int, overlap: int) -> list[str]:
    """Split a single overlong block on character boundaries with overlap."""
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = min(start + size, len(text))
        # Prefer to end on a sentence/line boundary when one exists in range.
        if end < len(text):
            boundary = max(text.rfind(". ", start, end), text.rfind("\n", start, end))
            if boundary > start + size // 2:
                end = boundary + 1
        chunks.append(text[start:end].strip())
        start = end - overlap if end < len(text) else end
    return [c for c in chunks if c]


def split_text(text: str, chunk_size: int = 900, chunk_overlap: int = 150) -> list[str]:
    """Split `text` into chunks of at most ~`chunk_size` characters."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks: list[str] = []
    current = ""

    for para in paragraphs:
        candidate = f"{current}\n\n{para}" if current else para
        if len(candidate) <= chunk_size:
            current = candidate
            continue
        if current:
            chunks.append(current)
        if len(para) > chunk_size:
            for piece in _hard_split(para, chunk_size, chunk_overlap):
                chunks.append(piece)
            current = ""
        else:
            # Carry tail context into the next paragraph group.
            tail = current[-chunk_overlap:] if chunk_overlap and current else ""
            current = f"{tail}\n\n{para}".strip() if tail else para

    if current:
        chunks.append(current)
    return [c for c in chunks if c]
