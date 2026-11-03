"""Tests for the R2 storage backend — TEC-165.

Hermetic unit tests cover the S3 response parsing, error mapping and the
secret-mask settings rules. Integration tests run against the local docker
stack (same convention as test_settings.py) with a stubbed boto3 client —
the storage layer is exercised end-to-end without touching real R2.
"""

from __future__ import annotations

import io
import socket
import uuid
from collections.abc import Generator
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import psycopg
import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.main import app
from app.models.enums import UserRole
from app.services import media as media_service
from app.services import settings as settings_service
from app.services import setup as setup_service
from app.services import storage as storage_service
from app.services.storage import StorageError

client = TestClient(app)

PG_HOST = "localhost"
PG_PORT = 5433
PG_DB = "bloom"
PG_USER = "bloom"
PG_PASSWORD = "bloom_dev_password"

TEST_ADMIN_EMAIL = "storage-test-admin@techfly.dev"

_SECRET_KEY = "storage.r2.secret_access_key"


def _infra_up() -> bool:
    try:
        socket.create_connection((PG_HOST, PG_PORT), timeout=1).close()
        return True
    except OSError:
        return False


requires_infra = pytest.mark.skipif(
    not _infra_up(), reason="local docker stack is not running"
)


class _FakeS3:
    """In-memory stand-in for the boto3 S3 client."""

    def __init__(self) -> None:
        self.buckets: list[dict[str, Any]] = [
            {"Name": "bloom-media", "CreationDate": datetime(2026, 1, 1, tzinfo=UTC)}
        ]
        self.objects: dict[str, tuple[bytes, str]] = {}
        self.pages: list[dict[str, Any]] = []
        self.put_calls: list[dict[str, Any]] = []
        self.list_error: Exception | None = None
        self.get_error: Exception | None = None

    def list_buckets(self) -> dict[str, Any]:
        if self.list_error:
            raise self.list_error
        return {"Buckets": self.buckets}

    def create_bucket(self, **kwargs: Any) -> None:
        self.buckets.append(
            {"Name": kwargs["Bucket"], "CreationDate": datetime.now(UTC)}
        )

    def head_bucket(self, Bucket: str, **kwargs: Any) -> None:
        if Bucket not in {b["Name"] for b in self.buckets}:
            raise StorageError("check bucket: not found", 404)

    def list_objects_v2(self, **kwargs: Any) -> dict[str, Any]:
        if self.pages:
            return self.pages.pop(0)
        return {"Contents": [], "CommonPrefixes": [], "IsTruncated": False}

    def put_object(self, **kwargs: Any) -> None:
        self.put_calls.append(kwargs)
        self.objects[kwargs["Key"]] = (kwargs["Body"], kwargs["ContentType"])

    def get_object(self, **kwargs: Any) -> dict[str, Any]:
        if self.get_error:
            raise self.get_error
        body, mime = self.objects[kwargs["Key"]]
        return {"Body": io.BytesIO(body), "ContentLength": len(body), "ContentType": mime}


@pytest.fixture
def fake_s3(monkeypatch: pytest.MonkeyPatch) -> _FakeS3:
    fake = _FakeS3()
    monkeypatch.setattr(storage_service, "get_client", lambda cfg: fake)
    return fake


# ── hermetic: parsing, mapping, validation ───────────────────────────────


def test_list_objects_parses_folders_and_objects() -> None:
    fake = _FakeS3()
    fake.pages = [
        {
            "CommonPrefixes": [{"Prefix": "media/"}, {"Prefix": "files/"}],
            "Contents": [
                {
                    "Key": "uploads/a.png",
                    "Size": 10,
                    "LastModified": datetime(2026, 1, 2, tzinfo=UTC),
                },
                {"Key": "uploads/b.png", "Size": 5},
            ],
            "IsTruncated": True,
            "NextContinuationToken": "tok-2",
        }
    ]
    out = storage_service.list_objects(fake, "bloom-media", "", None, 50)
    assert out["folders"] == ["media/", "files/"]
    assert out["objects"][0] == {
        "key": "uploads/a.png",
        "size": 10,
        "last_modified": "2026-01-02T00:00:00+00:00",
    }
    assert out["objects"][1]["last_modified"] is None
    assert out["next_token"] == "tok-2"
    assert out["truncated"] is True


