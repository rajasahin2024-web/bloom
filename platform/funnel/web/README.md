# bloom-funnel-web — AI for Office Work course funnel (TEC-122)

Zero-dependency static funnel site: landing → checkout → order bump → upsell →
thank-you → buyer login → gated learner portal. Vanilla HTML/CSS/JS for speed
(LCP < 2.5s on 4G). No framework, no build step, no deps.

## Layout

```
serve.js          zero-dep static server + /config.js env injection + clean URLs + gzip
mock-api.js       DEV/QA contract stub for /api/funnel/* incl. /portal/* (until TEC-121 ships)
public/
  index.html      landing — /          (ViewContent)
  checkout.html   checkout — /checkout (InitiateCheckout)
  upsell.html     upsell —  /upsell?order=…
  thanks.html     thanks —  /thanks?order=…   (Purchase) + portal entry CTA
  login.html      buyer login — /login  (email + order-id; also /login?token=<magic-link>)
  portal.html     learner portal — /portal  (gated; redirects to /login without session)
  assets/app.css  mobile-first, zero-radius design system
  assets/funnel.js shared runtime: config, fbq, api client, portal client, rail dispatch
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

## Learner portal contract (`/api/funnel/portal/*`, real impl = TEC-121)

- `POST /portal/login` `{email, order_id}` | `{token}` (magic link) →
  `{token, token_type, expires_at, email, order_id, entitlements}` on a **paid** order;
  `401` otherwise. Token is kept in `sessionStorage` and sent as `Authorization: Bearer`.
- `GET /portal/me` → `{email, order_id, entitlements:{course, prompt_pack, bundle}}`
- `GET /portal/modules` → `{course_name, modules:[{id,title,summary,videos:[{video_id,title,duration}],quiz_count,progress:{status,best_score_pct,attempts}}]}`
- `GET /portal/modules/{id}` → `{module:{…,questions:[{id,q,options[]}]}}` — **answers never leave the server**
- `POST /portal/modules/{id}/quiz` `{answers:{qid:optionIndex}}` →
  `{score_pct, passed, pass_pct, correct_count, total, results:{qid:correctIndex}, progress}`
- `GET /portal/progress` → `{modules_total, modules_passed, percent, certificate_ready, modules[]}`
- `GET /portal/certificate` → `{ready, course_name?, serial?, issued_at?, pdf_url?, message?}`
- `GET /portal/certificate.pdf` → PDF (Bearer or `?token=`); completion only — never "accredited"
- `GET /portal/downloads` → `{downloads:[{name,format,url?|locked,lock_note?}]}` —
  signed asset URLs same scheme as `/dl/*`; prompt-pack rows lock without bump, bundle rows without upsell
- Videos are `youtube-nocookie.com` embeds — free curated bonus, never the paid content.

## Run

```bash
# web (serves public/ + config.js)
PORT=8081 FUNNEL_API_BASE=http://82.112.226.111:8090 META_PIXEL_ID= node serve.js

# mock API (dev/QA — full portal contract stubbed)
PORT=8090 node mock-api.js
```

Deployed as systemd-run units `bloom-funnel-web` / `funnel-api` with `MemoryMax=512M`.

> Port note: 8080 was already bound by another app on this host, so the preview runs on **8081**.
