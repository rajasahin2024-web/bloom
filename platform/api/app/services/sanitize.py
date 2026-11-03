"""Server-side HTML sanitization for rich-text CMS bodies.

Uses nh3 (Rust ammonia binding — bleach is deprecated) with an explicit
allowlist matching the blog editor's toolbar: basic formatting, links,
images, headings, lists, tables, figures. Everything else is stripped
silently — the stored body is what readers get.

``link_rel`` forces ``rel="noopener noreferrer"`` on every ``<a>`` (nh3
applies it to all links — a safe superset of the required "_blank only").
"""

from __future__ import annotations

import math

import nh3

_ALLOWED_TAGS = {
    "p",
    "br",
    "strong",
    "em",
    "u",
    "s",
    "a",
    "img",
    "h1",
    "h2",
    "h3",
    "h4",
    "ul",
    "ol",
    "li",
    "blockquote",
    "code",
    "pre",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "figure",
    "figcaption",
    "hr",
}

_ALLOWED_ATTRIBUTES = {
    "a": {"href", "title", "target"},
    "img": {"src", "alt"},
}

_WORDS_PER_MINUTE = 200


def clean_html(html: str) -> str:
    """Strip everything outside the blog-body allowlist."""
    return nh3.clean(
        html,
        tags=_ALLOWED_TAGS,
        attributes=_ALLOWED_ATTRIBUTES,
        link_rel="noopener noreferrer",
    )


def word_count(html: str) -> int:
    """Word count of rendered text — used for auto read-time."""
    return len(nh3.clean(html, tags=set()).split())


def read_minutes(html: str) -> int:
    """ceil(words/200) — auto-filled when the admin leaves read_minutes null."""
    return math.ceil(word_count(html) / _WORDS_PER_MINUTE)