def test_list_objects_passes_continuation_token() -> None:
    fake = _FakeS3()
    seen: list[dict[str, Any]] = []

    def spy(**kwargs: Any) -> dict[str, Any]:
        seen.append(kwargs)
        return {"Contents": [], "CommonPrefixes": [], "IsTruncated": False}

    fake.list_objects_v2 = spy  # type: ignore[method-assign]
    storage_service.list_objects(fake, "b", "media/", "tok-1", 25)
    assert seen[0]["ContinuationToken"] == "tok-1"
    assert seen[0]["Prefix"] == "media/"
    assert seen[0]["Delimiter"] == "/"
    assert seen[0]["MaxKeys"] == 25


def test_usage_sums_pages_and_flags_truncation() -> None:
    fake = _FakeS3()
    fake.pages = [
        {
            "Contents": [{"Key": "a", "Size": 10}, {"Key": "b", "Size": 20}],
            "IsTruncated": True,
            "NextContinuationToken": "t",
        },
        {"Contents": [{"Key": "c", "Size": 5}], "IsTruncated": False},
    ]
    out = storage_service.usage(fake, "bloom-media")
    assert out == {"bytes": 35, "object_count": 3, "truncated": False}


def test_error_mapping_never_echoes_aws() -> None:
    from botocore.exceptions import ClientError

    exc = ClientError(
        {"Error": {"Code": "NoSuchKey", "Message": "secret internal msg"},
         "ResponseMetadata": {"HTTPStatusCode": 404}},
        "GetObject",
    )
    try:
        storage_service._call(lambda: (_ for _ in ()).throw(exc), "read object")
    except StorageError as err:
        assert err.http_status == 404
        assert "secret internal msg" not in err.detail
    else:
        raise AssertionError("expected StorageError")


def test_stream_body_reads_file_like() -> None:
    assert b"".join(storage_service.stream_body(io.BytesIO(b"abc"))) == b"abc"


def test_r2_prefix_validation() -> None:
    errors: dict[str, str] = {}
    spec = settings_service.SPEC_BY_KEY["storage.r2.prefix_media"]
    assert settings_service._validate(spec, "media/", errors) == "media/"
    assert errors == {}
    for bad in ("media", "/media/", "a/../b/"):
        errs: dict[str, str] = {}
        settings_service._validate(spec, bad, errs)
        assert spec.key in errs, bad


def test_storage_admin_endpoints_require_auth() -> None:
    assert client.get("/api/admin/storage/status").status_code == 401
    assert client.put("/api/admin/storage/connection", json={}).status_code == 401
    assert client.delete("/api/admin/storage/connection").status_code == 401
    assert client.get("/api/admin/storage/buckets").status_code == 401
    assert client.post("/api/admin/storage/buckets", json={}).status_code == 401
    assert client.post("/api/admin/storage/select", json={}).status_code == 401
    assert client.get("/api/admin/storage/objects").status_code == 401
    assert client.put("/api/admin/storage/prefixes", json={}).status_code == 401
    assert client.get("/api/admin/storage/usage").status_code == 401


# ── infra helpers ────────────────────────────────────────────────────────


def _pg() -> psycopg.Connection[Any]:
    return psycopg.connect(
        host=PG_HOST,
        port=PG_PORT,
        dbname=PG_DB,
        user=PG_USER,
        password=PG_PASSWORD,
        autocommit=True,
    )


