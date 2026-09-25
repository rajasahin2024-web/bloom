/* Minimal contract tests: mock-api endpoints + serve.js /config.js injection. */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const DIR = fileURLToPath(new URL(".", import.meta.url));
const API_PORT = 18090;
const WEB_PORT = 18081;
const API = `http://127.0.0.1:${API_PORT}`;
const WEB = `http://127.0.0.1:${WEB_PORT}`;

let apiProc, webProc;

function wait(url, tries = 40) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      fetch(url)
        .then((r) => resolve(r))
        .catch(() => (n <= 0 ? reject(new Error("timeout " + url)) : setTimeout(() => attempt(n - 1), 150)));
    };
    attempt(tries);
  });
}

before(async () => {
  apiProc = spawn("node", [join(DIR, "..", "mock-api.js")], {
    env: { ...process.env, PORT: String(API_PORT), HOST: "127.0.0.1", ALLOWED_ORIGINS: WEB },
    stdio: "ignore",
  });
  webProc = spawn("node", [join(DIR, "..", "serve.js")], {
    env: { ...process.env, PORT: String(WEB_PORT), HOST: "127.0.0.1", FUNNEL_API_BASE: API, META_PIXEL_ID: "" },
    stdio: "ignore",
  });
  await wait(`${API}/api/funnel/health`);
  await wait(`${WEB}/healthz`);
});

after(() => {
  apiProc?.kill();
  webProc?.kill();
});

test("config.js injects env config", async () => {
  const r = await fetch(`${WEB}/config.js`);
  const body = await r.text();
  assert.match(body, /FUNNEL_CONFIG=/);
  assert.match(body, new RegExp(API.replace(/[/.:]/g, "\\$&")));
});

test("clean URLs resolve to pages", async () => {
  for (const p of ["/", "/checkout", "/upsell", "/thanks"]) {
    const r = await fetch(WEB + p);
    assert.equal(r.status, 200, p);
    assert.match(r.headers.get("content-type"), /text\/html/);
  }
});

test("order contract: create -> settle -> upsell -> settle -> downloads", async () => {
  const create = await fetch(`${API}/api/funnel/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "t@example.com", bump: true, event_id: "evt_test_1" }),
  });
  assert.equal(create.status, 201);
  const order = await create.json();
  assert.equal(order.currency, "INR");
  assert.equal(order.rail, "mock");
  assert.equal(order.amount_paise, 29800); // 199 + 99 bump
  assert.ok(order.mock.settle_url);
  assert.ok(order.order_id);

  // downloads gated before payment
  const d0 = await fetch(`${API}/api/funnel/orders/${order.order_id}/downloads`);
  assert.equal(d0.status, 402);

  const settle = await fetch(`${API}${order.mock.settle_url}`, { method: "POST" });
  assert.equal(settle.status, 200);

  const got = await fetch(`${API}/api/funnel/orders/${order.order_id}`);
  const o = await got.json();
  assert.equal(o.status, "paid");
  assert.equal(o.items.length, 2);

  // upsell flow
  const up = await fetch(`${API}/api/funnel/orders/${order.order_id}/upsell`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event_id: "evt_test_2" }),
  });
  assert.equal(up.status, 201);
  const upBody = await up.json();
  assert.equal(upBody.amount_paise, 59900);
  const upSettle = await fetch(`${API}${upBody.mock.settle_url}`, { method: "POST" });
  assert.equal(upSettle.status, 200);

  const d1 = await fetch(`${API}/api/funnel/orders/${order.order_id}/downloads`);
  const dl = await d1.json();
  assert.equal(dl.files.length, 3);
  const file = await fetch(`${API}${dl.files[0].url}`);
  assert.equal(file.status, 200);
  assert.match(file.headers.get("content-type"), /application\/pdf/);
});

test("email validation enforced server-side", async () => {
  const r = await fetch(`${API}/api/funnel/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "not-an-email", bump: false, event_id: "x" }),
  });
  assert.equal(r.status, 422);
});

test("buyers.csv is admin-gated", async () => {
  const no = await fetch(`${API}/api/funnel/buyers.csv`);
  assert.equal(no.status, 401);
  const yes = await fetch(`${API}/api/funnel/buyers.csv`, {
    headers: { Authorization: "Bearer dev-admin-token" },
  });
  assert.equal(yes.status, 200);
  assert.match(await yes.text(), /t@example\.com/);
});

