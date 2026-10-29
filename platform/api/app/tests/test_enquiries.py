"""Tests for POST /api/enquiries — the contact-form intake endpoint (TEC-143).

Regression coverage for the 500 caused by the never-migrated
`enquiry_ref_seq` sequence: with the sequence in place the endpoint must
store the enquiry and return 201, idempotent on `idempotency_key`.

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

from app.integrations.waise import get_enquiry_notifier
from app.main import app
from app.models.enquiry import Enquiry

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

    def send_enquiry_alert(self, enquiry: Enquiry) -> None:
        self.refs.append(enquiry.ref)


@pytest.fixture
def client() -> Generator[tuple[TestClient, SpyNotifier], None, None]:
    spy = SpyNotifier()
    app.dependency_overrides[get_enquiry_notifier] = lambda: spy
    try:
        yield TestClient(app), spy
    finally:
        app.dependency_overrides.clear()


def _delete_enquiry(enquiry_id: str) -> None:
    with psycopg.connect(PG_DSN) as conn:
        conn.execute("DELETE FROM enquiries WHERE id = %s", (enquiry_id,))


def _count_by_key(key: str) -> int:
    with psycopg.connect(PG_DSN) as conn:
        row = conn.execute(
            "SELECT count(*) FROM enquiries WHERE idempotency_key = %s", (key,)
        ).fetchone()
    assert row is not None
    return int(row[0])


def _payload(key: str) -> dict[str, str]:
    return {
        "name": "QA Bot",
        "email": "qa@example.dev",
        "phone": "+8801700000000",
        "country": "BD",
        "interest": "ielts",
        "message": "Please call me back",
        "source": "website",
        "idempotency_key": key,
    }


def test_create_enquiry_validates_body(client: tuple[TestClient, SpyNotifier]) -> None:
    c, spy = client
    response = c.post("/api/enquiries", json={"source": "website"})
    assert response.status_code == 422
    assert spy.refs == []


@requires_infra
def test_create_enquiry_happy_path(client: tuple[TestClient, SpyNotifier]) -> None:
    c, spy = client
    key = f"test-{uuid.uuid4()}"
    response = c.post("/api/enquiries", json=_payload(key))
    assert response.status_code == 201
    body = response.json()
    enquiry = body["enquiry"]
    try:
        assert enquiry["ref"].startswith("ENQ-")
        assert enquiry["name"] == "QA Bot"
        assert enquiry["status"] == "new"
        assert enquiry["source"] == "website"
        assert body["alert"] == "sent"
        assert spy.refs == [enquiry["ref"]]
        assert _count_by_key(key) == 1
    finally:
        _delete_enquiry(enquiry["id"])


@requires_infra
def test_create_enquiry_idempotent_retry(client: tuple[TestClient, SpyNotifier]) -> None:
    c, spy = client
    key = f"test-{uuid.uuid4()}"
    first = c.post("/api/enquiries", json=_payload(key))
    second = c.post("/api/enquiries", json=_payload(key))
    assert first.status_code == 201
    assert second.status_code == 201
    enquiry_id = first.json()["enquiry"]["id"]
    try:
        assert second.json()["enquiry"]["id"] == enquiry_id
        assert second.json()["enquiry"]["ref"] == first.json()["enquiry"]["ref"]
        assert _count_by_key(key) == 1
        # The retry returns the stored row without firing a second alert.
        assert len(spy.refs) == 1
    finally:
        _delete_enquiry(enquiry_id)
