"""E2E tests for the funnel API (mock rail, CAPI DRY_RUN)."""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import sys
from pathlib import Path

import pytest

API_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(API_DIR))


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("PAYMENT_RAIL", "mock")
    monkeypatch.setenv("META_CAPI_DRY_RUN", "1")
    monkeypatch.setenv("ADMIN_TOKEN", "test-admin-token")
    monkeypatch.setenv("FUNNEL_DB_PATH", str(tmp_path / "funnel.db"))
    monkeypatch.setenv("FUNNEL_ASSETS_DIR", str(tmp_path / "assets"))
    monkeypatch.setenv("DOWNLOAD_SIGNING_SECRET", "test-secret")
    (tmp_path / "assets").mkdir()
    (tmp_path / "assets" / "course").mkdir()
    (tmp_path / "assets" / "course" / "quick-start.pdf").write_bytes(
        b"%PDF fake quick-start")
    (tmp_path / "assets" / "prompts").mkdir()
    (tmp_path / "assets" / "prompts" / "office-prompt-library.pdf").write_bytes(
        b"%PDF fake prompt library")
    (tmp_path / "assets" / "prompts" / "email-templates.txt").write_text(
        "template pack")
    (tmp_path / "assets" / "upsell").mkdir()
    (tmp_path / "assets" / "upsell" / "bundle.pdf").write_bytes(b"%PDF bundle")

    from app.config import get_settings
    get_settings.cache_clear()
    from app.main import create_app
    from fastapi.testclient import TestClient
    yield TestClient(create_app())
    get_settings.cache_clear()


def test_health(client):
    r = client.get("/api/funnel/health")
    assert r.status_code == 200 and r.json()["rail"] == "mock"


def test_full_funnel_mock_rail(client, caplog):
    caplog.set_level(logging.INFO, logger="funnel.capi")
    r = client.post("/api/funnel/orders", json={
        "email": "Buyer@Test.com", "bump": True,
        "event_id": "evt-checkout-1", "utm": {"utm_source": "meta"},
    })
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["amount_paise"] == 29800
    assert data["currency"] == "INR" and data["rail"] == "mock"
    assert "mock-settle" in data["mock"]["settle_url"]
    oid = data["order_id"]

    capi_events = [json.loads(r.message.split("CAPI_DRY_RUN ", 1)[1])
                   for r in caplog.records if "CAPI_DRY_RUN" in r.message]
    ic = capi_events[0]["data"][0]
    assert ic["event_name"] == "InitiateCheckout"
    assert ic["event_id"] == "evt-checkout-1"
    assert ic["custom_data"]["value"] == 298.0
    assert ic["custom_data"]["currency"] == "INR"
    assert ic["user_data"]["em"] == [hashlib.sha256(b"buyer@test.com").hexdigest()]

    assert client.get(f"/api/funnel/orders/{oid}/downloads").status_code == 402

    r = client.post(f"/api/funnel/orders/{oid}/mock-settle")
    assert r.status_code == 200
    assert r.json()["status"] == "paid"

    capi_events = [json.loads(r.message.split("CAPI_DRY_RUN ", 1)[1])
                   for r in caplog.records if "CAPI_DRY_RUN" in r.message]
    purch = capi_events[-1]["data"][0]
    assert purch["event_name"] == "Purchase"
    assert purch["event_id"] == f"purchase_{oid}"
    assert purch["custom_data"]["value"] == 298.0

    r = client.get(f"/api/funnel/orders/{oid}")
    assert r.json()["items"][0]["sku"] == "ai-office-course"
    assert len(r.json()["items"]) == 2

    r = client.get(f"/api/funnel/orders/{oid}/downloads")
    assert r.status_code == 200
    downloads = r.json()["downloads"]
    assert {d["file"] for d in downloads} == {"quick-start.pdf", "office-prompt-library.pdf", "email-templates.txt"}
    for d in downloads:
        path = d["url"].split("/api/funnel", 1)[1]
        assert client.get(f"/api/funnel{path}").status_code == 200

    r = client.get("/api/funnel/buyers.csv")
    assert r.status_code == 401
    r = client.get("/api/funnel/buyers.csv",
                   headers={"Authorization": "Bearer test-admin-token"})
    assert r.status_code == 200
    assert "buyer@test.com" in r.text and "29800" in r.text

    # attempt logging: mock settle recorded one captured attempt
    from app import store
    attempts = store.list_attempts(oid)
    assert len(attempts) == 1
    assert attempts[0]["status"] == "captured" and attempts[0]["method"] == "mock"

    r = client.get("/api/funnel/payment-stats")
    assert r.status_code == 401
    r = client.get("/api/funnel/payment-stats",
                   headers={"Authorization": "Bearer test-admin-token"})
    stats = r.json()
    assert stats["attempts"] == 1 and stats["captured"] == 1
    assert stats["success_rate"] == 1.0
    assert stats["by_method"]["mock"]["captured"] == 1


def test_order_create_idempotent(client):
    body = {"email": "a@b.com", "bump": False, "event_id": "dup-1"}
    r1 = client.post("/api/funnel/orders", json=body)
    r2 = client.post("/api/funnel/orders", json=body)
    assert r1.json()["order_id"] == r2.json()["order_id"]


