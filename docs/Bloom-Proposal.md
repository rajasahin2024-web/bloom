# Proposal — Bloom Academy IELTS Learning Platform

**Prepared for:** Bloom Academy (Bloom IELTS Academy)
**Prepared by:** Techfly Engineering
**Date:** 16 September 2026
**Version:** 5.1 — repriced to the client's ₹2.7L structure (₹2,50,000 package · Mail Engine setup ₹20,000 extra · 3-month delivery · external/running costs in a separate annexure)

---

## 1. Executive Summary

Bloom Academy has already produced a complete, high-fidelity front-end prototype of its IELTS preparation platform — a public website, a student portal covering every IELTS module, faculty tools, and a full administration suite.

We propose to rebuild this prototype as a **production-grade, scalable web platform** — with a real backend, secure authentication, and three capabilities the academy has requested:

1. **Institutional student email IDs on a custom mail server** — every registered student gets their own `@bloomielts.com`-style mailbox, provisioned on a dedicated mail server we build and operate for the academy, with Gmail-style live availability checking at sign-up.
2. **An always-on AI Tutor ("Bloom AI Tutor")** — a dedicated Python service built on a **parallel development track**, RAG + LangGraph based, trained on Bloom's own IELTS curriculum (Essentials scope at this budget — see §3.5).
3. **WhatsApp automation via WAISE.in** — enquiries, enrolment confirmations, class reminders, fee receipts and results delivered on WhatsApp through the WAISE WhatsApp Business platform (Professional yearly plan).

**Package price: ₹2,50,000 (all development) + one-time Mail Engine setup ₹20,000 — total engagement ₹2,70,000** — delivered in **3 months** with staged module deliveries (Website → CMS Admin → LMS Admin → Teachers Panel → Student Panel), while a second engineer builds the Bloom AI Tutor in parallel.

**All third-party / running costs** (VPS hosting, domain, WAISE subscription, Meta conversation charges, LLM API usage, storage/CDN, payment-gateway fees) are **paid directly by the academy at actuals** and are listed separately in the companion document **`Bloom-External-Costs` annexure** — they are not part of the ₹2.5L package.

---

## 2. What Exists Today — Bloom Prototype Audit

The delivered `FMAHTML` bundle contains the complete Bloom Academy product as a **working functional specification** (the bundle also contains an unrelated "FMA Admin" medical-admissions suite, which is out of scope for this proposal).

### 2.1 Public website (CMS-driven)

Home, About, Courses & Pricing, IELTS explainer, Medical/OET, Study Abroad, Blog, Results, Careers, Contact, Login — every page served from a CMS, with complete SEO plumbing (Open Graph, JSON-LD `EducationalOrganization` schema, sitemap, robots.txt, PWA manifest) and an enquiry inbox wired to a WhatsApp alert stub.

### 2.2 Student portal — every IELTS module

The portal is organised around the **real IELTS paper structure** — a 15-part module map that governs the library, lectures, practice labs and mock exams:

| Module | Parts in prototype | What students get |
|---|---|---|
| **Listening** | Part 1–4 (form completion → academic lecture) | Audio-based practice per part, map/matching drills, lecture-comprehension sets |
| **Reading** | Passage 1–3 + General Training (`rgt`) | Timed passages, matching-headings / YNNG question types, GT workplace texts |
| **Writing** | Task 1 (report/letter) + Task 2 (essay) | Guided task practice, model answers, five essay question types |
| **Speaking** | Part 1 interview · Part 2 cue card · Part 3 discussion | Cue-card practice, fluency drills, part-wise band descriptors |
| **Grammar & Vocabulary** | `gv` — underpins all four skills | Vocabulary lab, grammar trainer (Lexical Resource + Grammatical Range = half the W/S marks) |
| **Exam Strategy** | `strategy` — timing, transfer, test day | Test-day checklists, timing plans |

Around this module map the portal already models:

