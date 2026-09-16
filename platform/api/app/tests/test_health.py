"""Tests for the Bloom API."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root() -> None:
    response = client.get("/")
    assert response.status_code == 200
    body = response.json()
    assert body["service"] == "bloom-api"
    assert body["health"] == "/api/health"


def test_health_shape() -> None:
    # Without infra running, the health endpoint still returns 200 with a
    # degraded status; the shape is the contract we assert here.
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["service"] == "bloom-api"
    assert "checks" in body
    assert "postgres" in body["checks"]
    assert "redis" in body["checks"]
