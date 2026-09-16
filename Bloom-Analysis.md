# Bloom Academy — In-Depth Technical Analysis

**Project:** Bloom Academy (Bloom IELTS Academy) — IELTS/English-exam prep platform, front-end prototype
**Location:** `/project/bloom/FMAHTML` — Bloom side = 16 public pages + `Bloom.html` SPA + ~40 `bloom-*.js` modules (~19,500 LOC)
**Companion doc:** `Bloom-Proposal.md` (client-facing). This file is the engineering analysis behind it.
**Note:** the `FMAHTML` bundle also contains an unrelated FMA Admin (Future Meds Academy) medical-admissions suite — analysed separately, out of scope here.

---

## 1. What the client delivered (Bloom side only)

A **complete clickable product spec** for an IELTS-prep academy, in two parts:

### A. Public marketing site — 12 pages, fully CMS-driven

`index.html`, `about.html`, `courses.html`, `ielts.html`, `medical.html`, `abroad.html`, `blog.html`, `results.html`, `careers.html`, `contact.html`, `login.html`, `platform.html`

- All page content flows through `cms()` from `bloom-cms-data.js` (blogs, faculty, pricing, testimonials, university lists, settings); admin edits persist to `localStorage` `bloom_cms` with a `CMS_VERSION` stale-snapshot guard
- Production-grade SEO already wired: Open Graph + Twitter cards, JSON-LD `EducationalOrganization` schema, canonical URLs, `sitemap.xml`, `robots.txt`, `manifest.webmanifest`, favicon/app-icon set
- Brand identity complete: Bloom mark/logo assets, `bloomielts.com` domain assumed throughout, Bengaluru address, +91 phone
- Enquiry flow: `contact.html`/`careers.html` forms → `localStorage` `bloom_enq_queue` → admin Enquiries inbox → reply via `wa.me` deep links; optional webhook (`cfg.webhook` in `bloom-sitecms.js`) for automation — currently a stub

### B. Student platform — `Bloom.html` SPA

Single-page app: sidebar nav + `navTo()` router + role switching (student / teacher / admin). ~40 JS modules.

## 2. The IELTS module map (the core domain model)

Everything in the portal is keyed to a **15-part map of the real IELTS paper** (`PARTS` in `bloom-data-library.js`):

| Part id | Module | Prototype coverage |
|---|---|---|
| `l1`–`l4` | **Listening** | Part 1 form completion (spelling/numbers drill), Part 2 monologue+maps, Part 3 academic discussion, Part 4 lecture — each with seeded audio tracks and notes |
| `r1`–`r3`, `rgt` | **Reading** | Three Academic passages (descriptive→discursive→argumentative) + General Training reading for `ielts-g` students |
| `w1`, `w2` | **Writing** | Task 1 report/letter, Task 2 essay (5 question types, model answers) |
| `s1`–`s3` | **Speaking** | Part 1 interview, Part 2 cue-card long turn, Part 3 two-way discussion |
| `gv` | **Grammar & Vocabulary** | Cross-skill trainer — explicitly tied to Lexical Resource + Grammatical Range band criteria |
| `strategy` | **Exam strategy** | Timing, answer-sheet transfer, test-day checklists |

Each part carries minutes, difficulty notes and "highest-yield" teaching notes — this is real IELTS pedagogy modelling, not lorem ipsum.

### Exam tracks (staff-gated)

`bloom-tracks.js`: 8 tracks — `ielts-a` (full 15-part map), `ielts-g`, `toefl`, `pte`, `duolingo`, `cambridge`, `oet`, `general`. Each track maps its own blueprint onto the part list (`TRACK_PARTS`); staff assignment locks the student's exam selector and reconfigures which mocks/school parts/practice content are visible.

### Mock-exam engines

`bloom-data-exams.js`: blueprint definitions per exam — TOEFL iBT (120 pts / 116 min), PTE Academic (90 pts / 120 min), Duolingo (160 pts / 60 min, adaptive). IELTS runs on the band 0–9 scale through the shared engine. 8 seeded mock definitions (full + section mocks).

### Student-facing features (all modelled)

Placement test + CEFR estimate · dashboard with weakest-module detection · study planner (weighted day-by-day, PDF export via jsPDF) · live classes + schedule + in-portal meeting rooms (`bloom-live.js`, `bloom-meet.js`, 844 LOC) · Bloom Tutor chat (`bloom-tutor.js` — **rule-based canned replies, not an LLM**) · 1-on-1 tutoring booking · skill labs (`bloom-reading/writing/speaking/vocab/grammar.js`, ~1,900 LOC combined) · library (17 materials, 12 lectures, 13 audio tracks) · progress/band trajectory · English Profile with IELTS↔TOEFL↔PTE↔DET↔Cambridge↔OET concordance · gamified badges/streaks.

### Faculty & admin

Teacher: teaching planner, live teaching console, roster, content manager (upload flow to `bloom-content.js`), exam builder (`bloom-exambuilder.js` — passage/section authoring).
Admin: overview, admissions, communications, academic, finance (fees/receipts/subscriptions/reminders), personnel + printable HR docs, content manager, exam builder, admin planner, operations, analytics, exam-track assignment, HR, system, website CMS, enquiries, WhatsApp alerts.

## 3. Engineering assessment

| Aspect | Reality |
|---|---|
| Backend | **None.** Every "save" writes to `localStorage` (`bloom_*` keys). |
| Auth | Fake. 3 hardcoded accounts (`student/teacher/admin@bloomielts.com` / `bloom2026`) + `bloom_auth` flag. |
| AI Tutor | **Simulated** — `tutorReply()` pattern-matches keywords to canned strings. |
| WhatsApp | Stub — webhook config + `wa.me` deep links. No Cloud API. |
| Email | No email functionality at all on the Bloom side (FMA side has a mock email centre). |
| Payments | Finance section is mock ledger data. No gateway. |
| Live classes | Scheduling UI + embedded meeting placeholders only. |
| Data quality | Excellent — CEFR levels, exam scales, band concordance, error-bank model, spaced repetition, track gating. A real spec, not wireframes. |
| Provenance | AI-builder export artifacts present (`image-slot.js` omelette comment, `.c/`, `.thumbnail`, `versions/`). |

**Verdict:** Bloom is a very detailed IELTS product spec. Design language + domain models carry over to production; no code is reusable server-side.

## 4. What the production rebuild must add

Real backend (PostgreSQL, auth+RBAC, media storage, payments, live-class provider), plus the client's three asks: **student email-ID provisioning on a custom self-hosted mail server** (mailcow/Postfix + webmail + provisioning API, per client's explicit instruction), **a separately-scalable AI Tutor microservice** (RAG over Bloom curriculum), and **WhatsApp Business Cloud API**.
