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

  json(res, 404, { error: "not found" });
});

server.listen(PORT, HOST, () => {
  console.log(`[funnel-api-mock] http://${HOST}:${PORT} rail=${RAIL} capi=${CAPI_TOKEN && PIXEL_ID ? "live" : "DRY_RUN"} origins=${ORIGINS.join(",")}`);
});
