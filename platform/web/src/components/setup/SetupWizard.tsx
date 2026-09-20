/**
 * /setup — first-run setup wizard.
 *
 * Five steps: welcome → database → redis (optional) → review+apply → done.
 * Left guide panel explains where every value lives (aaPanel + docker paths);
 * right panel runs the step forms against the fixed /api/setup/* contract.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "@/lib/api";
import { applySetup, testDatabase, testRedis } from "@/lib/setup";
import {
  adminStepComplete,
  dbStepComplete,
  dbTargetFromForm,
  instituteStepComplete,
  redisStepComplete,
  redisTargetFromForm,
  STEPS,
  validateAdminForm,
  validateDbForm,
  validateRedisForm,
} from "@/lib/wizard";
import type { FieldErrors, StepId, WizardData } from "@/lib/wizard";
import { initialWizardData } from "@/lib/wizard";
import { GuideContent } from "@/components/setup/guide";
import { CheckList } from "@/components/setup/CheckList";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  ChevronIcon,
  ExternalIcon,
  GradCapIcon,
  InfoIcon,
  LockIcon,
  ServerIcon,
  XIcon,
} from "@/components/icons";

function StepError({ message }: { message: string | null }) {
  return (
    <div className={`fma-err${message ? " show" : ""}`} role="alert">
      {message ?? ""}
    </div>
  );
}

export function SetupWizard() {
  const [step, setStep] = useState<StepId>("welcome");
  const [data, setData] = useState<WizardData>(initialWizardData);
  const [errors, setErrors] = useState<FieldErrors<Record<string, unknown>>>({});
  const [stepError, setStepError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const eyebrow = `Step ${stepIndex + 1} of ${STEPS.length} · ${STEPS[stepIndex].title}`;

  function patch<K extends keyof WizardData>(key: K, value: WizardData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  // ── step 2: institute ───────────────────────────────────────────────
  function onLogoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      setErrors({ logoDataUrl: "Logo must be a PNG, JPEG or WebP image" });
      return;
    }
    if (file.size > 512 * 1024) {
      setErrors({ logoDataUrl: "Logo must be 512KB or smaller" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setData((d) => ({
        ...d,
        institute: {
          ...d.institute,
          logoDataUrl: String(reader.result),
          logoName: file.name,
        },
      }));
      setErrors({});
    };
    reader.readAsDataURL(file);
  }

  const instituteOk = instituteStepComplete(data);

  function go(next: StepId) {
    setErrors({});
    setStepError(null);
    setStep(next);
    setShowGuide(false);
  }

  // ── step 2: database ──────────────────────────────────────────────
  async function runDbTest() {
    const errs = validateDbForm(data.db);
    setErrors(errs);
    setStepError(null);
    if (Object.keys(errs).length > 0) return;
    const target = dbTargetFromForm(data.db);
    if (!target) return;
    setBusy("db");
    try {
      const result = await testDatabase(target);
      setData((d) => ({ ...d, dbResult: result, dbTestedTarget: target }));
      if (!result.ok) setStepError(result.error);
    } catch (err) {
      setData((d) => ({ ...d, dbResult: null, dbTestedTarget: null }));
      setStepError(err instanceof ApiError ? err.message : "Test failed.");
    } finally {
      setBusy(null);
    }
  }

  const dbOk = dbStepComplete(data);
  const dbStale =
    data.dbResult !== null && !dbOk && dbTargetFromForm(data.db) !== null;

  // ── step 3: redis ─────────────────────────────────────────────────
  async function runRedisTest() {
    const errs = validateRedisForm(data.redis);
    setErrors(errs);
    setStepError(null);
    if (Object.keys(errs).length > 0) return;
    const target = redisTargetFromForm(data.redis);
    if (!target) return;
    setBusy("redis");
    try {
      const result = await testRedis(target);
      setData((d) => ({
        ...d,
        redisResult: result,
        redisTestedTarget: target,
        redisSkipped: false,
      }));
      if (!result.ok) setStepError(result.error);
    } catch (err) {
      setData((d) => ({ ...d, redisResult: null, redisTestedTarget: null }));
      setStepError(err instanceof ApiError ? err.message : "Test failed.");
    } finally {
      setBusy(null);
    }
  }

  function skipRedis() {
    setData((d) => ({
      ...d,
      redisSkipped: true,
      redisResult: null,
      redisTestedTarget: null,
    }));
    setErrors({});
    setStepError(null);
  }

  const redisOk = redisStepComplete(data);

  // ── step 4: apply ─────────────────────────────────────────────────
  async function runApply() {
    const errs = validateAdminForm(data.admin);
    setErrors(errs);
    setStepError(null);
    if (Object.keys(errs).length > 0) return;
    const database = dbTargetFromForm(data.db);
    if (!database) return;
    const redis = data.redisSkipped ? null : redisTargetFromForm(data.redis);
    setBusy("apply");
    try {
      const result = await applySetup({
        database,
        redis,
        admin_email: data.admin.email.trim(),
        admin_password: data.admin.password,
        admin_name: data.admin.name.trim(),
        institute_name: data.institute.name.trim(),
        institute_tagline: data.institute.tagline.trim(),
        institute_logo: data.institute.logoDataUrl,
      });
      if (result.ok) {
        go("done");
      } else {
        setStepError(result.error ?? "Apply failed — please retry.");
      }
    } catch (err) {
      setStepError(
        err instanceof ApiError ? err.message : "Apply failed — please retry.",
      );
    } finally {
      setBusy(null);
    }
  }

  const adminOk = adminStepComplete(data);

  return (
    <div className="wiz">
      <div className="wiz-win">
        {/* ── Installer title bar ── */}
        <header className="wiz-titlebar">
          <span className="wiz-mark">
            <GradCapIcon size={17} />
          </span>
          <div className="wiz-titlebar-t">
            <strong>IELTS Installer</strong>
            <span>Setup wizard</span>
          </div>
          <span className="wiz-titlebar-tag">v0.1</span>
        </header>

        <div className="wiz-body">
          {/* ── Guide panel ── */}
          <aside className="wiz-guide">
        <div className="fma-crest">
          {data.institute.logoDataUrl ? (
            <img src={data.institute.logoDataUrl} alt="Institute logo" />
          ) : (
            <span className="wiz-mark">
              <GradCapIcon size={20} />
            </span>
          )}
          <div>
            <strong>{data.institute.name.trim() || "IELTS Installer"}</strong>
            <span>First-run setup</span>
          </div>
        </div>

        <ol className="wiz-steps" aria-label="Setup progress">
          {STEPS.map((s, i) => (
            <li
              key={s.id}
              className={i === stepIndex ? "on" : i < stepIndex ? "done" : ""}
              aria-current={i === stepIndex ? "step" : undefined}
            >
              <span className="n">
                {i < stepIndex ? <CheckIcon size={11} /> : i + 1}
              </span>
              {s.title}
            </li>
          ))}
        </ol>

        <button
          type="button"
          className="wiz-guide-toggle"
          onClick={() => setShowGuide((s) => !s)}
          aria-expanded={showGuide}
        >
          Where do I find these values?
          <ChevronIcon size={12} />
        </button>
        <div className={`wiz-guide-body${showGuide ? " show-mobile" : ""}`}>
          <GuideContent step={step} />
        </div>
      </aside>

      {/* ── Step panel ── */}
      <main className="wiz-main">
        <div className="wiz-main-inner">
          {step === "welcome" && (
            <>
              <div className="fma-eyebrow">{eyebrow}</div>
              <h2>Set up your platform.</h2>
              <p className="fma-sub">
                This one-time installer names the institute, connects the
                platform to its database and cache, runs the migrations, and
                creates the first administrator. It takes about two minutes.
              </p>
              <ul className="wiz-list">
                <li>
                  <GradCapIcon size={15} />
                  <span>
                    <b>Institute identity</b> — the name, tagline and logo
                    shown across the app.
                  </span>
                </li>
                <li>
                  <ServerIcon size={15} />
                  <span>
                    <b>PostgreSQL</b> — host, port, database name, username and
                    password. Direct or via PgBouncer.
                  </span>
                </li>
                <li>
                  <InfoIcon size={15} />
                  <span>
                    <b>Redis</b> — optional. Host, port and password if your
                    server sets one.
                  </span>
                </li>
                <li>
                  <LockIcon size={15} />
                  <span>
                    <b>First admin</b> — the email and password you will use to
                    sign in at <code>/admin</code>.
                  </span>
                </li>
              </ul>
              <div className="wiz-actions">
                <button
                  type="button"
                  className="fma-btn fma-btn-primary grow"
                  onClick={() => go("institute")}
                >
                  Get started <ArrowRightIcon size={12} />
                </button>
              </div>
            </>
          )}

          {step === "institute" && (
            <>
              <div className="fma-eyebrow">{eyebrow}</div>
              <h2>Name your institute.</h2>
              <p className="fma-sub">
                These details become the platform&apos;s public identity —
                sign-in pages and the admin console read them from core
                settings. Everything is editable later from admin settings.
              </p>

              <StepError message={stepError} />

              <div className={`fma-field${errors.name ? " invalid" : ""}`}>
                <label htmlFor="in-name">Institute name</label>
                <input
                  id="in-name"
                  value={data.institute.name}
                  onChange={(e) =>
                    patch("institute", { ...data.institute, name: e.target.value })
                  }
                  placeholder="e.g. Sunrise IELTS Academy"
                  autoComplete="organization"
                />
                {errors.name && (
                  <div className="fma-field-msg">{errors.name}</div>
                )}
              </div>

              <div className={`fma-field${errors.tagline ? " invalid" : ""}`}>
                <label htmlFor="in-tagline">Tagline (optional)</label>
                <input
                  id="in-tagline"
                  value={data.institute.tagline}
                  onChange={(e) =>
                    patch("institute", {
                      ...data.institute,
                      tagline: e.target.value,
                    })
                  }
                  placeholder="e.g. IELTS preparation that works"
                  autoComplete="off"
                />
                {errors.tagline && (
                  <div className="fma-field-msg">{errors.tagline}</div>
                )}
              </div>

              <div
                className={`fma-field${errors.logoDataUrl ? " invalid" : ""}`}
              >
                <label htmlFor="in-logo">Logo (optional)</label>
                {data.institute.logoDataUrl ? (
                  <div className="wiz-logo-pick">
                    <img
                      src={data.institute.logoDataUrl}
                      alt="Institute logo preview"
                    />
                    <span className="wiz-logo-name">
                      {data.institute.logoName}
                    </span>
                    <button
                      type="button"
                      className="fma-btn fma-btn-ghost wiz-logo-remove"
                      onClick={() =>
                        patch("institute", {
                          ...data.institute,
                          logoDataUrl: null,
                          logoName: null,
                        })
                      }
                      aria-label="Remove logo"
                    >
                      <XIcon size={11} />
                    </button>
                  </div>
                ) : (
                  <input
                    id="in-logo"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={onLogoPick}
                  />
                )}
                {errors.logoDataUrl && (
                  <div className="fma-field-msg">{errors.logoDataUrl}</div>
                )}
              </div>

              <div className="wiz-actions">
                <button
                  type="button"
                  className="fma-btn fma-btn-ghost"
                  onClick={() => go("welcome")}
                >
                  <ArrowLeftIcon size={12} /> Back
                </button>
                <button
                  type="button"
                  className="fma-btn fma-btn-primary grow"
                  onClick={() => go("database")}
                  disabled={!instituteOk}
                >
                  Continue <ArrowRightIcon size={12} />
                </button>
              </div>
            </>
          )}

          {step === "database" && (
            <>
              <div className="fma-eyebrow">{eyebrow}</div>
              <h2>Connect PostgreSQL.</h2>
              <p className="fma-sub">
                The database must already exist and have pgvector available —
                the test verifies connectivity, auth, the extension, and
                whether the endpoint is really PgBouncer.
              </p>

              <StepError message={stepError} />

              <div className="wiz-conn" role="radiogroup" aria-label="Connection type">
                <label className={data.db.connectionType === "direct" ? "on" : ""}>
                  <input
                    type="radio"
                    name="conn"
                    checked={data.db.connectionType === "direct"}
                    onChange={() =>
                      patch("db", { ...data.db, connectionType: "direct" })
                    }
                  />
                  <span>
                    <span className="t">Direct Postgres</span>
                    <div className="d">
                      Straight to the server — simplest setup, port 5432.
                    </div>
                  </span>
                </label>
                <label className={data.db.connectionType === "pgbouncer" ? "on" : ""}>
                  <input
                    type="radio"
                    name="conn"
                    checked={data.db.connectionType === "pgbouncer"}
                    onChange={() =>
                      patch("db", { ...data.db, connectionType: "pgbouncer" })
                    }
                  />
                  <span>
                    <span className="t">Via PgBouncer</span>
                    <div className="d">
                      Transaction pooling — recommended, usually port 6432.
                    </div>
                  </span>
                </label>
              </div>

              <details className="wiz-details">
                <summary>How do I set up PgBouncer?</summary>
                <div className="wiz-details-body">
                  <ol>
                    <li>
                      <b>Docker (easiest):</b> run <code>edoburu/pgbouncer</code>{" "}
                      with <code>DB_HOST</code>, <code>DB_NAME</code>,{" "}
                      <code>DB_USER</code>, <code>DB_PASSWORD</code>,{" "}
                      <code>POOL_MODE=transaction</code>,{" "}
                      <code>LISTEN_PORT=6432</code>.
                    </li>
                    <li>
                      <b>Manual:</b> <code>pgbouncer.ini</code> →{" "}
                      <code>[databases] bloom = host=… dbname=…</code>,{" "}
                      <code>listen_port = 6432</code>,{" "}
                      <code>pool_mode = transaction</code>,{" "}
                      <code>auth_file = userlist.txt</code>; add the user to{" "}
                      <code>userlist.txt</code>.
                    </li>
                    <li>
                      Point this form at the pooler (host + port{" "}
                      <code>6432</code>) and choose <b>Via PgBouncer</b> — the
                      test verifies it through the admin console.
                    </li>
                    <li>
                      Migrations need the <b>direct</b> Postgres endpoint —
                      set <code>DATABASE_URL_DIRECT</code> in <code>.env</code>{" "}
                      after apply.
                    </li>
                  </ol>
                </div>
              </details>

              <div className="wiz-grid-2">
                <div className={`fma-field${errors.host ? " invalid" : ""}`}>
                  <label htmlFor="db-host">Host</label>
                  <input
                    id="db-host"
                    value={data.db.host}
                    onChange={(e) =>
                      patch("db", { ...data.db, host: e.target.value })
                    }
                    placeholder="localhost or server IP"
                    autoComplete="off"
                  />
                  {errors.host && <div className="fma-field-msg">{errors.host}</div>}
                </div>
                <div className={`fma-field${errors.port ? " invalid" : ""}`}>
                  <label htmlFor="db-port">Port</label>
                  <input
                    id="db-port"
                    value={data.db.port}
                    onChange={(e) =>
                      patch("db", { ...data.db, port: e.target.value })
                    }
                    inputMode="numeric"
                    placeholder="5432"
                  />
                  {errors.port && <div className="fma-field-msg">{errors.port}</div>}
                </div>
              </div>

              <div className="wiz-grid-2 even">
                <div className={`fma-field${errors.database ? " invalid" : ""}`}>
                  <label htmlFor="db-name">Database</label>
                  <input
                    id="db-name"
                    value={data.db.database}
                    onChange={(e) =>
                      patch("db", { ...data.db, database: e.target.value })
                    }
                    placeholder="bloom"
                    autoComplete="off"
                  />
                  {errors.database && (
                    <div className="fma-field-msg">{errors.database}</div>
                  )}
                </div>
                <div className={`fma-field${errors.username ? " invalid" : ""}`}>
                  <label htmlFor="db-user">Username</label>
                  <input
                    id="db-user"
                    value={data.db.username}
                    onChange={(e) =>
                      patch("db", { ...data.db, username: e.target.value })
                    }
                    placeholder="bloom"
                    autoComplete="off"
                  />
                  {errors.username && (
                    <div className="fma-field-msg">{errors.username}</div>
                  )}
                </div>
              </div>

              <div className="fma-field">
                <label htmlFor="db-pass">Password</label>
                <input
                  id="db-pass"
                  type="password"
                  value={data.db.password}
                  onChange={(e) =>
                    patch("db", { ...data.db, password: e.target.value })
                  }
                  placeholder="••••••••"
                  autoComplete="off"
                />
              </div>

              <label className="wiz-toggle">
                <input
                  type="checkbox"
                  checked={data.db.ssl}
                  onChange={(e) =>
                    patch("db", { ...data.db, ssl: e.target.checked })
                  }
                />
                Require SSL (sslmode=require)
              </label>

              {data.dbResult && <CheckList result={data.dbResult} />}
              {dbStale && (
                <div className="fma-note info" role="note">
                  Connection details changed since the last test — re-run the
                  test to continue.
                </div>
              )}

              <div className="wiz-actions">
                <button
                  type="button"
                  className="fma-btn fma-btn-ghost"
                  onClick={() => go("institute")}
                >
                  <ArrowLeftIcon size={12} /> Back
                </button>
                <button
                  type="button"
                  className="fma-btn fma-btn-ghost"
                  onClick={runDbTest}
                  disabled={busy !== null}
                >
                  {busy === "db" ? <span className="wiz-spinner" /> : null}
                  Test connection
                </button>
                <button
                  type="button"
                  className="fma-btn fma-btn-primary grow"
                  onClick={() => go("redis")}
                  disabled={!dbOk}
                >
                  Continue <ArrowRightIcon size={12} />
                </button>
              </div>
            </>
          )}

          {step === "redis" && (
            <>
              <div className="fma-eyebrow">{eyebrow}</div>
              <h2>Connect Redis.</h2>
              <p className="fma-sub">
                Optional but recommended — Redis powers one-time passcodes,
                background jobs and caching. Skip it and add it later if you
                don&apos;t have a server yet.
              </p>

              <StepError message={stepError} />

              <div className="wiz-grid-2">
                <div className={`fma-field${errors.host ? " invalid" : ""}`}>
                  <label htmlFor="rd-host">Host</label>
                  <input
                    id="rd-host"
                    value={data.redis.host}
                    onChange={(e) =>
                      patch("redis", { ...data.redis, host: e.target.value })
                    }
                    placeholder="localhost"
                    autoComplete="off"
                  />
                  {errors.host && <div className="fma-field-msg">{errors.host}</div>}
                </div>
                <div className={`fma-field${errors.port ? " invalid" : ""}`}>
                  <label htmlFor="rd-port">Port</label>
                  <input
                    id="rd-port"
                    value={data.redis.port}
                    onChange={(e) =>
                      patch("redis", { ...data.redis, port: e.target.value })
                    }
                    inputMode="numeric"
                    placeholder="6379"
                  />
                  {errors.port && <div className="fma-field-msg">{errors.port}</div>}
                </div>
              </div>

              <div className="fma-field">
                <label htmlFor="rd-pass">Password (if required)</label>
                <input
                  id="rd-pass"
                  type="password"
                  value={data.redis.password}
                  onChange={(e) =>
                    patch("redis", { ...data.redis, password: e.target.value })
                  }
                  placeholder="leave empty for no auth"
                  autoComplete="off"
                />
              </div>

              {data.redisResult && (
                <div
                  className={`fma-note ${data.redisResult.ok ? "ok" : ""}`}
                  role="status"
                >
                  {data.redisResult.ok
                    ? "Redis answered PING — connection verified."
                    : data.redisResult.error}
                </div>
              )}
              {data.redisSkipped && (
                <div className="fma-note info" role="note">
                  Redis will be skipped. OTP, queue and cache features stay off
                  until REDIS_URL is added to .env later.
                </div>
              )}

              <div className="wiz-actions">
                <button
                  type="button"
                  className="fma-btn fma-btn-ghost"
                  onClick={() => go("database")}
                >
                  <ArrowLeftIcon size={12} /> Back
                </button>
                <button
                  type="button"
                  className="fma-btn fma-btn-ghost"
                  onClick={runRedisTest}
                  disabled={busy !== null}
                >
                  {busy === "redis" ? <span className="wiz-spinner" /> : null}
                  Test connection
                </button>
                <button
                  type="button"
                  className="fma-btn fma-btn-ghost"
                  onClick={skipRedis}
                  disabled={busy !== null}
                >
                  Skip Redis
                </button>
                <button
                  type="button"
                  className="fma-btn fma-btn-primary grow"
                  onClick={() => go("review")}
                  disabled={!redisOk}
                >
                  Continue <ArrowRightIcon size={12} />
                </button>
              </div>
            </>
          )}

          {step === "review" && (
            <>
              <div className="fma-eyebrow">{eyebrow}</div>
              <h2>Review, then apply.</h2>
              <p className="fma-sub">
                Applying re-tests the database, runs migrations, seeds the
                first administrator and writes <code>platform/.env</code>. The
                wizard locks permanently afterwards.
              </p>

              <StepError message={stepError} />

              <div className="wiz-review">
                <dl>
                  <dt>Institute</dt>
                  <dd>
                    {data.institute.name}
                    {data.institute.tagline
                      ? ` — ${data.institute.tagline}`
                      : ""}
                    {data.institute.logoDataUrl ? " · logo attached" : ""}
                  </dd>
                  <dt>Database</dt>
                  <dd>
                    {data.db.username}@{data.db.host}:{data.db.port}/
                    {data.db.database}
                    {data.db.ssl ? " (ssl)" : ""}
                  </dd>
                  <dt>Connection</dt>
                  <dd>
                    {data.db.connectionType === "pgbouncer"
                      ? "PgBouncer (transaction pooling)"
                      : "Direct Postgres"}
                  </dd>
                  <dt>Redis</dt>
                  <dd>
                    {data.redisSkipped
                      ? "skipped"
                      : `${data.redis.host}:${data.redis.port}`}
                  </dd>
                </dl>
              </div>

              <div className="fma-field">
                <label htmlFor="ad-name">Administrator name</label>
                <input
                  id="ad-name"
                  value={data.admin.name}
                  onChange={(e) =>
                    patch("admin", { ...data.admin, name: e.target.value })
                  }
                  placeholder="Full name"
                  autoComplete="name"
                  className={errors.name ? "invalid" : ""}
                />
                {errors.name && <div className="fma-field-msg">{errors.name}</div>}
              </div>
              <div className="wiz-grid-2 even">
                <div className={`fma-field${errors.email ? " invalid" : ""}`}>
                  <label htmlFor="ad-email">Admin email</label>
                  <input
                    id="ad-email"
                    type="email"
                    value={data.admin.email}
                    onChange={(e) =>
                      patch("admin", { ...data.admin, email: e.target.value })
                    }
                    placeholder="admin@example.com"
                    autoComplete="email"
                  />
                  {errors.email && (
                    <div className="fma-field-msg">{errors.email}</div>
                  )}
                </div>
                <div className={`fma-field${errors.password ? " invalid" : ""}`}>
                  <label htmlFor="ad-pass">Admin password</label>
                  <input
                    id="ad-pass"
                    type="password"
                    value={data.admin.password}
                    onChange={(e) =>
                      patch("admin", { ...data.admin, password: e.target.value })
                    }
                    placeholder="minimum 8 characters"
                    autoComplete="new-password"
                  />
                  {errors.password && (
                    <div className="fma-field-msg">{errors.password}</div>
                  )}
                </div>
              </div>

              <div className="wiz-actions">
                <button
                  type="button"
                  className="fma-btn fma-btn-ghost"
                  onClick={() => go("redis")}
                >
                  <ArrowLeftIcon size={12} /> Back
                </button>
                <button
                  type="button"
                  className="fma-btn fma-btn-gold grow"
                  onClick={runApply}
                  disabled={busy !== null || !adminOk || !dbOk || !redisOk}
                >
                  {busy === "apply" ? (
                    <span className="wiz-spinner" />
                  ) : (
                    <LockIcon size={12} />
                  )}
                  Apply setup
                </button>
              </div>
            </>
          )}

          {step === "done" && (
            <>
              <div className="wiz-done-badge">
                <CheckIcon size={26} />
              </div>
              <div className="fma-eyebrow">{eyebrow}</div>
              <h2>{data.institute.name.trim() || "Your platform"} is configured.</h2>
              <p className="fma-sub">
                Migrations ran, the first administrator was created, the
                institute settings were saved and <code>platform/.env</code>{" "}
                was written. This wizard is now locked — every setup endpoint
                refuses further calls.
              </p>
              <div className="wiz-actions">
                <Link
                  to="/admin"
                  className="fma-btn fma-btn-primary grow"
                >
                  Go to admin sign-in <ExternalIcon size={11} />
                </Link>
              </div>
            </>
          )}
          </div>
        </main>
        </div>

        {/* ── Installer status bar ── */}
        <footer className="wiz-statusbar">
          <span className="wiz-statusbar-step">
            Step {stepIndex + 1} of {STEPS.length} · {STEPS[stepIndex]?.title}
          </span>
          <div
            className="wiz-progress"
            role="progressbar"
            aria-valuenow={stepIndex + 1}
            aria-valuemin={1}
            aria-valuemax={STEPS.length}
            aria-label="Setup progress"
          >
            <i
              style={{
                width: `${((stepIndex + 1) / STEPS.length) * 100}%`,
              }}
            />
          </div>
        </footer>
      </div>
    </div>
  );
}
