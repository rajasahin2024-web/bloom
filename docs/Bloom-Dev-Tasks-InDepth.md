# Bloom Academy — Development Tasks (In-Depth Work Orders, v3.1)

**Date:** 18 September 2026 · **Basis:** Proposal v5.1 (accepted — 3-month delivery) · **Spec:** `FMAHTML/` prototype = functional spec · **Supersedes:** v3.0 · **Rule:** work orders carry **tasks only** — no pricing or commercial terms appear in this document; those live in the proposal contract.

---

## 1. The team — who owns what

| Person | Role | Owns end-to-end | Does NOT touch |
|---|---|---|---|
| **Sahim Sarkar** | Core Developer of the Application | All custom application/feature development — frontend + backend of every panel: public website, unified Admin Panel (CMS + LMS merged), Teachers Panel, Student Panel, exam engine, and all platform-side integration code (WAISE API calls, Razorpay/Cashfree, calls into Bikash's mail provisioning API, AI-tutor chat UI). | Servers, deploys, DNS, mail stack internals, AI service internals. Never waits on infra — Raja keeps environments ahead of the build. |
| **Raja Sahin** | DevOps + AI Engine Development | **DevOps/hosting:** VPS provisioning + hardening, Docker stack, nginx, TLS, CI/CD, staging + production deploys, backups, monitoring, load/security pass, go-live cutover. **AI engine:** the complete Bloom AI Tutor service — FastAPI gateway → Redis queue → worker(s) → LangGraph agent graph → RAG over Bloom curriculum on pgvector, eval + metering. | Panel code, mail server build (Bikash's scope — Raja only consumes the provisioning API contract on the infra side for firewalling/DNS coordination). |
| **Bikash** | Email Engine Setup — **outsourced partner** | The dedicated mail server end-to-end: VPS hardening, Postfix + Dovecot + Rspamd + SOGo, DNS auth (MX/SPF/DKIM/DMARC/PTR), IP warm-up plan + execution, mailbox provisioning API per the W1 frozen contract, deliverability monitoring, documentation + handover. | Application code, app VPS, AI engine. Interfaces with the platform **only** through the frozen provisioning contract. |

**Short forms:** **Sahim** = Sahim Sarkar · **Raja** = Raja Sahin · **Bikash** = outsourced mail engineer.

**Bikash's engagement (v3.1):** Bikash joins Techfly as an **outsourced partner for the email-engine scope only**. He is a specialist who **already knows this exact mail-stack setup** — he has done the same Postfix/Dovecot/Rspamd/SOGo build before — which is what makes the 2-day setup in Section 5 realistic.

**Design principle (unchanged):** everyone meets only at **frozen API contracts in Week 1** — platform↔AI, platform↔WAISE, platform↔mail — committed to `platform/contracts/`. After that all three build independently; zero blocking. Bikash works entirely against the mail contract + DNS/VPS access — he never needs repo access beyond `contracts/`.

---

## 2. Operating model

- **Definition of Done (every task):** code reviewed + merged, lint/typecheck/tests green (`platform/scripts/`), deployed to staging, demo-able. For Bikash: config in git (infra repo), verified on the live mail VPS, documented.
- **Cadence:** weekly demo every Friday (Month-1/2/3 demos are the delivery checkpoints). Async standup in the shared channel; blockers escalated same-day.
- **Contract governance:** any contract change after W1 freeze needs a written change request + all three parties sign off.
- **Scope discipline:** the package scope is fixed. Anything beyond the prototype spec is a change request, never absorbed silently.
- **Mail-engine timing (v3.1):** Bikash's email-engine work **starts within 7 days of the project start date**, and the core setup is a **2-day** task inside that window. Warm-up then runs on its own non-compressible calendar.
- **Commercial terms:** none in this document. Work orders list tasks, owners, and acceptance criteria only.

---

## 3. Week-by-week — who does what, when

| Week | Sahim — application | Raja — DevOps | Raja — AI engine | Bikash — mail engine |
|---|---|---|---|---|
| **W1** | Auth core (JWT+OTP+RBAC, audit log) · core schema v1 + seed · design-system port + app shells | App VPS + staging (nginx, TLS, CI/CD, auto-deploy, daily backups) · domain/DNS chased · hostname/IP plan + DNS access handed to Bikash | `ai-tutor/` skeleton: FastAPI gateway → Redis queue → worker pool | **2-day setup burst (inside the first 7 days):** mail VPS hardened + Postfix/Dovecot/Rspamd/SOGo live + MX/SPF/DKIM/DMARC/PTR set · contract inputs received |
| **W1 joint** | **Freeze contracts** — `POST /ai/chat`, `GET /ai/profile/{id}`, WAISE send/webhook, mail `check_username/create_mailbox/suspend/reset/quota` (Sahim + Raja + Bikash) | — | — | — |
| **W2** | CMS backend: document store, draft/publish + revisions, media → S3, Redis-cached public reads | Staging polish; WAISE credentials in hand | KB pipeline: curriculum → chunks → embeddings → pgvector | **IP warm-up begins** — seed list only, <50/day · stack tuning · first test mailboxes |
| **W3** | Public pages ×12 prerendered + full SEO · enquiry → DB → admin inbox → WAISE alert | Prod VPS prep | LangGraph graph v1: profile → retrieval → LLM, streamed | Warm-up continues; mail-tester baseline |
| **W4** | Website CMS admin UI → prod deploy → **WEBSITE LIVE · Month-1 demo** | Prod cutover + CDN + uptime | First streamed answer from Bloom KB | Warm-up ramp — transactional templates, <200/day |
| **W5** | Unified admin shell + admissions/student records + exam-track assignment | Staging/prod parity | RAG quality pass | Provisioning API v1 build on mail VPS (token auth + IP allowlist) |
| **W6** | Finance: fees, receipts (PDF), subscriptions, reminders → WAISE | Backup/restore drill #1 | Student-profile context node live | **Provisioning API live per contract · SOGo webmail live** — Month-2 demo support |
| **W7** | Comms + academic + personnel/HR + ops + analytics · CMS merged | Monitoring + alert routing | Agent profiles + guardrails + escalation; eval harness | Deliverability monitoring + alerts handed to Raja's dashboard |
| **W8** | Teachers Panel: planner + roster + live console → **Month-2 demo (admin + mailbox provisioning)** | Demo support | Eval set green; regression enforced | Live demo: admin → `create_mailbox` → usable in SOGo |
| **W9** | Teachers: content manager → library feed · exam builder | — | Load test worker pool; scale-out runbook | Quota/reporting polish; docs draft; warm-up at expected sign-up volume |
| **W10** | Student: registration + live `@bloomielts.com` check → mailbox · placement + dashboard + progress | Provisioning path production-ready | Per-student usage metering | **Production-ready for sign-up traffic** — rate limits, retry semantics verified; warm-up complete; DMARC → `p=reject` if clean |
| **W11** | Student: exam engine + all skill labs (15-part map) + mocks/band reports | Load-test mocks with Sahim · security pass · restore drill #2 | `/ai/chat` hardened | Deliverability report — mail-tester ≥9/10, inbox placement ≥90%, no blacklistings |
| **W12** | Student: planner + library + booking + payments · AI tutor chat UI · full WhatsApp set · UAT → **GO-LIVE · Month-3 demo** | Prod cutover, monitoring + alerts, ops handover docs | AI Tutor live in portal | **Docs + handover + 30-day support window starts** — final acceptance |

> **Capacity reality check:** Sahim carries the entire application alone. It holds at 12 weeks only because (a) the prototype removes all design ambiguity, (b) Raja absorbs all infra + AI, and (c) Bikash absorbs the whole mail engine in parallel — his 2-day setup lands in week 1, and the long warm-up calendar runs unattended alongside. W10–12 (Student Panel) is the densest stretch — if it needs more room it takes precedence and go-live moves; new asks are change requests. Weekly demos surface slippage early.

---

## 4. Sahim Sarkar — Core Application work order (sequential, D1→D5)

Spec = the prototype (`FMAHTML/`, referenced by file name). Each task lists objective → build steps → surface → acceptance.

### Phase D1 — Foundation (Week 1)

**D1.1 Auth core: JWT + OTP + RBAC** *(est. 3d)*
- Access token + rotating refresh JWT with reuse detection; OTP via email/SMS for registration + login.
- RBAC middleware: roles `student|teacher|admin`; permission decorators on routers.
- Audit log table written on every admin mutation (who, what, when, before/after).
- Prototype rule: staff assign exam track; students cannot self-override.
- **Accept:** register→OTP→login→role-scoped `/me`; refresh rotation tested; admin action writes audit row.

**D1.2 Core schema v1** *(est. 2d)*
- Alembic migrations: `users, students, staff, enquiries, cms_documents, cms_revisions, media_assets, audit_log`.
- Enums mirror prototype: exam tracks `ielts-a, ielts-g, toefl, pte, duolingo, cambridge, oet, general`; IELTS part ids `l1–l4, r1–r3, rgt, w1, w2, s1–s3, gv, strategy` — from `PARTS`/`TRACK_PARTS` in `bloom-data-library.js`/`bloom-tracks.js`.
- pgvector extension enabled; `kb_chunks` table reserved for Raja's AI track.
- **Accept:** `alembic upgrade head` clean from empty DB; seed script creates demo data.

**D1.3 Design-system port + app shells** *(est. 2d)*
- Port `bloom-core.css`/`bloom-site.css` tokens → TS theme; shared primitives (sidebar layout, cards, tables, forms, modal, toast).
- Three shells: public layout, authed portal layout (sidebar + router), admin layout.
- **Accept:** primitives demo page renders; all three shells route correctly.

**D1.4 Freeze API contracts** *(joint — Sahim + Raja + Bikash, est. 1d)*
- OpenAPI specs for: platform↔AI (`POST /ai/chat` streamed; `GET /ai/profile/{student_id}` = track, CEFR, weak modules, error history); platform↔WAISE (template send, inbound webhook, enquiry alert); **mail provisioning** (`check_username / create_mailbox / suspend / reset / quota` — request/response schemas, error codes, auth header, idempotency).
- Committed + versioned in `platform/contracts/`; stubs/mock servers generated so all three sides code independently.
- **Accept:** contracts merged; mock servers available to Sahim, Raja, Bikash.

### Phase D2 — Public website + CMS (Weeks 2–4 · Milestone M1)

**D2.1 CMS backend** *(est. 4d)* — keyed `cms_documents` store (page sections, blog, faculty, pricing, testimonials, university lists, settings — mirrors `bloom-cms-data.js`); CRUD + draft/publish + revision history; `media_assets` → S3 + CDN; public reads Redis-cached, admin writes invalidate. **Accept:** publish/unpublish round-trip; rollback; public endpoint <50ms.

**D2.2 Public pages ×12 — prerendered** *(est. 4d)* — home, about, courses, ielts, medical, abroad, blog(+post), results, careers, contact, login, platform; all content from CMS API; SEO carried over exactly (OG/Twitter, JSON-LD `EducationalOrganization`, canonical, sitemap, robots, manifest, icons). **Accept:** Lighthouse SEO ≥95; view-source shows prerendered content.

**D2.3 Enquiry pipeline + WAISE alert** *(est. 2d)* — `POST /api/enquiries` → DB → admin inbox (replaces `bloom_enq_queue`); `app/integrations/waise.py`: template alert to staff on new enquiry; webhook for inbound replies → enquiry thread. **Accept:** form submit → admin inbox row + real WhatsApp alert via WAISE.

**D2.4 Website CMS admin UI + prod deploy** *(est. 3d)* — "Website Content" admin section (spec: prototype sitecms); optimistic concurrency on publish (`CMS_VERSION` equivalent); deploy with Raja → **website live → Month-1 checkpoint**. **Accept:** staff edits a page → live without deploy; client accepts Month-1 demo.

### Phase D3 — Unified Admin Panel (Weeks 5–8 · Milestone M2)

**D3.1 Admin shell + admissions & student records** *(est. 4d)* — student CRUD: profile, enrolment, course/batch, staff-gated exam-track assignment, status lifecycle, documents (spec: `bloom-ops.js`, `bloom-admin.js`). **Accept:** staff creates student + assigns track; track change audited.

**D3.2 Finance** *(est. 4d)* — fee plans, invoices, receipts (PDF), subscription status, overdue reminders → WAISE template; receipts → WhatsApp + email. **Accept:** record payment → receipt PDF + WhatsApp receipt; overdue list + reminder send.

**D3.3 Comms, academic, HR, ops, analytics + CMS merge** *(est. 5d)* — announcements; academic setup (courses/batches/tracks); personnel + printable HR docs (`bloom-hr.js`, `bloom-hr-docs.js`); ops + analytics dashboards; fold M1 Website Content UI into same admin shell, role-gated. **Accept:** every prototype admin section has a real-data equivalent; single admin login reaches everything.

**D3.4 Admin mailbox controls** *(est. 2d — consumes Bikash's API)* — admin UI over the provisioning API: mailbox list, suspend, reset password, set quota per student. **Accept:** suspend/reset/quota from admin panel reflects on the mail server.

### Phase D4 — Teachers Panel (Weeks 8–9 · Milestone M3)

**D4.1 Planner + roster + live console** *(est. 4d)* — schedule CRUD, batch/calendar, class roster w/ tracks, live teaching console (spec: `bloom-faculty.js`, `bloom-live.js`); Zoom/Google Meet link integration; schedule → student timetable → WhatsApp reminder. **Accept:** teacher schedules class → appears on student schedule → reminder fires.

**D4.2 Content manager + exam builder** *(est. 4d)* — uploads → object storage → library feed by IELTS part (`bloom-content.js`); exam builder: passages/sections/questions + per-exam blueprints (`bloom-exambuilder.js`, `bloom-data-exams.js`) → publishes into the student exam engine. **Accept:** teacher-authored section mock → student takes it → score recorded.

### Phase D5 — Student Panel + go-live (Weeks 10–12 · Milestones M4/M5)

**D5.1 Registration + email-ID provisioning** *(est. 3d — consumes Bikash's API)* — sign-up username with **live availability check** (debounced → `check_username` → taken/available + suggestions); confirm → `create_mailbox` → `name@bloomielts.com` + credentials shown once + welcome mail/WhatsApp; webmail (SOGo) link + IMAP/SMTP settings in student profile. **Accept:** register → usable mailbox in SOGo <30s; duplicates handled gracefully.

**D5.2 Placement + dashboard + progress** *(est. 3d)* — placement → CEFR estimate; dashboard: weakest-module detection, band trajectory, streaks/badges; English Profile with IELTS↔TOEFL↔PTE↔DET↔Cambridge↔OET concordance (`bloom-progress.js`). **Accept:** new student → placement → dashboard shows level + weakest module.

**D5.3 Exam engine + mocks** *(est. 5d)* — blueprint engine: IELTS band 0–9, TOEFL iBT (120/116min), PTE (90/120min), Duolingo (160/60min adaptive) — port `bloom-data-exams.js`; attempt lifecycle: start → timed sections → autosave → submit → scoring + band report; error-bank capture (`bloom-mocks.js`, `bloom-exams.js`); Redis attempt state, safe under exam-day spikes. **Accept:** full IELTS mock end-to-end → band report; multi-exam engines verified.

**D5.4 Skill labs — all 15 parts** *(est. 4d)* — Listening P1–4 (audio + answer sheets), Reading P1–3 + GT, Writing T1–2, Speaking P1–3 (record/upload), Grammar & Vocab, Exam Strategy (spec: `bloom-reading/writing/speaking/vocab/grammar.js`, `bloom-data-*.js`). **Accept:** every part in `PARTS` has working practice UI + saved attempts.

**D5.5 Planner + library + booking + payments** *(est. 4d)* — weighted day-by-day study plan + PDF export; library; 1-on-1 tutor booking (`bloom-tutoring.js`, `bloom-library.js`); Razorpay/Cashfree checkout (UPI/cards/EMI); idempotent webhook → ledger + receipt → WhatsApp. **Accept:** test payment → receipt → finance reflects; duplicate webhook safe.

**D5.6 AI chat UI + WhatsApp set + UAT → go-live** *(est. 3d)* — SSE chat UI wired to `POST /ai/chat` (replaces simulated `bloom-tutor.js`); all WAISE templates live (enquiry follow-up, admission confirmation, class reminders, fee receipts, results, document nudges); client UAT fixes → production cutover with Raja → **Month-3 go-live**. **Accept:** tutor streams real answers in portal; every WhatsApp trigger verified; client sign-off.

**Sahim's total: ~55 working days across 12 weeks.**

---

## 5. Bikash — Email Engine work order (outsourced partner)

**Engagement model:** Bikash joins Techfly as an **outsourced partner** for the email engine only. He already knows this exact setup — the same Postfix + Dovecot + Rspamd + SOGo stack and DNS auth flow — so no learning curve is budgeted anywhere in this work order.

**Start rule (v3.1):** email-engine work **begins within 7 days of the project start date**. The core setup (E1) is a **2-day** task inside that window.

**Scope boundary:** Bikash delivers a working, documented mail system + provisioning API. He does not write application code, does not need repo access beyond `platform/contracts/mail-provisioning.yaml`, and does not touch the app VPS.

### Inputs Bikash receives (Day 1–3 of W1)

| Input | From | Details |
|---|---|---|
| Frozen contract | Sahim | `mail-provisioning.yaml`: `check_username / create_mailbox / suspend / reset / set_quota` — schemas, error codes, auth, idempotency rules |
| Mail VPS | Client (dedicated purchase) | Dedicated VPS, isolated from app VPS — fresh Ubuntu/Debian, root access |
| DNS access | Client/Raja | Zone access for `bloomielts.com` to set MX/SPF/DKIM/DMARC/PTR (or exact record values to hand to the DNS owner) |
| Hostname/IP plan | Raja | `mail.bloomielts.com`, webmail host `webmail.bloomielts.com`, platform egress IP for API allowlist |
| Contract SLA targets | This doc | mailbox usable <30s after `create_mailbox`; mail-tester ≥9/10; API auth = bearer token + IP allowlist |

### Tasks

**E1 (W1 — inside the first 7 days) 2-day setup: VPS hardening + full mail stack + DNS auth** *(est. 2d)*
- OS hardening: ssh keys only, ufw (25/465/587/993/143/4190 + API port allowlisted to platform IP), fail2ban, unattended security upgrades, swap.
- Dockerised mailcow-style stack live: Postfix (submission 587 + smtps 465, virtual mailboxes from DB, Let's Encrypt TLS for `mail.bloomielts.com` + `webmail.bloomielts.com`), Dovecot (IMAP 993, managesieve 4190, per-mailbox quota), Rspamd (DKIM signing, SPF/DMARC checks, rate limits, greylisting), SOGo.
- DNS authentication in the same window: MX → `mail.bloomielts.com`; SPF `v=spf1 mx -all`; DKIM public key published; DMARC `p=quarantine` (→ `p=reject` after warm-up); PTR/rDNS filed with the VPS provider.
- Config committed to an infra repo — reproducible `docker compose up` on a clean VPS.
- **Accept:** a hand-created test mailbox sends/receives externally; STARTTLS verified; MXToolbox shows MX/SPF/DKIM/DMARC/PTR all green — **all inside the first 7 days of the project**.

**E2 (W2→W10) IP warm-up — non-compressible** *(calendar-driven)*
- W2–3: internal + seed-list mail only (Gmail/Outlook/Yahoo seed accounts), <50/day. W4–5: transactional templates, <200/day. W6–8: ramp to expected student sign-up volume. W9–10: full-volume ready; DMARC moved to `p=reject` if reputation clean.
- Weekly deliverability report: mail-tester score, seed-inbox placement, blacklist check (Spamhaus/Barracuda), bounce/complaint rates.
- **Accept (final):** mail-tester ≥9/10; seed inbox placement ≥90%; zero blacklist listings. *(Starts a week earlier than v3.0 — extra warm-up runway before sign-up traffic.)*

**E3 (W5–W6) Mailbox provisioning API** *(est. 2–3d — the critical deliverable)*
- Implement exactly per `mail-provisioning.yaml`: `check_username(localpart)` → available/taken + suggestions; `create_mailbox(localpart, password_hash?, quota?)` → mailbox + credentials (idempotent on `localpart`); `suspend(localpart)` / `unsuspend`; `reset_password(localpart)`; `set_quota(localpart, mb)`; `list_mailboxes(cursor)`; `delete_mailbox` (optional, flagged).
- Auth: bearer token + source-IP allowlist (platform egress only). HTTPS only. Structured errors per contract.
- Deployment: same mail VPS, reverse-proxied behind nginx; logs + request tracing.
- **Accept:** contract test suite (Sahim's mock + Postman collection) green; `create_mailbox` → usable in SOGo/IMAP <30s; duplicate `create_mailbox` returns the documented idempotent response; calls from non-allowlisted IP rejected.

**E4 (W6–W8) SOGo webmail + admin surface** *(est. 1d)*
- SOGo live on `webmail.bloomielts.com` with quotas displayed; minimal admin surface for manual ops (list/add when API is down).
- **Accept:** W8 demo — admin panel button (Sahim's D3.4) → mailbox appears + usable in SOGo.

**E5 (W9–W12) Monitoring, docs, handover, support** *(est. 2d + support window)*
- Monitoring wired into Raja's stack: queue depth, Rspamd stats, disk/quota usage, cert expiry, deliverability alerts.
- Runbook: architecture, DNS records, API usage, common ops (reset, quota, suspend), disaster recovery (mailbox DB backup + restore steps).
- Handover session with Raja (recorded) + **30-day post-go-live support window** for mail-related defects.
- **Accept:** Raja can perform every runbook op unaided; monitoring alerts firing in Raja's dashboard.

### Bikash — final acceptance checklist

1. E3 provisioning API passes the contract test suite (the single hard gate).
2. E2 warm-up done: mail-tester ≥9/10, inbox placement ≥90%, no blacklistings.
3. E1 stack live: real `name@bloomielts.com` mailboxes working over IMAP + SOGo — delivered inside the first 7 days.
4. E5 runbook + handover complete.

*Final acceptance lands at W12; the 30-day support window runs after go-live.*

---

## 6. Raja Sahin — DevOps & Hosting work order

**S1 (W1) Environments + CI/CD** *(est. 3d)*
- App VPS (≥8GB, 16GB recommended): Docker stack — Postgres+pgvector, PgBouncer, Redis, api, web; nginx reverse proxy; TLS; `staging.*` subdomain.
- CI on every PR: ruff+mypy+pytest (api/ai-tutor), eslint+tsc+vitest (web), docker build; auto-deploy to staging on merge to main.
- Daily `pg_dump` backups + uptime probe from day one.
- **Accept:** merge → live on staging; one restore verified.

**S2 (W1) Coordination for Bikash** *(est. 0.5d)*
- Hand Bikash the hostname/IP plan (`mail.*`, `webmail.*`, platform egress IP) **in his first days** so the 2-day setup is unblocked; confirm DNS access path; add mail VPS to the monitoring estate.
- **Accept:** Bikash unblocked — no infra question pending >1 day.

**S3 (W4) Production cutover — website** *(est. 1d)* — prod VPS, `bloomielts.com` domain + TLS, CDN, brotli, uptime probe → website live for Month-1 demo.

**S4 (W6) Backup/restore drill #1** *(est. 0.5d)* — full restore of Postgres + media to a scratch environment; timed.

**S5 (W11–W12) Hardening + go-live** *(est. 4d)*
- Load test with Sahim: hundreds of simultaneous timed mock attempts; PgBouncer/Redis tuning.
- Security pass: RBAC audit, rate limits, dependency scan, secrets review.
- Restore drill #2; monitoring + alert routing; production cutover runbook; ops + handover docs for academy staff.
- **Accept:** load report meets target; restore drill done; platform live on prod.

## 7. Raja Sahin — AI Tutor engine work order

**Concept:** independent deployment + own scaling group; capacity = worker count. AI down ≠ platform down. **Essentials scope (v5.1):** single-worker production for launch cohorts; multi-worker scale-out load-test + expanded eval = post-launch phase.

**A1 (W1–W4) Skeleton + knowledge base** *(est. 8d spread)*
- `ai-tutor/` service: FastAPI gateway (auth, rate limits, SSE streaming) → Redis queue → stateless Python worker pool.
- LangGraph agent graph: profile node (student context from Postgres) → retrieval node (pgvector) → LLM node (streamed).
- Ingestion: Bloom curriculum → chunking → embeddings → pgvector `kb_chunks`; re-indexable job.
- **Accept:** chat request → retrieved-context streamed answer; KB re-index runs.

**A2 (W5–W8) Quality + personalisation + guardrails** *(est. 8d spread)*
- RAG quality pass on Bloom material (chunk/embedding tuning); agent profiles per module (Listening tutor ≠ Writing tutor); guardrails + escalation to a human teacher for off-scope questions.
- Student-profile context node live against platform API (track, CEFR, weak modules, error history); curated eval set + regression harness enforced on every model/prompt change.
- **Accept:** eval set green; answers cite Bloom KB; student context measurably changes responses.

**A3 (W9–W12) Harden + integrate + meter** *(est. 6d spread)*
- Harden `/ai/chat` (rate limits, streaming, fallbacks); per-student usage metering (monthly cost-per-student report — target tracked in the costs annexure); single-worker prod deploy (Essentials).
- Hand the frozen `/ai/chat` to Sahim for the portal chat UI; isolated production deployment.
- **Accept:** tutor live in portal under expected launch load; metering report exists.

---

## 8. Contracts & handoffs — the dependency spine

| Producer | Deliverable | Consumer | Needed by | Contract ref |
|---|---|---|---|---|
| All three | Frozen OpenAPI contracts | All three | **W1 — no exceptions** | `platform/contracts/` |
| Bikash | Mail stack live + DNS auth (E1) | Warm-up calendar + test mailboxes | **Within the first 7 days** | infra repo + MXToolbox green |
| Bikash | Mail provisioning API (E3) | Sahim → D3.4 admin controls, D5.1 student registration | **W6** | `mail-provisioning.yaml` |
| Bikash | Warm-up + deliverability (E2) | Go-live quality | W10–11 report | mail-tester ≥9/10 |
| Raja | `/ai/chat` hardened (A3) | Sahim → D5.6 chat UI | **W11** | `ai-chat.yaml` |
| Raja | Staging/prod environments | Sahim | ahead of every phase | runbook |
| Raja | Hostname/IP plan + DNS path | Bikash | **Day 1–3 of W1** | S2 |
| Client | Domain + DNS, VPS×2, WAISE creds, Razorpay KYC, curriculum | Everyone | W1 / W1 / W1–2 / W6 / rolling→W4 | §9 |

- **Exam engine** is one codebase: teacher exam builder (D4.2, W9) publishes into the same engine student mocks use (D5.3, W11).
- Sahim builds against contract stubs from W1 — he never waits on the real mail/AI service.

## 9. Client dependencies (chase early — they gate real work)

| Item | Needed by | Gates |
|---|---|---|
| Domain + DNS access (bloomielts.com) | Day 1–3 of W1 | Deploys, SSL, **Bikash's mail DNS records** |
| VPS purchases (app + mail — specs per costs annexure) | W1 | Staging/prod + Bikash's 2-day setup |
| WAISE.in Professional + API credentials | W1–2 | Every WhatsApp feature |
| Razorpay/Cashfree merchant KYC | W6 | Payments (D5.5) |
| Curriculum content — notes, model answers, question banks, audio | Rolling; bulk by W4 | AI knowledge base + library |

## 10. Milestone ↔ owner map

| Milestone | Modules demoed | Primary owner(s) |
|---|---|---|
| W1 exit | Foundations + contracts frozen + **mail stack already live** | All three |
| Month-1 demo | Website + CMS live (D2.x) | Sahim + Raja (S3) |
| Month-2 demo | Admin panel + Teachers + **mailbox provisioning (E3/E4)** | Sahim + **Bikash** |
| Month-3 go-live | Student panel + AI Tutor + WhatsApp set | Sahim + Raja (+ Bikash handover) |

## 11. Risk watchlist

- **Single-dev bandwidth (Sahim)** — W10–12 densest; weekly demos catch slippage; scope changes never absorbed silently.
- **Mail deliverability** — new IP/domain lands in spam without warm-up; E2 starts W2 (right after the 2-day setup) and cannot be compressed. Bikash's weekly report is the early-warning.
- **Outsourced handoff (Bikash)** — mitigated by: frozen contract, contract test suite as the acceptance gate, documented runbook, 30-day support window — and Bikash has run this exact setup before, so build risk is low.
- **Content dependency** — AI tutor + library need curriculum; escalate if the W4 bulk handover slips.
- **Exam-day load** — mock engine load-tested W11 before go-live.

---

*Techfly Engineering · v3.1 · 18 September 2026 — supersedes v3.0. Changes vs v3.0: **all pricing/commercial terms removed — work orders carry tasks only** (terms live in Proposal v5.1 + the costs annexure); **email-engine work now starts within the first 7 days of the project**, with Bikash's **2-day setup burst** landing in W1 and IP warm-up starting W2 (a week earlier than before); **Bikash joins as an outsourced partner who already knows this exact mail-stack setup**. Companion docs: Proposal v5.1 · External & Running Costs annexure · FMAHTML prototype = functional spec.*
