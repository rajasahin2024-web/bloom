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
        "items": [{"name": _ANY, "logo_url": _ANY, "blurb": _ANY}],
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
