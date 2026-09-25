"""Tests for the gated delivery area (buyer portal): auth, entitlements,
module map, quiz + progress, certificate PDF, gated downloads."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

API_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(API_DIR))

TEST_MANIFEST = {
    "course": {"id": "test-course", "title": "Test Course", "pass_score_pct": 75},
    "modules": [
        {
            "id": "m1", "title": "Module One", "summary": "first",
            "lesson": "course/m1/lesson.html",
            "videos": [
                {"video_id": "abc123", "title": "v1", "duration_seconds": 100},
                {"video_id": "def456", "title": "v2", "duration_seconds": 200},
            ],
            "quiz": [
                {"id": "q1", "prompt": "p1",
                 "options": [{"id": "a", "text": "x"}, {"id": "b", "text": "y"}],
                 "answer": "a"},
                {"id": "q2", "prompt": "p2",
                 "options": [{"id": "a", "text": "x"}, {"id": "b", "text": "y"}],
                 "answer": "b"},
                {"id": "q3", "prompt": "p3",
                 "options": [{"id": "a", "text": "x"}, {"id": "b", "text": "y"}],
                 "answer": "a"},
                {"id": "q4", "prompt": "p4",
                 "options": [{"id": "a", "text": "x"}, {"id": "b", "text": "y"}],
                 "answer": "b"},
            ],
        },
        {
            "id": "m2", "title": "Module Two", "summary": "second",
            "videos": [{"video_id": "ghi789", "title": "v3", "duration_seconds": 300}],
            "quiz": [
                {"id": "q1", "prompt": "p1",
                 "options": [{"id": "a", "text": "x"}, {"id": "b", "text": "y"}],
                 "answer": "a"},
            ],
        },
    ],
}


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("PAYMENT_RAIL", "mock")
    monkeypatch.setenv("META_CAPI_DRY_RUN", "1")
    monkeypatch.setenv("ADMIN_TOKEN", "test-admin-token")
    monkeypatch.setenv("FUNNEL_DB_PATH", str(tmp_path / "funnel.db"))
    monkeypatch.setenv("FUNNEL_ASSETS_DIR", str(tmp_path / "assets"))
    monkeypatch.setenv("FUNNEL_CERTIFICATES_DIR", str(tmp_path / "certs"))
    monkeypatch.setenv("DOWNLOAD_SIGNING_SECRET", "test-secret")
    manifest = tmp_path / "manifest.json"
    manifest.write_text(json.dumps(TEST_MANIFEST))
    monkeypatch.setenv("FUNNEL_COURSE_MANIFEST", str(manifest))

    (tmp_path / "assets" / "course" / "m1").mkdir(parents=True)
    (tmp_path / "assets" / "course" / "m1" / "lesson.html").write_text(
        "<h1>lesson</h1>")
    (tmp_path / "assets" / "course" / "quick-start.pdf").write_bytes(b"%PDF qs")
    (tmp_path / "assets" / "prompts").mkdir()
    (tmp_path / "assets" / "prompts" / "office-prompt-library.pdf").write_bytes(
        b"%PDF prompts")
    (tmp_path / "assets" / "upsell").mkdir()
    (tmp_path / "assets" / "upsell" / "starter.pdf").write_bytes(b"%PDF upsell")

    from app import course
    from app.config import get_settings
    get_settings.cache_clear()
    course.reset()
    from app.main import create_app
    from fastapi.testclient import TestClient
    yield TestClient(create_app())
    get_settings.cache_clear()
    course.reset()


def _paid_order(client, email="buyer@test.com", bump=True, upsell=False):
    r = client.post("/api/funnel/orders", json={
        "email": email, "bump": bump, "event_id": f"e-{email}-{upsell}",
    })
    assert r.status_code == 201, r.text
    oid = r.json()["order_id"]
    r = client.post(f"/api/funnel/orders/{oid}/mock-settle")
    assert r.status_code == 200
    if upsell:
        r = client.post(f"/api/funnel/orders/{oid}/upsell", json={})
        pid = r.json()["mock"]["settle_url"].split("payment_id=")[1]
        client.post(f"/api/funnel/orders/{oid}/mock-settle?payment_id={pid}")
    return oid


def _login(client, oid, email="buyer@test.com"):
    r = client.post("/api/funnel/gated/auth/login",
                    json={"email": email, "order_id": oid})
    assert r.status_code == 200, r.text
    return r.json()


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_login_and_entitlements(client):
    oid = _paid_order(client, upsell=True)
    data = _login(client, oid)
    assert data["token"].startswith("fns_")
    assert data["order_id"] == oid
    ent = data["entitlements"]
    assert ent == {"course": True, "prompt_library": True,
                   "second_course": True}
    assert data["course"]["id"] == "test-course"


def test_login_rejects_bad_creds(client):
    oid = _paid_order(client)
    r = client.post("/api/funnel/gated/auth/login",
                    json={"email": "wrong@test.com", "order_id": oid})
    assert r.status_code == 401
    r = client.post("/api/funnel/gated/auth/login",
                    json={"email": "buyer@test.com", "order_id": "ord_nope"})
    assert r.status_code == 401
    # unpaid order cannot log in
    r = client.post("/api/funnel/orders",
                    json={"email": "unpaid@x.com", "bump": False,
                          "event_id": "e-unpaid"})
    un_oid = r.json()["order_id"]
    r = client.post("/api/funnel/gated/auth/login",
                    json={"email": "unpaid@x.com", "order_id": un_oid})
    assert r.status_code == 403


def test_gated_requires_session(client):
    for path in ["/api/funnel/gated/me", "/api/funnel/gated/modules",
                 "/api/funnel/gated/progress", "/api/funnel/gated/downloads",
                 "/api/funnel/gated/certificate"]:
        assert client.get(path).status_code == 401
        assert client.get(path, headers=_auth("fns_bad")).status_code == 401


def test_modules_map(client):
    oid = _paid_order(client)
    tok = _login(client, oid)["token"]
    r = client.get("/api/funnel/gated/modules", headers=_auth(tok))
    assert r.status_code == 200
    data = r.json()
    assert data["modules_total"] == 2 and data["modules_passed"] == 0
    m1 = data["modules"][0]
    assert m1["id"] == "m1"
    assert [v["video_id"] for v in m1["videos"]] == ["abc123", "def456"]
    assert all("youtube.com/embed/" in v["embed_url"] for v in m1["videos"])
    assert m1["quiz_question_count"] == 4
    assert m1["progress"]["attempts"] == 0
    # lesson served through the gated endpoint, not a raw asset path
    r = client.get("/api/funnel/gated/modules/m1/lesson", headers=_auth(tok))
    assert r.status_code == 200 and "lesson" in r.text
    r = client.get("/api/funnel/gated/modules/m2/lesson", headers=_auth(tok))
    assert r.status_code == 404


def test_quiz_flow_and_progress(client):
    oid = _paid_order(client)
    tok = _login(client, oid)["token"]

    r = client.get("/api/funnel/gated/modules/m1/quiz", headers=_auth(tok))
    assert r.status_code == 200
    qs = r.json()["questions"]
    assert len(qs) == 4
    assert all("answer" not in q for q in qs)

    # 3/4 correct = 75% -> pass
    r = client.post("/api/funnel/gated/modules/m1/quiz/submit",
                    json={"answers": {"q1": "a", "q2": "b", "q3": "a",
                                      "q4": "a"}},
                    headers=_auth(tok))
    assert r.status_code == 200
    d = r.json()
    assert d["score"] == 3 and d["total"] == 4 and d["passed"] is True
    assert d["module"]["attempts"] == 1 and d["module"]["passed"] is True

    # failing attempt on m2: 0/1 -> fail; module passed stays False
    r = client.post("/api/funnel/gated/modules/m2/quiz/submit",
                    json={"answers": {"q1": "b"}}, headers=_auth(tok))
    assert r.json()["passed"] is False

    prog = client.get("/api/funnel/gated/progress", headers=_auth(tok)).json()
    assert prog["modules_passed"] == 1 and prog["complete"] is False

    # retake m2 and pass
    r = client.post("/api/funnel/gated/modules/m2/quiz/submit",
                    json={"answers": {"q1": "a"}}, headers=_auth(tok))
    assert r.json()["passed"] is True
    prog = client.get("/api/funnel/gated/progress", headers=_auth(tok)).json()
    assert prog["complete"] is True


def test_quiz_submit_ignores_unknown_ids(client):
    oid = _paid_order(client)
    tok = _login(client, oid)["token"]
    r = client.post("/api/funnel/gated/modules/m2/quiz/submit",
                    json={"answers": {"q1": "a", "bogus": "a"}},
                    headers=_auth(tok))
    assert r.status_code == 200 and r.json()["score"] == 1
    r = client.post("/api/funnel/gated/modules/nope/quiz/submit",
                    json={"answers": {}}, headers=_auth(tok))
    assert r.status_code == 404


def _pass_all(client, tok):
    client.post("/api/funnel/gated/modules/m1/quiz/submit",
                json={"answers": {"q1": "a", "q2": "b", "q3": "a", "q4": "b"}},
                headers=_auth(tok))
    client.post("/api/funnel/gated/modules/m2/quiz/submit",
                json={"answers": {"q1": "a"}}, headers=_auth(tok))


def test_certificate_flow(client):
    oid = _paid_order(client)
    tok = _login(client, oid)["token"]

    st = client.get("/api/funnel/gated/certificate", headers=_auth(tok)).json()
    assert st["eligible"] is False and st["issued"] is False

    r = client.post("/api/funnel/gated/certificate",
                    json={"name": "Test Buyer"}, headers=_auth(tok))
    assert r.status_code == 403

    _pass_all(client, tok)
    st = client.get("/api/funnel/gated/certificate", headers=_auth(tok)).json()
    assert st["eligible"] is True

    r = client.post("/api/funnel/gated/certificate",
                    json={"name": "Test Buyer"}, headers=_auth(tok))
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["issued"] is True
    assert d["serial"].startswith("AIW-")
    assert d["buyer_name"] == "Test Buyer"
    assert d["pdf_url"].endswith("/api/funnel/gated/certificate/pdf")

    r = client.get("/api/funnel/gated/certificate/pdf", headers=_auth(tok))
    assert r.status_code == 200
    assert r.content[:4] == b"%PDF"
    body = r.content
    assert b"Certificate of Completion" in body or len(body) > 500

    # re-issue is idempotent: same serial, name not overwritten
    r = client.post("/api/funnel/gated/certificate",
                    json={"name": "Other Name"}, headers=_auth(tok))
    assert r.json()["serial"] == d["serial"]
    assert r.json()["buyer_name"] == "Test Buyer"


def test_gated_downloads_entitlements(client):
    # base+bump only: no upsell files
    oid = _paid_order(client, bump=True, upsell=False)
    tok = _login(client, oid)["token"]
    d = client.get("/api/funnel/gated/downloads", headers=_auth(tok)).json()
    files = {x["file"] for x in d["downloads"]}
    assert "quick-start.pdf" in files
    assert "office-prompt-library.pdf" in files
    assert "starter.pdf" not in files
    for x in d["downloads"]:
        path = x["url"].split("/api/funnel", 1)[1]
        assert client.get(f"/api/funnel{path}").status_code == 200

    # no bump: only quick-start
    r = client.post("/api/funnel/orders",
                    json={"email": "nobump@x.com", "bump": False,
                          "event_id": "e-nobump"})
    oid2 = r.json()["order_id"]
    client.post(f"/api/funnel/orders/{oid2}/mock-settle")
    tok2 = _login(client, oid2, "nobump@x.com")["token"]
    d = client.get("/api/funnel/gated/downloads",
                   headers=_auth(tok2)).json()
    files = {x["file"] for x in d["downloads"]}
    assert files == {"quick-start.pdf"}

    # with upsell: upsell files included
    oid3 = _paid_order(client, email="up@x.com", upsell=True)
    tok3 = _login(client, oid3, "up@x.com")["token"]
    d = client.get("/api/funnel/gated/downloads",
                   headers=_auth(tok3)).json()
    files = {x["file"] for x in d["downloads"]}
    assert "starter.pdf" in files


def test_me_endpoint(client):
    oid = _paid_order(client)
    tok = _login(client, oid)["token"]
    r = client.get("/api/funnel/gated/me", headers=_auth(tok))
    assert r.status_code == 200
    d = r.json()
    assert d["email"] == "buyer@test.com"
    assert d["entitlements"]["prompt_library"] is True
    assert d["progress"]["modules_total"] == 2
    assert d["certificate"]["issued"] is False


def test_manifest_fallback_to_bundled(tmp_path, monkeypatch):
    """Without FUNNEL_COURSE_MANIFEST or assets manifest, bundled placeholder loads."""
    monkeypatch.setenv("PAYMENT_RAIL", "mock")
    monkeypatch.setenv("META_CAPI_DRY_RUN", "1")
    monkeypatch.setenv("FUNNEL_DB_PATH", str(tmp_path / "funnel.db"))
    monkeypatch.setenv("FUNNEL_ASSETS_DIR", str(tmp_path / "assets"))
    monkeypatch.setenv("FUNNEL_CERTIFICATES_DIR", str(tmp_path / "certs"))
    (tmp_path / "assets").mkdir()
    from app import course
    from app.config import get_settings
    get_settings.cache_clear()
    course.reset()
    m = course.load_manifest()
    assert m["course"]["id"] == "ai-office-work-v1"
    assert len(m["modules"]) >= 3
    for mod in m["modules"]:
        assert all("video_id" in v for v in mod["videos"])
        for q in mod["quiz"]:
            assert q["answer"] in {o["id"] for o in q["options"]}
    get_settings.cache_clear()
    course.reset()


def test_login_rate_limit(client, monkeypatch):
    """Repeated failed logins for one (ip, email) get throttled."""
    monkeypatch.setenv("GATED_LOGIN_MAX_ATTEMPTS", "3")
    from app.config import get_settings
    get_settings.cache_clear()
    oid = _paid_order(client, email="rl@x.com")
    for _ in range(3):
        r = client.post("/api/funnel/gated/auth/login",
                        json={"email": "rl@x.com", "order_id": "ord_bad"})
        assert r.status_code == 401
    r = client.post("/api/funnel/gated/auth/login",
                    json={"email": "rl@x.com", "order_id": oid})
    assert r.status_code == 429
    # a different email key is unaffected
    r = client.post("/api/funnel/gated/auth/login",
                    json={"email": "other@x.com", "order_id": "ord_bad"})
    assert r.status_code == 401
    get_settings.cache_clear()
