/* bloom-funnel-web — zero-dependency static server.
 *
 * Env:
 *   PORT            listen port (default 8080)
 *   HOST            listen host (default 0.0.0.0)
 *   FUNNEL_API_BASE backend base URL injected into /config.js
 *                   (default http://82.112.226.111:8090)
 *   META_PIXEL_ID   Meta Pixel id injected into /config.js (empty = stub mode)
 *
 * /config.js is generated per-request from env so the same build serves
 * dev/stage/prod without rebuild. Clean URLs: /checkout -> /checkout.html.
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "public");
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || "0.0.0.0";
const API_BASE = (process.env.FUNNEL_API_BASE || "http://82.112.226.111:8090").replace(/\/+$/, "");
const PIXEL_ID = process.env.META_PIXEL_ID || "";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".pdf": "application/pdf",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

function configJs() {
  return (
    "window.FUNNEL_CONFIG=" +
    JSON.stringify({ apiBase: API_BASE, pixelId: PIXEL_ID }) +
    ";"
  );
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    let path = decodeURIComponent(url.pathname);

    if (path === "/config.js") {
      const body = configJs();
      res.writeHead(200, {
        "Content-Type": MIME[".js"],
        "Cache-Control": "no-store",
        "Content-Length": Buffer.byteLength(body),
      });
      res.end(body);
      return;
    }

    if (path === "/healthz") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end('{"ok":true}');
      return;
    }

    // Clean URL -> file
    let file = normalize(join(ROOT, path));
    if (!file.startsWith(ROOT)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    let st = await stat(file).catch(() => null);
    if (st && st.isDirectory()) {
      file = join(file, "index.html");
      st = await stat(file).catch(() => null);
    }
    if (!st) {
      file = normalize(join(ROOT, path + ".html"));
      st = await stat(file).catch(() => null);
    }
    if (!st) {
      res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
      return;
    }

    const type = MIME[extname(file)] || "application/octet-stream";
    const isHtml = type.startsWith("text/html");
    const cache = isHtml
      ? "no-cache"
      : path.startsWith("/assets/")
        ? "public, max-age=3600"
        : "public, max-age=300";

    const acceptGzip = (req.headers["accept-encoding"] || "").includes("gzip");
    if (acceptGzip && st.size < 1024 * 1024 && /\.(html|css|js|svg|txt|xml|json)$/.test(file)) {
      const buf = gzipSync(await readFile(file));
      res.writeHead(200, {
        "Content-Type": type,
        "Content-Encoding": "gzip",
        "Cache-Control": cache,
        "Content-Length": buf.length,
      });
      res.end(buf);
      return;
    }

    res.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": cache,
      "Content-Length": st.size,
    });
    createReadStream(file).pipe(res);
  } catch (e) {
    res.writeHead(500, { "Content-Type": "text/plain" }).end("Server error");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[funnel-web] http://${HOST}:${PORT} api=${API_BASE} pixel=${PIXEL_ID || "(stub)"}`);
});
