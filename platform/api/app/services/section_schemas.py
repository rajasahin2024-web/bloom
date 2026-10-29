"""Typed section schema registry for CMS pages.

Each home-page section is a dict ``{id, label, type, enabled, animation,
props}`` where ``props`` is validated against the type's shape spec below.
Validation is deliberately pragmatic: it checks that required keys exist
in ``props``, that list fields are lists, and that nested objects carry
their required keys. Unknown ``props`` keys are ignored (forward-compat).
"""

from __future__ import annotations

from typing import Any

# Sentinel meaning "any value" for fields we don't constrain.
_ANY = object()

# Each spec is a nested dict. A leaf of ``_ANY`` accepts anything; a dict
# requires those keys; a list spec ``[<item-spec>]`` requires a list whose
# items match ``<item-spec>`` (a dict of required keys).
SECTION_TYPES: dict[str, dict[str, Any]] = {
    "nav": {
        "brand": {"name": _ANY, "tagline": _ANY, "logo_url": _ANY},
        "links": [{"label": _ANY, "href": _ANY}],
        "cta": {"signin_href": _ANY, "signup_href": _ANY, "signup_label": _ANY},
    },
    "hero": {
        "badge": _ANY,
        "headline": _ANY,
        "subhead": _ANY,
        "primary_btn": {"label": _ANY, "href": _ANY},
        "secondary_btn": {"label": _ANY, "href": _ANY},
        "stats_line": {
            "students": _ANY,
            "band_gain": _ANY,
            "reach_pct": _ANY,
        },
        "avatars": [{"media_url": _ANY, "initials": _ANY}],
    },
    "stats_strip": {
        "items": [{"label": _ANY, "value": _ANY, "prefix": _ANY, "suffix": _ANY}],
    },
    "destinations": {
        "heading": _ANY,
        "items": [{"name": _ANY, "flag_url": _ANY, "blurb": _ANY}],
    },
    "rich_block": {
        "eyebrow": _ANY,
        "heading": _ANY,
        "body": _ANY,
        "cards": [{"icon": _ANY, "title": _ANY, "body": _ANY, "href": _ANY}],
    },
    "steps": {
        "eyebrow": _ANY,
        "heading": _ANY,
        "steps": [{"n": _ANY, "title": _ANY, "body": _ANY}],
    },
    "feature_grid": {
        "heading": _ANY,
        "features": [{"icon": _ANY, "title": _ANY, "body": _ANY}],
    },
    "showcase": {
        "heading": _ANY,
        "body": _ANY,
        "media": {"url": _ANY, "type": _ANY},
        "cta": {"label": _ANY, "href": _ANY},
    },
    "certificate_list": {
        "heading": _ANY,
        "eyebrow": _ANY,
        "items": [
            {
                "name": _ANY,
                "org": _ANY,
                "overall": _ANY,
                "cefr": _ANY,
                "skills": [{"label": _ANY, "value": _ANY}],
                "logo_url": _ANY,
                "blurb": _ANY,
            }
        ],
    },
    "staff_cards": {
        "heading": _ANY,
        "staff": [{"name": _ANY, "role": _ANY, "photo_url": _ANY, "bio": _ANY}],
    },
    "testimonial_cards": {
        "heading": _ANY,
        "students": [
            {
                "name": _ANY,
                "photo_url": _ANY,
                "before_band": _ANY,
                "after_band": _ANY,
                "quote": _ANY,
                "course": _ANY,
            }
        ],
    },
    "overseas": {
        "heading": _ANY,
        "body": _ANY,
        "items": [{"title": _ANY, "body": _ANY}],
    },
    "university_grid": {
        "heading": _ANY,
        "universities": [{"name": _ANY, "logo_url": _ANY, "href": _ANY}],
    },
    "cta_strip": {
        "heading": _ANY,
        "body": _ANY,
        "cta": {"label": _ANY, "href": _ANY},
    },
    "pricing_tiers": {
        "heading": _ANY,
        "tiers": [
            {
                "name": _ANY,
                "price": _ANY,
                "period": _ANY,
                "features": [_ANY],
                "cta_label": _ANY,
                "cta_href": _ANY,
                "highlighted": _ANY,
            }
        ],
    },
    "reach": {
        "heading": _ANY,
        "items": [{"label": _ANY, "value": _ANY}],
    },
    "life": {
        "heading": _ANY,
        "gallery": [{"media_url": _ANY, "caption": _ANY}],
    },
    "paper_cta": {
        "heading": _ANY,
        "body": _ANY,
        "cta": {"label": _ANY, "href": _ANY},
    },
    "contact": {
        "heading": _ANY,
        "body": _ANY,
        "phone": _ANY,
        "email": _ANY,
        "address": _ANY,
        "map_url": _ANY,
        "form_enabled": _ANY,
    },
    "footer": {
        "columns": [{"heading": _ANY, "links": [{"label": _ANY, "href": _ANY}]}],
        "social": [{"icon": _ANY, "href": _ANY}],
        "copyright": _ANY,
    },
    # ── TEC-134: section types for the 11 remaining prototype pages ──
    # The nine-band scale on /ielts. Each row is a coloured band chip with
    # descriptor text and the institutions that typically require it.
    "band_table": {
        "eyebrow": _ANY,
        "heading": _ANY,
        "lead": _ANY,
        "rows": [
            {
                "band": _ANY,
                "title": _ANY,
                "description": _ANY,
                "used_for": _ANY,
                "color": _ANY,
                "text_color": _ANY,
            }
        ],
        "notes": [_ANY],
    },
    # Accordion of <details> Q&A items (courses page and reuse elsewhere).
    "faq": {
        "eyebrow": _ANY,
        "heading": _ANY,
        "items": [{"q": _ANY, "a": _ANY, "open": _ANY}],
    },
    # Priced course/plan cards (courses page .plans grid).
    "course_grid": {
        "eyebrow": _ANY,
        "heading": _ANY,
        "lead": _ANY,
        "courses": [
            {
                "icon": _ANY,
                "icon_tone": _ANY,
                "name": _ANY,
                "price": _ANY,
                "period": _ANY,
                "blurb": _ANY,
                "features": [{"text": _ANY, "included": _ANY}],
                "cta_label": _ANY,
                "cta_href": _ANY,
                "highlighted": _ANY,
                "ribbon": _ANY,
            }
        ],
        "footnote": _ANY,
    },
    # Filterable university directory (abroad page): country filter buttons
    # plus rich .unic cards with per-skill English requirements.
    "uni_filter": {
        "eyebrow": _ANY,
        "heading": _ANY,
        "lead": _ANY,
        "all_label": _ANY,
        "universities": [
            {
                "id": _ANY,
                "name": _ANY,
                "country": _ANY,
                "flag": _ANY,
                "city": _ANY,
                "rank": _ANY,
                "tuition": _ANY,
                "intake": _ANY,
                "course": _ANY,
                "ielts": _ANY,
                "per_skill": _ANY,
                "toefl": _ANY,
                "photo_url": _ANY,
                "featured": _ANY,
                "note": _ANY,
            }
        ],
    },
    # A single data table (.tbl): column headers + body rows. Each row is a
    # list of cells; a cell may be a plain value or {text, sub} for the
    # two-line cells the prototype uses.
    "data_table": {
        "eyebrow": _ANY,
        "heading": _ANY,
        "intro": _ANY,
        "columns": [_ANY],
        "rows": [_ANY],
        "footnote": _ANY,
    },
    # Photo collage (.moments grid) on the about page — tiles carry the
    # prototype's a–g size letters so the mosaic layout is reproducible.
    "moments": {
        "eyebrow": _ANY,
        "heading": _ANY,
        "lead": _ANY,
        "items": [
            {
                "slot": _ANY,
                "media_url": _ANY,
                "title": _ANY,
                "sub": _ANY,
                "size": _ANY,
            }
        ],
        "footnote": _ANY,
    },
    # Dark reach block (about page): abstract map with pulsing dots plus the
    # per-country student bars and summary stats.
    "map_block": {
        "eyebrow": _ANY,
        "heading": _ANY,
        "lead": _ANY,
        "map": {
            "dots": [
                {
                    "left": _ANY,
                    "top": _ANY,
                    "size": _ANY,
                    "delay": _ANY,
                    "color": _ANY,
                }
            ],
            "label": {"text": _ANY, "left": _ANY, "top": _ANY},
        },
        "countries": [
            {"flag": _ANY, "name": _ANY, "students": _ANY, "pct": _ANY}
        ],
        "stats": [{"value": _ANY, "label": _ANY}],
    },
    # Open vacancies list (careers page) — resolved card data, not the raw
    # HR ids: dept/office/contract are pre-resolved to display values.
    "job_list": {
        "eyebrow": _ANY,
        "heading": _ANY,
        "lead": _ANY,
        "jobs": [
            {
                "id": _ANY,
                "title": _ANY,
                "dept": _ANY,
                "dept_icon": _ANY,
                "office": _ANY,
                "office_flag": _ANY,
                "contract": _ANY,
                "ctc": _ANY,
                "need": _ANY,
                "posted": _ANY,
                "band": _ANY,
            }
        ],
        "empty": {
            "heading": _ANY,
            "body": _ANY,
            "cta_label": _ANY,
            "cta_href": _ANY,
        },
    },
    # Careers application form + the "what helps" tips sidebar.
    "job_form": {
        "eyebrow": _ANY,
        "heading": _ANY,
        "lead": _ANY,
        "tips_heading": _ANY,
        "tips": [{"title": _ANY, "body": _ANY}],
        "note": _ANY,
        "roles": [{"id": _ANY, "title": _ANY}],
        "offices": [{"id": _ANY, "label": _ANY}],
        "countries": [_ANY],
        "examiner_options": [_ANY],
        "submit_label": _ANY,
        "footnote": _ANY,
        "success": {"title": _ANY, "body": _ANY, "cta_label": _ANY},
    },
    # Blog index grid: featured card + post cards (data cloned from the
    # prototype's cms() blogs collection).
    "blog_grid": {
        "posts": [
            {
                "slug": _ANY,
                "title": _ANY,
                "category": _ANY,
                "author": _ANY,
                "date": _ANY,
                "read_minutes": _ANY,
                "hero_url": _ANY,
                "excerpt": _ANY,
                "featured": _ANY,
                "tags": [_ANY],
            }
        ],
        "empty": {"title": _ANY, "body": _ANY},
    },
    # Blog head + category filter pills (rendered just above blog_grid).
    "blog_filter": {
        "eyebrow": _ANY,
        "heading": _ANY,
        "lead": _ANY,
        "all_label": _ANY,
        "categories": [_ANY],
    },
    # Standalone sign-in / sign-up / reset page (no site chrome). Left aside
    # panel + the three auth modes, switched by ?mode=.
    "auth_page": {
        "brand": {
            "name": _ANY,
            "tagline": _ANY,
            "logo_url": _ANY,
            "href": _ANY,
        },
        "back_link": {"label": _ANY, "href": _ANY},
        "aside": {
            "eyebrow": _ANY,
            "heading": _ANY,
            "lead": _ANY,
            "features": [{"icon": _ANY, "title": _ANY, "body": _ANY}],
            "quote": {"text": _ANY, "author": _ANY},
        },
        "roles": [{"key": _ANY, "name": _ANY, "icon": _ANY, "sub": _ANY}],
        "signin": {
            "heading": _ANY,
            "lead": _ANY,
            "sso": [{"provider": _ANY, "icon": _ANY}],
            "demo_note": _ANY,
            "footer_text": _ANY,
            "footer_link": {"label": _ANY, "mode": _ANY},
        },
        "signup": {
            "heading": _ANY,
            "lead": _ANY,
            "countries": [_ANY],
            "languages": [_ANY],
            "exams": [{"value": _ANY, "label": _ANY}],
            "plans": [{"value": _ANY, "label": _ANY}],
            "terms": _ANY,
            "submit_label": _ANY,
            "footer_text": _ANY,
            "footer_link": {"label": _ANY, "mode": _ANY},
        },
        # Password reset is not self-serve (no reset endpoint) — the mode is an
        # info panel with a contact CTA. Only heading/lead are required so
        # rows seeded before the relabel still validate (TEC-154 LOW-1).
        "forgot": {
            "heading": _ANY,
            "lead": _ANY,
        },
    },
}

