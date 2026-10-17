"""Public SEO surface — robots.txt, sitemap.xml, meta resolution, og image.

No auth: crawlers and the public site hit these directly. Values resolve
through the settings registry (admin overrides win, installer/prototype
defaults otherwise); when the database is unreachable the env/default values
are served so a fresh deploy still answers crawlers.

`GET /api/seo/meta?path=` also emits `head_tags` — ready-to-inject HTML for
verification, analytics, Open Graph/Twitter cards and JSON-LD structured
data. Per-page meta overrides and actual `<head>` injection wire up in SEO
phase 3 when public pages exist.
"""

from __future__ import annotations

import html
import json
import math
import re
from typing import Any
from xml.sax.saxutils import escape as xml_escape

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse, PlainTextResponse, Response
from sqlalchemy import select

from app.core.config import get_settings
from app.core.database import new_session
from app.deps import require_admin
from app.models.cms import CmsPage, CmsPost
from app.models.enums import CmsStatus
from app.models.user import User
from app.services import settings as settings_service
from app.services import setup as setup_service

router = APIRouter(tags=["seo"])

_DEFAULT_ROBOTS = "User-agent: *\nAllow: /\n"

# Analytics IDs only emit tags when they match the vendor's ID shape — a
# malformed admin value must never become an injected script.
_GA4_RE = re.compile(r"^G-[A-Z0-9]+$", re.I)
_GTM_RE = re.compile(r"^GTM-[A-Z0-9]+$", re.I)
_FB_PIXEL_RE = re.compile(r"^\d{5,20}$")
_CLARITY_RE = re.compile(r"^[a-z0-9]{6,20}$", re.I)
_FB_APP_ID_RE = re.compile(r"^\d{5,20}$")
_TWITTER_HANDLE_RE = re.compile(r"^@?[A-Za-z0-9_]{1,15}$")

_SCHEMA_TYPES = ("EducationalOrganization", "LocalBusiness")

_IMAGE_MEDIA = {"png": "image/png", "jpg": "image/jpeg", "webp": "image/webp"}


def _resolved() -> dict[str, Any]:
    """key → effective setting value, with env defaults when the DB is down."""
    db = new_session()
    if db is None:
        env = get_settings()
        return {
            spec.key: settings_service._default_for(spec, env) for spec in settings_service.SPECS
        }
    try:
        return settings_service.resolved_map(db)
    finally:
        db.close()


def _canonical_base(values: dict[str, Any]) -> str:
    """Canonical site origin from institute.website_url ('' when unset)."""
    raw = str(values.get("institute.website_url") or "").strip()
    return raw.rstrip("/") if re.match(r"^https?://", raw, re.I) else ""


# ── robots.txt ───────────────────────────────────────────────────────────


def _aio_lines(value: Any) -> list[str]:
    """Non-empty trimmed lines of a textarea setting."""
    return [s for s in (line.strip() for line in str(value or "").splitlines()) if s]


def _ai_crawler_rules(values: dict[str, Any]) -> str:
    """robots.txt block for the AIO crawler policy — '' when inactive."""
    if not values.get("aio.enabled"):
        return ""
    policy = str(values.get("aio.crawler_policy") or "Allow all")
    if policy == "Block listed":
        return "".join(
            f"User-agent: {token}\nDisallow: /\n\n"
            for token in _aio_lines(values.get("aio.crawler_list"))
        )
    if policy == "Custom rules":
        custom = str(values.get("aio.custom_robots") or "").strip()
        return f"{custom}\n\n" if custom else ""
    return ""


@router.get("/robots.txt", include_in_schema=False)
def robots_txt() -> PlainTextResponse:
    values = _resolved()
    if not values.get("seo.indexing_enabled"):
        return PlainTextResponse("User-agent: *\nDisallow: /\n")
    body = str(values.get("seo.robots_txt") or _DEFAULT_ROBOTS).rstrip() + "\n\n"
    body += _ai_crawler_rules(values)
    base = _canonical_base(values)
    if base and values.get("seo.sitemap_enabled") and "sitemap:" not in body.lower():
        body += f"Sitemap: {base}/sitemap.xml\n"
    if not body.endswith("\n"):
        body += "\n"
    return PlainTextResponse(body)


# ── sitemap.xml ──────────────────────────────────────────────────────────


