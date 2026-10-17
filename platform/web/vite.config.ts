import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    // Same-origin API calls in dev: the browser only ever talks to :5173,
    // so the dev server works over LAN/public IP without exposing :8000.
    proxy: {
      "/api": {
        // Inside docker-compose the API is reached by service name; on the
        // host it's localhost:8000.
        target: process.env.API_PROXY_TARGET ?? "http://localhost:8000",
        changeOrigin: true,
      },
      // Crawler-facing files are served by the API — proxy them so the dev
      // preview answers /sitemap.xml, /robots.txt and /llms.txt on :5173.
      "/sitemap.xml": {
        target: process.env.API_PROXY_TARGET ?? "http://localhost:8000",
        changeOrigin: true,
      },
      "/robots.txt": {
        target: process.env.API_PROXY_TARGET ?? "http://localhost:8000",
        changeOrigin: true,
      },
      "/llms.txt": {
        target: process.env.API_PROXY_TARGET ?? "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  test: {
    // jsdom is added by later stages when they write DOM/component tests.
    passWithNoTests: true,
  },
});