_ANIMATION_TYPES = ("fade", "slide", "none", "marquee-ltr")

_REQUIRED_SECTION_KEYS = ("id", "label", "type", "enabled", "props")


def is_typed_section(section: dict[str, Any]) -> bool:
    """True if ``section`` carries a ``props`` dict (new typed format)."""
    return isinstance(section.get("props"), dict)


def _check_shape(spec: Any, value: Any, path: str, errors: list[str]) -> None:
    """Recursively validate ``value`` against ``spec`` appending to ``errors``."""
    if spec is _ANY:
        return
    if isinstance(spec, dict):
        if not isinstance(value, dict):
            errors.append(f"{path}: expected an object")
            return
        for key, sub in spec.items():
            if key not in value:
                errors.append(f"{path}: missing required key '{key}'")
            else:
                _check_shape(sub, value[key], f"{path}.{key}", errors)
        return
    if isinstance(spec, list):
        if not isinstance(value, list):
            errors.append(f"{path}: expected a list")
            return
        item_spec = spec[0]
        for i, item in enumerate(value):
            _check_shape(item_spec, item, f"{path}[{i}]", errors)
        return


def _validate_animation(section: dict[str, Any], errors: list[str]) -> None:
    animation = section.get("animation")
    if animation is None:
        return
    if not isinstance(animation, dict):
        errors.append(f"section '{section.get('id')}': animation must be an object or null")
        return
    anim_type = animation.get("type")
    if anim_type is not None and anim_type not in _ANIMATION_TYPES:
        errors.append(
            f"section '{section.get('id')}': animation.type must be one of "
            f"{', '.join(_ANIMATION_TYPES)}"
        )


def validate_section(section: dict[str, Any]) -> list[str]:
    """Validate one section; returns a list of error strings (empty = valid)."""
    errors: list[str] = []
    sid = section.get("id", "<no-id>")
    for key in _REQUIRED_SECTION_KEYS:
        if key not in section:
            errors.append(f"section '{sid}': missing required key '{key}'")
    if errors:
        return errors
    stype = section.get("type")
    if not isinstance(stype, str) or stype not in SECTION_TYPES:
        errors.append(f"section '{sid}': unknown type '{stype}'")
        return errors
    props = section.get("props")
    if not isinstance(props, dict):
        errors.append(f"section '{sid}': props must be an object")
        return errors
    _check_shape(SECTION_TYPES[stype], props, f"section '{sid}'.props", errors)
    _validate_animation(section, errors)
    return errors


def validate_sections(sections: list[dict[str, Any]]) -> list[str]:
    """Validate a list of sections; returns a list of error strings (empty = valid)."""
    errors: list[str] = []
    if not isinstance(sections, list):
        return ["sections: must be a list"]
    for section in sections:
        if not isinstance(section, dict):
            errors.append(f"sections: expected an object, got {type(section).__name__}")
            continue
        errors.extend(validate_section(section))
    return errors