def _published_content() -> list[tuple[str, str, str | None, str]]:
    """(path, title, lastmod, source) for published CMS content.

    Empty when the DB is down. Public site routes are Phase 3 — until then
    CMS pages map to `/{slug}` and posts to `/blog/{slug}`.
    """
    db = new_session()
    if db is None:
        return []
    try:
        pages = db.execute(
            select(CmsPage.slug, CmsPage.title, CmsPage.updated_at).where(
                CmsPage.status == CmsStatus.published
            )
        ).all()
        posts = db.execute(
            select(CmsPost.slug, CmsPost.title, CmsPost.updated_at).where(
                CmsPost.status == CmsStatus.published
            )
        ).all()
    finally:
        db.close()

    def lastmod(ts: Any) -> str | None:
        return ts.date().isoformat() if ts else None

    return [
        *( (f"/{s}", t, lastmod(ts), "page") for s, t, ts in pages ),
        *( (f"/blog/{s}", t, lastmod(ts), "post") for s, t, ts in posts ),
    ]


def _sitemap_entries(values: dict[str, Any]) -> list[tuple[str, str | None, str]]:
    """(path, lastmod, source) for the sitemap — honor the sitemap group."""
    entries: list[tuple[str, str | None, str]] = [("/", None, "home")]
    seen = {"/"}
    for path, _title, lastmod, source in _published_content():
        if source == "page" and not values.get("sitemap.include_pages"):
            continue
        if source == "post" and not values.get("sitemap.include_posts"):
            continue
        if path not in seen:
            seen.add(path)
            entries.append((path, lastmod, source))
    for path in _aio_lines(values.get("sitemap.extra_paths")):
        if path not in seen:
            seen.add(path)
            entries.append((path, None, "extra"))
    return entries


def _sitemap_xml(base: str, entries: list[tuple[str, str | None, str]]) -> str:
    items = "".join(
        "  <url>\n"
        f"    <loc>{xml_escape(base)}{xml_escape(path)}</loc>\n"
        + (f"    <lastmod>{lastmod}</lastmod>\n" if lastmod else "")
        + "  </url>\n"
        for path, lastmod, _source in entries
    )
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{items}</urlset>\n"
    )


@router.get("/sitemap.xml", include_in_schema=False)
def sitemap_xml() -> Response:
    values = _resolved()
    base = _canonical_base(values)
    if not values.get("seo.sitemap_enabled") or not base:
        raise HTTPException(
            status_code=404,
            detail="Sitemap is disabled or Website URL is not set",
        )
    return Response(
        content=_sitemap_xml(base, _sitemap_entries(values)),
        media_type="application/xml",
    )


@router.get("/api/admin/sitemap")
def admin_sitemap(_: User = Depends(require_admin)) -> dict[str, Any]:
    """Admin preview of the runtime sitemap — state, entries and the XML."""
    values = _resolved()
    base = _canonical_base(values)
    enabled = bool(values.get("seo.sitemap_enabled"))
    entries = _sitemap_entries(values)
    return {
        "enabled": enabled,
        "base_url": base,
        "sitemap_url": f"{base}/sitemap.xml" if base else "",
        "entry_count": len(entries),
        "entries": [
            {
                "loc": f"{base}{path}" if base else path,
                "path": path,
                "lastmod": lastmod,
                "source": source,
            }
            for path, lastmod, source in entries
        ],
        "xml": _sitemap_xml(base, entries) if enabled and base else "",
    }


# ── llms.txt (AI / answer engines) ───────────────────────────────────────


def _generated_llms_txt(values: dict[str, Any], base: str) -> str:
    """Auto llms.txt — H1 name, > summary, key facts, published links."""
    title = str(values.get("seo.site_title") or values.get("institute.name") or "").strip()
    summary = (
        str(values.get("aio.org_summary") or "").strip()
        or str(values.get("institute.tagline") or "").strip()
        or str(values.get("seo.meta_description") or "").strip()
    )
    lines = [f"# {title or 'Site'}", ""]
    if summary:
        lines += [f"> {summary}", ""]
    facts = _aio_lines(values.get("aio.key_facts"))
    if facts:
        lines += ["## Facts", ""]
        lines += [f"- {fact}" for fact in facts]
        lines.append("")
    links = [
        (path, link_title)
        for path, link_title, _lm, _src in _published_content()
    ]
    if links:
        lines += ["## Content", ""]
        lines += [f"- [{t}]({base}{p})" for p, t in links]
        lines.append("")
    return "\n".join(lines)


