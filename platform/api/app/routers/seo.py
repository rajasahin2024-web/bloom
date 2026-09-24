"""Public SEO surface — robots.txt, sitemap.xml, meta resolution, og image.

No auth: crawlers and the public site hit these directly. Values resolve
through the settings registry (admin overrides win, installer/prototype
defaults otherwise); when the database is unreachable the env/default values
are served so a fresh deploy still answers crawlers.

`GET /api/seo/meta?path=` also emits `head_tags` — ready-to-inject HTML for
verification and analytics IDs. Per-page meta, OG/Twitter cards and actual
`<head>` injection wire up in SEO phases 2–3 when public pages exist.
"""

from __future__ import annotations

import html
import re
from typing import Any
from xml.sax.saxutils import escape as xml_escape

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse, PlainTextResponse, Response
from sqlalchemy import select

from app.core.config import get_settings
from app.core.database import new_session
from app.models.cms import CmsPage, CmsPost
from app.models.enums import CmsStatus
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


@router.get("/robots.txt", include_in_schema=False)
def robots_txt() -> PlainTextResponse:
    values = _resolved()
    if not values.get("seo.indexing_enabled"):
        return PlainTextResponse("User-agent: *\nDisallow: /\n")
    body = str(values.get("seo.robots_txt") or _DEFAULT_ROBOTS)
    base = _canonical_base(values)
    if base and values.get("seo.sitemap_enabled") and "sitemap:" not in body.lower():
        body = f"{body.rstrip()}\n\nSitemap: {base}/sitemap.xml\n"
    if not body.endswith("\n"):
        body += "\n"
    return PlainTextResponse(body)


# ── sitemap.xml ──────────────────────────────────────────────────────────


def _sitemap_entries() -> list[tuple[str, str | None]]:
    """(path, lastmod) pairs for published CMS content. Empty when DB is down.

    Public site routes are Phase 3 — until then CMS pages map to `/{slug}`
    and posts to `/blog/{slug}`.
    """
    db = new_session()
    if db is None:
        return []
    try:
        pages = db.execute(
            select(CmsPage.slug, CmsPage.updated_at).where(CmsPage.status == CmsStatus.published)
        ).all()
        posts = db.execute(
            select(CmsPost.slug, CmsPost.updated_at).where(CmsPost.status == CmsStatus.published)
        ).all()
    finally:
        db.close()
    entries = [(f"/{slug}", ts) for slug, ts in pages]
    entries += [(f"/blog/{slug}", ts) for slug, ts in posts]
    return [(p, ts.date().isoformat() if ts else None) for p, ts in entries]


@router.get("/sitemap.xml", include_in_schema=False)
def sitemap_xml() -> Response:
    values = _resolved()
    base = _canonical_base(values)
    if not values.get("seo.sitemap_enabled") or not base:
        raise HTTPException(
            status_code=404,
            detail="Sitemap is disabled or Website URL is not set",
        )
    urls = [("/", None), *_sitemap_entries()]
    items = "".join(
        "  <url>\n"
        f"    <loc>{xml_escape(base)}{xml_escape(path)}</loc>\n"
        + (f"    <lastmod>{lastmod}</lastmod>\n" if lastmod else "")
        + "  </url>\n"
        for path, lastmod in urls
    )
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{items}</urlset>\n"
    )
    return Response(content=xml, media_type="application/xml")


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


def _head_tags(values: dict[str, Any], canonical: str) -> list[str]:
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
    """Resolve global meta for a public path — consumed by the site <head>.

    Phase 3 adds per-page overrides; for now every path gets the global
    values plus a path-derived title and canonical URL.
    """
    values = _resolved()
    base = _canonical_base(values)
    safe_path = path if path.startswith("/") else f"/{path}"
    canonical = f"{base}{safe_path}" if base else ""
    og_raw = str(values.get("seo.default_og_image") or "")
    og_image = f"{base}{og_raw}" if og_raw.startswith("/") and base else og_raw
    indexing = bool(values.get("seo.indexing_enabled"))
    return {
        "path": safe_path,
        "title": _page_title(values, safe_path),
        "description": values.get("seo.meta_description") or "",
        "keywords": values.get("seo.meta_keywords") or "",
        "robots": "index,follow" if indexing else "noindex,nofollow",
        "canonical_url": canonical,
        "og_image": og_image,
        "site_name": values.get("institute.name") or "",
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
        "head_tags": _head_tags(values, canonical),
    }


# ── uploaded share image ─────────────────────────────────────────────────


@router.get("/api/seo/og-image", include_in_schema=False)
def seo_og_image() -> FileResponse:
    for ext, media in _IMAGE_MEDIA.items():
        candidate = setup_service.UPLOADS_DIR / "seo" / f"og-image.{ext}"
        if candidate.is_file():
            return FileResponse(candidate, media_type=media)
    raise HTTPException(status_code=404, detail="No default share image configured")
