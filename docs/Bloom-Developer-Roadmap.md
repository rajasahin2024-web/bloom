# Bloom Academy — Developer Roadmap (Internal, v2.2)

> **SUPERSEDED by v3.0** — see `Bloom-Dev-Tasks-InDepth.md` (issue doc `dev-tasks`). Team change: email engine moved from Raja Sahin to **Bikash (outsourced)** per Proposal v5.1; Raja keeps DevOps + AI engine; Sahim Sarkar owns the application.

**Date:** 16 September 2026 · **Team:** Raja Sahin — DevOps + AI engine + email engine + hosting · Sahin Mehbub Sarkar — all application/feature development · **Spec:** `FMAHTML/` prototype · **Client timeline:** 3 months, staged module deliveries · **Client budget:** ₹2,50,000 all-inclusive package (Proposal v5.0) — external/running costs are billed to the academy at actuals, itemised in `Bloom-External-Costs.md`

---

## 0. Who builds what

| Person | Owns end-to-end |
|---|---|
| **Sahin Mehbub Sarkar** — application dev | **All custom application/feature development** — frontend + backend of every panel: public website, unified Admin Panel (CMS + LMS merged), Teachers Panel, Student Panel, exam engine, and all platform-side integration code (WAISE API calls, Razorpay/Cashfree, mail provisioning calls, AI-tutor chat UI). Never does ops; never waits on infra. |
| **Raja Sahin — DevOps & hosting** | Hosting server setup end-to-end: VPS provisioning, nginx, TLS, CI/CD, staging + production deploys, backups, monitoring. |
| **Raja Sahin — email engine** | The dedicated mail server end-to-end: Postfix + Dovecot + Rspamd + SOGo, DNS auth (MX/SPF/DKIM/DMARC/PTR), IP warm-up, mail provisioning API. |
| **Raja Sahin — AI engine** | The complete Bloom AI Tutor service — FastAPI gateway → Redis queue → Python worker(s) (scale-out-ready) → LangGraph agent graph → RAG over Bloom curriculum on pgvector, eval + metering. **Essentials scope per Proposal v5.0:** single-worker production deployment sized for launch cohorts; multi-worker scale-out load-test + expanded eval suites = post-launch phase. |

*Short forms used below — **Raja** = Raja Sahin · **Sahin M.** = Sahin Mehbub Sarkar.*

**Design principle:** the two sides meet only at **frozen API contracts (Week 1)**: platform↔AI, platform↔WAISE, platform↔mail — committed to `platform/contracts/`. After that, both build independently; zero blocking.

---

## 1. Week-by-week — who does what, when

| Week | Sahin M. — application | Raja — DevOps/mail | Raja — AI engine |
|---|---|---|---|
| **W1** (M0) | Auth core (JWT+OTP+RBAC, audit log) · core schema v1 + seed · design-system port + app shells | App VPS + staging (nginx, TLS, CI/CD, auto-deploy, daily backups) · mail VPS ordered · domain/DNS chased | `ai-tutor/` skeleton: FastAPI gateway → Redis queue → worker pool |
| **W1** joint | **Freeze contracts** — `POST /ai/chat`, `GET /ai/profile/{id}`, WAISE send/webhook, mail `check_username/create_mailbox/suspend/reset/quota` | — | — |
| **W2** | CMS backend: document store, draft/publish + revisions, media → S3, Redis-cached public reads | Staging polish; WAISE credentials in hand | KB pipeline: curriculum → chunks → embeddings → pgvector |
| **W3** | Public pages ×12 prerendered + full SEO · enquiry → DB → admin inbox → WAISE WhatsApp alert | **Mail VPS build starts** (Postfix/Dovecot/Rspamd/SOGo, MX/SPF/DKIM/DMARC/PTR) · **IP warm-up begins** | LangGraph graph v1: profile → retrieval → LLM, streamed |
| **W4** | Website CMS admin UI → prod deploy → **WEBSITE LIVE · Month-1 demo** | Prod VPS + domain cutover + CDN + uptime | First end-to-end streamed answer from Bloom KB |
| **W5** | Unified admin shell + admissions/student records + exam-track assignment (staff-gated) | Mail provisioning API v1 live on mail VPS | RAG quality pass on Bloom material |
| **W6** | Finance: fees, receipts (PDF), subscriptions, reminders → WAISE | SOGo webmail + quotas; warm-up continues | Student-profile context node live vs platform API |
| **W7** | Comms + academic + personnel/HR + ops + analytics · CMS merged into same admin panel | Deliverability monitoring + alerts | Agent profiles + guardrails + escalation; eval harness |
| **W8** | Teachers Panel: planner + roster + live console (Zoom/Meet) → **Month-2 demo (admin + mailbox provisioning)** | Mailbox provisioning demo support | Eval set green; regression harness enforced |
| **W9** | Teachers: content manager → library feed · exam builder (blueprints) | — | Load test worker pool; scale-out runbook |
| **W10** | Student: registration + live `@bloomielts.com` check → mailbox · placement + dashboard + progress | Provisioning API production-ready | Per-student usage metering |
| **W11** | Student: exam engine + all skill labs (15-part map) + mocks/band reports | Load-test mocks with Sahin M. · security pass · restore drill | `/ai/chat` hardened for integration |
| **W12** | Student: planner + library + booking + payments · AI tutor chat UI on `/ai/chat` · full WhatsApp set · UAT fixes → **GO-LIVE · Month-3 demo** | Production cutover, monitoring + alerts, handover docs | AI Tutor live in portal |

