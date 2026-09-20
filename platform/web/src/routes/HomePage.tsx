/**
 * Home page — Stage 0 placeholder.
 * Renders a health check against the API to prove the stack is wired up.
 */
import { useEffect, useState } from "react";
import { env } from "@/config/env";
import { useBranding } from "@/lib/branding";

type HealthState =
  | { status: "loading" }
  | { status: "ok"; data: Record<string, unknown> }
  | { status: "error"; message: string };

export function HomePage() {
  const branding = useBranding();
  const [health, setHealth] = useState<HealthState>({ status: "loading" });

  useEffect(() => {
    fetch(`${env.apiBaseUrl}/api/health`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setHealth({ status: "ok", data }))
      .catch((err: Error) => setHealth({ status: "error", message: err.message }));
  }, []);

  return (
    <section className="home">
      <h1>{branding.name}</h1>
      <p>{branding.tagline || "IELTS learning platform"}</p>

      <div className="health-card">
        <h2>API health</h2>
        {health.status === "loading" && <p>Checking…</p>}
        {health.status === "ok" && (
          <pre>{JSON.stringify(health.data, null, 2)}</pre>
        )}
        {health.status === "error" && (
          <p className="error">
            API unreachable: {health.message}
            <br />
            (Start the API: <code>uvicorn app.main:app --reload</code>)
          </p>
        )}
      </div>
    </section>
  );
}
