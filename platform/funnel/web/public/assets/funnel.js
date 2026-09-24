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
  function req(method, path, body) {
    return fetch(API_BASE + path, {
      method: method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
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
    uuid: uuid,
    captureUtm: captureUtm,
    getUtm: getUtm,
    api: api,
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