> **Capacity reality check:** Sahin M. carries the entire application alone. It holds at 12 weeks only because (a) the prototype removes all design ambiguity and (b) Raja absorbs 100% of infra, mail and AI. W10–12 (Student Panel) is the densest stretch — if it needs more room it takes precedence and go-live moves; new asks beyond the prototype are change requests. Weekly demos surface slippage early.
>
> **Budget reality check (v2.2):** the package is fixed at **₹2.5L** — margin lives in scope discipline, not in cutting corners. AI Tutor ships as Essentials (single-worker prod, metering, eval set); scale-out load-test and expanded eval are a paid post-launch phase. WhatsApp = core notification template set; campaigns run from WAISE's own dashboard. Every external rupee (VPS, WAISE, LLM, Meta, storage) is the academy's direct spend — never absorb it into the package.

---

## 2. Sahin Mehbub Sarkar — application track (sequential, D1→D5)

**Week 1 — Foundation**
- **D1.1 Auth core** — access + rotating refresh JWT, OTP (email/SMS), RBAC `student|teacher|admin`, audit log on admin mutations. *Accept: register→OTP→login→role-scoped /me.*
- **D1.2 Core schema v1** — `users, students, staff, enquiries, cms_documents, cms_revisions, media_assets, audit_log`; enums mirror `PARTS`/`TRACK_PARTS` (`bloom-data-library.js`, `bloom-tracks.js`); pgvector on, `kb_chunks` reserved. *Accept: `alembic upgrade head` clean + seed data.*
- **D1.3 Design-system port + shells** — `bloom-core.css`/`bloom-site.css` tokens → TS theme; primitives; public/portal/admin shells. *Accept: shells route correctly.*
- **D1.4 Freeze contracts** *(joint with Raja)* — OpenAPI for platform↔AI, platform↔WAISE, mail provisioning; committed + versioned, stubs generated. *Accept: both sides code independently.*

**Weeks 2–4 — Public website + CMS (M1)**
- **D2.1 CMS backend** — keyed `cms_documents` (mirrors `bloom-cms-data.js`), draft/publish + revisions, media → S3+CDN, cached public reads. *Accept: publish round-trip + rollback; <50ms.*
- **D2.2 Public pages ×12** — prerendered, all SEO carried over (OG, JSON-LD, sitemap, robots, manifest). *Accept: Lighthouse SEO ≥95.*
- **D2.3 Enquiry → WAISE** — `POST /api/enquiries` → admin inbox; `app/integrations/waise.py` alert + inbound webhook. *Accept: real WhatsApp alert on WAISE sender.*
- **D2.4 Website CMS admin UI + deploy** — Website Content section, optimistic concurrency; deploy with Raja → **website live**. *Accept: edit → live without deploy; Month-1 sign-off.*

**Weeks 5–8 — Unified Admin Panel (M2)**
- **D3.1 Admin shell + admissions/records** — student CRUD, enrolment, staff-gated exam track, documents. *Accept: track change audited.*
- **D3.2 Finance** — fee plans, invoices, receipts PDF, subscriptions, reminders → WAISE; receipts → WhatsApp + email. *Accept: payment → receipt + WhatsApp.*
- **D3.3 Comms/academic/HR/ops/analytics + CMS merge** — every prototype admin section real; printable HR docs; CMS folded into same shell. *Accept: single admin login reaches all.*
- **D3.4 Admin mailbox controls** — UI over Raja's provisioning API: list/suspend/reset/quota. *Accept: controls reflect on mail server.*

**Weeks 8–9 — Teachers Panel (M3)**
- **D4.1 Planner + roster + live console** — schedule CRUD, batch roster w/ tracks, Zoom/Meet links → student timetable → WhatsApp reminder. *Accept: scheduled class → reminder fires.*
- **D4.2 Content manager + exam builder** — uploads → library by IELTS part; passage/section/question authoring + blueprints → publishes to student exam engine. *Accept: authored mock → student takes → score.*

**Weeks 10–12 — Student Panel + go-live (M4/M5)**
- **D5.1 Registration + email-ID provisioning** — live availability check → `create_mailbox` → `name@bloomielts.com`, credentials once, webmail/IMAP settings in profile. *Accept: usable mailbox in SOGo <30s.*
- **D5.2 Placement + dashboard + progress** — CEFR placement, weakest-module detection, band trajectory, streaks/badges, English Profile concordance. *Accept: placement → dashboard shows level.*
- **D5.3 Exam engine + mocks** — IELTS band 0–9, TOEFL 120, PTE 90, Duolingo 160 adaptive; timed attempts, autosave, scoring + band report, error bank; Redis attempt state. *Accept: full mock → band report.*
- **D5.4 Skill labs** — all 15 parts: L1–4, R1–3+GT, W1–2, S1–3, GV, strategy. *Accept: every part has working UI + saved attempts.*
- **D5.5 Planner + library + booking + payments** — day-by-day plan + PDF; library; 1-on-1 booking; Razorpay/Cashfree → idempotent webhook → receipt → WhatsApp. *Accept: test payment → receipt; dup webhook safe.*
- **D5.6 AI chat UI + WhatsApp set + UAT → go-live** — SSE chat on `/ai/chat` replaces `bloom-tutor.js`; all WAISE templates live; UAT fixes → prod cutover with Raja. *Accept: real tutor answers in portal; client sign-off.*

