/* bloom-funnel-api-mock — DEV/QA contract stub for the funnel backend (TEC-117).
 *
 * Implements the /api/funnel/* contract exactly so the frontend and QA can run
 * the full flow before the real backend ships. NOT for production.
 *
 * Env:
 *   PORT             listen port (default 8090)
 *   HOST             listen host (default 0.0.0.0)
 *   ALLOWED_ORIGINS  comma list of CORS origins (default http://82.112.226.111:8081,http://localhost:8081,http://127.0.0.1:8081)
 *   PAYMENT_RAIL     "mock" (default) | "razorpay" — razorpay mode returns the
 *                    razorpay block using RAZORPAY_KEY_ID (never exposes secret)
 *   RAZORPAY_KEY_ID  public key id for razorpay checkout.js (optional)
 *   ADMIN_TOKEN      gates GET /api/funnel/buyers.csv (default "dev-admin-token")
 *   META_PIXEL_ID    for CAPI DRY_RUN payload logging
 *   META_CAPI_TOKEN  if unset -> DRY_RUN mode: logs exact CAPI payloads
 *   META_TEST_EVENT_CODE  optional test_event_code appended to payloads
 */
import { createServer } from "node:http";
import { randomUUID, createHmac, timingSafeEqual } from "node:crypto";

const PORT = Number(process.env.PORT || 8090);
const HOST = process.env.HOST || "0.0.0.0";
const ORIGINS = (process.env.ALLOWED_ORIGINS ||
  "http://82.112.226.111:8081,http://localhost:8081,http://127.0.0.1:8081"
).split(",");
const RAIL = process.env.PAYMENT_RAIL || "mock";
const RZP_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "dev-admin-token";
const PIXEL_ID = process.env.META_PIXEL_ID || "";
const CAPI_TOKEN = process.env.META_CAPI_TOKEN || "";
const TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE || "";
const SELF = `http://${HOST === "0.0.0.0" ? "82.112.226.111" : HOST}:${PORT}`;

const PRICE_EBOOK = 19900;
const PRICE_BUMP = 9900;
const PRICE_UPSELL = 59900;

const orders = new Map();

/* CAPI DRY_RUN logger — prints the exact payload the real backend would POST
 * to graph.facebook.com. Keeps the pipeline verifiable without creds. */
