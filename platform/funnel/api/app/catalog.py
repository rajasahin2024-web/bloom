"""Funnel item catalog — fixed pricing per the funnel spec (all INR).

Asset resolution is tolerant: files are produced by a sibling task
(TEC-119) under platform/funnel/assets/; missing files are skipped.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

EBOOK = {"sku": "ielts-ebook", "name": "IELTS Band-7 eBook", "amount_paise": 19900}
BUMP = {"sku": "mock-test-workbook", "name": "Mock-Test Workbook + Vocab Pack",
        "amount_paise": 9900}
UPSELL = {"sku": "band7-upsell", "name": "Band-7 Mini-Course + 3-eBook Bundle",
          "amount_paise": 59900}

# sku -> candidate asset paths relative to assets dir (first existing wins per entry)
ASSET_MAP: dict[str, list[str]] = {
    "ielts-ebook": ["ebook.pdf"],
    "mock-test-workbook": ["workbook.pdf"],
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
        if (assets_dir / rel).is_file():
            out.append(rel)
    return out
