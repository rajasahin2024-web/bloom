"""Payment rail interface."""

from __future__ import annotations

from typing import Any, Protocol


class RailError(Exception):
    """Rail is misconfigured or the provider call failed."""


class PaymentRail(Protocol):
    name: str

    def create_checkout(
        self, *, order: dict[str, Any], payment: dict[str, Any], base_url: str
    ) -> dict[str, Any]:
        """Start a payment for `payment`. Returns response extras plus
        optional 'rail_ref' to persist on the payment row."""
        ...
