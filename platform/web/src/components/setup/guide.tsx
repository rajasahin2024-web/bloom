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
            The platform runs on PostgreSQL (with pgvector for the AI tutor)
            and optionally Redis. This wizard verifies both and saves the
            configuration to <code>platform/.env</code> — it never writes to
            the database. Schema migrations and the first administrator are
            created later with <code>platform/scripts/init-db.sh</code>.
          </p>
          <ul>
            <li>
              <b>Name the institute first</b> — its name, tagline and logo
              are pushed into core settings and shown across the app.
            </li>
            <li>
              <b>Collect the database credentials</b> — host, port,
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
    case "institute":
      return (
        <>
          <div className="wiz-guide-kicker">Core settings</div>
          <h3>Institute identity</h3>
          <ul>
            <li>
              <b>Name</b> appears on the sign-in pages, the admin console and
              the browser tab — it is the platform&apos;s public identity.
            </li>
            <li>
              <b>Tagline</b> is optional — a one-line subtitle shown beside
              the name.
            </li>
            <li>
              <b>Logo</b> is optional — PNG, JPEG or WebP up to 512KB. It is
              stored by the API and served at <code>/api/branding/logo</code>.
            </li>
            <li>
              These land in env-backed <b>core settings</b> at apply. Admin
              settings will manage them from the database in a later stage.
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

          <div className="wiz-guide-kicker">How to set up PgBouncer</div>
          <h3>PgBouncer in four steps</h3>
          <ul>
            <li>
              <b>1 · Easiest — Docker.</b> Run{" "}
              <code>edoburu/pgbouncer</code> with <code>DB_HOST</code>,{" "}
              <code>DB_NAME</code>, <code>DB_USER</code>,{" "}
              <code>DB_PASSWORD</code>, <code>POOL_MODE=transaction</code>{" "}
              and <code>LISTEN_PORT=6432</code>.{" "}
              <code>platform/docker-compose.yml</code> ships a working
              service you can copy.
            </li>
            <li>
              <b>2 · Manual install.</b> In <code>pgbouncer.ini</code>:{" "}
              <code>[databases]</code> →{" "}
              <code>bloom = host=127.0.0.1 dbname=bloom</code>;{" "}
              <code>[pgbouncer]</code> → <code>listen_port = 6432</code>,{" "}
              <code>pool_mode = transaction</code>,{" "}
              <code>auth_type = scram-sha-256</code>,{" "}
              <code>auth_file = userlist.txt</code>. Put the database user in{" "}
              <code>userlist.txt</code> as{" "}
              <code>&quot;bloom&quot; &quot;SCRAM…&quot;</code> (or the md5
              hash).
            </li>
            <li>
              <b>3 · Point the wizard at it.</b> Host + port{" "}
              <code>6432</code>, same database user/password, connection type{" "}
              <b>Via PgBouncer</b> — the test confirms the pooler through its
              admin console.
            </li>
            <li>
              <b>4 · After apply.</b> App queries use the pooler; migrations
              need the direct endpoint — point{" "}
              <code>DATABASE_URL_DIRECT</code> in <code>.env</code> at the raw
              Postgres host:port, then run{" "}
              <code>platform/scripts/init-db.sh</code>.
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
          <h3>Review &amp; apply</h3>
          <ul>
            <li>
              Confirm the endpoints match what you tested — apply re-runs the
              database check before writing anything.
            </li>
            <li>
              Apply only writes <code>platform/.env</code> — it never touches
              the database, then locks this wizard for good.
            </li>
            <li>
              The <b>first administrator</b> can be registered here (stored as{" "}
              <code>SEED_ADMIN_*</code>) or skipped entirely. Either way the
              account is created when you run{" "}
              <code>platform/scripts/init-db.sh</code>, which also runs the
              migrations.
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
              Sign in at <code>/admin</code> — you are being redirected there
              now.
            </li>
            <li>
              When the database should be initialized, run{" "}
              <code>platform/scripts/init-db.sh</code> once — it runs every
              migration in <code>api/alembic/versions</code> and seeds the
              admin (from <code>SEED_ADMIN_*</code> if the wizard collected
              it).
            </li>
          </ul>
        </>
      );
  }
}
