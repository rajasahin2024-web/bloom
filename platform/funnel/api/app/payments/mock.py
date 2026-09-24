"""Mock rail — auto-settles via the mock-settle endpoint. No keys needed."""

from __future__ import annotations

from typing import Any


class MockRail:
    name = "mock"

    def create_checkout(
        self, *, order: dict[str, Any], payment: dict[str, Any], base_url: str
    ) -> dict[str, Any]:
        path = (
            f"/api/funnel/orders/{order['id']}/mock-settle"
            f"?payment_id={payment['id']}"
        )
        return {"mock": {"settle_url": f"{base_url}{path}" if base_url else path}}