@router.get("/llms.txt", include_in_schema=False)
def llms_txt() -> PlainTextResponse:
    values = _resolved()
    if not values.get("aio.enabled") or not values.get("aio.llms_txt_enabled"):
        raise HTTPException(status_code=404, detail="llms.txt is disabled")
    override = str(values.get("aio.llms_txt") or "").strip()
    body = override if override else _generated_llms_txt(values, _canonical_base(values))
    if not body.endswith("\n"):
        body += "\n"
    return PlainTextResponse(body)


# ── structured data (Schema.org JSON-LD) ─────────────────────────────────


def _abs_url(base: str, url: str) -> str:
    """Make a site-relative serving path absolute when a base is known."""
    return f"{base}{url}" if url.startswith("/") and base else url


def _org_schema(values: dict[str, Any], base: str) -> dict[str, Any]:
    """Organization JSON-LD built from the institute profile group."""
    schema_type = str(values.get("seo.schema_type") or "")
    if schema_type not in _SCHEMA_TYPES:
        schema_type = _SCHEMA_TYPES[0]
    schema: dict[str, Any] = {
        "@context": "https://schema.org",
        "@type": schema_type,
        "name": str(values.get("institute.name") or ""),
    }
    if base:
        schema["url"] = base
        schema["@id"] = f"{base}/#organization"
    logo = str(values.get("institute.logo_url") or "")
    if logo:
        schema["logo"] = _abs_url(base, logo)
    tagline = str(values.get("institute.tagline") or "").strip()
    description = (
        str(values.get("aio.org_summary") or "").strip()
        if values.get("aio.enabled")
        else ""
    ) or tagline
    if description:
        schema["description"] = description
    if values.get("aio.enabled"):
        same_as = _aio_lines(values.get("aio.same_as"))
        if same_as:
            schema["sameAs"] = same_as
    address = str(values.get("institute.address") or "").strip()
    if address:
        schema["address"] = {"@type": "PostalAddress", "streetAddress": address}
    phone = str(values.get("institute.phone") or "").strip()
    if phone:
        schema["telephone"] = phone
    email = str(values.get("institute.contact_email") or "").strip()
    if email:
        schema["email"] = email
    if schema_type == "LocalBusiness":
        try:
            lat = float(str(values.get("seo.geo_lat") or ""))
            lng = float(str(values.get("seo.geo_lng") or ""))
        except ValueError:
            lat = lng = float("nan")
        if math.isfinite(lat) and math.isfinite(lng):
            schema["geo"] = {
                "@type": "GeoCoordinates",
                "latitude": lat,
                "longitude": lng,
            }
        hours = str(values.get("seo.opening_hours") or "").strip()
        if hours:
            schema["openingHours"] = [s.strip() for s in hours.split(";") if s.strip()]
    return schema


def _cms_page(path: str) -> tuple[str, dict[str, Any] | None] | None:
    """(title, json_ld) of the published CMS page at `path`, if any."""
    slug = path.strip("/")
    if not slug:
        return None
    db = new_session()
    if db is None:
        return None
    try:
        row = db.execute(
            select(CmsPage.title, CmsPage.json_ld).where(
                CmsPage.slug == slug, CmsPage.status == CmsStatus.published
            )
        ).first()
        return (row[0], row[1]) if row else None
    except Exception:  # noqa: BLE001 - table may not exist pre-migration
        return None
    finally:
        db.close()


def _course_schema(
    values: dict[str, Any], base: str, path: str, page_title: str | None
) -> dict[str, Any] | None:
    """Minimal Course JSON-LD for `/courses/{slug}` paths."""
    slug = path[len("/courses/") :].strip("/")
    if not slug:
        return None
    name = page_title or slug.rsplit("/", 1)[-1].replace("-", " ").replace("_", " ").title()
    schema: dict[str, Any] = {
        "@context": "https://schema.org",
        "@type": "Course",
        "name": name,
        "provider": {
            "@type": str(values.get("seo.schema_type") or _SCHEMA_TYPES[0]),
            "name": str(values.get("institute.name") or ""),
            **({"sameAs": base} if base else {}),
        },
    }
    if base:
        schema["url"] = f"{base}{path}"
    description = str(values.get("seo.meta_description") or "").strip()
    if description:
        schema["description"] = description
    return schema


