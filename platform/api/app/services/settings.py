"""Platform settings — registry, seeding, resolution and bulk updates.

The registry below is the single source of truth for which keys exist, what
they control, and how values are validated. Effective value resolution:

  row present + ``updated_by`` set → admin override, ``source="db"``
  row present + ``updated_by`` NULL → seeded value, ``source="env"``
  row missing                    → env/prototype default, ``source="env"``

Seeding happens in the alembic migration and again on first read
(``ensure_seeded``), so keys added later appear without a manual backfill.

Values that matter elsewhere (institute name/tagline/logo) are read by
``app.routers.branding`` through :func:`resolved_map` — DB override wins over
the installer's ``INSTITUTE_*`` env, and env wins over prototype defaults.
"""

from __future__ import annotations

import base64
import logging
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app import __version__
from app.core.config import Settings, get_settings
from app.models.setting import Setting
from app.models.user import User
from app.services import setup as setup_service

if TYPE_CHECKING:
    from redis import Redis

logger = logging.getLogger(__name__)

CACHE_KEY = "bloom:settings:payload:v1"
CACHE_TTL_SECONDS = 120

_email_adapter: TypeAdapter[str] = TypeAdapter(EmailStr)
_URL_RE = re.compile(r"^https?://[^\s]+$", re.I)

# data:image/{png,jpeg,webp};base64,… uploads (same rules as the setup wizard)
_IMAGE_DATA_URL = re.compile(
    r"^data:image/(png|jpeg|webp);base64,(?P<data>.+)$", re.S
)
_IMAGE_EXT = {"png": "png", "jpeg": "jpg", "webp": "webp"}
_IMAGE_MAX_BYTES = 512 * 1024

# Where uploaded image settings are served from.
_IMAGE_TARGETS: dict[str, tuple[str, str]] = {
    "institute.logo_url": ("logo", "/api/branding/logo"),
    "institute.favicon_url": ("favicon", "/api/branding/favicon"),
}


class SettingValidationError(ValueError):
    """One or more PATCHed keys failed validation.

    ``errors`` maps setting key → human-readable message; the router turns it
    into a 422 detail payload.
    """

    def __init__(self, errors: dict[str, str]) -> None:
        super().__init__("; ".join(f"{k}: {v}" for k, v in errors.items()))
        self.errors = errors


@dataclass(frozen=True)
class SettingSpec:
    key: str
    group: str
    label: str
    type: str  # text | email | url | select | toggle | number | image
    description: str
    default: Any = None
    options: tuple[str, ...] = ()
    env_alias: str | None = None  # Settings attribute consulted before `default`
    max_length: int = 300
    number_min: float = 0
    number_max: float = 100


_GROUPS: tuple[tuple[str, str, str], ...] = (
    (
        "institute",
        "Institute Profile",
        "Identity and contact details used across the site, emails and invoices.",
    ),
    (
        "academic",
        "Academic Defaults",
        "Baseline expectations applied to new batches and enrolments.",
    ),
    (
        "finance",
        "Finance Rules",
        "Payment terms used by invoicing, reminders and access control.",
    ),
    (
        "notifications",
        "Notification Defaults",
        "Which automated emails and alerts are switched on.",
    ),
)

_GROUP_META = {g[0]: (g[1], g[2]) for g in _GROUPS}

_BANDS = tuple(f"{b / 2:.1f}" for b in range(11, 19))  # 5.5 → 9.0

