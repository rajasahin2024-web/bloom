"""Funnel item catalog — fixed pricing per the funnel spec (all INR).

Re-scoped product (TEC-113 build-spec v2): "AI for Office Work" micro-course.
Asset resolution is tolerant: files are produced by a sibling task
(TEC-119) under platform/funnel/assets/; missing files are skipped.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

EBOOK = {"sku": "ai-office-course",
         "name": "AI for Office Work — micro-course", "amount_paise": 19900}
BUMP = {"sku": "prompt-library-pack",
        "name": "Prompt Library + Office Template Pack", "amount_paise": 9900}
UPSELL = {"sku": "ai-creators-starter",
          "name": "AI for Content Creators — starter pack", "amount_paise": 59900}

# sku -> asset paths relative to the assets dir. An entry that resolves to a
# directory expands to every file under it (order preserved, sorted).
ASSET_MAP: dict[str, list[str]] = {
    "ai-office-course": ["course/quick-start.pdf"],
    "prompt-library-pack": ["prompts"],
}


def base_items(bump: bool) -> list[dict[str, Any]]:
    items = [dict(EBOOK)]
    if bump:
        items.append(dict(BUMP))
    return items


def assets_for_sku(assets_dir: Path, sku: str) -> list[str]:
    """Existing asset rel_paths for a sku. Upsell = whole upsell/ dir."""
    out: list[str] = []
    if sku == UPSELL["sku"]:
        up = assets_dir / "upsell"
        if up.is_dir():
            out.extend(str(p.relative_to(assets_dir)) for p in sorted(up.rglob("*")) if p.is_file())
        return out
    for rel in ASSET_MAP.get(sku, []):
        candidate = assets_dir / rel
        if candidate.is_dir():
            out.extend(str(p.relative_to(assets_dir)) for p in sorted(candidate.rglob("*")) if p.is_file())
        elif candidate.is_file():
            out.append(rel)
    return out