function capi(events, order) {
  const payload = {
    data: events.map((e) => ({
      event_name: e.name,
      event_time: Math.floor(Date.now() / 1000),
      event_id: e.eventId,
      action_source: "website",
      event_source_url: e.sourceUrl || undefined,
      user_data: { em: [sha256Placeholder(order.email)], client_ip_address: "0.0.0.0" },
      custom_data: { value: e.value, currency: "INR", content_type: "product" },
    })),
    ...(TEST_EVENT_CODE ? { test_event_code: TEST_EVENT_CODE } : {}),
  };
  if (!CAPI_TOKEN || !PIXEL_ID) {
    console.log(`[CAPI DRY_RUN] POST https://graph.facebook.com/v19.0/${PIXEL_ID || "<META_PIXEL_ID>"}/events`);
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  // Real send path — only when creds exist.
  fetch(`https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${CAPI_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then((r) => r.json())
    .then((j) => console.log("[CAPI] sent", JSON.stringify(j)))
    .catch((e) => console.error("[CAPI] failed", e));
}
function sha256Placeholder(v) {
  return createHmac("sha256", "mock").update(String(v || "").toLowerCase()).digest("hex");
}

function cors(req, res) {
  const origin = req.headers.origin;
  if (origin && ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") {
    res.writeHead(204).end();
    return true;
  }
  return false;
}

function json(res, code, body) {
  const b = JSON.stringify(body);
  res.writeHead(code, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(b) });
  res.end(b);
}

function readBody(req) {
  return new Promise((resolve) => {
    let d = "";
    req.on("data", (c) => (d += c));
    req.on("end", () => {
      try { resolve(JSON.parse(d || "{}")); } catch { resolve({}); }
    });
  });
}

/* Minimal valid PDF so download links return a real file until TEC-119 assets land. */
function placeholderPdf(title) {
  const text = `${title} - placeholder asset (content issue TEC-119 pending)`;
  const stream = `BT /F1 12 Tf 50 780 Td (${text.replace(/[()\\]/g, "")}) Tj ET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => (pdf += String(o).padStart(10, "0") + " 00000 n \n"));
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}

const ASSETS = {
  ebook: { name: "IELTS Writing Band 7 eBook.pdf", file: "ielts-ebook.pdf" },
  bump: { name: "IELTS Mock-Test Workbook.pdf", file: "mock-test-workbook.pdf" },
  upsell: { name: "Band 7 Mini-Course + 3-eBook bundle.pdf", file: "band7-minicourse-bundle.pdf" },
};

function downloadLinks(order) {
  const exp = Date.now() + 24 * 3600 * 1000;
  return order.items
    .filter((i) => i.status === "paid")
    .map((i) => {
      const a = ASSETS[i.kind];
      const sig = createHmac("sha256", ADMIN_TOKEN).update(`${order.id}:${i.kind}:${exp}`).digest("hex").slice(0, 24);
      return { name: a.name, format: "PDF", url: `/api/funnel/dl/${a.file}?o=${order.id}&k=${i.kind}&e=${exp}&s=${sig}` };
    });
}

function verifyDl(q) {
  const { o, k, e, s } = q;
  const exp = Number(e);
  if (!o || !k || !exp || exp < Date.now()) return false;
  const want = createHmac("sha256", ADMIN_TOKEN).update(`${o}:${k}:${e}`).digest("hex").slice(0, 24);
  try { return timingSafeEqual(Buffer.from(want), Buffer.from(String(s))); } catch { return false; }
}

/* ============ learner portal mock — mirrors the real TEC-121 contract ============
 * POST /gated/auth/login {email, order_id} on a PAID order -> {token fns_*}
 * Every other /gated/* route takes `Authorization: Bearer <token>`; download
 * URLs are HMAC-signed like /dl/*. Shapes match
 * platform/funnel/api/app/routers/gated.py. */
const sessions = new Map();     // fns_* token -> order_id
const quizState = new Map();    // order_id -> {moduleId: {attempts,best_score,total,passed,last_attempt_at}}
const certState = new Map();    // order_id -> {serial,buyer_name,issued_at}
const PASS_PCT = 70;
const MOCK_COURSE = { id: "ai-office-work-v1", title: "AI for Office Work" };

// Placeholder manifest until TEC-119 lands real content — real manifest shape.
const PORTAL_MODULES = [
  { id: "m1", title: "ChatGPT basics for office work",
    summary: "Set up free tools, prompt anatomy, checking output before it reaches your boss.",
    lesson: true,
    videos: [{ video_id: "jNQXAC9IVRw", title: "Getting started with AI chat tools (placeholder)", duration_seconds: 420 }],
    quiz: [
      { id: "m1q1", prompt: "Which AI tool can you start with for free?", options: [
        { id: "a", text: "ChatGPT free tier" }, { id: "b", text: "Only paid Copilot" }, { id: "c", text: "None — AI needs a subscription" }], answer: "a" },
      { id: "m1q2", prompt: "A good office prompt should include…", options: [
        { id: "a", text: "Task + context + format" }, { id: "b", text: "Just 'write something'" }, { id: "c", text: "Your password for context" }], answer: "a" },
      { id: "m1q3", prompt: "Before sending AI output to your boss you should…", options: [
        { id: "a", text: "Review and edit it" }, { id: "b", text: "Send it as-is" }, { id: "c", text: "Delete it" }], answer: "a" },
    ] },
  { id: "m2", title: "Reports & documents with AI",
    summary: "Structure, draft and polish reports — prompts built for Indian office formats.",
    lesson: true,
    videos: [{ video_id: "jNQXAC9IVRw", title: "AI-assisted report drafting (placeholder)", duration_seconds: 480 }],
    quiz: [
      { id: "m2q1", prompt: "The fastest way to a usable first draft is…", options: [
        { id: "a", text: "Give AI the outline + audience + length" }, { id: "b", text: "Ask for 'a report'" }, { id: "c", text: "Write it fully yourself first" }], answer: "a" },
      { id: "m2q2", prompt: "AI output should be treated as…", options: [
        { id: "a", text: "A first draft you edit" }, { id: "b", text: "Final copy" }, { id: "c", text: "Something to paste verbatim" }], answer: "a" },
    ] },
  { id: "m3", title: "Excel without formulas",
    summary: "Plain-English prompts that give you formulas, cleaning steps and summaries.",
    lesson: true,
    videos: [{ video_id: "jNQXAC9IVRw", title: "Describe the problem, get the formula (placeholder)", duration_seconds: 390 }],
    quiz: [
      { id: "m3q1", prompt: "To get a formula from AI, describe…", options: [
        { id: "a", text: "Columns, what you want calculated, and an example" }, { id: "b", text: "Just the sheet name" }, { id: "c", text: "Nothing — AI guesses" }], answer: "a" },
      { id: "m3q2", prompt: "If the formula errors, you should…", options: [
        { id: "a", text: "Paste the error back to AI for a fix" }, { id: "b", text: "Give up on Excel" }, { id: "c", text: "Reinstall Office" }], answer: "a" },
    ] },
  { id: "m4", title: "Email & meeting notes",
    summary: "Draft replies, summarise threads, write tricky emails politely — in your tone.",
    lesson: true,
    videos: [{ video_id: "jNQXAC9IVRw", title: "Inbox zero with AI drafts (placeholder)", duration_seconds: 450 }],
    quiz: [
      { id: "m4q1", prompt: "For an email in your own tone, give AI…", options: [
        { id: "a", text: "A sample of how you write + the points to cover" }, { id: "b", text: "Nothing" }, { id: "c", text: "Your colleague's email" }], answer: "a" },
      { id: "m4q2", prompt: "Long thread to summarise? Ask AI for…", options: [
        { id: "a", text: "Decisions + action items + owners" }, { id: "b", text: "A poem" }, { id: "c", text: "The longest reply" }], answer: "a" },
    ] },
  { id: "m5", title: "Presentations in minutes",
    summary: "Topic to slide outline to speaker notes — then make it pretty.",
    lesson: true,
    videos: [{ video_id: "jNQXAC9IVRw", title: "Deck outlines with AI (placeholder)", duration_seconds: 400 }],
    quiz: [
      { id: "m5q1", prompt: "A good deck prompt includes…", options: [
        { id: "a", text: "Audience + goal + slide count" }, { id: "b", text: "Just the topic" }, { id: "c", text: "The office Wi-Fi password" }], answer: "a" },
      { id: "m5q2", prompt: "AI speaker notes are for…", options: [
        { id: "a", text: "What you'll say per slide" }, { id: "b", text: "Printing as the deck" }, { id: "c", text: "Replacing slides" }], answer: "a" },
    ] },
  { id: "m6", title: "Your AI daily workflow",
    summary: "String it together: a repeatable morning-to-evening AI routine.",
    lesson: true,
    videos: [{ video_id: "jNQXAC9IVRw", title: "Building your daily AI routine (placeholder)", duration_seconds: 360 }],
    quiz: [
      { id: "m6q1", prompt: "The habit that compounds is…", options: [
        { id: "a", text: "Reusing and refining your best prompts" }, { id: "b", text: "Starting from scratch each time" }, { id: "c", text: "Avoiding AI on busy days" }], answer: "a" },
      { id: "m6q2", prompt: "AI in office work is best for…", options: [
        { id: "a", text: "First drafts, summaries, structure" }, { id: "b", text: "Final accountability" }, { id: "c", text: "Replacing judgement" }], answer: "a" },
    ] },
];

/* sku -> gated download filenames (real contract: catalog.assets_for_sku). */
const PORTAL_ASSETS = {
  "ai-office-course": ["quick-start.pdf"],
  "prompt-library-pack": ["prompt-library.pdf", "office-templates.pdf"],
  "ai-creators-starter": ["starter-welcome.pdf"],
};

function entitlements(order) {
  const paid = (k) => order.items.some((i) => i.kind === k && i.status === "paid");
  return { course: order.status === "paid", prompt_library: paid("bump"), second_course: paid("upsell") };
}
function portalAuth(req) {
  const tok = (req.headers.authorization || "").replace(/^Bearer /, "");
  const oid = sessions.get(tok);
  const order = oid && orders.get(oid);
  return order ? { token: tok, order, order_id: oid } : null;
}
function moduleProgress(orderId, modId) {
  const st = (quizState.get(orderId) || {})[modId] || {};
  return {
    attempts: st.attempts || 0,
    best_score: st.best_score != null ? st.best_score : null,
    total: st.total != null ? st.total : null,
    passed: !!st.passed,
    last_attempt_at: st.last_attempt_at || null,
  };
}
function moduleView(orderId, mod) {
  return {
    id: mod.id, title: mod.title, summary: mod.summary,
    lesson_url: mod.lesson ? `/api/funnel/gated/modules/${mod.id}/lesson` : null,
    videos: (mod.videos || []).map((v) => ({
      video_id: v.video_id, title: v.title,
      duration_seconds: v.duration_seconds || null,
      embed_url: `https://www.youtube.com/embed/${v.video_id}`,
    })),
    quiz_question_count: (mod.quiz || []).length,
    pass_score_pct: PASS_PCT,
    progress: moduleProgress(orderId, mod.id),
  };
}
function progressSummary(orderId) {
  const modules = PORTAL_MODULES.map((m) => moduleView(orderId, m));
  const passed = modules.filter((m) => m.progress.passed).length;
  return {
    course: MOCK_COURSE,
    modules_total: modules.length,
    modules_passed: passed,
    complete: passed === modules.length && modules.length > 0,
    modules,
  };
}
function certView(orderId) {
  const cert = certState.get(orderId);
  const eligible = progressSummary(orderId).complete;
  return {
    eligible, issued: !!cert,
    serial: cert ? cert.serial : null,
    issued_at: cert ? cert.issued_at : null,
    buyer_name: cert ? cert.buyer_name : null,
    pdf_url: cert ? `http://${HOST}:${PORT}/api/funnel/gated/certificate/pdf` : null,
  };
}

const server = createServer(async (req, res) => {
  if (cors(req, res)) return;
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const p = url.pathname;

  if (p === "/api/funnel/health") return json(res, 200, { ok: true, rail: RAIL, mode: "mock" });

  if (p === "/api/funnel/orders" && req.method === "POST") {
    const b = await readBody(req);
    if (!b.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email))
      return json(res, 422, { error: "valid email required" });
    const id = "ord_" + randomUUID().slice(0, 12);
    const items = [{ kind: "ebook", name: ASSETS.ebook.name, amount_paise: PRICE_EBOOK, status: "pending" }];
    if (b.bump) items.push({ kind: "bump", name: ASSETS.bump.name, amount_paise: PRICE_BUMP, status: "pending" });
    const amount = items.reduce((s, i) => s + i.amount_paise, 0);
    const order = { id, email: b.email, items, status: "pending", utm: b.utm || {}, event_id: b.event_id };
    orders.set(id, order);

    capi([{ name: "InitiateCheckout", eventId: b.event_id, value: amount / 100 }], order);

    const out = { order_id: id, amount_paise: amount, currency: "INR", rail: RAIL };
    if (RAIL === "razorpay") {
      out.razorpay = { order_id: "rzp_mock_" + id, key_id: RZP_KEY_ID, amount_paise: amount };
    } else {
      out.mock = { settle_url: `/api/funnel/orders/${id}/mock-settle` };
    }
    console.log(`[mock] order ${id} email=${b.email} amount=${amount} rail=${RAIL}`);
    return json(res, 201, out);
  }

  let m = p.match(/^\/api\/funnel\/orders\/([^/]+)\/mock-settle$/);
  if (m && req.method === "POST") {
    const o = orders.get(m[1]);
    if (!o) return json(res, 404, { error: "order not found" });
    const pending = o.items.filter((i) => i.status === "pending");
    pending.forEach((i) => (i.status = "paid"));
    o.status = "paid";
    const upsellPaid = pending.some((i) => i.kind === "upsell");
    const value = pending.reduce((s, i) => s + i.amount_paise, 0) / 100;
    capi([{ name: "Purchase", eventId: `purchase_${o.id}${upsellPaid ? "_upsell" : ""}`, value }], o);
    console.log(`[mock] settled ${o.id} +${pending.map((i) => i.kind).join(",")}`);
    return json(res, 200, { status: "paid", order_id: o.id });
  }

  m = p.match(/^\/api\/funnel\/orders\/([^/]+)\/upsell$/);
  if (m && req.method === "POST") {
    const o = orders.get(m[1]);
    if (!o) return json(res, 404, { error: "order not found" });
    if (o.items.some((i) => i.kind === "upsell")) return json(res, 409, { error: "upsell already added" });
    o.items.push({ kind: "upsell", name: ASSETS.upsell.name, amount_paise: PRICE_UPSELL, status: "pending" });
    const out = { order_id: o.id, amount_paise: PRICE_UPSELL, currency: "INR", rail: RAIL };
    if (RAIL === "razorpay") {
      out.razorpay = { order_id: "rzp_mock_" + o.id + "_u", key_id: RZP_KEY_ID, amount_paise: PRICE_UPSELL };
    } else {
      out.mock = { settle_url: `/api/funnel/orders/${o.id}/mock-settle` };
    }
    console.log(`[mock] upsell started ${o.id} +59900`);
    return json(res, 201, out);
  }

  m = p.match(/^\/api\/funnel\/orders\/([^/]+)\/downloads$/);
  if (m && req.method === "GET") {
    const o = orders.get(m[1]);
    if (!o) return json(res, 404, { error: "order not found" });
    if (o.status !== "paid") return json(res, 402, { error: "order not paid" });
    return json(res, 200, { files: downloadLinks(o) });
  }

  m = p.match(/^\/api\/funnel\/orders\/([^/]+)$/);
  if (m && req.method === "GET") {
    const o = orders.get(m[1]);
    if (!o) return json(res, 404, { error: "order not found" });
    return json(res, 200, {
      status: o.status,
      email: o.email,
      items: o.items.map((i) => ({ kind: i.kind, name: i.name, amount_paise: i.amount_paise, status: i.status })),
    });
  }

  if (p === "/api/funnel/buyers.csv" && req.method === "GET") {
    const auth = (req.headers.authorization || "").replace(/^Bearer /, "");
    if (auth !== ADMIN_TOKEN) return json(res, 401, { error: "unauthorized" });
    let csv = "email,order_id,status,total_paise,items\n";
    orders.forEach((o) => {
      csv += `${o.email},${o.id},${o.status},${o.items.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount_paise, 0)},"${o.items.map((i) => i.kind).join("+")}"\n`;
    });
    res.writeHead(200, { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=buyers.csv" });
    return res.end(csv);
  }

  m = p.match(/^\/api\/funnel\/dl\/([^/]+)$/);
  if (m && req.method === "GET") {
    const q = Object.fromEntries(url.searchParams);
    if (!verifyDl(q)) return json(res, 403, { error: "invalid or expired link" });
    const o = orders.get(q.o);
    const item = o && o.items.find((i) => i.kind === q.k && i.status === "paid");
    const asset = Object.values(ASSETS).find((a) => a.file === m[1]);
    if (!o || !item || !asset) return json(res, 404, { error: "not found" });
    const pdf = placeholderPdf(asset.name.replace(/\.pdf$/, ""));
    res.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${asset.file}"`,
      "Content-Length": pdf.length,
    });
    return res.end(pdf);
  }



  /* --- gated learner portal routes (mirrors TEC-121 contract) --- */
  if (p === "/api/funnel/gated/auth/login" && req.method === "POST") {
    const b = await readBody(req);
    const o = b.order_id && orders.get(String(b.order_id).trim());
    const ok = o && b.email && o.email === String(b.email).trim().toLowerCase();
    if (!ok) return json(res, 401, { error: "invalid login" });
    if (o.status !== "paid") return json(res, 403, { error: "order not settled" });
    const token = "fns_" + randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "").slice(0, 8);
    sessions.set(token, o.id);
    console.log(`[mock] gated login ${o.id} ${o.email}`);
    return json(res, 200, {
      token, expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      order_id: o.id, email: o.email, entitlements: entitlements(o), course: MOCK_COURSE,
    });
  }

  if (p === "/api/funnel/gated/me" && req.method === "GET") {
    const a = portalAuth(req);
    if (!a) return json(res, 401, { error: "session required" });
    return json(res, 200, {
      order_id: a.order.id, email: a.order.email,
      entitlements: entitlements(a.order),
      progress: progressSummary(a.order.id),
      certificate: certView(a.order.id),
    });
  }

  if (p === "/api/funnel/gated/modules" && req.method === "GET") {
    const a = portalAuth(req);
    if (!a) return json(res, 401, { error: "session required" });
    return json(res, 200, progressSummary(a.order.id));
  }

  m = p.match(/^\/api\/funnel\/gated\/modules\/([^/]+)\/lesson$/);
  if (m && req.method === "GET") {
    const a = portalAuth(req);
    if (!a) return json(res, 401, { error: "session required" });
    const mod = PORTAL_MODULES.find((x) => x.id === m[1]);
    if (!mod || !mod.lesson) return json(res, 404, { error: "no lesson for module" });
    const html = `<h2>${mod.title}</h2><p>Placeholder lesson — TEC-119 replaces this with the real module guide.</p>`;
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Content-Length": Buffer.byteLength(html) });
    return res.end(html);
  }

  m = p.match(/^\/api\/funnel\/gated\/modules\/([^/]+)\/quiz$/);
  if (m && req.method === "GET") {
    const a = portalAuth(req);
    if (!a) return json(res, 401, { error: "session required" });
    const mod = PORTAL_MODULES.find((x) => x.id === m[1]);
    if (!mod || !mod.quiz.length) return json(res, 404, { error: "no quiz for module" });
    return json(res, 200, {
      module_id: mod.id, title: mod.title, pass_score_pct: PASS_PCT,
      questions: mod.quiz.map((q) => ({
        id: q.id, prompt: q.prompt,
        options: q.options.map((o) => ({ id: o.id, text: o.text })),
      })),
    });
  }

  m = p.match(/^\/api\/funnel\/gated\/modules\/([^/]+)\/quiz\/submit$/);
  if (m && req.method === "POST") {
    const a = portalAuth(req);
    if (!a) return json(res, 401, { error: "session required" });
    const mod = PORTAL_MODULES.find((x) => x.id === m[1]);
    if (!mod || !mod.quiz.length) return json(res, 404, { error: "no quiz for module" });
    const b = await readBody(req);
    const ans = b.answers || {};
    let score = 0;
    mod.quiz.forEach((q) => { if (ans[q.id] === q.answer) score++; });
    const total = mod.quiz.length;
    const passed = total > 0 && score * 100 >= total * PASS_PCT;
    const st = quizState.get(a.order_id) || {};
    const prev = st[mod.id] || { attempts: 0, best_score: null, passed: false };
    st[mod.id] = {
      attempts: prev.attempts + 1,
      best_score: Math.max(prev.best_score == null ? -1 : prev.best_score, score),
      total,
      passed: prev.passed || passed,
      last_attempt_at: new Date().toISOString(),
    };
    quizState.set(a.order_id, st);
    console.log(`[mock] quiz ${a.order_id} ${mod.id} -> ${score}/${total} passed=${passed}`);
    return json(res, 200, {
      module_id: mod.id, score, total, passed,
      pass_score_pct: PASS_PCT,
      module: moduleProgress(a.order_id, mod.id),
    });
  }

  m = p.match(/^\/api\/funnel\/gated\/modules\/([^/]+)$/);
  if (m && req.method === "GET") {
    const a = portalAuth(req);
    if (!a) return json(res, 401, { error: "session required" });
    const mod = PORTAL_MODULES.find((x) => x.id === m[1]);
    if (!mod) return json(res, 404, { error: "module not found" });
    return json(res, 200, moduleView(a.order_id, mod));
  }

  if (p === "/api/funnel/gated/progress" && req.method === "GET") {
    const a = portalAuth(req);
    if (!a) return json(res, 401, { error: "session required" });
    return json(res, 200, progressSummary(a.order.id));
  }

  if (p === "/api/funnel/gated/certificate" && req.method === "GET") {
    const a = portalAuth(req);
    if (!a) return json(res, 401, { error: "session required" });
    return json(res, 200, certView(a.order.id));
  }

  if (p === "/api/funnel/gated/certificate" && req.method === "POST") {
    const a = portalAuth(req);
    if (!a) return json(res, 401, { error: "session required" });
    if (certState.get(a.order_id)) return json(res, 200, certView(a.order.id));
    if (!progressSummary(a.order.id).complete)
      return json(res, 403, { error: "all module quizzes must be passed first" });
    const b = await readBody(req);
    certState.set(a.order_id, {
      serial: `AIW-${new Date().getFullYear()}-${a.order_id.replace(/^ord_/, "").slice(0, 8).toUpperCase()}-MOCK`,
      buyer_name: String(b.name || "Learner"),
      issued_at: new Date().toISOString(),
    });
    console.log(`[mock] certificate issued ${a.order_id}`);
    return json(res, 200, certView(a.order.id));
  }

  if (p === "/api/funnel/gated/certificate/pdf" && req.method === "GET") {
    const a = portalAuth(req);
    if (!a) return json(res, 401, { error: "session required" });
    const cert = certState.get(a.order_id);
    if (!cert) return json(res, 404, { error: "certificate not issued" });
    const pdf = placeholderPdf(
      `Certificate of Completion - ${cert.buyer_name} - AI for Office Work - ${cert.issued_at.slice(0, 10)} - serial ${cert.serial}`
    );
    res.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="certificate-of-completion.pdf"',
      "Content-Length": pdf.length,
    });
    return res.end(pdf);
  }

  if (p === "/api/funnel/gated/downloads" && req.method === "GET") {
    const a = portalAuth(req);
    if (!a) return json(res, 401, { error: "session required" });
    const ent = entitlements(a.order);
    const groups = [
      ["ai-office-course", ent.course],
      ["prompt-library-pack", ent.prompt_library],
      ["ai-creators-starter", ent.second_course],
    ];
    const exp = Date.now() + 24 * 3600 * 1000;
    const downloads = [];
    groups.forEach(([sku, allowed]) => {
      if (!allowed) return;
      (PORTAL_ASSETS[sku] || []).forEach((file) => {
        const sig = createHmac("sha256", ADMIN_TOKEN)
          .update(`${a.order_id}:${sku}:${exp}`).digest("hex").slice(0, 24);
        downloads.push({
          sku, file,
          url: `http://${HOST}:${PORT}/api/funnel/gated/dl/${file}?o=${a.order_id}&k=${sku}&e=${exp}&s=${sig}`,
          expires_at: exp,
        });
      });
    });
    return json(res, 200, { order_id: a.order_id, downloads });
  }

  m = p.match(/^\/api\/funnel\/gated\/dl\/([^/]+)$/);
  if (m && req.method === "GET") {
    const q = Object.fromEntries(url.searchParams);
    const want = createHmac("sha256", ADMIN_TOKEN)
      .update(`${q.o}:${q.k}:${q.e}`).digest("hex").slice(0, 24);
    let ok = false;
    try {
      ok = timingSafeEqual(Buffer.from(want), Buffer.from(String(q.s))) && Number(q.e) > Date.now();
    } catch { ok = false; }
    if (!ok) return json(res, 403, { error: "invalid or expired link" });
    const o = orders.get(q.o);
    const ent = o && entitlements(o);
    const allowed = o && (
      (q.k === "ai-office-course" && ent.course) ||
      (q.k === "prompt-library-pack" && ent.prompt_library) ||
      (q.k === "ai-creators-starter" && ent.second_course));
    if (!allowed || !(PORTAL_ASSETS[q.k] || []).includes(m[1]))
      return json(res, 403, { error: "not entitled" });
    const pdf = placeholderPdf(m[1].replace(/\.pdf$/, ""));
    res.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${m[1]}"`,
      "Content-Length": pdf.length,
    });
    return res.end(pdf);
  }

  json(res, 404, { error: "not found" });
});

server.listen(PORT, HOST, () => {
  console.log(`[funnel-api-mock] http://${HOST}:${PORT} rail=${RAIL} capi=${CAPI_TOKEN && PIXEL_ID ? "live" : "DRY_RUN"} origins=${ORIGINS.join(",")}`);
});