test("portal contract: login -> modules -> quiz -> progress -> certificate -> downloads", async () => {
  const json = { "Content-Type": "application/json" };
  const create = await fetch(`${API}/api/funnel/orders`, {
    method: "POST", headers: json,
    body: JSON.stringify({ email: "learner@example.com", bump: true, event_id: "evt_portal_1" }),
  });
  const order = await create.json();
  await fetch(`${API}${order.mock.settle_url}`, { method: "POST" });

  // login rejects bad creds / unknown orders
  const bad = await fetch(`${API}/api/funnel/gated/auth/login`, {
    method: "POST", headers: json,
    body: JSON.stringify({ email: "learner@example.com", order_id: "ord_nope" }),
  });
  assert.equal(bad.status, 401);

  const login = await fetch(`${API}/api/funnel/gated/auth/login`, {
    method: "POST", headers: json,
    body: JSON.stringify({ email: "learner@example.com", order_id: order.order_id }),
  });
  assert.equal(login.status, 200);
  const sess = await login.json();
  assert.ok(sess.token.startsWith("fns_"));
  assert.equal(sess.entitlements.course, true);
  assert.equal(sess.entitlements.prompt_library, true);   // bump purchased
  assert.equal(sess.entitlements.second_course, false);   // upsell skipped
  const auth = { Authorization: `Bearer ${sess.token}` };

  const me = await (await fetch(`${API}/api/funnel/gated/me`, { headers: auth })).json();
  assert.equal(me.email, "learner@example.com");
  assert.equal(me.entitlements.prompt_library, true);

  // gated endpoints require auth
  assert.equal((await fetch(`${API}/api/funnel/gated/modules`)).status, 401);

  const mods = await (await fetch(`${API}/api/funnel/gated/modules`, { headers: auth })).json();
  assert.equal(mods.modules.length, 6);
  assert.equal(mods.complete, false);
  assert.ok(mods.modules[0].videos[0].video_id);
  assert.equal(mods.modules[0].progress.passed, false);

  // module detail embeds no questions — quiz is a separate stripped resource
  const det = await (await fetch(`${API}/api/funnel/gated/modules/m1`, { headers: auth })).json();
  assert.equal(det.id, "m1");
  assert.ok(det.lesson_url);
  const lesson = await fetch(`${API}${det.lesson_url}`, { headers: auth });
  assert.equal(lesson.status, 200);
  assert.match(lesson.headers.get("content-type"), /text\/html/);

  const quiz = await (await fetch(`${API}/api/funnel/gated/modules/m1/quiz`, { headers: auth })).json();
  assert.ok(quiz.questions.length >= 2);
  assert.ok(!("answer" in quiz.questions[0]), "answers must not leak to the client");
  assert.ok(quiz.questions[0].options[0].id, "options carry ids");

  // failing attempt — all mock correct answers are option "a", so pick the last
  const wrong = {};
  quiz.questions.forEach((q) => { wrong[q.id] = q.options[q.options.length - 1].id; });
  const fail = await (await fetch(`${API}/api/funnel/gated/modules/m1/quiz/submit`, {
    method: "POST", headers: { ...auth, ...json }, body: JSON.stringify({ answers: wrong }),
  })).json();
  assert.equal(fail.passed, false);
  assert.equal(fail.total, quiz.questions.length);
  assert.equal(fail.module.attempts, 1);

  // pass every module
  for (const mod of mods.modules) {
    const q = await (await fetch(`${API}/api/funnel/gated/modules/${mod.id}/quiz`, { headers: auth })).json();
    const ans = {};
    q.questions.forEach((qq) => { ans[qq.id] = "a"; });
    const r = await (await fetch(`${API}/api/funnel/gated/modules/${mod.id}/quiz/submit`, {
      method: "POST", headers: { ...auth, ...json }, body: JSON.stringify({ answers: ans }),
    })).json();
    assert.equal(r.passed, true, mod.id);
  }

  const prog = await (await fetch(`${API}/api/funnel/gated/progress`, { headers: auth })).json();
  assert.equal(prog.complete, true);
  assert.equal(prog.modules_passed, 6);

  // certificate: eligible -> POST {name} issues -> pdf_url serves the PDF
  const cert = await (await fetch(`${API}/api/funnel/gated/certificate`, { headers: auth })).json();
  assert.equal(cert.eligible, true);
  assert.equal(cert.issued, false);
  const issue = await fetch(`${API}/api/funnel/gated/certificate`, {
    method: "POST", headers: { ...auth, ...json },
    body: JSON.stringify({ name: "Test Learner" }),
  });
  assert.equal(issue.status, 200);
  const cert2 = await issue.json();
  assert.equal(cert2.issued, true);
  assert.match(cert2.serial, /^AIW-/);
  const pdf = await fetch(cert2.pdf_url, { headers: auth });
  assert.equal(pdf.status, 200);
  assert.match(pdf.headers.get("content-type"), /application\/pdf/);

  // downloads: entitlement-filtered signed links (course+bump yes, upsell no)
  const dls = await (await fetch(`${API}/api/funnel/gated/downloads`, { headers: auth })).json();
  const skus = dls.downloads.map((d) => d.sku);
  assert.ok(skus.includes("ai-office-course"));
  assert.ok(skus.includes("prompt-library-pack"));
  assert.ok(!skus.includes("ai-creators-starter"));
  const file = await fetch(dls.downloads[0].url);
  assert.equal(file.status, 200);
  assert.match(file.headers.get("content-type"), /application\/pdf/);
});
