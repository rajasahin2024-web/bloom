"""Gated delivery area — buyer-authenticated learner portal API.

Auth: email + order-id login mints a bearer session (sha256-hashed at rest).
Entitlements are derived from the paid order's items — never trust the
client's claim:

    course         <- order status 'paid' (₹199 front)
    prompt_library <- +₹99 bump sku present in items
    second_course  <- ₹599 upsell sku present in items

Everything under /api/funnel/gated/* except /auth/login requires the session.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import time
import uuid
from collections import deque
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse

from app import catalog, certificate as cert_mod, course, gated_store, signing, store
from app.config import get_settings
from app.schemas import (
    BuyerLoginRequest,
    CertificateRequest,
    Entitlements,
    LoginResponse,
    QuizSubmitRequest,
)

log = logging.getLogger("funnel.gated")

router = APIRouter(prefix="/api/funnel/gated", tags=["funnel-gated"])


# ---------- login rate limiting (in-memory, fixed window) ----------

_FAILURES: dict[str, deque[float]] = {}
_WINDOW = 60.0


def _login_limited(key: str) -> bool:
    """True when this key exceeded the failed-login budget for the window."""
    now = time.monotonic()
    dq = _FAILURES.get(key)
    if not dq:
        return False
    while dq and now - dq[0] > _WINDOW:
        dq.popleft()
    return len(dq) >= get_settings().gated_login_max_attempts


def _record_login_failure(key: str) -> None:
    now = time.monotonic()
    dq = _FAILURES.setdefault(key, deque())
    while dq and now - dq[0] > _WINDOW:
        dq.popleft()
    dq.append(now)
    if len(_FAILURES) > 5000:  # bound memory: drop fully-expired buckets
        for k in [k for k, d in _FAILURES.items() if not d]:
            del _FAILURES[k]


# ---------- auth / entitlement helpers ----------


def entitlements_for(order: dict[str, Any]) -> Entitlements:
    skus = {i["sku"] for i in order["items"]}
    return Entitlements(
        course=order["status"] == "paid",
        prompt_library=catalog.BUMP["sku"] in skus,
        second_course=catalog.UPSELL["sku"] in skus,
    )


def _email_matches(a: str, b: str) -> bool:
    da = hashlib.sha256(a.strip().lower().encode()).digest()
    db = hashlib.sha256(b.strip().lower().encode()).digest()
    return hmac.compare_digest(da, db)


def buyer_ctx(request: Request) -> dict[str, Any]:
    """FastAPI dependency: Bearer session -> {session, order, entitlements}."""
    auth = request.headers.get("authorization", "")
    token = auth[7:].strip() if auth.lower().startswith("bearer ") else ""
    session = gated_store.session_for_token(token)
    if not session:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "session required")
    order = store.get_order(session["order_id"])
    if not order or order["status"] != "paid":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "order access revoked")
    return {
        "session": session,
        "order": order,
        "entitlements": entitlements_for(order),
    }


def _base_url(request: Request) -> str:
    configured = get_settings().base_url.rstrip("/")
    return configured or str(request.base_url).rstrip("/")


def _manifest_or_503() -> dict[str, Any]:
    try:
        return course.load_manifest()
    except course.ManifestError as exc:
        log.error("course manifest unavailable: %s", exc)
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "course content unavailable"
        ) from exc


def _module_view(m: dict[str, Any], progress: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": m["id"],
        "title": m["title"],
        "summary": m.get("summary"),
        "lesson_url": f"/api/funnel/gated/modules/{m['id']}/lesson"
        if m.get("lesson")
        else None,
        "videos": [
            {
                "video_id": v["video_id"],
                "title": v["title"],
                "duration_seconds": v.get("duration_seconds"),
                "embed_url": f"https://www.youtube.com/embed/{v['video_id']}",
            }
            for v in m.get("videos") or []
        ],
        "quiz_question_count": len(m.get("quiz") or []),
        "pass_score_pct": course.pass_score_pct(m),
        "progress": progress.get(
            m["id"],
            {"attempts": 0, "best_score": None, "total": None,
             "passed": False, "last_attempt_at": None},
        ),
    }


def _progress_summary(order_id: str) -> dict[str, Any]:
    manifest = _manifest_or_503()
    progress = gated_store.module_progress(order_id)
    mods = [_module_view(m, progress) for m in manifest["modules"]]
    passed = sum(1 for m in mods if m["progress"]["passed"])
    return {
        "course": {
            "id": manifest["course"]["id"],
            "title": manifest["course"]["title"],
        },
        "modules_total": len(mods),
        "modules_passed": passed,
        "complete": passed == len(mods) and len(mods) > 0,
        "modules": mods,
    }


def _certificate_view(
    order_id: str, request: Request, summary: dict[str, Any] | None = None
) -> dict[str, Any]:
    cert = gated_store.get_certificate(order_id)
    eligible = (summary or _progress_summary(order_id))["complete"]
    return {
        "eligible": eligible,
        "issued": cert is not None,
        "serial": cert["serial"] if cert else None,
        "issued_at": cert["issued_at"] if cert else None,
        "buyer_name": cert["buyer_name"] if cert else None,
        "pdf_url": f"{_base_url(request)}/api/funnel/gated/certificate/pdf"
        if cert
        else None,
    }


# ---------- auth ----------


@router.post("/auth/login", response_model=LoginResponse)
def login(body: BuyerLoginRequest, request: Request) -> LoginResponse:
    ip = request.client.host if request.client else "unknown"
    key = f"{ip}|{body.email}"
    if _login_limited(key):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "too many attempts")
    order = store.get_order(body.order_id)
    if not order or not _email_matches(body.email, order["email"]):
        _record_login_failure(key)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid login")
    if order["status"] != "paid":
        _record_login_failure(key)
        raise HTTPException(status.HTTP_403_FORBIDDEN, "order not settled")
    token, expires_at = gated_store.create_session(
        order["id"], get_settings().gated_session_ttl_seconds
    )
    manifest = _manifest_or_503()
    return LoginResponse(
        token=token,
        expires_at=expires_at,
        order_id=order["id"],
        email=order["email"],
        entitlements=entitlements_for(order),
        course={
            "id": manifest["course"]["id"],
            "title": manifest["course"]["title"],
        },
    )


# ---------- portal ----------


@router.get("/me")
def me(request: Request, ctx: dict[str, Any] = Depends(buyer_ctx)) -> dict[str, Any]:
    order = ctx["order"]
    summary = _progress_summary(order["id"])
    return {
        "order_id": order["id"],
        "email": order["email"],
        "entitlements": ctx["entitlements"].model_dump(),
        "progress": summary,
        "certificate": _certificate_view(order["id"], request, summary),
    }


@router.get("/modules")
def list_modules(ctx: dict[str, Any] = Depends(buyer_ctx)) -> dict[str, Any]:
    return _progress_summary(ctx["order"]["id"])


@router.get("/modules/{module_id}")
def get_module(
    module_id: str, ctx: dict[str, Any] = Depends(buyer_ctx)
) -> dict[str, Any]:
    _manifest_or_503()
    module = course.get_module(module_id)
    if not module:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "module not found")
    progress = gated_store.module_progress(ctx["order"]["id"])
    return _module_view(module, progress)


@router.get("/modules/{module_id}/lesson")
def get_lesson(
    module_id: str, ctx: dict[str, Any] = Depends(buyer_ctx)
) -> FileResponse:
    _manifest_or_503()
    module = course.get_module(module_id)
    if not module:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "module not found")
    rel = module.get("lesson")
    if not rel:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "no lesson for module")
    root = Path(get_settings().assets_dir).resolve()
    path = (root / rel).resolve()
    if root not in path.parents or not path.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "lesson not available")
    return FileResponse(path, media_type="text/html")


@router.get("/modules/{module_id}/quiz")
def get_quiz(
    module_id: str, ctx: dict[str, Any] = Depends(buyer_ctx)
) -> dict[str, Any]:
    _manifest_or_503()
    module = course.get_module(module_id)
    if not module:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "module not found")
    questions = course.quiz_public(module)
    if not questions:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "no quiz for module")
    return {
        "module_id": module["id"],
        "title": module["title"],
        "pass_score_pct": course.pass_score_pct(module),
        "questions": questions,
    }


@router.post("/modules/{module_id}/quiz/submit")
def submit_quiz(
    module_id: str,
    body: QuizSubmitRequest,
    ctx: dict[str, Any] = Depends(buyer_ctx),
) -> dict[str, Any]:
    _manifest_or_503()
    module = course.get_module(module_id)
    if not module:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "module not found")
    questions = module.get("quiz") or []
    if not questions:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "no quiz for module")
    qids = {q["id"] for q in questions}
    answers = {k: v for k, v in body.answers.items() if k in qids}
    score, total = course.grade(module, answers)
    pct = course.pass_score_pct(module)
    passed = course.passed(score, total, pct)
    gated_store.record_quiz_attempt(
        order_id=ctx["order"]["id"],
        module_id=module_id,
        score=score,
        total=total,
        passed=passed,
        answers_json=json.dumps(answers, separators=(",", ":")),
    )
    progress = gated_store.module_progress(ctx["order"]["id"]).get(module_id, {})
    return {
        "module_id": module_id,
        "score": score,
        "total": total,
        "passed": passed,
        "pass_score_pct": pct,
        "module": progress,
    }


@router.get("/progress")
def progress(ctx: dict[str, Any] = Depends(buyer_ctx)) -> dict[str, Any]:
    return _progress_summary(ctx["order"]["id"])


# ---------- certificate ----------


@router.get("/certificate")
def certificate_status(
    request: Request, ctx: dict[str, Any] = Depends(buyer_ctx)
) -> dict[str, Any]:
    return _certificate_view(ctx["order"]["id"], request)


@router.post("/certificate")
def issue_certificate(
    body: CertificateRequest,
    request: Request,
    ctx: dict[str, Any] = Depends(buyer_ctx),
) -> dict[str, Any]:
    order = ctx["order"]
    existing = gated_store.get_certificate(order["id"])
    if existing:
        return _certificate_view(order["id"], request)

    summary = _progress_summary(order["id"])
    if not summary["complete"]:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "all module quizzes must be passed first",
        )
    course_name = summary["course"]["title"]
    serial = f"AIW-{time.strftime('%Y')}-{order['id'].split('_', 1)[-1][:8].upper()}-{uuid.uuid4().hex[:4].upper()}"
    cert = gated_store.create_certificate(
        order_id=order["id"],
        serial=serial,
        buyer_name=body.name,
        course_name=course_name,
    )
    cert_mod.render_certificate(
        buyer_name=cert["buyer_name"],
        course_name=cert["course_name"],
        issued_date=cert["issued_at"][:10],
        serial=cert["serial"],
        out_path=_cert_path(order["id"]),
    )
    return _certificate_view(order["id"], request, summary)


def _cert_path(order_id: str) -> Path:
    safe = "".join(ch for ch in order_id if ch.isalnum() or ch in "-_")
    return Path(get_settings().certificates_dir) / f"{safe}.pdf"


@router.get("/certificate/pdf")
def certificate_pdf(ctx: dict[str, Any] = Depends(buyer_ctx)) -> FileResponse:
    order_id = ctx["order"]["id"]
    if not gated_store.get_certificate(order_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "certificate not issued")
    path = _cert_path(order_id)
    if not path.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "certificate file missing")
    return FileResponse(path, media_type="application/pdf",
                        filename="certificate-of-completion.pdf")


# ---------- downloads ----------


@router.get("/downloads")
def gated_downloads(
    request: Request, ctx: dict[str, Any] = Depends(buyer_ctx)
) -> dict[str, Any]:
    order = ctx["order"]
    ent = ctx["entitlements"]
    assets_dir = Path(get_settings().assets_dir)
    base = _base_url(request)
    groups = [
        (catalog.EBOOK["sku"], ent.course),
        (catalog.BUMP["sku"], ent.prompt_library),
        (catalog.UPSELL["sku"], ent.second_course),
    ]
    downloads: list[dict[str, Any]] = []
    for sku, allowed in groups:
        if not allowed:
            continue
        for rel in catalog.assets_for_sku(assets_dir, sku):
            token, exp = signing.sign_download(order["id"], rel)
            downloads.append({
                "sku": sku,
                "file": Path(rel).name,
                "url": f"{base}/api/funnel/assets/{order['id']}/{token}",
                "expires_at": exp,
            })
    return {"order_id": order["id"], "downloads": downloads}
