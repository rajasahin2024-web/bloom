# Bloom Academy — System Architecture Design (v1.0)

**Date:** 18 September 2026 · **Status:** Architecture baseline for build · **Basis:** Proposal v5.1 (accepted) + Work Orders v3.1 · **Spec source:** `FMAHTML/` prototype = functional spec · **Companion docs:** Proposal v5.1 · Dev Tasks v3.1 · External & Running Costs annexure

---

## 1. What this document is

This is the **whole-system architecture design** for the Bloom Academy platform — how every part works and how the parts talk to each other. It is written for the three builders (Sahim, Raja, Bikash) and for the client as a reference. It freezes the technical shape of the platform **before Week-1 contract freeze**, so the contracts in `platform/contracts/` are written against this design, not invented per-module.

Scope covered: public website, unified Admin Panel, Teachers Panel, Student Panel, exam engine, CMS, payments, WhatsApp (WAISE), student email IDs, AI Tutor, and the infrastructure that runs all of it.

---

## 2. System context — who and what the platform touches

### 2.1 Actors

| Actor | Enters through | What they do |
|---|---|---|
| **Visitor** | Public website | Reads pages, submits enquiry/career/contact forms |
| **Student** | Student Panel (web, mobile-responsive PWA) | Learns: classes, planner, flashcards, quiz lab, mocks, skill labs, AI tutor, payments, own mailbox |
| **Teacher / Faculty** | Teachers Panel | Planner, roster, live classes, content uploads, exam builder, student feedback |
| **Admin / Staff** | Unified Admin Panel | Admissions, student records, finance, comms, HR, ops, analytics, website CMS, mailbox controls |
| **Owner (client)** | Admin Panel + ops dashboards | Everything above + deliverability/cost reports |

### 2.2 External systems

| System | Direction | Purpose | Owner of integration |
|---|---|---|---|
| **Mail engine** (dedicated VPS: Postfix/Dovecot/Rspamd/SOGo) | Platform → API calls; users → IMAP/webmail | Real `name@bloomielts.com` mailboxes | Bikash builds; Sahim consumes contract |
| **WAISE** (waise.in WhatsApp Business API) | Platform → template sends; WAISE → inbound webhook | All WhatsApp notifications + enquiry alerts | Sahim (platform side) |
| **Razorpay / Cashfree** | Platform → checkout; gateway → webhook | Fees, subscriptions (UPI/cards/EMI) | Sahim |
| **LLM API** (GPT/Claude-class) | AI service → API | Tutor answers | Raja |
| **Zoom / Google Meet** | Platform → link generation | Live classes | Sahim |
| **S3-compatible object storage + CDN** | Platform → put/get; users → CDN GET | PDFs, audio, images, receipts | Raja (infra), Sahim (code) |
| **Meta embeds** (KaTeX/Chart.js replaced by npm bundles) | client-side | Math/chart rendering | Sahim |

**Boundary rule:** the platform talks to every external system through a **frozen contract** (`platform/contracts/*.yaml`). No module calls a third party directly outside its integration adapter.

---

## 3. Architecture principles

1. **Modular monolith first.** One `api` service, one `web` app, one database — internally split into strict modules. Services split out only where scaling or ownership demands it (already done for `ai-tutor` and the mail engine).
2. **Contract-first.** Platform↔AI, platform↔mail, platform↔WAISE are frozen OpenAPI contracts in W1. All three builders work against mocks; nothing blocks on another person's unfinished service.
3. **The prototype is the spec.** Every screen, enum, and user journey in `FMAHTML/` maps to a real module (§15). No redesign, no scope invention.
4. **Single source of truth = Postgres.** The prototype's `localStorage` store becomes server-side relational data. localStorage survives only for ephemeral UI state (theme, draft autosave).
5. **Everything tenant-important is auditable.** Every admin mutation writes an `audit_log` row (who, what, when, before/after).
6. **Degrade gracefully.** AI down ≠ platform down. Mail API down ≠ signup broken (queued retry). WhatsApp down ≠ payment lost (idempotent webhooks + retry queue).
7. **Boring, hireable stack.** Next.js + FastAPI + Postgres + Redis + Docker on VPS — mainstream in the Indian dev market, no exotic dependencies.

---

## 4. High-level architecture

