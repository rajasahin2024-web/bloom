/* Bloom IELTS funnel — shared runtime.
 * Exposes window.Funnel: config, fbq tracking (Meta Pixel w/ event_id dedup),
 * API client for the /api/funnel contract, rail dispatch (razorpay|mock). */
(function () {
  "use strict";

  var CFG = window.FUNNEL_CONFIG || {};
  var API_BASE = (CFG.apiBase || "http://82.112.226.111:8090").replace(/\/+$/, "");
  var PIXEL_ID = CFG.pixelId || "";

  /* ---------- Meta Pixel ---------- */
  var pixelReady = false;
  function initPixel() {
    if (window.fbq) return;
    var n = (window.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    });
    n.queue = [];
    n.loaded = false;
    n.version = "2.0";
    if (PIXEL_ID) {
      var s = document.createElement("script");
      s.async = true;
      s.src = "https://connect.facebook.net/en_US/fbevents.js";
      document.head.appendChild(s);
      n("init", PIXEL_ID);
      pixelReady = true;
    } else {
      n("init", "000000000000000");
      console.info("[funnel] META_PIXEL_ID not set - fbq stub mode");
    }
  }
  initPixel();

  function track(event, params, eventId) {
    var p = params || {};
    if (!("currency" in p)) p.currency = "INR";
    var opts = eventId ? { eventID: eventId } : undefined;
    try {
      if (opts) window.fbq("track", event, p, opts);
      else window.fbq("track", event, p);
      if (!pixelReady) console.info("[funnel] fbq(stub) " + event, p, opts || "");
    } catch (e) {
      console.warn("[funnel] fbq failed", e);
    }
  }

  function trackCustom(event, params) {
    try {
      window.fbq("trackCustom", event, params || {});
      if (!pixelReady) console.info("[funnel] fbq(stub) custom " + event, params || {});
    } catch (e) {
      console.warn("[funnel] fbq failed", e);
    }
  }

  /* ---------- ids / utm ---------- */
  function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  var UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"];
  function captureUtm() {
    try {
      var q = new URLSearchParams(location.search);
      var stored = JSON.parse(sessionStorage.getItem("funnel_utm") || "{}");
      UTM_KEYS.forEach(function (k) {
        var v = q.get(k);
        if (v) stored[k] = v;
      });
      sessionStorage.setItem("funnel_utm", JSON.stringify(stored));
      return stored;
    } catch (e) {
      return {};
    }
  }
  function getUtm() {
    try {
      return JSON.parse(sessionStorage.getItem("funnel_utm") || "{}");
    } catch (e) {
      return {};
    }
  }

  /* ---------- API client (contract: /api/funnel/*) ---------- */
  function req(method, path, body, token) {
    var headers = {};
    if (body) headers["Content-Type"] = "application/json";
    if (token) headers["Authorization"] = "Bearer " + token;
    return fetch(API_BASE + path, {
      method: method,
      headers: Object.keys(headers).length ? headers : undefined,
      body: body ? JSON.stringify(body) : undefined,
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) {
          var err = new Error(j.error || j.message || "Request failed (" + r.status + ")");
          err.status = r.status;
          throw err;
        }
        return j;
      });
    });
  }

  /* Meta browser cookies (_fbp/_fbc) improve CAPI match quality — the backend
   * accepts them on order/upsell create. Absent when the pixel never loaded. */
  function cookie(name) {
    var m = document.cookie.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : undefined;
  }
  function fbCtx() {
    return { fbp: cookie("_fbp"), fbc: cookie("_fbc") };
  }

  var api = {
    createOrder: function (email, bump, eventId, utm) {
      return req("POST", "/api/funnel/orders", Object.assign({
        email: email, bump: !!bump, event_id: eventId, utm: utm || undefined,
      }, fbCtx()));
    },
    getOrder: function (id) { return req("GET", "/api/funnel/orders/" + encodeURIComponent(id)); },
    mockSettle: function (id) {
      return req("POST", "/api/funnel/orders/" + encodeURIComponent(id) + "/mock-settle");
    },
    upsell: function (id, eventId) {
      return req("POST", "/api/funnel/orders/" + encodeURIComponent(id) + "/upsell",
        Object.assign({ event_id: eventId }, fbCtx()));
    },
    downloads: function (id) {
      return req("GET", "/api/funnel/orders/" + encodeURIComponent(id) + "/downloads");
    },
  };

  /* ---------- learner portal session + gated API (contract: /api/funnel/gated/*)
   * Session token is minted by POST /gated/auth/login (email + order_id) on
   * the sibling backend (TEC-121) and stored in sessionStorage — closing the
   * tab ends the session, no cookies needed. */
  var PORTAL_KEY = "funnel_portal_session";
  function saveSession(sess) {
    try { sessionStorage.setItem(PORTAL_KEY, JSON.stringify(sess)); } catch (e) {}
  }
  function getSession() {
    try { return JSON.parse(sessionStorage.getItem(PORTAL_KEY) || "null"); }
    catch (e) { return null; }
  }
  function clearSession() {
    try { sessionStorage.removeItem(PORTAL_KEY); } catch (e) {}
  }
  function portalToken() {
    var s2 = getSession();
    return s2 && s2.token ? s2.token : null;
  }
  /* Redirect guard for gated pages — sends the visitor to /login when there
   * is no session, preserving the target as ?next=. Returns the token. */
  function requireSession() {
    var t = portalToken();
    if (!t) {
      var next = encodeURIComponent(location.pathname + location.search);
      location.href = "/login?next=" + next;
      return null;
    }
    return t;
  }

  var portal = {
    login: function (email, orderId) {
      return req("POST", "/api/funnel/gated/auth/login", { email: email, order_id: orderId });
    },
    /* Magic links aren't a separate backend endpoint — the link carries the
     * session token itself; /gated/me validates it on the next call. */
    loginToken: function (magicToken) {
      return Promise.resolve({ token: magicToken });
    },
    me: function () { return req("GET", "/api/funnel/gated/me", null, portalToken()); },
    modules: function () { return req("GET", "/api/funnel/gated/modules", null, portalToken()); },
    module: function (id) {
      return req("GET", "/api/funnel/gated/modules/" + encodeURIComponent(id), null, portalToken());
    },
    quiz: function (id) {
      return req("GET", "/api/funnel/gated/modules/" + encodeURIComponent(id) + "/quiz", null, portalToken());
    },
    submitQuiz: function (id, answers) {
      return req("POST", "/api/funnel/gated/modules/" + encodeURIComponent(id) + "/quiz/submit",
        { answers: answers }, portalToken());
    },
    /* lesson_url is a gated FileResponse — fetch with the bearer and inject,
     * since iframes can't send Authorization headers. */
    lessonHtml: function (lessonUrl) {
      var url = /^https?:/.test(lessonUrl) ? lessonUrl : API_BASE + lessonUrl;
      return fetch(url, { headers: { Authorization: "Bearer " + (portalToken() || "") } })
        .then(function (r) { return r.ok ? r.text() : null; })
        .catch(function () { return null; });
    },
    progress: function () { return req("GET", "/api/funnel/gated/progress", null, portalToken()); },
    certificate: function () { return req("GET", "/api/funnel/gated/certificate", null, portalToken()); },
    issueCertificate: function (name) {
      return req("POST", "/api/funnel/gated/certificate", { name: name }, portalToken());
    },
    downloads: function () { return req("GET", "/api/funnel/gated/downloads", null, portalToken()); },
  };

  /* ---------- payment rail dispatch ---------- */
  var rzpPromise = null;
  function loadRazorpay() {
    if (rzpPromise) return rzpPromise;
    rzpPromise = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = resolve;
      s.onerror = function () { reject(new Error("Could not load payment SDK. Check your connection.")); };
      document.head.appendChild(s);
    });
    return rzpPromise;
  }

  /* Settle a backend-created payment. onPaid() runs once confirmed. */
  function settle(order, ctx, onPaid, onError) {
    ctx = ctx || {};
    if (order.rail === "razorpay" && order.razorpay && order.razorpay.order_id) {
      loadRazorpay().then(function () {
        var rzp = new window.Razorpay({
          key: order.razorpay.key_id,
          order_id: order.razorpay.order_id,
          amount: order.razorpay.amount_paise || order.amount_paise,
          currency: "INR",
          name: "Bloom Academy",
          description: ctx.description || "IELTS eBook",
          prefill: { email: ctx.email || "" },
          theme: { color: "#e8590c" },
          handler: function () { onPaid(); },
          modal: { ondismiss: function () { onError(new Error("Payment cancelled.")); } },
        });
        rzp.on("payment.failed", function (resp) {
          onError(new Error((resp.error && resp.error.description) || "Payment failed."));
        });
        rzp.open();
      }).catch(onError);
      return;
    }
    var settleUrl = order.mock && order.mock.settle_url;
    var p = settleUrl
      ? fetch(/^https?:/.test(settleUrl) ? settleUrl : API_BASE + settleUrl, { method: "POST" })
          .then(function (r) {
            if (!r.ok) throw new Error("Settle failed (" + r.status + ")");
            return r.json().catch(function () { return {}; });
          })
      : api.mockSettle(order.order_id);
    p.then(function () { onPaid(); }).catch(onError);
  }

  /* ---------- misc ---------- */
  function qs(name) { return new URLSearchParams(location.search).get(name); }
  function inr(paise) { return "₹" + (paise / 100).toLocaleString("en-IN"); }
  function el(id) { return document.getElementById(id); }
  function showError(node, msg) {
    if (!node) return;
    node.textContent = msg;
    node.hidden = !msg;
  }

  window.Funnel = {
    apiBase: API_BASE,
    pixelId: PIXEL_ID,
    track: track,
    trackCustom: trackCustom,
    uuid: uuid,
    captureUtm: captureUtm,
    getUtm: getUtm,
    api: api,
    portal: portal,
    saveSession: saveSession,
    getSession: getSession,
    clearSession: clearSession,
    requireSession: requireSession,
    settle: settle,
    qs: qs,
    inr: inr,
    el: el,
    showError: showError,
    /* CAPI dedup convention (README):
       InitiateCheckout event_id = uuid on submit, POSTed as event_id.
       Purchase event_id = "purchase_" + order_id ("_upsell" for upsell). */
    purchaseEventId: function (orderId, isUpsell) {
      return "purchase_" + orderId + (isUpsell ? "_upsell" : "");
    },
  };
})();