SPECS: tuple[SettingSpec, ...] = (
    # ── Institute Profile ────────────────────────────────────────────────
    SettingSpec(
        key="institute.name",
        group="institute",
        label="Institute name",
        type="text",
        description=(
            "Shown in the navbar, login screen, page titles, invoices and "
            "transactional emails."
        ),
        default="Bloom IELTS Academy",
        env_alias="institute_name",
        max_length=200,
    ),
    SettingSpec(
        key="institute.tagline",
        group="institute",
        label="Tagline",
        type="text",
        description=(
            "One-line promise shown on the login screen and used as the site "
            "meta description."
        ),
        default="",
        env_alias="institute_tagline",
        max_length=300,
    ),
    SettingSpec(
        key="institute.logo_url",
        group="institute",
        label="Logo",
        type="image",
        description=(
            "Brand mark in the admin navbar, public header and login page. "
            "PNG/JPEG/WebP up to 512KB."
        ),
        default=None,
        env_alias="institute_logo_url",
    ),
    SettingSpec(
        key="institute.favicon_url",
        group="institute",
        label="Favicon",
        type="image",
        description=(
            "Browser tab icon. Upload a square PNG/WebP — applied site-wide "
            "on next load."
        ),
        default=None,
    ),
    SettingSpec(
        key="institute.contact_email",
        group="institute",
        label="Contact email",
        type="email",
        description=(
            "Public contact address — shown on the site footer and used as "
            "the reply-to on student emails."
        ),
        default="hello@bloomielts.com",
    ),
    SettingSpec(
        key="institute.phone",
        group="institute",
        label="Phone",
        type="text",
        description="Front-desk number shown on the website and invoices.",
        default="",
        max_length=32,
    ),
    SettingSpec(
        key="institute.whatsapp",
        group="institute",
        label="WhatsApp number",
        type="text",
        description=(
            "Number used for enquiry alerts and admission follow-ups over "
            "WhatsApp."
        ),
        default="",
        max_length=32,
    ),
    SettingSpec(
        key="institute.address",
        group="institute",
        label="Address",
        type="text",
        description="Postal address printed on invoices and the contact page.",
        default="",
        max_length=500,
    ),
    SettingSpec(
        key="institute.website_url",
        group="institute",
        label="Website URL",
        type="url",
        description=(
            "Canonical public site URL — used in emails, sitemaps and SEO "
            "metadata."
        ),
        default="",
        max_length=500,
    ),
    SettingSpec(
        key="institute.timezone",
        group="institute",
        label="Timezone",
        type="select",
        description=(
            "Working timezone for schedules, attendance cut-offs and report "
            "dates."
        ),
        default="Europe/London",
        options=(
            "Europe/London",
            "Europe/Rome",
            "Asia/Kolkata",
            "Asia/Shanghai",
            "Asia/Dubai",
        ),
    ),
    SettingSpec(
        key="institute.currency",
        group="institute",
        label="Currency",
        type="select",
        description="Currency symbol used on fee displays, invoices and receipts.",
        default="GBP (£)",
        options=("GBP (£)", "EUR (€)", "USD ($)", "INR (₹)"),
    ),
    SettingSpec(
        key="institute.date_format",
        group="institute",
        label="Date format",
        type="select",
        description="How dates render in the admin console, emails and PDFs.",
        default="DD/MM/YYYY",
        options=("DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"),
    ),
    # ── Academic Defaults ────────────────────────────────────────────────
    SettingSpec(
        key="academic.default_target_band",
        group="academic",
        label="Default target band",
        type="select",
        description=(
            "Pre-filled target IELTS band for new admissions — counsellors "
            "can adjust per student."
        ),
        default="7.0",
        options=_BANDS,
    ),
    SettingSpec(
        key="academic.min_attendance",
        group="academic",
        label="Minimum attendance",
        type="select",
        description=(
            "Attendance floor before a student is flagged; drives the "
            "absence alert and mock-exam eligibility."
        ),
        default="80%",
        options=("70%", "75%", "80%", "85%", "90%"),
    ),
    SettingSpec(
        key="academic.mock_frequency",
        group="academic",
        label="Mock frequency",
        type="select",
        description=(
            "How often full mock exams are scheduled for running batches."
        ),
        default="Every 2 weeks",
        options=("Weekly", "Every 2 weeks", "Monthly"),
    ),
    SettingSpec(
        key="academic.placement_test_required",
        group="academic",
        label="Placement test required",
        type="toggle",
        description=(
            "When on, admissions hold until the student completes the "
            "placement test."
        ),
        default=True,
    ),
    # ── Finance Rules ────────────────────────────────────────────────────
    SettingSpec(
        key="finance.deposit",
        group="finance",
        label="Deposit to secure a place",
        type="select",
        description=(
            "Minimum upfront payment that confirms a seat in a batch."
        ),
        default="25%",
        options=("10%", "20%", "25%", "50%", "Full fee"),
    ),
    SettingSpec(
        key="finance.grace_period",
        group="finance",
        label="Payment grace period",
        type="select",
        description=(
            "Days after an invoice due date before an account is treated as "
            "overdue."
        ),
        default="14 days",
        options=("7 days", "14 days", "21 days", "30 days"),
    ),
    SettingSpec(
        key="finance.auto_payment_reminders",
        group="finance",
        label="Automatic payment reminders",
        type="toggle",
        description=(
            "Email/SMS nudges sent automatically before and after a due date."
        ),
        default=True,
    ),
    SettingSpec(
        key="finance.suspend_on_overdue",
        group="finance",
        label="Suspend access when overdue",
        type="toggle",
        description=(
            "When on, student portal access pauses once the grace period "
            "expires."
        ),
        default=True,
    ),
    SettingSpec(
        key="finance.invoice_prefix",
        group="finance",
        label="Invoice prefix",
        type="text",
        description="Prefix on invoice numbers, e.g. INV-0001.",
        default="INV-",
        max_length=20,
    ),
    SettingSpec(
        key="finance.tax_percent",
        group="finance",
        label="Tax / VAT %",
        type="number",
        description="Tax percentage added to invoice totals (0 = untaxed).",
        default=0,
        number_min=0,
        number_max=100,
    ),
    # ── Notification Defaults ────────────────────────────────────────────
    SettingSpec(
        key="notifications.welcome_email",
        group="notifications",
        label="Welcome email on enrolment",
        type="toggle",
        description=(
            "Send the welcome email with login details as soon as a student "
            "is enrolled."
        ),
        default=True,
    ),
    SettingSpec(
        key="notifications.mock_reminders",
        group="notifications",
        label="Mock exam reminders",
        type="toggle",
        description="Remind students before each scheduled mock exam.",
        default=True,
    ),
    SettingSpec(
        key="notifications.progress_reports",
        group="notifications",
        label="Monthly progress reports",
        type="toggle",
        description=(
            "Email a monthly progress summary to students and guardians."
        ),
        default=True,
    ),
    SettingSpec(
        key="notifications.teacher_absence_alert",
        group="notifications",
        label="Teacher absence alert",
        type="toggle",
        description=(
            "Alert the assigned teacher after a student misses the absence "
            "threshold."
        ),
        default=True,
    ),
)