```
                          ┌──────────────┐
        Visitors/students │  CDN (static │
        staff, teachers ─►│  + media)    │
                          └──────┬───────┘
                                 │
                    ┌────────────▼────────────┐
                    │   nginx reverse proxy   │  TLS, brotli, rate-limit
                    │  bloomielts.com / api.* │
                    └──────┬─────────┬────────┘
                           │         │
                ┌──────────▼──┐   ┌──▼─────────────┐        ┌────────────────┐
                │  web        │   │  api           │        │  ai-tutor      │
                │  Next.js    │   │  FastAPI       │───────►│  FastAPI gw    │
                │  (SSR/SSG + │   │  modular       │contract│  → Redis queue │
                │  portal SPA)│   │  monolith      │◄───────│  → worker pool │
                └─────────────┘   └──┬───┬───┬───┬─┘(SSE)   │  → LangGraph   │
                                     │   │   │   │         │  → LLM API     │
                          ┌──────────▼┐ ┌▼─┐ ┌▼───▼──┐      └───────┬────────┘
                          │ PostgreSQL│ │Re│ │  S3   │              │ reads
                          │ +pgvector │ │di│ │ media │              ▼
                          │ (PgBouncer│ │s │ └───────┘        ┌────────────┐
                          └───────────┘ └──┘                  │ kb_chunks  │
                                     │                        │ (pgvector) │
            ┌────────────────────────┼──────────┐             └────────────┘
            │                        │          │
   ┌────────▼───────┐      ┌─────────▼──┐  ┌────▼─────────┐
   │ Mail engine VPS│      │  WAISE.in  │  │ Razorpay /   │
   │ provisioning   │      │ WhatsApp   │  │ Cashfree     │
   │ API (contract) │      │ API + hook │  │ checkout+hook│
   └────────────────┘      └────────────┘  └──────────────┘
```

**Two physical servers:**

- **App VPS** (≥8–16GB): `web`, `api`, Postgres+PgBouncer, Redis, `ai-tutor` gateway+worker — all Docker, behind nginx.
- **Mail VPS** (dedicated, Bikash): Postfix/Dovecot/Rspamd/SOGo + provisioning API — isolated so a mail problem can never take the platform down and vice versa.

---

## 5. Deployment topology

| Hostname | Points to | Serves |
|---|---|---|
| `bloomielts.com`, `www.` | App VPS → CDN → nginx → `web` | Public website (prerendered) |
| `app.bloomielts.com` | App VPS → nginx → `web` | Student/Teacher/Admin portals |
| `api.bloomielts.com` | App VPS → nginx → `api` | REST API `/api/v1/*` |
| `staging.bloomielts.com` | App VPS (staging containers) | Full staging stack |
| `mail.bloomielts.com` | Mail VPS | SMTP/IMAP + provisioning API (allowlisted to app egress IP) |
| `webmail.bloomielts.com` | Mail VPS | SOGo webmail |
| MX record | `mail.bloomielts.com` | Inbound mail |

**Environments:** `staging` (auto-deploy on merge to `main`) and `prod` (manual promote). Same compose stack, different env files + secrets. All state on named volumes; daily `pg_dump` + media sync off-site.

**CI pipeline (every PR):** `ruff`+`mypy`+`pytest` (api, ai-tutor) · `eslint`+`tsc`+`vitest` (web) · docker build. Merge → staging deploy. Weekly demo runs on staging; monthly milestones promote to prod.

---

## 6. Repository layout (one monorepo)

```
platform/
├── web/                  # Next.js + TypeScript — website + 3 portals
│   ├── app/              # routes: (site)/..., (portal)/..., (admin)/...
│   ├── components/       # design-system primitives (§14)
│   ├── lib/              # api client, auth, formatting
│   └── theme/            # ported design tokens from bloom-core.css
├── api/                  # FastAPI modular monolith
│   ├── app/
│   │   ├── modules/      # auth, students, cms, enquiries, finance,
│   │   │                 # academic, exams, skills, planner, library,
│   │   │                 # comms, mail_admin, hr, ops, analytics, notify
│   │   ├── integrations/ # waise.py, razorpay.py, mail_api.py, ai_client.py
│   │   ├── core/         # config, db, security, rbac, audit, errors
│   │   └── workers/      # async jobs (reminders, retries, reports)
│   └── alembic/          # migrations
├── ai-tutor/             # Raja — independent service (§10)
│   ├── gateway/          # FastAPI: auth, rate-limit, SSE
│   ├── worker/           # LangGraph graph, retrieval, LLM calls
│   └── ingest/           # curriculum → chunks → embeddings → pgvector
├── contracts/            # FROZEN OpenAPI: ai-chat.yaml, mail-provisioning.yaml,
│                         # waise.yaml, payments-events.md
├── infra/                # docker-compose, nginx confs, backup scripts
└── scripts/              # lint/typecheck/test entrypoints, seed, restore drills
```

