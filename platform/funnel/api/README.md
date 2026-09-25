# Bloom Funnel API

Standalone FastAPI service for the "AI for Office Work" micro-course funnel
(landing → checkout ₹199 → +₹99 bump → ₹599 upsell → gated delivery area).

## Run

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env          # fill in when creds exist
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8090
```

DB: single-file SQLite at `data/funnel.db` (gitignored). Assets served from
`../assets/` (produced by TEC-119; missing files are skipped).
Generated certificates are written to `data/certificates/`.

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


## Gated delivery area (buyer portal)

Buyers log in with email + order id (`POST /api/funnel/gated/auth/login`) and
receive a bearer session token (`fns_*`, sha256-hashed at rest, 30-day TTL via
`GATED_SESSION_TTL_SECONDS`). All `/gated/*` endpoints below require
`Authorization: Bearer <token>`. Failed logins are throttled per (ip, email):
`GATED_LOGIN_MAX_ATTEMPTS` per 60s (default 20). Only paid orders can log in.

Entitlements are derived server-side from the paid order's items:
`course` (base paid), `prompt_library` (+₹99 bump sku), `second_course`
(₹599 upsell sku).

| Endpoint | Notes |
|---|---|
| `POST /api/funnel/gated/auth/login` | `{email, order_id}` → `{token, expires_at, entitlements, course}` |
| `GET /api/funnel/gated/me` | entitlements + full progress + certificate state |
| `GET /api/funnel/gated/modules` | ordered module map: title/summary/lesson_url/videos[{video_id,title,duration_seconds,embed_url}]/quiz count + per-module progress |
| `GET /api/funnel/gated/modules/{id}` | single module detail |
| `GET /api/funnel/gated/modules/{id}/lesson` | serves the module's lesson HTML (gated) |
| `GET /api/funnel/gated/modules/{id}/quiz` | questions WITHOUT answers |
| `POST /api/funnel/gated/modules/{id}/quiz/submit` | `{answers:{qid:opt}}` → `{score,total,passed}`; append-only attempts, module passes on any passing attempt |
| `GET /api/funnel/gated/progress` | same aggregate as `/modules` |
| `GET /api/funnel/gated/certificate` | `{eligible, issued, serial, pdf_url}` |
| `POST /api/funnel/gated/certificate` | `{name}` → issues "Certificate of Completion" PDF once all module quizzes passed; idempotent per order |
| `GET /api/funnel/gated/certificate/pdf` | serves the generated PDF |
| `GET /api/funnel/gated/downloads` | signed 24h links filtered by entitlement (quick-start PDF, prompt library, upsell bundle) |

### Course manifest (content contract with TEC-119)

Load order: `$FUNNEL_COURSE_MANIFEST` → `{FUNNEL_ASSETS_DIR}/course/manifest.json`
→ bundled placeholder `app/course_manifest.json`. Schema:

```json
{
  "course": {"id": "ai-office-work-v1", "title": "AI for Office Work",
             "pass_score_pct": 70},
  "modules": [{
    "id": "m1", "title": "...", "summary": "...",
    "lesson": "course/m1/lesson.html",
    "videos": [{"video_id": "<youtube-id>", "title": "...",
                "duration_seconds": 480}],
    "pass_score_pct": 70,
    "quiz": [{"id": "q1", "prompt": "...",
              "options": [{"id": "a", "text": "..."}],
              "answer": "a"}]
  }]
}
```

YouTube entries carry id/title/duration only — the portal embeds
`youtube.com/embed/{video_id}`; media is never re-hosted. Answers are stripped
before quiz payloads leave the API. Certificate wording is completion-only —
no accreditation claims.

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
