/**
 * Per-step guide panel content — tells the operator where each value lives
 * (aaPanel paths for the client's hosting, docker paths for local dev).
 */
import type { StepId } from "@/lib/wizard";

export function GuideContent({ step }: { step: StepId }) {
  switch (step) {
    case "welcome":
      return (
        <>
          <div className="wiz-guide-kicker">Before you start</div>
          <h3>What this wizard does</h3>
          <p>
            Bloom runs on PostgreSQL (with pgvector for the AI tutor) and
            optionally Redis. This wizard verifies both, runs the database
            migrations, and creates the first administrator account.
          </p>
          <ul>
            <li>
              <b>Collect the database credentials first</b> — host, port,
              database name, username and password.
            </li>
            <li>
              Decide whether the app connects <b>directly to Postgres</b> or
              through <b>PgBouncer</b> (the recommended pooled path).
            </li>
            <li>
              Redis is optional but recommended — it powers OTPs, queues and
              caching. You can skip it and add it later.
            </li>
          </ul>
        </>
      );
    case "database":
      return (
        <>
          <div className="wiz-guide-kicker">Where to find these values</div>
          <h3>Database connection details</h3>
          <ul>
            <li>
              <b>aaPanel:</b> <code>Databases → PostgreSQL</code> lists every
              database with its username. The password is the one set when the
              database was created — or reset it from the same screen.
            </li>
            <li>
              <b>Host/port:</b> the server&apos;s IP or <code>localhost</code>{" "}
              when Postgres is on the same machine. The port is shown in
              aaPanel&apos;s PostgreSQL settings (default <code>5432</code>).
            </li>
            <li>
              <b>PgBouncer:</b> when installed via aaPanel/Docker it usually
              listens on <code>6432</code> — point the wizard at the pooler
              port and choose the <b>PgBouncer</b> connection type.
            </li>
            <li>
              <b>Docker dev stack:</b> direct Postgres is{" "}
              <code>localhost:5433</code>, PgBouncer is{" "}
              <code>localhost:6432</code>, credentials in{" "}
              <code>platform/.env</code>.
            </li>
            <li>
              The database must already exist and have the{" "}
              <b>pgvector extension</b> available — the test verifies it.
            </li>
          </ul>
        </>
      );
    case "redis":
      return (
        <>
          <div className="wiz-guide-kicker">Optional — recommended</div>
          <h3>Redis connection details</h3>
          <ul>
            <li>
              <b>aaPanel:</b> <code>App Store → Redis</code> shows the port
              (default <code>6379</code>) and the{" "}
              <code>requirepass</code> password in its configuration tab.
            </li>
            <li>
              <b>Docker dev stack:</b> <code>localhost:6380</code>, no
              password.
            </li>
            <li>
              Redis powers one-time passcodes, background jobs and caching.
              Skipping leaves those features off until you add it to{" "}
              <code>.env</code> later.
            </li>
          </ul>
        </>
      );
    case "review":
      return (
        <>
          <div className="wiz-guide-kicker">Final check</div>
          <h3>Review &amp; create the admin</h3>
          <ul>
            <li>
              Confirm the endpoints match what you tested — apply re-runs the
              database check before writing anything.
            </li>
            <li>
              The <b>first administrator</b> is created here. Use a real email
              and a strong password — this account can do everything.
            </li>
            <li>
              Apply writes <code>platform/.env</code>, runs migrations, seeds
              the admin, then locks this wizard for good.
            </li>
          </ul>
        </>
      );
    case "done":
      return (
        <>
          <div className="wiz-guide-kicker">Setup complete</div>
          <h3>What happens now</h3>
          <ul>
            <li>
              The platform is configured — every <code>/api/setup/*</code>{" "}
              endpoint now refuses further calls.
            </li>
            <li>
              Sign in at <code>/admin</code> with the administrator you just
              created.
            </li>
            <li>
              Student and teacher sign-in ships in a later stage — admin is
              the only entrance today.
            </li>
          </ul>
        </>
      );
  }
}