def test_upsell_flow(client, caplog):
    r = client.post("/api/funnel/orders",
                    json={"email": "u@x.com", "bump": False, "event_id": "e-up"})
    oid = r.json()["order_id"]
    assert client.post(f"/api/funnel/orders/{oid}/upsell", json={}).status_code == 409
    client.post(f"/api/funnel/orders/{oid}/mock-settle")
    caplog.set_level(logging.INFO, logger="funnel.capi")
    r = client.post(f"/api/funnel/orders/{oid}/upsell",
                    json={"event_id": "e-upsell"})
    assert r.status_code in (200, 201)
    assert r.json()["amount_paise"] == 59900
    assert "payment_id=" in r.json()["mock"]["settle_url"]
    up_pid = r.json()["mock"]["settle_url"].split("payment_id=")[1]
    r = client.post(f"/api/funnel/orders/{oid}/mock-settle?payment_id={up_pid}")
    assert r.status_code == 200
    skus = {i["sku"] for i in r.json()["items"]}
    assert "ai-creators-starter" in skus
    capi_events = [json.loads(x.message.split("CAPI_DRY_RUN ", 1)[1])
                   for x in caplog.records if "CAPI_DRY_RUN" in x.message]
    up_purch = capi_events[-1]["data"][0]
    assert up_purch["event_name"] == "Purchase"
    assert up_purch["event_id"] == f"purchase_{oid}_upsell"
    assert up_purch["custom_data"]["value"] == 599.0
    dls = client.get(f"/api/funnel/orders/{oid}/downloads").json()["downloads"]
    assert "bundle.pdf" in {d["file"] for d in dls}


def test_webhook_signature(tmp_path, monkeypatch):
    monkeypatch.setenv("PAYMENT_RAIL", "razorpay")
    monkeypatch.setenv("RAZORPAY_KEY_ID", "rzp_test_x")
    monkeypatch.setenv("RAZORPAY_KEY_SECRET", "secret")
    monkeypatch.setenv("RAZORPAY_WEBHOOK_SECRET", "whsec")
    monkeypatch.setenv("META_CAPI_DRY_RUN", "1")
    monkeypatch.setenv("FUNNEL_DB_PATH", str(tmp_path / "funnel.db"))
    monkeypatch.setenv("FUNNEL_ASSETS_DIR", str(tmp_path / "assets"))
    from app.config import get_settings
    get_settings.cache_clear()
    from app import store
    from app.main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    order, payment = store.create_order(
        email="w@x.com", items=[{"sku": "ai-office-course", "amount_paise": 19900}],
        event_id="e-wh", utm=None, payment_kind="base",
        amount_paise=19900, rail="razorpay",
    )
    store.set_payment_rail_ref(payment["id"], "order_RZP123")

    # failed UPI attempt is logged; payment stays retryable ('created')
    fail_body = json.dumps({
        "event": "payment.failed",
        "payload": {"payment": {"entity": {
            "id": "pay_FAIL1", "order_id": "order_RZP123", "amount": 19900,
            "method": "upi", "error_code": "BAD_REQUEST_ERROR",
            "error_description": "UPI transaction failed"}}},
    }).encode()
    fsig = hmac.new(b"whsec", fail_body, hashlib.sha256).hexdigest()
    fr = c.post("/api/funnel/webhooks/razorpay", content=fail_body,
                headers={"X-Razorpay-Signature": fsig})
    assert fr.status_code == 200 and fr.json()["status"] == "attempt_failed"
    assert store.get_payment(payment["id"])["status"] == "created"

    body = json.dumps({
        "event": "payment.captured",
        "payload": {"payment": {"entity": {
            "id": "pay_OK1", "order_id": "order_RZP123", "amount": 19900,
            "method": "upi"}}},
    }).encode()
    bad = c.post("/api/funnel/webhooks/razorpay", content=body,
                 headers={"X-Razorpay-Signature": "bad"})
    assert bad.status_code == 401
    sig = hmac.new(b"whsec", body, hashlib.sha256).hexdigest()
    ok = c.post("/api/funnel/webhooks/razorpay", content=body,
                headers={"X-Razorpay-Signature": sig})
    assert ok.status_code == 200 and ok.json()["status"] == "paid"
    assert store.get_order(order["id"])["status"] == "paid"
    # retry is idempotent — no duplicate attempt row either
    again = c.post("/api/funnel/webhooks/razorpay", content=body,
                   headers={"X-Razorpay-Signature": sig})
    assert again.json()["status"] == "already_paid"

    attempts = store.list_attempts(order["id"])
    assert [a["status"] for a in attempts] == ["failed", "captured"]
    assert attempts[0]["method"] == "upi"
    assert attempts[0]["error_code"] == "BAD_REQUEST_ERROR"
    stats = store.payment_stats()
    assert stats["attempts"] == 2 and stats["captured"] == 1 and stats["failed"] == 1
    assert stats["by_method"]["upi"]["success_rate"] == 0.5
    get_settings.cache_clear()