- **Placement test + onboarding** — CEFR-level estimate on entry
- **Mock exams** — full timed mocks with band-score reporting; the same shell already carries TOEFL iBT (120 pt), PTE Academic (90 pt) and Duolingo (160 pt, adaptive) engines, so multi-exam expansion is designed-in
- **Exam tracks** — staff assign each student a track (`ielts-a`, `ielts-g`, `toefl`, `pte`, `duolingo`, `cambridge`, `oet`); the portal reconfigures mocks, school parts and practice content to match, and the student cannot override it
- **Study planner** — weighted day-by-day plan generated from the student's weakest module, PDF export
- **Skill labs** — Reading / Writing / Speaking / Vocabulary / Grammar trainers
- **Live classes & schedule** — class timetable, in-portal meeting rooms
- **Bloom Tutor** — AI-tutor chat UI (currently simulated — see §3.5)
- **1-on-1 tutoring booking** — human teacher slots
- **Library** — 17 downloadable materials, 12 seeded lectures, 13 audio tracks, all organised by IELTS part
- **Progress & English Profile** — band trajectory, weakest-module detection, score concordance (IELTS↔TOEFL↔PTE↔Duolingo↔Cambridge↔OET)

### 2.3 Faculty & admin suite

- **Faculty (Teachers Panel):** teaching planner, live teaching console, class roster, content manager, exam builder
- **Admin:** overview dashboard, admissions & student records, communications, academic, finance (fees/receipts/subscriptions/reminders), personnel & HR documents, content manager, exam builder, operations, analytics, exam-track assignment, website CMS, enquiry inbox, WhatsApp alerts

### 2.4 Engineering reality

**Important:** the prototype has no server — every screen runs in the browser and all data lives in `localStorage` (demo login `bloom2026` is hardcoded; the "AI Tutor" returns canned rule-based replies; WhatsApp is a webhook stub). The design system, user journeys and domain models are excellent and reusable — the application itself must be rebuilt on a real stack.

---

## 3. Proposed Solution

### 3.1 Technology stack — fixed per client specification

| Layer | Choice | Why |
|---|---|---|
| Web frontend (all panels + portal) | **React + Vite + TypeScript** | Fast SPA for the portal and all admin/teachers panels; huge talent pool |
| Public website | **React + Vite with SSR/prerendered pages** | Same stack, SEO preserved (sitemap, schema, OG all carried over) |
| Backend API | **FastAPI (Python)** | Single Python ecosystem across platform API and AI services; async-first, high throughput |
| Database | **PostgreSQL** | Reliable, cheap to host, suits exam/attempt data |
| DB optimisation | **PgBouncer** | Connection pooling in front of Postgres — keeps the DB stable under exam-day traffic spikes |
| Vector search / embedded learning | **pgvector** (inside PostgreSQL) | Embedding store for the AI Tutor's knowledge base — no separate vector DB to run |
| Cache + queue | **Redis** | Sessions, rate limits, and the job queue feeding the AI worker |
| AI Tutor | **Python service + LangGraph + RAG** | Dedicated deployable service — see §3.5 |
| File storage | S3-compatible object storage + CDN | Audio tracks, PDFs, lecture recordings |
| Auth | JWT + OTP (phone/email), role-based access | Student / Teacher / Admin roles already in the design |
| **Email IDs** | **Custom self-hosted mail server** (Postfix + Dovecot stack) on academy domain | See §3.4 — architecture included |
| WhatsApp | **WAISE.in — Professional yearly plan** | See §3.6 |
| Payments | Razorpay / Cashfree (UPI, cards, EMI) | Standard for Indian ed-tech |
| Infra | Docker on cloud VPS (AWS / DigitalOcean), CI/CD, monitoring, daily backups | Starts lean, scales on demand |

### 3.2 How the platform will work

- **Public website + CMS** — marketing pages managed by staff from the admin panel, exactly as the prototype's Website Content section works today.
- **Unified Admin Panel** — the website CMS is **merged into the LMS admin panel**: one operations suite covering admissions, student records, fees, communications, exam tracks, personnel, analytics **and** website content — a single admin surface instead of two.
- **Teachers Panel** — faculty planner, live teaching console, class roster, content manager, exam builder.
- **Student Panel** — enrolment → student record → exam-track assignment → placement → personalised study plan → skill labs → live & recorded classes → mocks → band-score progress reports. Every screen in the prototype becomes real.

