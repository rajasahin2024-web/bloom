/**
 * /admin — dedicated admin sign-in.
 *
 * Visual port of prototype/FMA Admin.html's login screen: two-column layout,
 * hero side panel, floating-label inputs, show/hide password eye, same error
 * box — re-branded for Bloom and flattened to zero border-radius.
 * No register/create-account pane: admin self-registration is a security hole.
 */
import { useState } from "react";
import type { FormEvent } from "react";
import { ApiError } from "@/lib/api";
import { fetchMe, login, saveSession } from "@/lib/auth";
import type { AdminSession } from "@/lib/auth";
import { FloatField } from "@/components/FloatField";
import { ExternalIcon, SignInIcon } from "@/components/icons";

interface AdminLoginProps {
  onSuccess: (session: AdminSession) => void;
}

export function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  return (
    <div className="fma-login">
      <div className="fma-login-side">
        <div className="fma-crest">
          <img src="/assets/bloom-mark.png" alt="Bloom IELTS Academy" />
          <div>
            <strong>Bloom IELTS Academy</strong>
            <span>Admin Portal</span>
          </div>
        </div>
        <div className="fma-ls-min-body">
          <div className="fma-ls-eyebrow">IELTS 2026 · Enrolments open</div>
          <h1>
            The school for <em>English</em>, accepted all over the globe.
          </h1>
          <p>
            Reach your band with teachers who know the exam — structured IELTS
            preparation, writing &amp; speaking labs, and a study plan weighted
            to your weakest skill.
          </p>
          <div className="fma-hero-stats">
            <div>
              <b>2,840</b>
              <span>Students taught</span>
            </div>
            <div>
              <b>+1.4</b>
              <span>Avg band gain</span>
            </div>
            <div>
              <b>92%</b>
              <span>Hit target band</span>
            </div>
          </div>
          <div className="fma-ls-actions">
            <a className="fma-ls-site-link" href="/">
              Bloom Academy — home <ExternalIcon size={11} />
            </a>
          </div>
        </div>
      </div>

      <div className="fma-login-form">
        <div className="fma-login-form-inner">
          <div className="fma-eyebrow">Secure sign-in</div>
          <h2>Welcome back.</h2>
          <p className="fma-sub">
            Authenticate to continue to the admin console.
          </p>

          <div
            className={`fma-err${error ? " show" : ""}`}
            role="alert"
            aria-live="polite"
          >
            {error ?? ""}
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <FloatField
              label="Email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <FloatField
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button
              className="fma-btn fma-btn-primary fma-login-cta"
              type="submit"
              disabled={busy}
            >
              {busy ? (
                <>
                  <span className="wiz-spinner" /> Signing in…
                </>
              ) : (
                <>
                  <SignInIcon size={13} /> Sign In
                </>
              )}
            </button>
          </form>

          <div className="fma-login-foot">
            <span>Bloom IELTS Academy · admin portal</span>
            <span>Restricted to administrators</span>
          </div>
        </div>
      </div>
    </div>
  );
}