def _json_ld(values: dict[str, Any], base: str, path: str) -> list[dict[str, Any]]:
    """All JSON-LD blocks for a path: org schema + page/course schemas."""
    schemas = [_org_schema(values, base)]
    page = _cms_page(path)
    page_ld = page[1] if page else None
    emitted_page_ld = False
    if isinstance(page_ld, dict):
        is_faq = page_ld.get("@type") == "FAQPage"
        if not is_faq or values.get("seo.faq_schema_enabled"):
            schemas.append(page_ld)
            emitted_page_ld = True
    if not emitted_page_ld and path.startswith("/courses/"):
        course = _course_schema(values, base, path, page[0] if page else None)
        if course:
            schemas.append(course)
    return schemas


# ── meta resolution + injectable head tags ───────────────────────────────


def _page_title(values: dict[str, Any], path: str) -> str:
    """Resolved <title>: site title for '/', else the template with %page%."""
    site_title = str(values.get("seo.site_title") or "")
    if path in ("", "/"):
        return site_title
    segment = path.rstrip("/").rsplit("/", 1)[-1]
    page_name = segment.replace("-", " ").replace("_", " ").strip().title()
    template = str(values.get("seo.title_template") or "")
    if not template:
        return site_title
    return template.replace("%page%", page_name or site_title)


def _esc(value: Any) -> str:
    return html.escape(str(value), quote=True)


def _head_tags(
    values: dict[str, Any],
    canonical: str,
    social: dict[str, Any],
    schemas: list[dict[str, Any]],
) -> list[str]:
    """Ready-to-inject HTML tags from the resolved settings."""
    e = _esc
    tags: list[str] = []
    if values.get("seo.meta_description"):
        tags.append(f'<meta name="description" content="{e(values["seo.meta_description"])}">')
    if values.get("seo.meta_keywords"):
        tags.append(f'<meta name="keywords" content="{e(values["seo.meta_keywords"])}">')
    if not values.get("seo.indexing_enabled"):
        tags.append('<meta name="robots" content="noindex,nofollow">')
    if canonical:
        tags.append(f'<link rel="canonical" href="{e(canonical)}">')
    og = social["og"]
    tw = social["twitter"]
    for prop, val in (
        ("og:type", og["type"]),
        ("og:title", og["title"]),
        ("og:description", og["description"]),
        ("og:url", og["url"]),
        ("og:site_name", og["site_name"]),
        ("og:image", og["image"]),
        ("fb:app_id", social["fb_app_id"]),
    ):
        if val:
            tags.append(f'<meta property="{prop}" content="{e(val)}">')
    for name, val in (
        ("twitter:card", tw["card"]),
        ("twitter:site", tw["site"]),
        ("twitter:title", tw["title"]),
        ("twitter:description", tw["description"]),
        ("twitter:image", tw["image"]),
    ):
        if val:
            tags.append(f'<meta name="{name}" content="{e(val)}">')
    for schema in schemas:
        # "</" is escaped so JSON-LD can never break out of the script tag.
        payload = json.dumps(schema, ensure_ascii=False, separators=(",", ":")).replace(
            "</", "<\\/"
        )
        tags.append(f'<script type="application/ld+json">{payload}</script>')
    if values.get("seo.google_site_verification"):
        tags.append(
            '<meta name="google-site-verification" '
            f'content="{e(values["seo.google_site_verification"])}">'
        )
    if values.get("seo.bing_verification"):
        tags.append(f'<meta name="msvalidate.01" content="{e(values["seo.bing_verification"])}">')
    ga4 = str(values.get("seo.ga4_id") or "")
    if _GA4_RE.match(ga4):
        tags.append(
            f'<script async src="https://www.googletagmanager.com/gtag/js?id={e(ga4)}"></script>'
        )
        tags.append(
            "<script>window.dataLayer=window.dataLayer||[];"
            "function gtag(){dataLayer.push(arguments);}"
            f"gtag('js',new Date());gtag('config','{e(ga4)}');</script>"
        )
    gtm = str(values.get("seo.gtm_id") or "")
    if _GTM_RE.match(gtm):
        tags.append(
            "<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push("
            "{'gtm.start':new Date().getTime(),event:'gtm.js'});"
            "var f=d.getElementsByTagName(s)[0],j=d.createElement(s),"
            "dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src="
            "'https://www.googletagmanager.com/gtm.js?id='+i+dl;"
            f"f.parentNode.insertBefore(j,f);}})(window,document,'script','dataLayer','{e(gtm)}');</script>"
        )
    pixel = str(values.get("seo.fb_pixel_id") or "")
    if _FB_PIXEL_RE.match(pixel):
        tags.append(
            "<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq="
            "function(){n.callMethod?n.callMethod.apply(n,arguments):"
            "n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;"
            "n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);"
            "t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];"
            "s.parentNode.insertBefore(t,s)}(window,document,'script',"
            "'https://connect.facebook.net/en_US/fbevents.js');"
            f"fbq('init','{e(pixel)}');fbq('track','PageView');</script>"
        )
    clarity = str(values.get("seo.ms_clarity_id") or "")
    if _CLARITY_RE.match(clarity):
        tags.append(
            "<script>(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){"
            "(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);"
            "t.async=1;t.src='https://www.clarity.ms/tag/'+i;"
            "y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);"
            f"}})(window,document,'clarity','script','{e(clarity)}');</script>"
        )
    return tags


