# FMAHTML — In-Depth Technical Analysis

**Project:** Future Meds Academy (FMA) + Bloom IELTS Academy — front-end prototype
**Location:** `/project/bloom/FMAHTML` — 124 files, ~64 MB, 48 JS modules (~19,500 LOC), 16 HTML pages
**Nature:** 100% static HTML/CSS/JS. No backend, no database, no real auth. All state is seeded JavaScript objects persisted to `localStorage`. Demo password `bloom2026` is hardcoded.

---

## 1. What the client actually delivered

The client did **not** just hand over a landing page. The bundle contains **two full product prototypes**:

### A. Bloom IELTS Academy (public website + student/teacher/admin platform)

**Public marketing site** — `index.html`, `about.html`, `courses.html`, `ielts.html`, `medical.html`, `abroad.html`, `blog.html`, `results.html`, `careers.html`, `contact.html`, `login.html`, `site-admin.html`
- Full CMS-driven site: every page reads content through `cms()` from `bloom-cms-data.js` (blogs, faculty, pricing, testimonials, university lists)
- SEO plumbing already present: `sitemap.xml`, `robots.txt`, canonical/OG meta, `manifest.webmanifest`, favicon/app icons
- Enquiry form → enquiry inbox → **WhatsApp alert stub** (`bloom-sitecms.js` "waset" section): POSTs enquiry JSON to a configurable webhook (Zapier/Make/n8n → WhatsApp Cloud API / Twilio). Currently deep-link/manual only — no real API wired.

**Student platform** — `Bloom.html` (single-page app shell, role-aware nav)
- Learn: Dashboard, Live Classes, My Schedule, School/Library, My Study Plan, **Bloom Tutor (simulated AI tutor)**, 1-on-1 Tutoring
- Skills labs: Reading, Listening, Writing Lab, Speaking Lab, Vocabulary, Grammar
- Exam: Mock Tests, My Progress, English Profile, Settings
- Placement test + onboarding flow, CEFR levels, IELTS/TOEFL/PTE/Duolingo/Cambridge/OET exam tracks with band↔score concordance

**Teacher role**: My Teaching, Live Teaching, Faculty Planner, My Students (roster), Content Manager, Exam Builder

**Admin role**: Overview, Admissions, Communications, Academic, Finance, Personnel, Content Manager, Exam Builder, Admin Planner, Operations, Analytics, Exam Tracks, HR, System, Website Content (CMS), Enquiries, WhatsApp Alerts

### B. FMA Admin (Future Meds Academy — IMAT/medical-prep admin suite)

`FMA Admin.html` (~658 KB) / `FMA Admin Bundle.html` (~551 KB) / `FMA Admin Standalone.html` (~7.2 MB self-extracting bundle) — **38 sections**:

- **Academics:** dashboard, modules, lectures, textbooks, flashcards, quizbuilder, quizlab, exams, mocks, doubts, planner, schedule, attendance, results, reports, analytics, myprogress
- **Student lifecycle:** entry (admission form), records, portal (student self-service view), checklists, documents, mydocs, activity
- **Money:** fees, receipts, subscriptions, reminders (fee reminders)
- **Comms:** emailcenter (bulk email composer w/ templates), messages, templates
- **Org:** faculty, staff, rbac (role-based access control), pagesetup, content, settings

Seeded with realistic IMAT content: Biology/Chemistry/Physics/Anatomy/Logic subjects, "IMAT Simulation" mock series, Italian faculty names, PREP/PLUS/PREMIUM plan tiers.

### Shared FMA student tools (JS modules)
`fma-flashcards(.js/-data/-browse)`, `fma-quizlab.js`, `fma-doubts.js` (doubt-solving workflow), `fma-planner.js` (weighted day-by-day study plan generator → PDF export via jsPDF), `fma-textbooks.js`, `image-slot.js`.

---

## 2. Engineering assessment

| Aspect | Reality |
|---|---|
| Backend | **None.** Every "save" writes to `localStorage`. All data resets per browser. |
| Auth | Fake. Hardcoded demo accounts + `bloom_auth` localStorage flag. |
| AI Tutor | **Simulated** — `bloom-tutor.js` `tutorReply()` is a rule-based canned-response function, not an LLM. |
| WhatsApp | Stub only — webhook URL config + pre-drafted deep links. No Cloud API integration. |
| Email center | UI + templates only; nothing sends. |
| Payments/fees | Ledgers, receipts, subscriptions are mock data. No gateway. |
| Live classes | `bloom-live.js`/`bloom-meet.js` are scheduling UI + embedded meeting placeholders. |
| Data quality | Excellent domain modeling (CEFR, exam scales, error bank, spaced repetition) — this is a real functional spec, not throwaway wireframes. |

**Verdict:** this is a *very detailed clickable prototype* — effectively a complete product spec. Nothing is reusable server-side; the front-end design language and domain models carry over, the code does not.

## 3. What a production rebuild must add

Real multi-tenant backend (DB, auth, RBAC), file/media storage, payment gateway, live-class integration, real email sending, the three new asks (student email-ID provisioning, standalone AI tutor service, WhatsApp Business API), plus infra/CI/CD/monitoring.