---

## 3. Raja Sahin — DevOps, hosting & mail track (what, when)

- **S1 (W1) Environments + CI/CD** — app VPS (≥8GB, 16GB rec.), Docker stack (Postgres+pgvector, PgBouncer, Redis, api, web), nginx, TLS, staging subdomain; CI on PR (ruff+mypy+pytest, eslint+tsc+vitest, docker build); auto-deploy on merge; daily pg_dump + uptime. *Accept: merge → staging live; restore verified.*
- **S2 (W3–W6) Mail server** — dedicated mail VPS: Postfix + Dovecot + Rspamd + SOGo (mailcow-style), mailbox DB + quotas; DNS MX/SPF/DKIM/DMARC/PTR; **IP warm-up from W3** (deliverability needs lead time); provisioning API per W1 contract live by W6 (token auth + IP allowlist); monitoring, mail-tester ≥9/10. *Accept: API-created mailbox usable in SOGo/IMAP in seconds.*
- **S3 (W4) Production cutover** — prod VPS, domain + TLS, CDN, uptime → website live for Month-1 demo.
- **S4 (W11–W12) Hardening + go-live** — load test hundreds of simultaneous timed attempts, PgBouncer/Redis tuning; security pass; restore drill; monitoring + alerts; cutover runbook + ops handover docs. *Accept: load target met; prod live.*

## 4. Raja Sahin — AI Tutor engine (horizontally scalable)

Concept: independent deployment + own scaling group; capacity = worker count. AI down ≠ platform down.

- **A1 (W1–W4) Skeleton + KB** — FastAPI gateway (auth, rate limits, SSE) → Redis queue → stateless worker pool; LangGraph graph (profile → retrieval → LLM, streamed); ingestion → pgvector `kb_chunks`, re-indexable. *Accept: streamed answer grounded in Bloom KB.*
- **A2 (W5–W8) Quality + personalisation** — RAG quality pass; per-module agent profiles (Listening ≠ Writing tutor); guardrails + human-teacher escalation; student-profile context node; eval set + regression harness. *Accept: eval green; answers cite KB; context changes responses.*
- **A3 (W9–W12) Harden + integrate + meter** — harden `/ai/chat` (rate limits, streaming, fallbacks); per-student metering (~₹30–80/student/mo); hand `/ai/chat` to Sahin M.; isolated prod deploy (single-worker). *Accept: tutor live in portal under expected launch load.* *Post-launch phase: multi-worker load test + scale-out runbook + expanded eval.*

---

## 5. Handoffs & hard dependencies

- **W1 contracts gate everything cross-side** — freeze in Week 1, no exceptions.
- **Mail:** Raja's provisioning API (by W6) → gates admin mailbox controls (D3.4) and student registration (D5.1, W10). Warm-up can't be compressed — starts W3.
- **AI:** `/ai/chat` (by W11) → gates chat UI (D5.6, W12). Sahin M. builds against the W1 contract stub — never waits.
- **Exam engine:** teacher exam builder (W9) and student mocks (W11) share one engine — same code, same tables.
- **Environments:** Raja keeps staging/prod ahead of the build; Sahin M. never waits on a server — escalate same-day if it happens.

## 6. Client dependencies (chase early)

| Item | Needed by | Gates |
|---|---|---|
| Domain + DNS access | W1 | Deploys, SSL, mail DNS |
| WAISE.in Professional + API creds | W1–2 | Every WhatsApp feature |
| VPS purchases (app ~₹4–8k/mo, mail ~₹3–5k/mo) | W1 | Staging/prod + mail |
| Razorpay/Cashfree KYC | W6 | Payments |
| Curriculum content (notes, model answers, banks, audio) | Rolling; bulk by W4 | AI KB + library |

## 7. Risks

- **Single-developer application bandwidth (Sahin M.)** — W10–12 is densest; weekly demos catch slippage early; no silent scope absorption.
- **Mail deliverability** — warm-up starts W3, non-negotiable.
- **Content dependency** — escalate if Week-4 curriculum handover slips.
- **Exam-day load** — load-tested W11 before go-live.

---
*Techfly Engineering · v2.2 · supersedes v2.1 — restructured to the client's ₹2.5L budget (Proposal v5.0): AI Tutor scoped to Essentials, WhatsApp = core template set, mail-server one-time setup folded inside the package, external costs moved to `Bloom-External-Costs.md`. Team unchanged: Raja Sahin owns DevOps + AI engine + email engine + hosting; Sahin Mehbub Sarkar owns all remaining application/feature development.*