@pytest.fixture
def admin_token() -> Generator[str, None, None]:
    user_id = str(uuid.uuid4())
    conn = _pg()
    conn.execute(
        "INSERT INTO users (id, email, full_name, role, is_active, created_at,"
        " updated_at) VALUES (%s, %s, 'Storage Test Admin', 'admin', true,"
        " %s, %s)",
        (user_id, TEST_ADMIN_EMAIL, datetime.now(UTC), datetime.now(UTC)),
    )
    conn.close()
    token, _ = create_access_token(uuid.UUID(user_id), UserRole.admin)
    yield token
    conn = _pg()
    conn.execute("DELETE FROM users WHERE email = %s", (TEST_ADMIN_EMAIL,))
    conn.close()


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _items(payload: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {
        item["key"]: item
        for group in payload["groups"]
        for item in group["items"]
    }


def _secret_db_value() -> Any:
    conn = _pg()
    row = conn.execute(
        "SELECT value FROM settings WHERE key = %s", (_SECRET_KEY,)
    ).fetchone()
    conn.close()
    return row[0] if row else None


def _clear_connection(token: str) -> None:
    client.delete("/api/admin/storage/connection", headers=_auth(token))


_PNG_DATA_URL = (
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ"
    "AAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
)


# ── secret masking ───────────────────────────────────────────────────────


@requires_infra
def test_secret_masked_and_mask_patch_is_noop(admin_token: str) -> None:
    try:
        # unset → null, not ""
        resp = client.get("/api/admin/settings", headers=_auth(admin_token))
        assert resp.status_code == 200
        assert _items(resp.json())[_SECRET_KEY]["value"] is None
        assert _items(resp.json())[_SECRET_KEY]["type"] == "secret"

        # set a real secret → GET only ever shows the mask
        resp = client.patch(
            "/api/admin/settings",
            headers=_auth(admin_token),
            json={_SECRET_KEY: "real-secret-value"},
        )
        assert resp.status_code == 200, resp.text
        assert _items(resp.json())[_SECRET_KEY]["value"] == "********"
        assert _secret_db_value() == "real-secret-value"

        # PATCHing the mask back or an empty value keeps the stored secret
        for noop in ("********", "", None):
            resp = client.patch(
                "/api/admin/settings",
                headers=_auth(admin_token),
                json={_SECRET_KEY: noop},
            )
            assert resp.status_code == 200, resp.text
            assert _items(resp.json())[_SECRET_KEY]["value"] == "********"
            assert _secret_db_value() == "real-secret-value"
    finally:
        _clear_connection(admin_token)


# ── admin storage API ────────────────────────────────────────────────────


@requires_infra
def test_status_defaults_unconfigured(admin_token: str) -> None:
    try:
        resp = client.get("/api/admin/storage/status", headers=_auth(admin_token))
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["configured"] is False
        assert body["reachable"] is False
        assert body["account_id"] is None
        assert body["prefixes"] == {
            "media": "media/",
            "public_uploads": "uploads/",
            "files": "files/",
        }
    finally:
        _clear_connection(admin_token)


@requires_infra
def test_connection_round_trip(admin_token: str, fake_s3: _FakeS3) -> None:
    try:
        resp = client.put(
            "/api/admin/storage/connection",
            headers=_auth(admin_token),
            json={
                "account_id": "0123456789abcdef0123456789abcdef",
                "access_key_id": "AKID9999",
                "secret_access_key": "sekret-value",
            },
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["configured"] is True
        assert body["reachable"] is True
        assert body["account_id"] == "••••cdef"
        assert body["access_key_id"] == "••••9999"
        assert "sekret" not in resp.text

        # buckets + select + objects + usage all run against the stub
        resp = client.get("/api/admin/storage/buckets", headers=_auth(admin_token))
        assert [b["name"] for b in resp.json()] == ["bloom-media"]

        resp = client.post(
            "/api/admin/storage/select",
            headers=_auth(admin_token),
            json={"bucket": "bloom-media"},
        )
        assert resp.status_code == 200 and resp.json()["bucket"] == "bloom-media"

        fake_s3.pages = [
            {
                "CommonPrefixes": [{"Prefix": "media/"}],
                "Contents": [
                    {"Key": "uploads/a.png", "Size": 7,
                     "LastModified": datetime(2026, 2, 1, tzinfo=UTC)}
                ],
                "IsTruncated": False,
            }
        ]
        resp = client.get(
            "/api/admin/storage/objects", headers=_auth(admin_token)
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["folders"] == ["media/"]
        assert resp.json()["objects"][0]["key"] == "uploads/a.png"

        fake_s3.pages = [
            {"Contents": [{"Key": "a", "Size": 7}], "IsTruncated": False}
        ]
        resp = client.get("/api/admin/storage/usage", headers=_auth(admin_token))
        assert resp.json() == {"bytes": 7, "object_count": 1, "truncated": False}

        # select on a missing bucket → 404
        resp = client.post(
            "/api/admin/storage/select",
            headers=_auth(admin_token),
            json={"bucket": "nope"},
        )
        assert resp.status_code == 404
    finally:
        _clear_connection(admin_token)

    resp = client.get("/api/admin/storage/status", headers=_auth(admin_token))
    assert resp.json()["configured"] is False


@requires_infra
def test_connection_rejects_bad_credentials(
    admin_token: str, fake_s3: _FakeS3
) -> None:
    fake_s3.list_error = StorageError("list buckets: credentials rejected", 502)
    resp = client.put(
        "/api/admin/storage/connection",
        headers=_auth(admin_token),
        json={
            "account_id": "0123456789abcdef0123456789abcdef",
            "access_key_id": "bad",
            "secret_access_key": "bad",
        },
    )
    assert resp.status_code == 422
    assert resp.json()["detail"] == "connection_failed"


@requires_infra
def test_prefix_update_validates_and_saves(
    admin_token: str, fake_s3: _FakeS3
) -> None:
    try:
        resp = client.put(
            "/api/admin/storage/prefixes",
            headers=_auth(admin_token),
            json={"media": "img/"},
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["prefixes"]["media"] == "img/"

        resp = client.put(
            "/api/admin/storage/prefixes",
            headers=_auth(admin_token),
            json={"files": "no-trailing-slash"},
        )
        assert resp.status_code == 422
    finally:
        client.put(
            "/api/admin/storage/prefixes",
            headers=_auth(admin_token),
            json={"media": "media/", "public_uploads": "uploads/", "files": "files/"},
        )


@requires_infra
def test_objects_and_usage_require_config(
    admin_token: str, fake_s3: _FakeS3
) -> None:
    try:
        _clear_connection(admin_token)
        assert client.get(
            "/api/admin/storage/objects", headers=_auth(admin_token)
        ).status_code == 400
        assert client.get(
            "/api/admin/storage/buckets", headers=_auth(admin_token)
        ).status_code == 400
    finally:
        _clear_connection(admin_token)


# ── media upload → R2 and the serve endpoint ─────────────────────────────


@requires_infra
def test_media_upload_goes_to_r2_and_serves(
    admin_token: str, fake_s3: _FakeS3, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(setup_service, "UPLOADS_DIR", tmp_path)
    media_id = None
    try:
        resp = client.put(
            "/api/admin/storage/connection",
            headers=_auth(admin_token),
            json={
                "account_id": "00112233445566778899aabbccddeeff",
                "access_key_id": "AKID",
                "secret_access_key": "sekret",
            },
        )
        assert resp.status_code == 200, resp.text
        client.post(
            "/api/admin/storage/select",
            headers=_auth(admin_token),
            json={"bucket": "bloom-media"},
        )

        resp = client.post(
            "/api/cms/media/upload",
            headers=_auth(admin_token),
            json={"filename": "hero.png", "mime_type": "image/png",
                  "data_url": _PNG_DATA_URL},
        )
        assert resp.status_code == 201, resp.text
        body = resp.json()
        media_id = body["id"]
        assert body["storage_key"].startswith("media/")
        assert body["url"] == f"/api/media/serve/{body['storage_key']}"
        assert fake_s3.put_calls[0]["Bucket"] == "bloom-media"
        assert fake_s3.put_calls[0]["ContentType"] == "image/png"
        # nothing landed on local disk
        assert not list((tmp_path / "cms").glob("*.png"))

        # public serve streams the R2 bytes — no auth, immutable cache
        resp = client.get(body["url"])
        assert resp.status_code == 200, resp.text
        assert resp.headers["content-type"].startswith("image/png")
        assert "immutable" in resp.headers["cache-control"]
        assert len(resp.content) > 0
    finally:
        if media_id:
            client.delete(
                f"/api/cms/media/{media_id}", headers=_auth(admin_token)
            )
        _clear_connection(admin_token)


@requires_infra
def test_serve_local_file_and_404(
    admin_token: str, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(setup_service, "UPLOADS_DIR", tmp_path)
    media_id = None
    try:
        _clear_connection(admin_token)  # R2 off → local upload path
        resp = client.post(
            "/api/cms/media/upload",
            headers=_auth(admin_token),
            json={"filename": "local.png", "mime_type": "image/png",
                  "data_url": _PNG_DATA_URL},
        )
        assert resp.status_code == 201, resp.text
        media_id = resp.json()["id"]
        key = resp.json()["storage_key"]

        resp = client.get(f"/api/media/serve/{key}")
        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("image/png")
        assert "immutable" in resp.headers["cache-control"]

        assert client.get("/api/media/serve/cms/nope.png").status_code == 404
    finally:
        if media_id:
            client.delete(
                f"/api/cms/media/{media_id}", headers=_auth(admin_token)
            )
        _clear_connection(admin_token)


@requires_infra
def test_serve_r2_outage_returns_503(
    admin_token: str, fake_s3: _FakeS3, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(setup_service, "UPLOADS_DIR", tmp_path)
    media_id = None
    try:
        client.put(
            "/api/admin/storage/connection",
            headers=_auth(admin_token),
            json={
                "account_id": "00112233445566778899aabbccddeeff",
                "access_key_id": "AKID",
                "secret_access_key": "sekret",
            },
        )
        client.post(
            "/api/admin/storage/select",
            headers=_auth(admin_token),
            json={"bucket": "bloom-media"},
        )
        resp = client.post(
            "/api/cms/media/upload",
            headers=_auth(admin_token),
            json={"filename": "r2.png", "mime_type": "image/png",
                  "data_url": _PNG_DATA_URL},
        )
        media_id = resp.json()["id"]
        url = resp.json()["url"]

        fake_s3.get_error = StorageError("read object: storage backend unreachable", 502)
        resp = client.get(url)
        assert resp.status_code == 503
        assert resp.json()["detail"] == "storage_unavailable"
        assert resp.headers["cache-control"] == "public, max-age=30"
    finally:
        if media_id:
            client.delete(
                f"/api/cms/media/{media_id}", headers=_auth(admin_token)
            )
        _clear_connection(admin_token)


# ── security review regressions (TEC-171 F1/F2/F3) ──────────────────────


def _insert_media_row(storage_key: str, mime_type: str) -> str:
    """Insert a raw cms_media row (bypasses API validation); returns its id."""
    row_id = str(uuid.uuid4())
    conn = _pg()
    conn.execute(
        "INSERT INTO cms_media (id, storage_key, url, filename, mime_type,"
        " created_at) VALUES (%s, %s, %s, 'x.png', %s, %s)",
        (
            row_id,
            storage_key,
            f"/api/media/serve/{storage_key}",
            mime_type,
            datetime.now(UTC),
        ),
    )
    conn.close()
    return row_id


def _delete_media_row(row_id: str) -> None:
    conn = _pg()
    conn.execute("DELETE FROM cms_media WHERE id = %s", (row_id,))
    conn.close()


def test_is_servable_key_shape() -> None:
    good = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6.png"
    assert media_service.is_servable_key(f"cms/{good}", "media/")
    assert media_service.is_servable_key(f"media/{good}", "media/")
    for bad in (
        "/etc/passwd",
        "cms/../../etc/passwd",
        f"files/{good}",
        f"uploads/{good}",
        "cms/not-a-uuid.png",
        "cms/" + good + ".exe",
        "cms/",
    ):
        assert not media_service.is_servable_key(bad, "media/"), bad


def test_media_file_containment(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(setup_service, "UPLOADS_DIR", tmp_path)
    (tmp_path / "cms").mkdir()
    (tmp_path / "cms" / "a.png").write_bytes(b"x")
    assert media_service.media_file("cms/a.png") is not None
    assert media_service.media_file("/etc/hostname") is None
    assert media_service.media_file("../../etc/hostname") is None
    assert media_service.media_file("cms/../../etc/hostname") is None


@requires_infra
def test_serve_rejects_non_media_keys(
    admin_token: str, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """F1: absolute-path and non-media-prefix rows are never served."""
    monkeypatch.setattr(setup_service, "UPLOADS_DIR", tmp_path)
    good = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6.png"
    ids = [
        _insert_media_row("/etc/hostname", "image/png"),
        _insert_media_row(f"files/{good}", "image/png"),
        _insert_media_row(f"uploads/{good}", "image/png"),
    ]
    try:
        for key in ("/etc/hostname", f"files/{good}", f"uploads/{good}"):
            resp = client.get(f"/api/media/serve/{key}")
            assert resp.status_code == 404, (key, resp.status_code)
    finally:
        for row_id in ids:
            _delete_media_row(row_id)


@requires_infra
def test_create_media_rejects_arbitrary_storage_key(admin_token: str) -> None:
    """F1 write-path: POST /api/cms/media can't register an arbitrary key."""
    for bad in (
        "/etc/hostname",
        "files/a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6.png",
        "cms/../x.png",
    ):
        resp = client.post(
            "/api/cms/media",
            headers=_auth(admin_token),
            json={
                "storage_key": bad,
                "url": f"/api/media/serve/{bad}",
                "filename": "x.png",
                "mime_type": "image/png",
            },
        )
        assert resp.status_code == 422, (bad, resp.status_code)


@requires_infra
def test_serve_ignores_stored_html_content_type(
    admin_token: str, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """F2: a row claiming text/html never serves HTML — ext-derived + nosniff."""
    monkeypatch.setattr(setup_service, "UPLOADS_DIR", tmp_path)
    key = "cms/a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6.png"
    (tmp_path / "cms").mkdir(parents=True, exist_ok=True)
    (tmp_path / "cms" / "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6.png").write_bytes(
        b"<html>"
    )
    row_id = _insert_media_row(key, "text/html")
    try:
        resp = client.get(f"/api/media/serve/{key}")
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "image/png"
        assert resp.headers["x-content-type-options"] == "nosniff"
        assert "immutable" in resp.headers["cache-control"]
    finally:
        _delete_media_row(row_id)


@requires_infra
def test_connection_rejects_malformed_account_id(
    admin_token: str, fake_s3: _FakeS3
) -> None:
    """F3: account_id feeds the endpoint host — URL delimiters rejected."""
    try:
        for bad in (
            "evil.example.com/x?y",
            "a" * 31,
            "AABB" + "0" * 28,
            "0" * 31 + "!",
            "",
        ):
            resp = client.put(
                "/api/admin/storage/connection",
                headers=_auth(admin_token),
                json={
                    "account_id": bad,
                    "access_key_id": "AKID",
                    "secret_access_key": "sekret",
                },
            )
            assert resp.status_code == 422, (bad, resp.status_code)
    finally:
        # if a case ever slips through and writes creds, don't leak it to
        # later tests
        _clear_connection(admin_token)


def test_account_id_format_via_settings_spec() -> None:
    """F3: the same check applies to direct settings PATCHes."""
    spec = settings_service.SPEC_BY_KEY["storage.r2.account_id"]
    errs: dict[str, str] = {}
    settings_service._validate(spec, "evil.example.com/x", errs)
    assert spec.key in errs
    errs = {}
    assert (
        settings_service._validate(
            spec, "0123456789abcdef0123456789abcdef", errs
        )
        == "0123456789abcdef0123456789abcdef"
    )
    assert errs == {}