SPEC_BY_KEY = {spec.key: spec for spec in SPECS}


def _default_for(spec: SettingSpec, env: Settings) -> Any:
    """Resolved default: installer env alias wins, else the registry default."""
    if spec.env_alias:
        value = getattr(env, spec.env_alias, None)
        if value:
            return value
    return spec.default


def seed_rows(env: Settings | None = None) -> list[dict[str, Any]]:
    """Rows inserted by the migration / first boot — one per known key."""
    env = env or get_settings()
    now = datetime.now(UTC)
    return [
        {
            "key": spec.key,
            "value": _default_for(spec, env),
            "group": spec.group,
            "updated_by": None,
            "updated_at": now,
        }
        for spec in SPECS
    ]


def ensure_seeded(db: Session) -> None:
    """Insert rows for registry keys missing from the table. Idempotent."""
    existing = set(
        db.scalars(select(Setting.key).where(Setting.key.in_(SPEC_BY_KEY))).all()
    )
    missing = [spec.key for spec in SPECS if spec.key not in existing]
    if not missing:
        return
    env = get_settings()
    rows = [r for r in seed_rows(env) if r["key"] in missing]
    db.execute(pg_insert(Setting).values(rows).on_conflict_do_nothing())
    db.commit()


# ── resolution ───────────────────────────────────────────────────────────


