# Proposal — Future Meds Academy Digital Learning Platform

**Prepared for:** Future Meds Academy
**Prepared by:** Paperclip Engineering
**Date:** 15 September 2026
**Version:** 1.0 — for client review

---

## 1. Executive Summary

Future Meds Academy has already produced a complete, high-fidelity front-end prototype of its learning platform — a public website, a student portal, faculty tools, and a 38-section administration suite covering admissions, academics, fees, exams, and communications.

We propose to rebuild this prototype as a **production-grade, scalable web platform** — with a real backend, secure authentication, and three new capabilities the academy has requested:

1. **Institutional student email IDs** — every registered student gets their own `@futuremeds.academy`-style email address, with Gmail-style availability checking at sign-up.
2. **An always-on AI Tutor** — a dedicated, independently scalable service trained on the academy's own curriculum.
3. **WhatsApp Business API integration** — enquiries, enrolment confirmations, class reminders, fee receipts and results delivered on WhatsApp.

---

## 2. What Exists Today (Prototype Audit)

The delivered HTML bundle is a **complete functional specification** of the product:

| Area | Coverage in prototype |
|---|---|
| Public website | Home, About, Courses & Pricing, IELTS/Medical/Abroad pages, Blog, Results, Careers, Contact — all CMS-driven |
| Student portal | Dashboard, live classes, schedule, study planner (PDF export), library/textbooks, flashcards, quiz lab, doubt-solving, mock exams, progress analytics |
| Skills engine | Reading / Listening / Writing / Speaking labs, vocabulary & grammar trainers, CEFR levels, IELTS-TOEFL-PTE-OET score concordance |
| Faculty tools | Teaching planner, class roster, content manager, exam builder |
| Admin suite | Admissions & student records, document checklists, attendance, fees/receipts/subscriptions, email centre, reminders, mock-exam management, RBAC, analytics, website CMS, enquiry inbox |
| Integrations (stubbed) | WhatsApp enquiry alerts, email templates, live-class scheduling |

**Important:** the prototype has no server — all data lives in the visitor's browser. The design system, user journeys and domain models are reusable; the application itself must be rebuilt on a real stack.

---

## 3. Proposed Solution

### 3.1 Technology Stack (scalable, mainstream, easy to hire for)

| Layer | Choice | Why |
|---|---|---|
| Web frontend | **Next.js (React) + TypeScript** | SEO-friendly public site + fast app shell; largest talent pool in India |
| Mobile-ready | Responsive PWA now; React Native app optional later | 70%+ of Indian students are mobile-first |
| Backend API | **Node.js (NestJS) or Python (FastAPI)** | Modular monolith → services can split as load grows |
| Database | **PostgreSQL** (+ Redis cache/queues) | Reliable, cheap to host, handles exam/attempt data well |
| File storage | **S3-compatible object storage** + CDN | Lectures, PDFs, recordings |
| AI Tutor | **Separate service** — LLM API (GPT/Claude) with RAG over FMA content (pgvector) | Scales independently; per-student context |
| Auth | JWT + OTP (phone/email), role-based access | Student / Faculty / Admin roles already in the design |
| Email IDs | Google Workspace / Zoho Mail API, **or** self-hosted mail (mailcow) | See §3.3 |
| WhatsApp | **WhatsApp Business Cloud API** (direct Meta, or via Interakt/WATI/AiSensy) | See §3.4 |
| Payments | **Razorpay / Cashfree** (UPI, cards, EMI) | Standard for Indian ed-tech |
| Infra | Docker containers on AWS Mumbai / DigitalOcean Bangalore; CI/CD, monitoring, daily backups | Start ~₹15–25k/month, scale on demand |

### 3.2 How the platform will work

