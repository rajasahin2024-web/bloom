"""Course manifest loader — the gated area's content contract.

The course structure (modules, ordered YouTube refs, quiz banks) is data,
not code. Load order:

1. $FUNNEL_COURSE_MANIFEST (explicit override — tests/dev)
2. {FUNNEL_ASSETS_DIR}/course/manifest.json   (TEC-119's real content)
3. app/course_manifest.json                  (bundled placeholder)

Manifest schema (contract with TEC-119, documented in README):

    {
      "course": {"id": "...", "title": "...", "pass_score_pct": 70},
      "modules": [
        {"id": "m1", "title": "...", "summary": "...",
         "lesson": "course/m1/lesson.html",          // optional, rel to assets dir
         "videos": [{"video_id": "...", "title": "...",
                     "duration_seconds": 480}],
         "pass_score_pct": 70,                        // optional per-module override
         "quiz": [{"id": "q1", "prompt": "...",
                   "options": [{"id": "a", "text": "..."}, ...],
                   "answer": "a"}]}
      ]
    }

YouTube entries carry id/title/duration only — embeds-only, never media files.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.config import get_settings

BUNDLED_MANIFEST = Path(__file__).resolve().parent / "course_manifest.json"
DEFAULT_PASS_PCT = 70


class ManifestError(Exception):
    """Manifest file is missing, unreadable, or fails schema validation."""


def _manifest_path() -> Path:
    settings = get_settings()
    if settings.course_manifest:
        return Path(settings.course_manifest)
    assets_manifest = Path(settings.assets_dir) / "course" / "manifest.json"
    return assets_manifest if assets_manifest.is_file() else BUNDLED_MANIFEST


def _validate(raw: dict[str, Any]) -> dict[str, Any]:
    course = raw.get("course") or {}
    modules = raw.get("modules") or []
    if not course.get("id") or not course.get("title"):
        raise ManifestError("course.id and course.title are required")
    if not isinstance(modules, list) or not modules:
        raise ManifestError("at least one module is required")
    seen: set[str] = set()
    for m in modules:
        mid = m.get("id")
        if not mid or mid in seen:
            raise ManifestError("module ids must be present and unique")
        seen.add(mid)
        if not m.get("title"):
            raise ManifestError(f"module {mid}: title required")
        for v in m.get("videos") or []:
            if not v.get("video_id") or not v.get("title"):
                raise ManifestError(f"module {mid}: videos need video_id + title")
        qids: set[str] = set()
        for q in m.get("quiz") or []:
            qid = q.get("id")
            if not qid or qid in qids or not q.get("prompt"):
                raise ManifestError(f"module {mid}: quiz question ids unique + prompt")
            qids.add(qid)
            opts = q.get("options") or []
            opt_ids = [o.get("id") for o in opts]
            if len(opts) < 2 or len(set(opt_ids)) != len(opt_ids):
                raise ManifestError(f"module {mid}/{qid}: need >=2 unique options")
            if q.get("answer") not in opt_ids:
                raise ManifestError(f"module {mid}/{qid}: answer not in options")
    return raw


@lru_cache
def load_manifest() -> dict[str, Any]:
    path = _manifest_path()
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        raise ManifestError(f"cannot read course manifest {path}: {exc}") from exc
    return _validate(raw)


def manifest_source() -> str:
    return str(_manifest_path())


def reset() -> None:
    """Drop the cached manifest (tests / content hot-reload at boot)."""
    load_manifest.cache_clear()


def course_info() -> dict[str, Any]:
    return load_manifest()["course"]


def modules() -> list[dict[str, Any]]:
    return load_manifest()["modules"]


def get_module(module_id: str) -> dict[str, Any] | None:
    for m in modules():
        if m["id"] == module_id:
            return m
    return None


def pass_score_pct(module: dict[str, Any]) -> int:
    course = load_manifest()["course"]
    return int(module.get("pass_score_pct")
               or course.get("pass_score_pct")
               or DEFAULT_PASS_PCT)


def quiz_public(module: dict[str, Any]) -> list[dict[str, Any]]:
    """Questions without answers — safe to serve to buyers."""
    return [
        {"id": q["id"], "prompt": q["prompt"],
         "options": [{"id": o["id"], "text": o["text"]} for o in q["options"]]}
        for q in module.get("quiz") or []
    ]


def grade(module: dict[str, Any], answers: dict[str, str]) -> tuple[int, int]:
    """Score answers {question_id: option_id}. Returns (score, total)."""
    questions = module.get("quiz") or []
    score = sum(1 for q in questions if answers.get(q["id"]) == q["answer"])
    return score, len(questions)


def passed(score: int, total: int, pct: int) -> bool:
    return total > 0 and score * 100 >= total * pct
