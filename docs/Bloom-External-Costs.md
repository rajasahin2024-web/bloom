# Bloom Academy — External & Running Costs (Annexure)

**Companion to:** Bloom Proposal v5.1 (₹2,50,000 package + ₹20,000 one-time Mail Engine setup = ₹2,70,000 total)
**Date:** 17 September 2026
**Purpose:** every **provider/running** cost outside the development contract — paid **directly by the academy** to the respective providers, at actuals. Techfly does not mark up any of these.

*Note: the ₹20,000 Mail Engine setup is a one-time **Techfly development charge** (per Proposal §5), not a provider cost — it is listed in the proposal, not in this annexure.*

---

## 1. One-time external costs

| Item | Cost | Notes |
|---|---|---|
| Domain name (`bloomielts.com` or academy's existing domain) | ~₹1,000–1,500/year | Owned by the academy; we need DNS access from Week 1 |
| Razorpay / Cashfree account + KYC | ₹0 setup | Gateway takes ~2% per transaction instead (see §2) |
| SSL certificates | ₹0 | Let's Encrypt, auto-renewed — included in our setup |
| Meta / WhatsApp Business verification | ₹0 | Free verification; required for the WAISE sender |

## 2. Recurring external costs (monthly / yearly)

| Item | Cost | Notes |
|---|---|---|
| **Application VPS** (app + database + Redis) | ~₹4,000–8,000/month | Any 8 GB+ RAM cloud VPS (16 GB recommended) — AWS / DigitalOcean / equivalent. Needed from Week 1. |
| **Mail server VPS** | ~₹3,000–5,000/month | Dedicated VPS for the student-email system; flat cost, unlimited mailboxes. Needed from Week 3 (IP warm-up). |
| **WAISE.in — WhatsApp platform** | **₹7,500/year** (Professional) | 3 users, ~10,000 msgs/month. Needed **from Month 1** so endpoints are built against the real API. Starter ₹5,999/yr and Enterprise ₹12,999/yr tiers also exist. |
| **Meta conversation charges** | ~₹0.30–0.80/conversation | Paid directly to Meta at standard India rates; WAISE adds no markup |
| **AI Tutor — LLM API usage** | ~₹5,000–20,000/month | Usage-based, ~₹30–80/student/month at typical usage; lower with open-weight models. Starts small, scales with active students. |
| **Object storage + CDN** | ~₹500–2,000/month | Audio tracks, PDFs, lecture recordings (S3-compatible) |
| **Payment-gateway fees** | ~2% per transaction | Razorpay/Cashfree standard rates — deducted per payment, not a bill |
| **AMC / support (optional)** | ₹15,000–30,000/month | Only after the included 3-month post-launch support ends; optional |

## 3. Year-1 estimate (indicative)

| Scenario | Year-1 external total |
|---|---|
| **Lean launch** (smallest VPS tiers, ~100–200 active students, moderate WhatsApp/AI usage) | ~₹1.3–1.6 lakh |
| **Typical** (16 GB app VPS, ~300–500 active students) | ~₹1.8–2.4 lakh |
| **High usage** (larger student base, heavy AI-tutor usage) | ~₹2.5–3.0 lakh |

*Dominant variable is LLM usage — it scales with active students, so the academy pays more only when more students are using the product.*

## 4. When each cost starts

| When | What must be purchased |
|---|---|
| **Week 1** | Domain/DNS access confirmed · app VPS · WAISE.in Professional subscription |
| **Week 3** | Mail VPS (IP warm-up needs lead time) |
| **Week 6** | Razorpay/Cashfree KYC completed |
| **Month 2+** | LLM API account loaded (usage-based billing starts) |
| **Month 3+** | S3/CDN usage grows with content; AMC optional after go-live support ends |

---

*All figures are estimates at standard published provider rates (September 2026); the academy pays providers directly at actuals. The development contract (₹2,50,000 package + ₹20,000 Mail Engine setup = ₹2,70,000) is fixed and does not change with these figures.*
