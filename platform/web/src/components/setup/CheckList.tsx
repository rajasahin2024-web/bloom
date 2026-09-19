/**
 * Per-check results renderer for /test-database responses — each check
 * (tcp, auth, pgvector, pgbouncer) gets a pass/fail row with its detail.
 */
import type { DatabaseTestResult } from "@/lib/setup";
import { checkLabel } from "@/lib/wizard";
import { CheckIcon, XIcon } from "@/components/icons";

export function CheckList({ result }: { result: DatabaseTestResult }) {
  return (
    <>
      <ul className="wiz-checks" aria-live="polite">
        {result.checks.map((c, i) => (
          <li key={`${c.name}-${i}`}>
            <span className={`ic ${c.ok ? "ok-ic" : "bad-ic"}`}>
              {c.ok ? <CheckIcon size={13} /> : <XIcon size={12} />}
            </span>
            <span>
              <b>{checkLabel(c.name)}</b>
              {c.detail && <div className="det">{c.detail}</div>}
            </span>
          </li>
        ))}
      </ul>

      {result.postgres_version && (
        <div className="wiz-ver">{result.postgres_version}</div>
      )}

      {(result.ok || result.checks.length > 0) && (
        <div className="wiz-meta">
          <span className={`wiz-chip ${result.pgvector_installed ? "good" : "bad"}`}>
            {result.pgvector_installed ? "✓" : "✕"} pgvector
          </span>
          <span
            className={`wiz-chip ${result.pgbouncer_detected ? "good" : "info"}`}
          >
            {result.pgbouncer_detected ? "✓" : "·"} PgBouncer
            {result.pgbouncer_detected ? " detected" : " not detected"}
          </span>
        </div>
      )}

      {result.hint && (
        <div className={`fma-note ${result.ok ? "info" : ""}`} role="note">
          {result.hint}
        </div>
      )}
    </>
  );
}