Bikash keeps a **separate infra repo** for the mail stack; his only platform-repo path is `contracts/mail-provisioning.yaml`.

---

## 7. Frontend architecture (`web/`)

### 7.1 Three shells, one codebase

| Shell | Routes | Rendering | Spec source |
|---|---|---|---|
| **Public site** | `(site)` — home, about, courses, ielts, medical, abroad, blog, results, careers, contact, login | SSG/prerendered + ISR on CMS publish | 12 prototype pages; SEO carried over exactly (OG/Twitter, JSON-LD, canonical, sitemap, manifest) |
| **Portal** | `(portal)` — student + teacher | CSR app shell behind auth (sidebar + client router, mirroring `navTo()`) | `Bloom.html` + `bloom-*.js` |
| **Admin** | `(admin)` — unified admin | CSR app shell, role-gated | `FMA Admin*.html` + `bloom-admin/ops/hr/sitecms` |

Login page does OTP/JWT handshake then routes to the right shell by role.

### 7.2 Data flow

- Server Components fetch public CMS content at build/revalidate time.
- Portal/admin shells use a typed API client (`lib/api.ts` generated from the api OpenAPI spec) with SWR-style caching; mutations go through the client so audit headers and idempotency keys are attached automatically.
- Auth: `HttpOnly` refresh cookie + in-memory access token; no tokens in localStorage (fixes the prototype's `bloom_auth` console-bypass).

### 7.3 Prototype UI → frontend mapping

`bloom-core.css`/`bloom-site.css`/`bloom-site-2.css` tokens → `theme/` (colors, spacing, type scale). `image-slot.js` → `<MediaSlot>` component backed by `media_assets`. The FMA admin's theming (Light/Dark × Airy/Comfortable/Cozy/Modern/Editorial/Admin densities) becomes a supported theme matrix in the design system (§14).

---

## 8. Backend architecture (`api/`)

### 8.1 Modular monolith — module map

Each module = `router + service + schemas + repo` inside `app/modules/`. Modules share the DB but never each other's tables directly — cross-module reads go through service functions (keeps a future split possible).

| Module | Responsibility | Prototype spec |
|---|---|---|
| `auth` | OTP (email/SMS), JWT access+rotating refresh, sessions, RBAC | `login.html` roles student/teacher/admin |
| `students` | Student records, enrolment, batch, track assignment (staff-gated), documents, status lifecycle | `bloom-ops.js`, `bloom-admin.js`, `fma_students` |
| `cms` | Keyed document store: pages, blog, faculty, pricing, testimonials, settings; draft/publish + revisions | `bloom-cms-data.js`, `bloom-sitecms.js` |
| `enquiries` | Public forms → inbox → WAISE alert → reply thread | `bloom_enq_queue`, `site-admin` flow |
| `finance` | Fee plans, invoices, receipts (PDF), subscriptions, overdue reminders, Razorpay/Cashfree | `fma_payments`, `fma_plans` |
| `academic` | Courses, batches, exam tracks, schedule, live classes (Zoom/Meet links), attendance | `bloom-schedule.js`, `bloom-live.js`, `fma_liveclasses`, `fma_schedule` |
| `exams` | Exam builder + blueprint engine + attempt lifecycle + scoring + band reports + error bank | `bloom-exambuilder.js`, `bloom-data-exams.js`, `bloom-mocks.js`, `bloom-exams.js`, `fma_mock_folders` |
| `skills` | 15-part skill labs: listening/reading/writing/speaking/grammar/vocab/strategy attempts | `bloom-reading/writing/speaking/vocab/grammar.js`, `fma-quizlab.js` |
| `study` | Planner (weighted day plan + PDF), flashcards (SM-2), textbooks/library, doubt booking | `fma-planner.js`, `fma-flashcards*.js`, `fma-textbooks.js`, `fma-doubts.js`, `bloom-tutoring.js`, `bloom-library.js` |
| `progress` | Dashboard, CEFR estimate, band trajectory, concordance, streaks, analytics feeds | `bloom-progress.js`, `bloom-dashboard.js`, `bloom-tracks.js` |
| `comms` | Announcements, email/WhatsApp template centre, notification fan-out | `bloom-content.js`, `fma_notifs`, `fma_upcoming` |
| `mail_admin` | Admin mailbox controls via Bikash's provisioning API (list/suspend/reset/quota) + student provisioning at signup | contract `mail-provisioning.yaml` |
| `hr` | Staff/faculty records, hiring, leave, reviews, printable docs | `bloom-hr*.js`, `bloom-faculty.js`, `fma_staff`, `fma_faculty` |
| `ops` | Ops dashboards, checklists, toppers, activity feed | `bloom-ops.js`, `fma_checklists`, `fma_toppers`, `fma_activity` |
| `notify` | Internal notification bus: queues outbound email/WhatsApp/in-app; retry + dead-letter | replaces prototype's direct localStorage queues |

### 8.2 Request pipeline

`nginx → FastAPI → dependency injection (db session, current_user, rbac guard) → module router → service → repo → Postgres`

- **RBAC:** `student | teacher | admin` roles + permission decorators; exam-track assignment is staff-only (prototype rule).
- **Audit:** middleware writes `audit_log` on every mutating admin call.
- **Idempotency:** all payment/webhook/mailbox endpoints accept `Idempotency-Key`; duplicates return the stored first response.
- **Async work:** slow/failure-prone work (WhatsApp sends, mailbox provisioning retries, PDF renders, reminder fan-out) is queued on Redis and executed by `workers/` — never inline in a request.

### 8.3 API conventions

- Base: `/api/v1/`, resource-oriented REST; `GET` list params `?cursor=&limit=` (cursor pagination).
- Error envelope: `{ "error": { "code": "TRACK_LOCKED", "message": "...", "details": {...} } }` — codes are stable strings the frontend switches on.
- Validation: Pydantic schemas at the boundary; 422 on schema failure, 409 on state conflicts, 410 on expired resources.
- Every module ships an OpenAPI fragment; `contracts/` files are hand-frozen, module specs are generated.

---

## 9. Data architecture

### 9.1 PostgreSQL schema (core entities)

```
users ──┬── students ──┬── enrolments ── batches ── courses ── exam_tracks
        │              ├── documents (checklist items, status)
        │              ├── attempts ── exam_sections ── exam_blueprints
        │              ├── error_bank_items
        │              ├── study_plans / flashcard_states (SM-2)
        │              ├── subscriptions ── invoices ── payments ── receipts
        │              └── mailboxes (localpart, quota, status — mirror only)
        └── staff ── faculty_profiles ── schedules ── live_classes

enquiries ── enquiry_threads
cms_documents ── cms_revisions          media_assets (S3 pointer + metadata)
notifications ── notification_deliveries
audit_log                               kb_chunks (pgvector — Raja's AI track)
```

- **Enums carried from prototype:** exam tracks `ielts-a, ielts-g, toefl, pte, duolingo, cambridge, oet, general`; IELTS part ids `l1–l4, r1–r3, rgt, w1, w2, s1–s3, gv, strategy` (from `PARTS`/`TRACK_PARTS` in `bloom-data-library.js`/`bloom-tracks.js`); document-checklist states from the FMA admin document pipeline.
- **`cms_documents`:** keyed JSONB documents + `cms_revisions` for draft/publish/rollback — the production version of `bloom_cms` + `CMS_VERSION` optimistic concurrency.
- **`kb_chunks`:** pgvector embeddings of curriculum; owned by `ai-tutor/ingest`, read by workers only.
- **PgBouncer** in transaction mode in front of Postgres — the exam engine's autosave bursts stay cheap.

### 9.2 Redis usage

| Use | Notes |
|---|---|
| AI job queue | gateway → worker hand-off |
| Platform job queue | notifications, retries, PDF, reminders |
| Exam attempt state | autosave/in-progress attempt buffers — survive spikes |
| Public CMS read cache | invalidated on publish |
| Rate limiting | token buckets per user/IP |

### 9.3 localStorage → server mapping (prototype data becomes real)

| Prototype key | Becomes |
|---|---|
| `bloom_auth` | `users` + session/JWT (HttpOnly cookie) |
| `bloom_cms` | `cms_documents` + `cms_revisions` |
| `bloom_enq_queue` / `bloom_app_queue` | `enquiries` + `notify` queue |
| `fma_students`, `fma_staff`, `fma_faculty` | `students`, `staff`, `faculty_profiles` |
| `fma_payments`, `fma_plans` | `payments`, `invoices`, `subscriptions` |
| `fma_schedule`, `fma_liveclasses` | `schedules`, `live_classes` |
| `fma_quiz_active`, `fma_quiz_history` | `attempts` (+ Redis in-progress state) |
| `fma_fc_*` (flashcards) | `flashcard_states`, `decks` |
| `fma_planner`, `fma_doubts` | `study_plans`, `doubt_bookings` |
| `fma_mock_folders`, `fma_notes_content`, `fma_checklists`, `fma_toppers`, `fma_upcoming`, `fma_notifs`, `fma_branding`, `fma_settings` | `exams`, `cms_documents`, `checklists`, `toppers`, `announcements`, `notifications`, `settings` |
| `bloom_state`, `bloom_theme`, `fma_tb_downloads` | stays client-side (UI prefs / download hints) |

---

## 10. AI Tutor service (`ai-tutor/` — Raja)

Independent deployable: **AI down ≠ platform down.** Own scaling group; capacity = worker count.

```
POST /ai/chat (SSE) ─► FastAPI gateway ─► Redis queue ─► stateless worker(s)
                            │                              │
                            │                    LangGraph agent graph:
                            │                    1. profile node ─► platform API
                            │                       GET /ai/profile/{student_id}
                            │                       (track, CEFR, weak modules,
                            │                        error history)
                            │                    2. retrieval node ─► pgvector
                            │                       kb_chunks (Bloom curriculum)
                            │                    3. LLM node ─► streamed tokens
                            │                    4. guardrails ─► off-scope →
                            │                       escalate to human teacher
                            │
                     rate limit, auth, usage metering (per-student cost report)
```

- **Knowledge base pipeline:** curriculum (notes, model answers, question banks) → chunking → embeddings → `kb_chunks`; re-indexable job as content arrives (client dependency, bulk by W4).
- **Agent profiles:** per-module tutors (Listening tutor ≠ Writing tutor) with module-scoped retrieval filters.
- **Eval harness:** curated Q/A set runs on every model/prompt change — regression enforced in CI.
- **Launch shape (Essentials):** single worker; multi-worker scale-out + expanded eval is a post-launch phase per v5.1.
- **Contract:** `contracts/ai-chat.yaml` — Sahim builds the portal chat UI against the mock from W1.

---

## 11. Email engine (Mail VPS — Bikash)

Dedicated VPS, fully isolated from the app VPS. Bikash owns it end-to-end; the platform sees only the provisioning API.

```
App VPS (api) ──HTTPS, bearer + IP allowlist──► provisioning API (nginx on mail VPS)
                                                    │
        ┌───────────────────────────────────────────┼───────────────┐
        ▼                                           ▼               ▼
   Postfix (587/465, virtual                  Dovecot (IMAP 993,   Rspamd
   mailboxes from DB, LE TLS)                  managesieve, quota)  (DKIM sign,
        │                                           │               SPF/DMARC,
        └─────────────── SOGo webmail ──────────────┘               greylist,
                       webmail.bloomielts.com                       rate limits)
```

- **DNS auth:** MX → `mail.bloomielts.com`; SPF `v=spf1 mx -all`; DKIM public key; DMARC `p=quarantine` → `p=reject` post-warm-up; PTR with provider.
- **Contract:** `check_username / create_mailbox / suspend / unsuspend / reset_password / set_quota / list_mailboxes` — idempotent on `localpart`, bearer token + source-IP allowlist, mailbox usable <30s.
- **Warm-up (non-compressible calendar):** seed-list <50/day → transactional <200/day → ramp to sign-up volume; weekly deliverability report (mail-tester ≥9/10, placement ≥90%, no blacklists) is the go-live quality gate.
- **Signup flow:** student picks username → live debounced `check_username` → on confirm `create_mailbox` → credentials shown once → welcome mail + WhatsApp; SOGo link + IMAP/SMTP settings in profile.
- **Resilience:** platform queues `create_mailbox` retries if the API is down — signup never blocks on mail availability; admin panel shows provisioning status.

---

## 12. Integration architecture

| Integration | Pattern | Key design points |
|---|---|---|
| **WAISE WhatsApp** | `integrations/waise.py` adapter; outbound template sends via `notify` queue; inbound webhook → enquiry thread/student reply | All triggers: enquiry alert, admission confirm, class reminder, fee receipt, results, document nudges. Template registry in `comms`. |
| **Razorpay/Cashfree** | checkout session → gateway webhook → `finance` | Webhook is **idempotent** (gateway retries) → ledger entry + receipt PDF + WhatsApp/email receipt. Signature verified; duplicate delivery returns stored result. |
| **Mail provisioning** | `integrations/mail_api.py` → contract client | All calls logged; failures queue for retry; `mail_admin` surfaces status to admins. |
| **AI tutor** | `integrations/ai_client.py` → `POST /ai/chat` SSE proxy | Portal chat UI streams through api (auth + metering pass-through). |
| **Zoom/Meet** | link generation in `academic` | Live-class schedule → student timetable → WAISE reminder. |
| **S3 + CDN** | presigned uploads from `cms`/`study`/HR docs; public GETs via CDN | `media_assets` rows carry key + metadata; uploads virus-checked before publish. |

**Adapter rule:** third-party specifics live only in `app/integrations/` — modules call `waise.send_template(...)`, never raw HTTP. Swap a provider = change one adapter + contract revision.

---

## 13. Key end-to-end flows

1. **Enquiry:** public form → `POST /api/v1/enquiries` → DB → admin inbox + WAISE alert to staff → staff replies (WhatsApp deep-link / in-panel) → thread logged → convert to student on admission.
2. **Admission → mailbox:** admin creates student → enrolment + track assignment (audited) → student sets username at first login → `check_username`/`create_mailbox` → welcome pack (email + WhatsApp).
3. **Payment:** student/admin initiates → Razorpay checkout → webhook (idempotent) → payment row + receipt PDF → WhatsApp + email receipt → finance dashboard updates.
4. **Class:** teacher schedules in planner → batch timetable updates → students see it → reminder queue fires WhatsApp/email at configured offsets → attendance recorded.
5. **Mock exam:** teacher blueprint → published exam → student attempt (Redis autosave per section) → submit → scoring → band report + error-bank items → progress updates → AI tutor's profile node sees the new weak modules.
6. **AI tutoring:** student asks in portal → api proxies SSE → worker pulls profile + retrieves KB chunks → streamed answer citing Bloom material → off-scope → human-teacher escalation ticket.
7. **CMS publish:** admin edits → draft → publish → `cms_revisions` snapshot → public cache invalidated → prerendered page revalidated (ISR) → live without deploy; rollback = republish older revision.

---

## 14. UI design system

The user-facing design system is ported from the prototype, not reinvented:

- **Tokens:** color, spacing, radius, shadow, type scale extracted from `bloom-core.css`/`bloom-site.css` → `web/theme/tokens.ts` (single source; CSS vars generated).
- **Theme matrix:** Light/Dark × density (Airy/Comfortable/Cozy/Modern/Editorial/Admin) — preserves the FMA admin's theming feature.
- **Primitives:** `AppShell` (sidebar+topbar), `Card`, `DataTable` (sort/filter/paginate), `Form` controls, `Modal`, `Toast`, `Tabs`, `Badge`, `EmptyState`, `MediaSlot` (replaces `image-slot.js`), `PdfButton`, `ChatStream` (SSE).
- **Patterns:** list→detail layouts, wizard forms (document checklists), attempt runner (timed sections), dashboard cards.
- **Rules:** every screen uses primitives only; new component = design-system change request. Demo page (`/dev/primitives`) renders all primitives for QA.

---

## 15. Prototype → production module map (the build checklist)

| Prototype file(s) | Target |
|---|---|
| 12 public pages + `bloom-site*.css` | `web/(site)` + `cms` module |
| `bloom-cms-data.js`, `bloom-sitecms.js`, `site-admin.html`, `image-slot.js` | `cms` + `media_assets` + Website Content admin UI |
| `login.html` | `auth` (real OTP/JWT/RBAC) |
| `Bloom.html` + `bloom-dashboard/progress/tracks.js` | Portal shell + `progress` |
| `bloom-vocab/grammar/reading/writing/speaking.js`, `bloom-data-lang.js` | `skills` |
| `bloom-placement.js`, `bloom-mocks.js`, `bloom-exams.js`, `bloom-exambuilder.js`, `bloom-data-exams.js` | `exams` (builder + engine) |
| `bloom-live.js`, `bloom-meet.js`, `bloom-schedule.js` | `academic` (schedule + live) |
| `bloom-library.js`, `bloom-data-library.js` | `study` (library) |
| `bloom-tutor.js` (simulated) | `web` chat UI → `ai-tutor` (real) |
| `bloom-tutoring.js` | `study` (1:1 booking) |
| `bloom-admin.js`, `bloom-ops.js`, `bloom-content.js` | `students`, `ops`, `comms`, `enquiries` |
| `bloom-faculty.js` | Teachers Panel + `hr` |
| `bloom-hr*.js`, `bloom-data-hr/staff.js` | `hr` |
| `bloom-data-core/ops/content/tutoring/exams.js` | reference-data seeds (`api` seed) |
| `FMA Admin*.html` (3 variants) | unified `(admin)` shell — all sections |
| `fma-textbooks.js`, `fma-planner.js`, `fma-flashcards*.js`, `fma-quizlab.js`, `fma-doubts.js` | `study` (textbooks, planner, flashcards/SM-2, quiz lab, doubt booking) |
| `uploads/`, `.c/`, `versions/`, `*.zip` | **not carried over** — prototype artifacts; media moves to S3 |

---

## 16. Security architecture

- **AuthN:** OTP via email/SMS; short-lived access JWT + rotating refresh (reuse detection); HttpOnly cookies.
- **AuthZ:** RBAC everywhere; staff-gated track assignment; admin-only finance/HR/CMS publish; object-level checks (student sees only own data).
- **Audit:** `audit_log` on every admin mutation; auth events logged.
- **Edge:** nginx rate limits on auth/forms/webhooks; security headers; TLS everywhere; HSTS on apex.
- **Secrets:** env-injected, never in repo; WAISE/Razorpay keys in platform secrets store; webhook signatures verified.
- **Data:** daily `pg_dump` + off-site copy; media versioning on S3; PII access minimized — exports are admin-only + audited.
- **Mail VPS:** allowlist-only API, ufw, fail2ban, key-only SSH (Bikash's E1 hardening list).
- **Removal of prototype risks:** no source zips in webroot, no public `uploads/`, no `.c/`/`versions/` artifacts, no CDN-loaded third-party JS (vendored via npm instead), no console-bypassable auth.

## 17. Reliability & scale path

- **Launch targets:** hundreds of concurrent timed mock attempts; public CMS reads <50ms (cached); mailbox usable <30s; tutor first-token <3s.
- **Scale levers (in order):** PgBouncer/Redis tuning → api horizontal replicas behind nginx → ai-tutor worker count → DB read replica → split `exams`/`notify` into own services if needed.
- **Failure posture:** retries + dead-letter on notifications; queued mailbox provisioning; exam autosave to Redis (attempt survives api restart); AI outage shows "tutor unavailable" card, platform unaffected.
- **Observability:** uptime probe, container health, queue depth, mail deliverability alerts (Bikash's feed into Raja's dashboard), per-student AI cost metering; weekly report to client.
- **DR:** restore drills in W6 and W11; RPO = 24h (daily backups), RTO = hours (documented runbook).

## 18. Decisions locked by this document

| # | Decision | Consequence |
|---|---|---|
| A1 | Modular monolith `api` (not microservices) | one deployable; modules split only if a proven need appears |
| A2 | `ai-tutor` is a separate service | independent scaling/billing; contract `ai-chat.yaml` |
| A3 | Mail on dedicated VPS with provisioning contract | isolation + outsourced ownership; platform never touches Postfix |
| A4 | Postgres + pgvector (no separate vector DB) | one less system; kb_chunks live beside the data they personalize |
| A5 | All outbound comms through `notify` queue | retry/dedup/metering in one place |
| A6 | Contracts frozen W1 in `platform/contracts/` | all three builders develop in parallel against mocks |
| A7 | Prototype localStorage data model → relational schema | §9.3 mapping is the migration spec |
| A8 | Design system ported, not redesigned | build speed + client already approved the look |

---

*Techfly Engineering · Architecture v1.0 · 18 September 2026 — the technical baseline the W1 contracts are frozen against. Companion docs: Proposal v5.1 · Dev Tasks v3.1 · Costs annexure · `FMAHTML/` prototype = functional spec.*
