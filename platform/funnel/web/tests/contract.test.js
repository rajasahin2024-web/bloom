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
