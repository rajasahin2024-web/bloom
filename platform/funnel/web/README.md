# bloom-funnel-web — India IELTS eBook funnel (TEC-118)

Zero-dependency static funnel site: landing → checkout → order bump → upsell → thank-you.
Vanilla HTML/CSS/JS for speed (LCP < 2.5s on 4G). No framework, no build step, no deps.

## Layout

```
serve.js          zero-dep static server + /config.js env injection + clean URLs + gzip
mock-api.js       DEV/QA contract stub for the /api/funnel/* backend (until TEC-117 ships)
public/
  index.html      landing — /          (ViewContent)
  checkout.html   checkout — /checkout (InitiateCheckout)
  upsell.html     upsell —  /upsell?order=…
  thanks.html     thanks —  /thanks?order=…   (Purchase)
  assets/app.css  mobile-first, zero-radius design system
  assets/funnel.js shared runtime: config, fbq, api client, rail dispatch
  robots.txt, sitemap.xml, favicon.svg
```

## Configuration (env, no rebuild needed)

`/config.js` is generated per-request by `serve.js` from env:

| Env | Default | Purpose |
|---|---|---|
| `PORT` | `8080` | listen port |
| `HOST` | `0.0.0.0` | listen host |
| `FUNNEL_API_BASE` | `http://82.112.226.111:8090` | backend base URL the browser calls |
| `META_PIXEL_ID` | unset | Meta Pixel id; unset = stub mode (fbq calls still emit, logged to console) |

`mock-api.js` env: `PORT`(8090), `HOST`, `ALLOWED_ORIGINS`, `PAYMENT_RAIL`(`mock`|`razorpay`),
`RAZORPAY_KEY_ID`, `ADMIN_TOKEN`, `META_PIXEL_ID`, `META_CAPI_TOKEN` (unset → CAPI DRY_RUN
logs the exact payload to stdout), `META_TEST_EVENT_CODE`.

## Meta Pixel + CAPI dedup convention

Browser events carry `event_id` (fbq `eventID`) so backend CAPI events dedup:

| Event | Where | `event_id` |
|---|---|---|
| `ViewContent` | landing load | none (no CAPI counterpart needed) |
| `InitiateCheckout` | checkout submit (valid email) | uuid generated client-side, POSTed as `event_id` to `POST /api/funnel/orders` — backend reuses it for CAPI |
| `Purchase` | thanks page load (after `GET /orders/{id}`) | `purchase_<order_id>` — deterministic; backend webhook/mock-settle must emit the same id. Upsell purchase uses `purchase_<order_id>_upsell` |

All events include `value` (INR rupees, not paise) and `currency: "INR"`.

## Payment rails

`POST /api/funnel/orders` (and `/upsell`) return `{rail, razorpay?|mock?}`.
`Funnel.settle()` dispatches: `razorpay` → lazy-loads `checkout.razorpay.com/v1/checkout.js`
and opens the modal (UPI-first); `mock` → POSTs `mock.settle_url`.

## Run

```bash
# web (serves public/ + config.js)
PORT=8081 FUNNEL_API_BASE=http://82.112.226.111:8090 META_PIXEL_ID= node serve.js

# mock API (dev only — real backend is TEC-117)
PORT=8090 node mock-api.js
```

Deployed as systemd-run units `bloom-funnel-web` / `bloom-funnel-api-mock` with `MemoryMax=512M`.

> Port note: 8080 was already bound by another app on this host, so the preview runs on **8081**.
