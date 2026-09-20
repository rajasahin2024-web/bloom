# FMAHTML Project — In-depth Analysis

Tarikh: 2026-09-15 · Analyst: Devin Agent · Issue: TEC-59

## 1. Ek noksha — ei project ta ki

`FMAHTML` folder er moddhe asole **duita alada product** eksathe ache — ekta zip (`Future MedsAcademy (1) (1).zip`, ~30MB, 123 files) theke extract kora:

1. **Bloom IELTS Academy** — ekta complete English exam-prep school er website + student platform (IELTS, TOEFL, PTE, Duolingo, Cambridge, OET).
2. **Future MedsAcademy (FMA)** — medical-school admission er ekta admin CRM + student study tools (IMAT / Italy-te medical porte jaoa student der jonno).

Duita product-i **100% client-side static app** — kono backend nei, kono database nei. Sob data browser-er `localStorage` e thake.

## 2. Folder structure

```
FMAHTML/
├── Public marketing site (Bloom IELTS)          — 12 ta static page
│   ├── index.html, ielts.html, platform.html, courses.html,
│   ├── results.html, abroad.html, medical.html, blog.html,
│   ├── about.html, careers.html, contact.html, login.html
│   └── sitemap.xml, robots.txt, manifest.webmanifest, favicons
├── Student platform SPA                          — Bloom.html + 38 ta bloom-*.js
├── Site CMS                                      — bloom-cms-data.js + bloom-sitecms.js
├── FMA admin apps                                — 3 ta variant
│   ├── FMA Admin.html            (658KB — module-loading version)
│   ├── FMA Admin Bundle.html     (551KB — modules inline kora)
│   └── FMA Admin Standalone.html (7.2MB — fully self-contained)
├── FMA study tools                               — 8 ta fma-*.js + 2 ta css
├── assets/    — logo, og-card, login-hero images
├── uploads/   — real uploaded content (screenshots, xlsx import)
├── versions/  — "FMA Admin (pre-explore).html" snapshot
└── .c/ + .thumbnail — AI builder er export artifacts
```

## 3. Bloom IELTS Academy — marketing site

- 12 ta page, prottekta te complete SEO: Open Graph + Twitter card meta, JSON-LD (`EducationalOrganization` schema), canonical URL, sitemap, robots.txt, PWA manifest.
- Design: Google Fonts (Outfit, Plus Jakarta Sans, JetBrains Mono), Font Awesome 6.5, nijeder `bloom-site.css` + `bloom-site-2.css`.
- Branding complete — logo, og-card image, favicon sob ache.
- `contact.html` + `careers.html` form gula **real kaj kore na directly** — submission localStorage `bloom_enq_queue` e jay, tarpor admin panel theke **WhatsApp deep-link (`wa.me`)** diye reply kora hoy. Optional webhook configure korle automation possible (`bloom-sitecms.js` e `cfg.webhook`).

## 4. Bloom student platform (Bloom.html) — the big piece

Ekta full SPA: sidebar nav + `navTo()` router + role switching (student / teacher / admin). 38 ta JS module, ~19,500 line:

| Module group | Files | Ki kore |
|---|---|---|
| Data layer | `bloom-data-*.js` (9 ta) | Reference data: CEFR levels, exam definitions, band→TOEFL/PTE conversion, library, tutoring, staff, exams, HR, ops, languages |
| Learning | `bloom-vocab`, `bloom-grammar`, `bloom-reading`, `bloom-writing`, `bloom-speaking` | Skill-wise practice labs |
| Assessment | `bloom-placement`, `bloom-mocks`, `bloom-exambuilder` | Placement test, timed mock exams, exam authoring (passages, sections) |
| Progress | `bloom-dashboard`, `bloom-progress`, `bloom-tracks` | Dashboard, progress tracking, study tracks |
| Support | `bloom-tutor`, `bloom-library`, `bloom-tutoring` | AI-tutor chat UI, content library, 1:1 tutoring |
| Operations | `bloom-admin`, `bloom-ops`, `bloom-faculty`, `bloom-content` | Admin panel, admissions/comms/finance ops, faculty portal |
| Live | `bloom-live`, `bloom-meet`, `bloom-schedule` | Live classes, in-portal meeting rooms, scheduling |
| HR | `bloom-hr`, `bloom-hr-docs`, `bloom-hr-people` | People, printable HR documents, hiring, leave, reviews |
| Website | `bloom-sitecms`, `image-slot` | Site CMS editor + image slot component |

**Auth:** demo-only. `login.html` e 3 ta hardcoded account:
- `student@bloomielts.com` / `teacher@bloomielts.com` / `admin@bloomielts.com` — sob ar password `bloom2026`
- Session localStorage `bloom_auth` e. **Eta production auth na** — keu chaile console theke bypass korte pare.

**Site CMS:** `bloom-cms-data.js` e seed content (blogs, courses, staff, testimonials, settings). Admin panel theke edit korle localStorage `bloom_cms` e override save hoy; `CMS_VERSION` diye stale snapshot discard hoy. `site-admin.html` ekhon sudhu ekta "moved to main panel" notice.

## 5. Future MedsAcademy — admin CRM + study tools