def _item_payload(spec: SettingSpec, row: Setting | None, env: Settings) -> dict[str, Any]:
    value = row.value if row is not None else _default_for(spec, env)
    source = "db" if (row is not None and row.updated_by is not None) else "env"
    return {
        "key": spec.key,
        "group": spec.group,
        "label": spec.label,
        "type": spec.type,
        "value": value,
        "default": _default_for(spec, env),
        "source": source,
        "options": list(spec.options) or None,
        "description": spec.description,
        "updated_at": row.updated_at.isoformat() if row is not None else None,
    }


def collect(db: Session) -> dict[str, Any]:
    """Full grouped payload for the admin settings page."""
    ensure_seeded(db)
    env = get_settings()
    rows = {row.key: row for row in db.scalars(select(Setting)).all()}
    groups = []
    for group_id, label, description in _GROUPS:
        items = [
            _item_payload(spec, rows.get(spec.key), env)
            for spec in SPECS
            if spec.group == group_id
        ]
        groups.append(
            {
                "id": group_id,
                "label": label,
                "description": description,
                "items": items,
            }
        )
    env_settings = get_settings()
    uploads = setup_service.UPLOADS_DIR
    return {
        "groups": groups,
        "platform": {
            "env": env_settings.api_env,
            "version": __version__,
            "storage": {"ok": uploads.is_dir() or _try_mkdir(uploads)},
            # Mail engine is a later carve-out (proposal A1) — report pending.
            "mail_engine": {"ok": False, "detail": "not configured yet"},
        },
    }


def _try_mkdir(path: Any) -> bool:
    try:
        path.mkdir(parents=True, exist_ok=True)
        return True
    except OSError:
        return False


def resolved_map(db: Session) -> dict[str, Any]:
    """key → effective value for consumers like /api/branding."""
    env = get_settings()
    try:
        ensure_seeded(db)
        rows = {row.key: row for row in db.scalars(select(Setting)).all()}
    except Exception:  # noqa: BLE001 - table may not exist pre-migration
        rows = {}
    return {
        spec.key: (rows[spec.key].value if spec.key in rows else _default_for(spec, env))
        for spec in SPECS
    }


# ── validation + update ──────────────────────────────────────────────────


def _invalid(errors: dict[str, str], key: str, message: str) -> None:
    errors[key] = message


def _validate(spec: SettingSpec, raw: Any, errors: dict[str, str]) -> Any:
    """Coerce/validate one PATCHed value; returns the stored value."""
    key = spec.key
    if spec.type == "toggle":
        if isinstance(raw, bool):
            return raw
        _invalid(errors, key, "must be true or false")
        return None
    if spec.type == "number":
        if (
            isinstance(raw, (int, float))
            and not isinstance(raw, bool)
            and spec.number_min <= raw <= spec.number_max
        ):
            return raw
        _invalid(
            errors,
            key,
            f"must be a number between {spec.number_min:g} and {spec.number_max:g}",
        )
        return None
    if spec.type == "select":
        if isinstance(raw, str) and raw in spec.options:
            return raw
        _invalid(errors, key, f"must be one of: {', '.join(spec.options)}")
        return None
    if spec.type == "image":
        if raw is None or raw == "":
            return None
        if isinstance(raw, str) and (
            _IMAGE_DATA_URL.match(raw)
            or raw.startswith("/")
            or _URL_RE.match(raw)
        ):
            return raw
        _invalid(errors, key, "must be an image upload (PNG/JPEG/WebP) or a URL")
        return None
    # text | email | url
    if not isinstance(raw, str):
        _invalid(errors, key, "must be a string")
        return None
    value = raw.strip()
    if len(value) > spec.max_length:
        _invalid(errors, key, f"must be {spec.max_length} characters or fewer")
        return None
    if spec.type == "email" and value:
        try:
            _email_adapter.validate_python(value)
        except ValidationError:
            _invalid(errors, key, "must be a valid email address")
            return None
    if spec.type == "url" and value and not _URL_RE.match(value):
        _invalid(errors, key, "must be a valid http(s) URL")
        return None
    return value


