# Bloom Funnel API

Standalone FastAPI service for the India IELTS eBook funnel
(landing → checkout ₹199 → +₹99 bump → ₹599 upsell → downloads).

## Run

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env          # fill in when creds exist
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8090
```

DB: single-file SQLite at `data/funnel.db` (gitignored). Assets served from
`../assets/` (produced by TEC-119; missing files are skipped).

## API contract

| Endpoint | Notes |
|---|---|
| `GET /api/funnel/health` | liveness + rail/capi mode |
| `POST /api/funnel/orders` | `{email, bump, event_id, utm?, fbp?, fbc?}` → `{order_id, amount_paise, currency, rail, razorpay?|mock?}` |
| `GET /api/funnel/orders/{id}` | `{status, items[], email, payments[]}` |
| `POST /api/funnel/orders/{id}/mock-settle` | mock rail only; optional `?payment_id=` or JSON `{payment_id}` |
| `POST /api/funnel/orders/{id}/upsell` | `{event_id}` → new ₹599 payment, same rail flow |
| `GET /api/funnel/orders/{id}/downloads` | signed 24h links, paid orders only |
| `GET /api/funnel/assets/{order_id}/{token}` | serves a signed asset |
| `POST /api/funnel/webhooks/razorpay` | `X-Razorpay-Signature` verified; `payment.captured` → paid, `payment.failed` → attempt logged |
| `GET /api/funnel/buyers.csv` | `Authorization: Bearer $ADMIN_TOKEN` (or `?token=`) |
| `GET /api/funnel/payment-stats` | admin-gated; per-method attempt counts + `success_rate` (captured/attempts) |

## Meta CAPI dedup convention

- `InitiateCheckout` — fired on order create (and upsell create) with the
  client-sent `event_id`.
- `Purchase` — fired on paid; event_id = `purchase_{order_id}` (base) /
  `purchase_{order_id}_upsell` (upsell), matching
  `web/public/assets/funnel.js::purchaseEventId`.
- `META_CAPI_DRY_RUN=1` (default) logs `CAPI_DRY_RUN {...}` instead of POSTing.

## Idempotency

- `orders.event_id` UNIQUE → retried checkout returns the existing order.
- `payments` UNIQUE(order_id, kind) → upsell created once.
- Webhook/settle on already-paid payments → no-op, CAPI not re-fired.

## Payment attempts

`payment_attempts` records every rail-reported attempt (`captured`/`failed`,
with method + error fields) so the UPI success-rate metric is computable.
Idempotent on `UNIQUE(rail, rail_payment_id)`; a failed attempt leaves the
payment `created` so the buyer can retry on the same checkout.