@router.get("/api/seo/meta")
def seo_meta(path: str = Query(default="/", max_length=500)) -> dict[str, Any]:
    """Resolve meta for a public path — consumed by the site <head>.

    Returns the global values plus a path-derived title/canonical, the
    Open Graph/Twitter card payload, and the JSON-LD schemas for the path
    (organization profile always; CMS-authored page schema when present;
    synthesized Course schema on `/courses/*`; FAQPage gated by
    `seo.faq_schema_enabled`). Phase 3 adds per-page meta overrides.
    """
    values = _resolved()
    base = _canonical_base(values)
    safe_path = path if path.startswith("/") else f"/{path}"
    canonical = f"{base}{safe_path}" if base else ""
    title = _page_title(values, safe_path)
    description = str(values.get("seo.meta_description") or "")
    og_raw = str(values.get("seo.default_og_image") or "")
    og_image = _abs_url(base, og_raw)
    handle_raw = str(values.get("seo.twitter_handle") or "").strip()
    handle = handle_raw.lstrip("@") if _TWITTER_HANDLE_RE.match(handle_raw) else ""
    og_title = str(values.get("seo.og_title") or "") or title
    og_description = str(values.get("seo.og_description") or "") or description
    card = str(values.get("seo.twitter_card") or "")
    if card not in ("summary", "summary_large_image"):
        card = "summary_large_image"
    fb_app_id_raw = str(values.get("seo.fb_app_id") or "").strip()
    social = {
        "og": {
            "type": "website",
            "title": og_title,
            "description": og_description,
            "url": canonical,
            "site_name": str(values.get("institute.name") or ""),
            "image": og_image,
        },
        "twitter": {
            "card": card,
            "site": f"@{handle}" if handle else "",
            "title": og_title,
            "description": og_description,
            "image": og_image,
        },
        "fb_app_id": fb_app_id_raw if _FB_APP_ID_RE.match(fb_app_id_raw) else "",
    }
    schemas = _json_ld(values, base, safe_path)
    indexing = bool(values.get("seo.indexing_enabled"))
    return {
        "path": safe_path,
        "title": title,
        "description": description,
        "keywords": values.get("seo.meta_keywords") or "",
        "robots": "index,follow" if indexing else "noindex,nofollow",
        "canonical_url": canonical,
        "og_image": og_image,
        "site_name": values.get("institute.name") or "",
        "og": social["og"],
        "twitter": social["twitter"],
        "fb_app_id": social["fb_app_id"],
        "json_ld": schemas,
        "verification": {
            "google": values.get("seo.google_site_verification") or "",
            "bing": values.get("seo.bing_verification") or "",
        },
        "analytics": {
            "ga4": values.get("seo.ga4_id") or "",
            "gtm": values.get("seo.gtm_id") or "",
            "fb_pixel": values.get("seo.fb_pixel_id") or "",
            "ms_clarity": values.get("seo.ms_clarity_id") or "",
        },
        "head_tags": _head_tags(values, canonical, social, schemas),
    }


# ── uploaded share image ─────────────────────────────────────────────────


@router.get("/api/seo/og-image", include_in_schema=False)
def seo_og_image() -> FileResponse:
    for ext, media in _IMAGE_MEDIA.items():
        candidate = setup_service.UPLOADS_DIR / "seo" / f"og-image.{ext}"
        if candidate.is_file():
            return FileResponse(candidate, media_type=media)
    raise HTTPException(status_code=404, detail="No default share image configured")