- **Public website + CMS** — marketing pages managed by staff from the admin panel (as in the prototype's Website Content section).
- **Student portal** — everything in the prototype becomes real: enrolment → student record → batches → live & recorded classes → planner → flashcards/quizzes → mocks → progress reports.
- **Admin suite** — admissions pipeline, document checklists, attendance, fee ledger with receipts & reminders, email centre, RBAC, analytics.

### 3.3 Student Email-ID System (requested feature)

At registration the student picks a username; the UI checks availability **live** (Gmail-style "username is taken / available" with suggestions). On confirmation the system provisions a real mailbox:

`studentname@futuremeds.academy`

**Two implementation options:**

| Option | How it works | Cost |
|---|---|---|
| **A — Google Workspace / Zoho Mail (recommended)** | API creates a real hosted mailbox; student can use Gmail/Zoho web & mobile apps | ~₹130–250 per student/month |
| **B — Self-hosted mail server** | We run a mail server (mailcow/Postfix) on the academy's domain; unlimited mailboxes | ~₹3–6k/month server + maintenance |
| **C — Platform mailbox (budget option)** | Email-style login ID + in-platform inbox/notifications; outbound mail only, no real inbox | Included |

Recommended: **B** for a large student base, **A** if the academy wants zero mail-ops and full Gmail experience.

### 3.4 AI Tutor (requested feature — separate, always-on, scalable)

- A **dedicated microservice**, isolated from the main app, so it scales and is billed independently.
- LLM-powered chat trained on the academy's own material via **RAG**: textbooks, lecture notes, past-paper explanations, error patterns — the tutor answers *from FMA's curriculum*, not generic internet text.
- Knows each student's profile: level, target exam, weakest topics, error history (the prototype already models this).
- Horizontally scalable: stateless workers behind a queue; streaming responses; per-student rate limits; usage metering so cost per student is predictable (~₹30–80/student/month at typical usage with a paid LLM API; lower with open models).
- Can later power auto-graded writing/speaking feedback and personalised revision plans.

### 3.5 WhatsApp Business API (requested feature)

- Official **WhatsApp Business Cloud API** (Meta-verified sender, green-tick ready).
- Automated notifications: enquiry follow-up, admission confirmation, class reminders, fee receipts, mock-exam results, document checklist nudges.
- Two-way: students reply on WhatsApp → lands in the admin inbox; optional FAQ chatbot.
- Template management inside the admin panel (the prototype's Email Centre extends to WhatsApp).
- Cost: Meta conversation pricing (~₹0.30–0.80 per conversation in India) or a flat-rate reseller plan.

---

## 4. Delivery Plan

| Phase | Scope | Duration |
|---|---|---|
| **Phase 0 — Foundation** | Requirements sign-off, infra, auth + RBAC, student email-ID system | 3–4 weeks |
| **Phase 1 — Core LMS (MVP)** | Website + CMS, student records/admissions, batches, schedule, fees & receipts, enquiry inbox + WhatsApp notifications | 6–8 weeks |
| **Phase 2 — Learning engine** | Content library, planner, flashcards, quiz lab, exam builder, mocks, results & analytics | 6–8 weeks |
| **Phase 3 — AI & automation** | AI Tutor service, auto-reminders, advanced analytics, performance hardening | 4–6 weeks |

**Total: ~5–6 months** to full platform; MVP usable from ~week 10.

**Team:** 1 PM/architect, 2 full-stack engineers, 1 front-end engineer, 1 AI/integration engineer, shared QA & DevOps.

---

## 5. Investment (Indian mid-size client budget)

### One-time build cost

| Package | Scope | Price (INR) |
|---|---|---|
| **Launch** | Phases 0–1: platform core, website, admissions, fees, student email IDs, WhatsApp notifications | **₹9 – 12 lakh** |
| **Professional** | Launch + Phase 2 learning engine (mocks, quizzes, planner, analytics) | **₹16 – 21 lakh** |
| **Flagship** | Everything incl. AI Tutor service + advanced automation | **₹22 – 30 lakh** |

*(≈ USD 11k / 19–25k / 26–36k. Recommended for this scope: **Professional → Flagship**, phased so the academy starts earning on Phase 1 while later phases build.)*

### Monthly running cost (estimate, at ~500–2,000 active students)

| Item | INR/month |
|---|---|
| Cloud hosting + DB + storage + CDN | ₹15,000 – 40,000 |
| Student mailboxes (self-hosted) | ₹4,000 – 8,000 |
| AI Tutor LLM usage | ₹15,000 – 60,000 (scales with usage) |
| WhatsApp conversations | ₹3,000 – 15,000 |
| Maintenance & support (AMC) | ₹25,000 – 50,000 |

Payment terms suggested: 30% advance, 30% at MVP, 25% at Phase 2, 15% on go-live. 3 months post-launch support included; AMC thereafter.

---

## 6. Why this approach

- The prototype removes the biggest project risk — **unclear requirements**. Every screen is already decided; we build exactly what the academy designed, on infrastructure that survives real traffic.
- Modular stack = each piece (AI tutor, WhatsApp, email) can be turned on per phase without rewrites.
- Email IDs + AI tutor + WhatsApp are genuine differentiators vs. off-the-shelf LMS products (Teachable/Graphy/Moodle), which offer none of the three natively.

## 7. Assumptions & Exclusions

- Content (questions, notes, videos) is provided by the academy; we build the tools to manage it.
- Domain + Meta/WhatsApp Business verification owned by the academy (we assist).
- Live-class delivery via integrated provider (Zoom/Google Meet/own WebRTC — quoted separately if custom WebRTC is required).
- Mobile native apps, if needed, are a follow-on phase (PWA covers launch).
- Prices exclude GST.

---

*Prepared by the Paperclip engineering team — happy to walk the academy through the prototype audit and phase plan on a call.*
