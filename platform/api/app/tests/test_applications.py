"""Tests for POST /api/applications — the careers-form intake endpoint (TEC-144).

Regression coverage for the form's lost submissions: the endpoint must store
the application at the `applied` stage and return 201, idempotent on
`idempotency_key`.

The persistence tests run against the local docker stack (Postgres :5433,
PgBouncer :6432) and skip when it isn't up; the validation test is hermetic
because Pydantic rejects the body before the DB session is touched.
"""

from __future__ import annotations

import socket
import uuid
from collections.abc import Generator

import psycopg
import pytest
from fastapi.testclient import TestClient

from app.integrations.waise import get_application_notifier
from app.main import app
from app.models.application import Application

PG_HOST = "localhost"
PG_PORT = 5433
PG_DSN = "postgresql://bloom:bloom_dev_password@localhost:5433/bloom"


def _infra_up() -> bool:
    try:
        socket.create_connection((PG_HOST, PG_PORT), timeout=1).close()
        return True
    except OSError:
        return False


requires_infra = pytest.mark.skipif(
    not _infra_up(), reason="local docker stack is not running"
)


class SpyNotifier:
    """Records alert calls — the endpoint must notify exactly once per new row."""

    def __init__(self) -> None:
        self.refs: list[str] = []

    def send_application_alert(self, application: Application) -> None:
        self.refs.append(application.ref)


@pytest.fixture
def client() -> Generator[tuple[TestClient, SpyNotifier], None, None]:
    spy = SpyNotifier()
    app.dependency_overrides[get_application_notifier] = lambda: spy
    try:
        yield TestClient(app), spy
    finally:
        app.dependency_overrides.clear()


def _delete_application(application_id: str) -> None:
    with psycopg.connect(PG_DSN) as conn:
        conn.execute("DELETE FROM applications WHERE id = %s", (application_id,))


def _count_by_key(key: str) -> int:
    with psycopg.connect(PG_DSN) as conn:
        row = conn.execute(
            "SELECT count(*) FROM applications WHERE idempotency_key = %s", (key,)
        ).fetchone()
    assert row is not None
    return int(row[0])


def _payload(key: str) -> dict[str, object]:
    return {
        "name": "QA Bot",
        "email": "qa@example.dev",
        "phone": "+8801700000000",
        "country": "India",
        "vacancy": "v1",
        "role_title": "IELTS Writing Examiner",
        "years": 6,
        "examiner": "Former examiner",
        "office": "blr",
        "office_name": "Bengaluru, India",
        "cv": "https://example.dev/cv.pdf",
        "note": "I want to own Writing Task 2.",
        "source": "careers page",
        "idempotency_key": key,
    }


def test_create_application_validates_body(
    client: tuple[TestClient, SpyNotifier],
) -> None:
    c, spy = client
    response = c.post("/api/applications", json={"source": "careers page"})
    assert response.status_code == 422
    assert spy.refs == []


@requires_infra
def test_create_application_happy_path(client: tuple[TestClient, SpyNotifier]) -> None:
    c, spy = client
    key = f"test-{uuid.uuid4()}"
    response = c.post("/api/applications", json=_payload(key))
    assert response.status_code == 201
    body = response.json()
    application = body["application"]
    try:
        assert application["ref"].startswith("BL-APP-")
        assert application["name"] == "QA Bot"
        assert application["stage"] == "applied"
        assert application["source"] == "careers page"
        assert body["alert"] == "sent"
        assert spy.refs == [application["ref"]]
        assert _count_by_key(key) == 1
    finally:
        _delete_application(application["id"])


@requires_infra
def test_create_application_idempotent_retry(
    client: tuple[TestClient, SpyNotifier],
) -> None:
    c, spy = client
    key = f"test-{uuid.uuid4()}"
    first = c.post("/api/applications", json=_payload(key))
    second = c.post("/api/applications", json=_payload(key))
    assert first.status_code == 201
    assert second.status_code == 201
    application_id = first.json()["application"]["id"]
    try:
        assert second.json()["application"]["id"] == application_id
        assert (
            second.json()["application"]["ref"] == first.json()["application"]["ref"]
        )
        assert _count_by_key(key) == 1
        # The retry returns the stored row without firing a second alert.
        assert len(spy.refs) == 1
    finally:
        _delete_application(application_id)