### 3.3 Student Email-ID System — custom mail server (requested feature)

At registration the student picks a username; the UI checks availability **live** — Gmail-style "taken / available" with suggestions. On confirmation the system provisions a **real mailbox**:

`studentname@bloomielts.com`

### 3.4 Mail Server — Architecture Design

The email system runs on a **dedicated mail VPS**, isolated from the application server, built on the standard open-source mail stack (mailcow-style: Postfix + Dovecot + Rspamd + SOGo, dockerised):

```
┌──────────────────────────────┐        ┌─────────────────────────────────────────────┐
│  Bloom Platform (app VPS)    │        │  Dedicated Mail VPS — academy domain        │
│                              │        │                                             │
│  Student registration        │        │  ┌───────────────────────────────────────┐  │
│   └─ live availability check │──API──▶│  │ Mail Provisioning API (our service)  │  │
│      "username taken/free"   │        │  │  - create / suspend / reset mailbox  │  │
│   └─ confirm username        │──API──▶│  │  - quota per student                 │  │
│                              │        │  └───────────────┬───────────────────┘  │
│  Admin panel controls        │──API──▶│                  ▼                      │
│  (suspend / reset / quota)   │        │  ┌───────────────────────────────────────┐│
│                              │        │  │ Postfix (SMTP)  ·  Dovecot (IMAP/POP3)││
│                              │        │  │ Rspamd (spam)   ·  SOGo (webmail)     ││
│                              │        │  │ Mailbox DB      ·  DKIM signing       ││
│                              │        │  └───────────────────────────────────────┘│
└──────────────────────────────┘        └─────────────────────────────────────────────┘
              DNS on academy domain: MX · SPF · DKIM · DMARC · PTR (rDNS)
```

- **Flow:** student picks username → platform calls the provisioning API → mailbox created in seconds → credentials issued → student uses **webmail (SOGo)** or any mail app via **IMAP/SMTP**.
- **Deliverability by design:** DKIM/SPF/DMARC signing, PTR record, IP warm-up and rate limits so academy mail lands in inbox, not spam.
- **Unlimited mailboxes** — cost is the server, not per-student licensing. At thousands of students this is dramatically cheaper than per-seat Google Workspace (₹130–250/student/month), and the academy owns the infrastructure.
- **Admin controls from inside the platform:** suspend/reset mailbox, storage quota per student, alumni-mailbox policy.
- **Isolation:** mail VPS is separate from the app VPS — a mail IP issue can never take the learning platform down (and vice-versa).

**Pricing:** the one-time Mail Engine setup is a **separate one-time charge of ₹20,000, billed outside the ₹2.5L package** (mail server build, provisioning API, webmail, admin controls, DNS/deliverability configuration) — bringing the total engagement to **₹2,70,000**. The mail VPS itself is a running cost (~₹3,000–5,000/month) paid directly by the academy — see the External Costs annexure — flat regardless of student count.

### 3.5 Bloom AI Tutor — Architecture Design (parallel track, Essentials scope)

The AI Tutor is a **fully RAG + LangGraph** service, developed on a **parallel track** alongside the main platform, and designed so capacity grows by adding workers:

```
┌────────────────────────────────────────────────────────────────────────┐
│  Bloom AI Tutor service (independent deployment, own scaling group)     │
│                                                                        │
│  Student chat / portal request                                         │
│        ▼                                                               │
│  FastAPI gateway ──▶ Redis queue ──▶ Python worker(s) (scale-out       │
│   (auth, rate limits,                   ready: add workers as usage     │
│    streaming)                           grows)                         │
│                                            ▼                           │
│                              LangGraph agent graph                     │
│                               ├─ Profile node: student context from    │
│                               │   Postgres (track, CEFR level, weak    │
│                               │   modules, error history)              │
│                               ├─ Retrieval node: pgvector search over  │
│                               │   Bloom knowledge base                 │
│                               └─ LLM node: answer generation           │
│                                  (streamed back to student)            │
│                                                                        │
│  Knowledge-base pipeline: Bloom curriculum (notes, model answers,      │
│  band descriptors, question banks) ─▶ chunking ─▶ embeddings ─▶        │
│  pgvector index  ·  re-indexable as content grows                      │
└────────────────────────────────────────────────────────────────────────┘
```

