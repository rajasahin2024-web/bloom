# bloom-funnel-web — AI for Office Work course funnel (TEC-122)

Zero-dependency static funnel site: landing → checkout → order bump → upsell →
thank-you → buyer login → gated learner portal. Vanilla HTML/CSS/JS for speed
(LCP < 2.5s on 4G). No framework, no build step, no deps.

## Layout

```
serve.js          zero-dep static server + /config.js env injection + clean URLs + gzip
mock-api.js       DEV/QA contract stub for /api/funnel/* incl. /gated/* (mirrors TEC-121)
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

## Learner portal contract (`/api/funnel/gated/*` — shipped in TEC-121)

- `POST /gated/auth/login` `{email, order_id}` →
  `{token(fns_*), expires_at, order_id, email, entitlements:{course,prompt_library,second_course}, course:{id,title}}`
  on a **paid** order; `401` bad creds, `403` unsettled. Token kept in
  `sessionStorage`, sent as `Authorization: Bearer`. Magic links carry the
  session token directly — `/gated/me` validates it.
- `GET /gated/me` → `{order_id, email, entitlements, progress, certificate}`
- `GET /gated/modules` → `{course, modules_total, modules_passed, complete,
  modules:[{id,title,summary,lesson_url,videos:[{video_id,title,duration_seconds,embed_url}],
  quiz_question_count,pass_score_pct,progress:{attempts,best_score,total,passed,last_attempt_at}}]}`
- `GET /gated/modules/{id}` → single module view · `GET /gated/modules/{id}/lesson` → gated lesson HTML
- `GET /gated/modules/{id}/quiz` → `{module_id,title,pass_score_pct,questions:[{id,prompt,options:[{id,text}]}]}` — **answers never leave the server**
- `POST /gated/modules/{id}/quiz/submit` `{answers:{qid:optionId}}` →
  `{module_id,score,total,passed,pass_score_pct,module:{progress}}`
- `GET /gated/progress` → same summary shape as `/modules`
- `GET /gated/certificate` → `{eligible,issued,serial,issued_at,buyer_name,pdf_url}`;
  `POST /gated/certificate` `{name}` issues the PDF (idempotent, 403 until complete);
  `GET /gated/certificate/pdf` → `application/pdf`. Completion only — never "accredited".
- `GET /gated/downloads` → `{downloads:[{sku,file,url,expires_at}]}` — entitlement-filtered
  24h signed links; the portal additionally shows skipped add-ons as locked rows.
- Videos are `youtube-nocookie.com` embeds built from `video_id` — free curated bonus, never the paid content.

## Run


```bash
# web (serves public/ + config.js)
PORT=8081 FUNNEL_API_BASE=http://82.112.226.111:8090 META_PIXEL_ID= node serve.js

# mock API (dev/QA — full portal contract stubbed)
PORT=8090 node mock-api.js
```

Deployed as systemd-run units `bloom-funnel-web` / `funnel-api` with `MemoryMax=512M`.

> Port note: 8080 was already bound by another app on this host, so the preview runs on **8081**.
