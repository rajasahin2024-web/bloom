/**
 * /admin — dedicated admin sign-in.
 *
 * Visual port of prototype/login.html (the client's green Bloom sign-in):
 * leaf-green gradient side panel with brand, feature cards and testimonial;
 * white form panel with label-above fields and a show/hide password eye.
 * Admin-only — a static role tile instead of the student/teacher/admin
 * picker, and no self-registration (that would be a security hole).
 */
import { useId, useState } from "react";
import type { FormEvent } from "react";
import { ApiError } from "@/lib/api";
import { useBranding } from "@/lib/branding";
import { fetchMe, login, saveSession } from "@/lib/auth";
import type { AdminSession } from "@/lib/auth";
import {
  ArrowLeftIcon,
  ChartLineIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  QuoteLeftIcon,
  ShieldIcon,
  SignInIcon,
  UserPlusIcon,
} from "@/components/icons";

interface AdminLoginProps {
  onSuccess: (session: AdminSession) => void;
}

export function AdminLogin({ onSuccess }: AdminLoginProps) {
  const branding = useBranding();
  const emailId = useId();
  const pwId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await login(email.trim(), password);
      // Role gate: the admin console is admin-only — verify via /me.
      const me = await fetchMe(res.tokens.access_token);
      if (me.role !== "admin") {
        setError(
          "Access denied — this account does not have administrator access.",
        );
        return;
      }
      const session = { user: me, tokens: res.tokens };
      saveSession(session);
      onSuccess(session);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 400)) {
        setError("Invalid credentials. Please try again.");
      } else {
        setError(
          err instanceof Error ? err.message : "Sign-in failed. Try again.",
        );
      }
    } finally {
      setBusy(false);
    }
  }

  const logo = branding.logo_url ?? "/assets/bloom-mark.png";

  return (
    <div className="blm-auth">
      {/* ── left panel ── */}
      <aside className="blm-aside">
        <a className="blm-aside-brand" href="/">
          <img src={logo} alt={branding.name} />
          <div>
            <b>{branding.name}</b>
            <span>IELTS Academy</span>
          </div>
        </a>

        <div className="blm-aside-body">
          <div className="blm-eb">Welcome back</div>
          <h2>
            Every class, every student, <em>one console</em>.
          </h2>
          <p className="blm-aside-lead">
            Sign in to run {branding.name} — admissions, faculty, finance and
            the website, all from the same administration panel.
          </p>

          <div className="blm-feats">
            <div className="blm-feat">
              <div className="blm-feat-ic">
                <UserPlusIcon size={15} />
              </div>
              <div>
                <b>Admissions &amp; enrolments</b>
                <span>Every enquiry lands in one inbox</span>
              </div>
            </div>
            <div className="blm-feat">
              <div className="blm-feat-ic">
                <ShieldIcon size={15} />
              </div>
              <div>
                <b>Faculty &amp; live classes</b>
                <span>Teachers, rosters and the timetable</span>
              </div>
            </div>
            <div className="blm-feat">
              <div className="blm-feat-ic">
                <ChartLineIcon size={15} />
              </div>
              <div>
                <b>Reports &amp; operations</b>
                <span>Attendance, revenue and results</span>
              </div>
            </div>
          </div>
        </div>

        <div className="blm-aside-quote">
          <QuoteLeftIcon size={12} />
          Eleven weeks from Band 6.0 to 7.5. Having a real number instead of
          encouragement was what kept me going.
          <div className="blm-aside-quote-by">Priya Sharma · IELTS 7.5</div>
        </div>
      </aside>

      {/* ── form panel ── */}
      <main className="blm-panel">
        <div className="blm-aform">
          <div className="blm-aform-top">
            <a className="blm-back" href="/">
              <ArrowLeftIcon size={12} />
              Back to site
            </a>
            <img src={logo} alt={branding.name} />
          </div>

          <div
            className={`blm-err${error ? " show" : ""}`}
            role="alert"
            aria-live="polite"
          >
            {error ?? ""}
          </div>

          <h1>Sign in</h1>
          <p className="blm-sub">
            This console is restricted to {branding.name} administrators.
          </p>

          <div className="blm-rolecard">
            <ShieldIcon size={17} />
            <b>Admin</b>
            <span>Run the school</span>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="blm-fg">
              <label htmlFor={emailId}>Email address</label>
              <input
                id={emailId}
                type="email"
                autoComplete="username"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="blm-fg">
              <label htmlFor={pwId}>Password</label>
              <div className="blm-pw">
                <input
                  id={pwId}
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="blm-pw-eye"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  aria-pressed={showPw}
                >
                  {showPw ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
                </button>
              </div>
            </div>

            <button className="blm-btn" type="submit" disabled={busy}>
              {busy ? (
                <>
                  <span className="blm-spinner" /> Signing in…
                </>
              ) : (
                <>
                  <SignInIcon size={14} /> Sign in as admin
                </>
              )}
            </button>
          </form>

          <div className="blm-foot">
            <LockIcon size={11} /> {branding.name} · admin portal — restricted
            to administrators
          </div>
        </div>
      </main>
    </div>
  );
}