`FMA Admin.html` ekta boro monolithic admin app. Feature list dekhe clear — eta **Italy-te medical school e admission** manage korar CRM:

- **Student CRM:** PowerPrep / Premium tier, quiz attempts, watch hours
- **Document pipeline:** Passport, high school transcript/diploma, bank statement, motivation letter, **Declaration of Value**, pre-enrolment receipt — pura Italian university admission workflow
- **IMAT tracking:** registration, score reports
- **Visa process:** application form, appointment, health insurance, flight prep, accommodation
- **Payments:** verification workflow, pending payments, mark paid
- **Scholarship + consultancy forms**
- **Staff/faculty management, live classes, mock folders, toppers, notes, checklists**
- **Theming:** Light/Dark + Airy/Comfortable/Cozy/Modern/Editorial/Admin density

**CDN libraries:** KaTeX (math rendering), Chart.js, SheetJS xlsx (student bulk import — `uploads/` e real `FMA_Student_Import_Sample.xlsx` ache), jsPDF + autotable (result PDF), JSZip (bulk download), pdf-lib.

**fma-* study tools** (student side):
- `fma-textbooks` — subject→topic textbook library, PDF preview/download
- `fma-flashcards` + `-browse` + `-community` + `-data` — SM-2 spaced repetition engine, 6 study modes, weak-area detection, daily goals, community decks
- `fma-quizlab` — subject→topic→length diye quiz generate
- `fma-planner` — intake theke weighted day-by-day study plan → PDF export
- `fma-doubts` — doubt-session booking with live slot availability

**3 ta admin variant keno:** `FMA Admin.html` external `fma-*.js` load kore (dev-friendly); `Bundle` sob module inline kore single file banay (CDN libs chara); `Standalone` (7.2MB) fully self-contained — sob kichu embedded, offline-eo cholbe.

## 6. Data & integration architecture

- **Persistence:** 100% `localStorage`. Bloom side `bloom_*` keys (auth, cms, enq_queue, app_queue); FMA side `fma_*` keys (students, staff, faculty, payments, plans, schedule, branding, checklists, mock_folders, liveclasses, quiz_active, fc_daily, notifs, toppers, notes_content, upcoming, settings).
- **Kono backend nei** — data oi browser ei thake; onno device/browser e dekha jay na, clear korle sob chole jay.
- **Ekmatro network call:** `fetch()` sudhu `.image-slots.state.json` (image-slot sidecar) ar optional webhook (enquiry/WhatsApp alert) er jonno. Sob content local file/data theke ashe.
- **Omelette AI-builder artifacts:** `image-slot.js` er comment e clearly lekha — "Copied omelette starter... copy_starter_component". `.c/` (head/nav/foot.txt component snippets), `.thumbnail`, `versions/` — sob AI website-builder export er chinho. Eta hand-coded project na, AI tool diye generate kora export.

## 7. Serving status (nginx)

- Vhost: `/www/server/panel/vhost/nginx/fmahtml.conf` — `listen 8090`, root `/project/bloom/FMAHTML`, `try_files` static serving.
- Verified live: `index.html` 200 (64.8KB), `login.html` 200, `FMA Admin.html` 200.
- Access: `http://82.112.226.111:8090/` (localhost-o `http://localhost:8090/`).

## 8. Security & production-readiness issues (gurutopurno)

1. **Source zip publicly downloadable** — `http://82.112.226.111:8090/Future%20MedsAcademy%20(1)%20(1).zip` diye keu-i 30MB source tar e download korte parbe. Webroot theke sore deoa ba nginx `location` e deny kora uchit.
2. **`uploads/` publicly exposed** — student import xlsx, internal screenshots, admin-uploaded media sob without-auth download-able.
3. **Kono real auth nei** — admin page gulo (`FMA Admin.html`, `Bloom.html`) jar link ache tar jonnoi khola; login demo-credential diye bypassable.
4. **`.c/`, `.thumbnail`, `versions/`** — builder internals publicly accessible.
5. **CDN dependency** — Font Awesome, Google Fonts, Chart.js, KaTeX, SheetJS, jsPDF, JSZip, pdf-lib sob third-party CDN theke ashe; offline/CSP-restricted environment e cholbe na, ar CDN compromise hole supply-chain risk.
6. **localStorage data** — multi-user support nei, data loss risk ache, ar admin theke upload kora file-gulo asole persist hoy na server e (uploads/ folder er content jar aage theke chilo tai dekha jay).
7. **Duita brand mixed** — Bloom IELTS ar Future MedsAcademy eksathe; production e alada kora lagbe.

## 9. Recommendation

- Eta **prototype/demo-grade** codebase — showcase hisebe excellent (feature coverage onnorokom comprehensive), kintu production e jawar age backend + real auth + data persistence dorkar.
- Immediate hardening: webroot theke `.zip`, `.c/`, `.thumbnail` ba deny-rule; `uploads/` e access control; `FMA Admin*.html` er age auth gate (jotokkhon na real backend ashe, onttoto nginx `auth_basic`).
- Next step jodi user chai: backend API design, othoba Bloom/FMA alada kore deploy.