- **AI Agent profiles** — the tutor is configured as a proper agent: persona, teaching style, guardrails, per-module expertise (a Listening tutor vs. a Writing tutor behave differently).
- **Knowledge base** — Bloom's own material embedded into pgvector; the tutor answers *from Bloom's IELTS curriculum*, not generic internet text.
- **Embedded learning** — the tutor reads each student's live profile (exam track, band trajectory, weakest module, attempt history) and adapts answers and difficulty accordingly.
- **Training & evaluation** — curated Q&A/eval set built from Bloom material so answer quality is verified before go-live.
- **Scale-out ready** — stateless workers behind a Redis queue; the Essentials build ships with a single-worker deployment sized for launch cohorts, and adding workers is an ops action, not a rebuild. Usage metering per student keeps cost predictable (~₹30–80/student/month on paid LLM APIs; lower with open models).
- **Isolated & always-on** — separate deployment and billing from the main app; if the AI service is busy or down, the platform stays up.

**Essentials scope at this budget:** the ₹2.5L package delivers the production RAG tutor above — grounded answers from Bloom's curriculum, per-student context, guardrails and metering. The expanded items (multi-worker load-testing at scale, extended eval suites, auto-graded writing/speaking feedback) are scoped as a post-launch phase so the budget stays at ₹2.5L.

### 3.6 WhatsApp — WAISE.in platform (requested feature)

WhatsApp automation runs on **WAISE.in** (AI-enabled WhatsApp engine, Meta-verified tech provider) — the academy's own WAISE subscription, integrated into the platform by us:

- Official **WhatsApp Business API** through WAISE (Meta-verified sender).
- Automated notifications: enquiry follow-up, admission confirmation, class reminders, fee receipts, mock-exam results, document-checklist nudges.
- Two-way: student replies on WhatsApp land in the WAISE shared inbox / CRM; AI auto-routing and FAQ bot included in WAISE plans.
- Template management and broadcast campaigns run from WAISE's own dashboard (included in the plan); enquiry inbox inside the Bloom admin panel syncs via WAISE API/webhooks.
- **Required from initial development** — the WAISE account/API access is needed in Month 1 so we can prepare and test the platform's WhatsApp endpoints against the real API.

**Subscription — taken separately by the academy:** **WAISE.in Professional yearly plan — ₹7,500/year** (3 users, up to 10,000 messages/month — sized for academy volumes). Other tiers available: Starter ₹5,999/yr (1 user, 5,000 msgs/mo), Enterprise ₹12,999/yr (unlimited). Meta conversation charges are paid directly to Meta at standard rates — WAISE adds no markup on messaging. Full external-cost breakdown in the **`Bloom-External-Costs` annexure**.

Our development scope covers WAISE account setup assistance, sender verification, the core notification template set, and platform↔WAISE integration (API + webhooks) — included in the ₹2.5L package.

---

## 4. Delivery Plan — 3 Months, Staged Module Deliveries

Modules are delivered **in the client's required order**, each stage ending with a demo + acceptance checkpoint. The **Bloom AI Tutor is built in parallel by the second engineer** across all three months, so it never gates the main deliveries.

### Main track (platform)

| Stage | Module delivered | Detail |
|---|---|---|
| **Stage 1 (Month 1)** | **Public Website** | Server/VPS setup, domain + SSL, all public pages rebuilt and live on the real domain, enquiry form → WhatsApp alert, SEO plumbing. **Website live from Month 1.** WAISE account activated — WhatsApp endpoints prepared against the real API. |
| **Stage 2** | **CMS Admin Panel** | Staff CMS for all website content, blog, results, media — exactly as the prototype's Website Content section. |
| **Stage 3 (Month 2)** | **LMS Admin Panel** *(CMS merged in)* | One unified admin suite: admissions & student records, fees/receipts/subscriptions/reminders, communications, exam tracks, personnel, analytics — **with the CMS merged into the same panel**. Mail server set up here → student email-ID provisioning goes live. |
| **Stage 4** | **Teachers Panel** | Faculty planner, live teaching console, class roster, content manager, exam builder. |
| **Stage 5 (Month 3)** | **Student Panel + go-live** | Student login/auth + `@bloomielts.com` email ID at registration, dashboard, all module labs (L/R/W/S + GV), placement, mocks + band analytics, study planner, library, live classes, progress. Final QA/performance pass, production go-live, staff handover training. |