def _save_image(key: str, data_url: str) -> str:
    """Persist a data-URL upload under uploads/branding/; return serving path."""
    name, serving = _IMAGE_TARGETS[key]
    match = _IMAGE_DATA_URL.match(data_url)
    if not match:
        raise ValueError("image must be a PNG, JPEG or WebP data URL")
    raw = base64.b64decode(match.group("data"), validate=True)
    if len(raw) > _IMAGE_MAX_BYTES:
        raise ValueError("image must be 512KB or smaller")
    dest = setup_service.UPLOADS_DIR / "branding"
    dest.mkdir(parents=True, exist_ok=True)
    for old in dest.glob(f"{name}.*"):
        old.unlink()
    (dest / f"{name}.{_IMAGE_EXT[match.group(1)]}").write_bytes(raw)
    return serving


def update(
    db: Session, changes: dict[str, Any], user: User
) -> dict[str, Any]:
    """Validate + upsert a bulk {key: value} update; returns fresh payload."""
    errors: dict[str, str] = {}
    validated: dict[str, Any] = {}
    for key, raw in changes.items():
        spec = SPEC_BY_KEY.get(key)
        if spec is None:
            _invalid(errors, key, "unknown setting")
            continue
        value = _validate(spec, raw, errors)
        if key not in errors:
            validated[key] = value
    if errors:
        raise SettingValidationError(errors)

    now = datetime.now(UTC)
    for key, value in validated.items():
        if SPEC_BY_KEY[key].type == "image" and isinstance(value, str):
            if _IMAGE_DATA_URL.match(value):
                value = _save_image(key, value)
        row = db.get(Setting, key)
        if row is None:
            row = Setting(key=key, group=SPEC_BY_KEY[key].group)
            db.add(row)
        row.value = value
        row.updated_by = user.id
        row.updated_at = now
    db.commit()
    logger.info(
        "settings updated by %s (%s): %s",
        user.email,
        user.id,
        ", ".join(sorted(validated)),
    )
    return collect(db)


def reset(db: Session, user: User) -> dict[str, Any]:
    """Restore every key to its env/prototype default (clears overrides)."""
    env = get_settings()
    rows = {row.key: row for row in db.scalars(select(Setting)).all()}
    now = datetime.now(UTC)
    for spec in SPECS:
        row = rows.get(spec.key)
        if row is None:
            row = Setting(key=spec.key, group=spec.group)
            db.add(row)
        row.value = _default_for(spec, env)
        row.updated_by = None
        row.updated_at = now
    db.commit()
    logger.info("settings reset to defaults by %s (%s)", user.email, user.id)
    return collect(db)


# ── redis cache ──────────────────────────────────────────────────────────


def get_cached(redis: Redis | None) -> dict[str, Any] | None:
    if redis is None:
        return None
    try:
        import json

        raw = redis.get(CACHE_KEY)
        return json.loads(raw) if raw else None
    except Exception:  # noqa: BLE001 - cache failure must not break reads
        return None


def set_cached(redis: Redis | None, payload: dict[str, Any]) -> None:
    if redis is None:
        return
    try:
        import json

        redis.set(CACHE_KEY, json.dumps(payload), ex=CACHE_TTL_SECONDS)
    except Exception:  # noqa: BLE001
        pass


def invalidate(redis: Redis | None) -> None:
    if redis is None:
        return
    try:
        redis.delete(CACHE_KEY)
    except Exception:  # noqa: BLE001
        pass