### Parallel track (AI engineer — Bloom AI Tutor)

| Month | AI Tutor progress |
|---|---|
| Month 1 | Service skeleton (FastAPI + Redis queue + worker), LangGraph agent graph, knowledge-base ingestion pipeline, first embeddings into pgvector |
| Month 2 | RAG quality pass on Bloom curriculum, student-profile context node, agent profiles & guardrails, eval-set checks |
| Month 3 | `/ai/chat` hardened + metered, integration into Student Panel, go-live with the platform |

**Total delivery time: 3 months** from kickoff to full go-live.

**Team:** 1 architect/PM (part-time), 1 full-stack engineer on the main track, 1 engineer on DevOps + mail server + the parallel AI track, shared QA.

---

## 5. Investment — ₹2,70,000 total (₹2.5L package + ₹20K Mail Engine setup)

### 5.1 Package breakdown — divided by core module

| Core module | Scope | Price (INR) |
|---|---|---|
| Public website + CMS frontend | All public pages, enquiry inbox, SEO, domain/SSL deployment | ₹40,000 |
| Unified Admin Panel (CMS + LMS merged) | Website CMS + admissions, student records, fees/receipts/subscriptions, communications, exam tracks, personnel, analytics | ₹60,000 |
| Teachers Panel | Teaching planner, live console, roster, content manager, exam builder | ₹30,000 |
| Student Panel + IELTS learning engine | Auth/RBAC, dashboard, all module labs, placement, mocks + band analytics, study planner, library, live classes, progress | ₹80,000 |
| Bloom AI Tutor service (parallel track, Essentials) | FastAPI gateway + worker, LangGraph + RAG on pgvector, agent profiles, knowledge base, eval set, metering | ₹30,000 |
| WhatsApp integration | WAISE.in setup + sender verification, core notification templates, platform↔WAISE API/webhooks | ₹10,000 |
| **Package subtotal — all development** | | **₹2,50,000** |
| Mail Engine setup (one-time, **extra**) | Mail stack (Postfix + Dovecot + Rspamd + SOGo) on academy domain, provisioning API, webmail, SPF/DKIM/DMARC + PTR, admin controls | ₹20,000 |
| **Grand total** | | **₹2,70,000** |

### 5.2 Payment milestones — distributed across the 3 months

| Milestone | Trigger | Amount (INR) |
|---|---|---|
| Booking advance | Project kickoff, infrastructure & environment setup | ₹50,000 |
| Month 1 delivery | Public website live + CMS admin panel | ₹55,000 |
| Month 2 delivery | Unified LMS admin panel + Teachers Panel + student email IDs live | ₹85,000 |
| Mail Engine setup (one-time extra) | Billed with Month 2 — mail server configured, student email-ID provisioning live | ₹20,000 |
| Month 3 delivery | Student Panel + Bloom AI Tutor + WhatsApp automation + go-live | ₹60,000 |
| **Total** | | **₹2,70,000** |

3 months post-launch support included; optional AMC thereafter (see annexure).

### 5.3 External / running costs — separate annexure

Every third-party and running cost is **paid directly by the academy at actuals** and is intentionally **kept out of this package price**. The full itemised list — domain, app VPS, mail VPS, WAISE subscription + Meta conversation charges, LLM API usage, storage/CDN, payment-gateway fees, optional AMC — lives in the separate document **`Bloom-External-Costs` (annexure)** so this proposal shows exactly one package number — **₹2,50,000** — plus the single extra Mail Engine setup line (₹20,000): **total engagement ₹2,70,000**.

*Scope note:* this price assumes the delivered prototype as the agreed functional spec; new features beyond it are quoted as change requests.

### Optional add-ons (not in the package)

- Native iOS/Android apps (PWA covers launch) — quoted separately
- Custom WebRTC live-class rooms (default: Zoom/Google Meet integration) — quoted separately
- AI Tutor scale-out phase: multi-worker load-test at scale, expanded eval suites, auto-graded writing/speaking feedback, personalised revision engine — post-launch phase, quoted separately

---

## 6. Challenges in a project this size — and how the Techfly team manages them

A platform spanning a public website, three role-based panels, a custom mail system, WhatsApp automation and a standalone AI service is a large build. These are the real challenges, and how we handle each:

| Challenge | How Techfly manages it |
|---|---|
| **Breadth of scope** — 6 modules + AI + mail + WhatsApp in 3 months | Module-wise contract: the delivered prototype is the spec, each stage has a demo + acceptance checkpoint, scope changes are quoted separately — no silent scope creep |
| **Fixed budget** — full platform scope inside ₹2.5L, mail setup as one extra line | Lean two-engineer split (application vs DevOps+AI), Essentials-scoped AI Tutor, no redundant tooling — trade-offs are listed openly in §3.5 and §5 instead of hidden |
| **Parallel development** — AI Tutor built alongside the main platform | Shared API contracts first: the platform↔AI and platform↔WAISE interfaces are frozen in Month 1 (OpenAPI schemas), so the two tracks never block each other |
| **Email deliverability** — a new mail server can land in spam | Dedicated IP + full DNS auth (SPF/DKIM/DMARC/PTR), IP warm-up schedule, sending-rate limits, and deliverability monitoring from day one |
| **AI answer quality** — a tutor that answers wrongly damages trust | RAG restricted to Bloom's own knowledge base, curated eval sets, guardrails + escalation to human teachers for off-scope questions |
| **Exam-day load spikes** — hundreds of students in timed mocks simultaneously | PgBouncer pooling, Redis caching, load-tested mocks module, and service isolation so AI traffic can never starve exam traffic |
| **Data safety** — student records, fees, results | Daily automated backups + tested restore runbook, RBAC on every admin action, audit logs on finance/records |
| **Team coordination at this scale** | Single architect/PM as the client's one point of contact, weekly progress demos, code review on every merge, CI/CD with staging environment — the client's team sees progress every week, not just at month-ends |

## 7. Why this approach

- The prototype removes the biggest project risk — **unclear requirements**. Every screen and every IELTS module is already decided; we build exactly what the academy designed, on infrastructure that survives real traffic.
- **Website-first delivery** means the academy is live and visible from Month 1 — enrolment enquiries can start while the panels are being built.
- **Merging the CMS into the LMS admin** gives staff one panel to learn instead of two — less training, fewer permission mistakes.
- **Custom mail server** means unlimited student email IDs at flat cost — the academy owns the system instead of renting per-seat licences forever.
- **A parallel AI track** means the Bloom AI Tutor gets a specialist's attention — proper RAG + LangGraph on Bloom's curriculum — without slowing the platform, and Essentials scope keeps it inside the ₹2.5L budget.
- **WAISE.in for WhatsApp** gives a ready, Meta-verified platform with CRM, AI routing and broadcasts — cheaper and faster than building messaging infrastructure from scratch, and the academy controls the subscription directly.
- Student email IDs + a curriculum-trained AI tutor + WhatsApp automation are genuine differentiators vs. off-the-shelf LMS products (Teachable/Graphy/Moodle), which offer none of the three natively.

## 8. Assumptions & Exclusions

- Content (questions, notes, videos, audio) is provided by the academy; we build the tools to manage it.
- Domain, DNS access, WAISE.in subscription, and Meta/WhatsApp Business verification are owned and paid by the academy (we assist with setup).
- Prices exclude GST. Third-party costs (WAISE subscription, Meta conversation fees, VPS, LLM API, storage/CDN, gateway fees) are billed at actuals by the respective providers — itemised in the `Bloom-External-Costs` annexure.

---

*Prepared by the Techfly engineering team — happy to walk the academy through the prototype audit and milestone plan on a call.*
