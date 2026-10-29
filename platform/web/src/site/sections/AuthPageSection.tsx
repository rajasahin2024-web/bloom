import { useState, type FormEvent, type MouseEvent, type ReactNode } from "react";
import { ApiError } from "@/lib/api";
import { fetchMe, login, saveSession } from "@/lib/auth";
import { Icon } from "./Icon";
import { Inline } from "./shared";

interface AuthFeature {
  icon: string;
  title: string;
  body: string;
}

interface AuthRole {
  key: string;
  name: string;
  icon: string;
  sub: string;
}

interface FooterLink {
  label: string;
  mode: string;
}

interface AuthPageProps {
  brand: { name: string; tagline: string; logo_url: string; href: string };
  back_link: { label: string; href: string };
  aside: {
    eyebrow: string;
    heading: string;
    lead: string;
    features: AuthFeature[];
    quote: { text: string; author: string };
  };
  roles: AuthRole[];
  signin: {
    heading: string;
    lead: string;
    sso: { provider: string; icon: string }[];
    demo_note: string;
    footer_text: string;
    footer_link: FooterLink;
  };
  signup: {
    heading: string;
    lead: string;
    countries: (string | { label?: string })[];
    languages: (string | { label?: string })[];
    exams: { value: string; label: string }[];
    plans: { value: string; label: string }[];
    terms: string;
    submit_label: string;
    footer_text: string;
    footer_link: FooterLink;
  };
  forgot: {
    heading: string;
    lead: string;
    submit_label: string;
    success_heading: string;
    success_body: string;
  };
}

type Mode = "login" | "signup" | "forgot";

function toMode(m: string | null): Mode {
  return m === "signup" ? "signup" : m === "forgot" ? "forgot" : "login";
}

function qs(key: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(key);
}

const optLabel = (o: string | { label?: string }) =>
  typeof o === "object" && o !== null ? (o.label ?? "") : String(o);

/* Demo accounts from prototype/login.html — kept client-side so the page
   behaves exactly like the prototype. Real accounts fall through to the
   platform /api/auth/login below. */
const DEMO_ACCOUNTS = [
  { email: "student@bloomielts.com", pw: "bloom2026", role: "student", name: "Priya Sharma" },
  { email: "teacher@bloomielts.com", pw: "bloom2026", role: "teacher", name: "Dr. Elena Marchetti" },
  { email: "admin@bloomielts.com", pw: "bloom2026", role: "admin", name: "Administration" },
];

function SuccessPanel({
  icon,
  heading,
  children,
  onBack,
}: {
  icon: string;
  heading: string;
  children: ReactNode;
  onBack: () => void;
}) {
  return (
    <div style={{ textAlign: "center", padding: "20px 0" }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "var(--ok-soft)",
          color: "var(--ok)",
          display: "grid",
          placeItems: "center",
          fontSize: 22,
          margin: "0 auto 20px",
        }}
      >
        <Icon name={icon} size={22} />
      </div>
      <h1 style={{ fontSize: 26, letterSpacing: "-1px" }}><Inline text={heading} /></h1>
      <p style={{ fontSize: "14.5px", color: "var(--ink-3)", marginTop: 11, lineHeight: 1.7 }}>
        {children}
      </p>
      <button className="btn btn-ghost btn-lg" style={{ marginTop: 24 }} onClick={onBack}>
        Back to sign in
      </button>
    </div>
  );
}

/* The seed flattens the prototype's <b>/<code> demo note into plain text;
   restore the styling: leading label bold, emails + password in <code>. */
function DemoNote({ text }: { text: string }) {
  const m = text.match(/^(.+?)\s[—–:]\s*(.*)$/s);
  const head = m ? m[1] : null;
  const rest = m ? m[2] : text;
  const sep = text.match(/[—–:]/)?.[0] ?? "—";
  return (
    <div className="demo">
      {head && (
        <>
          <b>{head}</b>
          {` ${sep} `}
        </>
      )}
      {rest.split(/(\S+@\S+|bloom2026)/g).map((part, i) =>
        /\S+@\S+|bloom2026/.test(part) && part.length > 2 ? (
          <code key={i}>{part}</code>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </div>
  );
}

export function AuthPageSection({ props }: { props: AuthPageProps }) {
  const { brand, back_link, aside, roles, signin, signup, forgot } = props;
  const home = brand?.href || back_link?.href || "/";

  const [mode, setMode] = useState<Mode>(() => toMode(qs("mode")));
  const [role, setRole] = useState(() => {
    const want = qs("role");
    return roles?.some((r) => r.key === want) ? want! : roles?.[0]?.key || "student";
  });
  const [show, setShow] = useState(false);
  const [errText, setErrText] = useState("");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState(`${role}@bloomielts.com`);
  const [pw, setPw] = useState("bloom2026");
  const [done, setDone] = useState<"signin" | "signup" | "forgot" | null>(null);
  const [doneName, setDoneName] = useState("");

  const roleMeta = (roles ?? []).find((r) => r.key === role) ?? roles?.[0];
  const switchMode = (m: Mode) => (e: MouseEvent) => {
    e.preventDefault();
    setErrText("");
    setDone(null);
    setMode(m);
  };

  const pickRole = (key: string) => {
    setRole(key);
    setEmail(`${key}@bloomielts.com`);
    setPw("bloom2026");
    setErrText("");
  };

  function signedIn(name: string, roleKey: string) {
    if (roleKey === "admin") {
      window.location.assign("/admin");
      return;
    }
    setDoneName(name);
    setDone("signin");
    setBusy(false);
  }

  async function doLogin(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const em = email.trim().toLowerCase();
    const demo = DEMO_ACCOUNTS.find((a) => a.email === em);
    if (demo) {
      if (demo.pw !== pw) {
        setErrText("That password is not correct. Demo password: bloom2026");
        return;
      }
      if (demo.role !== role) {
        setErrText(
          `That account signs in as ${(roles ?? []).find((r) => r.key === demo.role)?.name.toLowerCase() ?? demo.role}. Switch the role above.`,
        );
        return;
      }
      setErrText("");
      setBusy(true);
      try {
        const res = await login(em, pw);
        const me = await fetchMe(res.tokens.access_token);
        saveSession({ user: me, tokens: res.tokens });
        signedIn(me.full_name || demo.name, me.role);
      } catch {
        signedIn(demo.name, demo.role);
      }
      return;
    }
    setErrText("");
    setBusy(true);
    try {
      const res = await login(em, pw);
      const me = await fetchMe(res.tokens.access_token);
      saveSession({ user: me, tokens: res.tokens });
      signedIn(me.full_name || em, me.role);
    } catch (err) {
      setErrText(
        err instanceof ApiError && (err.status === 401 || err.status === 400)
          ? "No account found for that email address and password."
          : err instanceof Error
            ? err.message
            : "Sign-in failed. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function doSignup(e: FormEvent) {
    e.preventDefault();
    const f = e.target as HTMLFormElement;
    const val = (name: string) =>
      (f.elements.namedItem(name) as HTMLInputElement | null)?.value.trim() ?? "";
    const name = val("suName");
    const em = val("suEmail");
    if (!name || !em) {
      setErrText("Please enter your name and email.");
      return;
    }
    if (val("suPw").length < 8) {
      setErrText("Your password needs at least eight characters.");
      return;
    }
    setErrText("");
    setBusy(true);
    // The learner portal isn't part of this build — the demo completes the
    // flow the way the prototype does instead of creating a real account.
    window.setTimeout(() => {
      setDoneName(name);
      setDone("signup");
      setBusy(false);
    }, 700);
  }

  function doForgot(e: FormEvent) {
    e.preventDefault();
    const f = e.target as HTMLFormElement;
    const em =
      (f.elements.namedItem("fgEmail") as HTMLInputElement | null)?.value.trim() ?? "";
    setDoneName(em);
    setDone("forgot");
  }

  return (
    <div className="auth">
      <aside className="aside">
        <a className="brand" href={home} style={{ marginBottom: "auto" }}>
          {brand?.logo_url && <img src={brand.logo_url} alt={brand.name} />}
          <div>
            <b style={{ color: "#fff" }}>{brand?.name}</b>
            <span style={{ color: "var(--leaf-300)" }}>{brand?.tagline}</span>
          </div>
        </a>

        <div style={{ maxWidth: 420 }}>
          <div className="eb" style={{ color: "var(--leaf-300)" }}>
            <Inline text={aside?.eyebrow} />
          </div>
          <h2 style={{ color: "#fff" }}><Inline text={aside?.heading} /></h2>
          {aside?.lead && (
            <p className="lead" style={{ color: "rgba(255,255,255,.7)", marginTop: 16 }}>
              <Inline text={aside.lead} />
            </p>
          )}

          <div style={{ display: "grid", gap: 14, marginTop: 34 }}>
            {(aside?.features ?? []).map((f, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 13,
                  alignItems: "center",
                  background: "rgba(255,255,255,.07)",
                  border: "1px solid rgba(255,255,255,.13)",
                  borderRadius: 14,
                  padding: "15px 17px",
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    flex: "0 0 34px",
                    borderRadius: 11,
                    background: "rgba(255,255,255,.14)",
                    color: "var(--leaf-300)",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Icon name={f.icon} />
                </div>
                <div style={{ color: "#fff" }}>
                  <b style={{ fontSize: "13.5px", display: "block" }}>{f.title}</b>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,.62)" }}>{f.body}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {aside?.quote && (aside.quote.text || aside.quote.author) && (
          <div
            style={{
              marginTop: "auto",
              paddingTop: 34,
              fontSize: "12.5px",
              color: "rgba(255,255,255,.5)",
            }}
          >
            <span style={{ color: "var(--leaf-300)", marginRight: 8 }}>
              <Icon name="quote-left" />
            </span>
            {aside.quote.text}
            {aside.quote.author && (
              <div style={{ marginTop: 9, color: "rgba(255,255,255,.72)", fontWeight: 700 }}>
                {aside.quote.author}
              </div>
            )}
          </div>
        )}
      </aside>

      <main className="apanel">
        <div className="aform">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 26,
            }}
          >
            <a
              href={back_link?.href || home}
              style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-4)" }}
            >
              <Icon name="arrow-left" /> {back_link?.label || "Back to site"}
            </a>
            <a className="brand" href={home} style={{ gap: 8 }}>
              {brand?.logo_url && (
                <img src={brand.logo_url} alt={brand.name} style={{ width: 26, height: 26 }} />
              )}
            </a>
          </div>

          {errText && (
            <div className="err">
              <Icon name="circle-info" />
              <span>{errText}</span>
            </div>
          )}

          {done === "forgot" && (
            <SuccessPanel
              icon="envelope-circle-check"
              heading={forgot?.success_heading || "Check your inbox"}
              onBack={() => {
                setDone(null);
                setMode("login");
              }}
            >
              {(forgot?.success_body || "If an account exists for {email}, a reset link is on its way.")
                .split("{email}")
                .map((part, i, arr) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && <b style={{ color: "var(--ink)" }}>{doneName}</b>}
                  </span>
                ))}
            </SuccessPanel>
          )}

          {(done === "signin" || done === "signup") && (
            <SuccessPanel
              icon="envelope-circle-check"
              heading={done === "signin" ? `Welcome back, ${doneName}.` : "Your account is ready."}
              onBack={() => {
                setDone(null);
                setMode("login");
              }}
            >
              This build covers the public site — the learner portal ships as a separate app.
            </SuccessPanel>
          )}

          {!done && mode === "login" && (
            <div>
              <h1 style={{ fontSize: 31, letterSpacing: "-1.3px" }}>
                <Inline text={signin?.heading} fallback={"Sign in"} />
              </h1>
              {signin?.lead && (
                <p style={{ fontSize: "14.5px", color: "var(--ink-3)", marginTop: 9, marginBottom: 26 }}>
                  <Inline text={signin.lead} />
                </p>
              )}

              <div className="roles">
                {(roles ?? []).map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    className={`rolebtn${role === r.key ? " on" : ""}`}
                    onClick={() => pickRole(r.key)}
                  >
                    <i>
                      <Icon name={r.icon} size={17} />
                    </i>
                    <b>{r.name}</b>
                    <span>{r.sub}</span>
                  </button>
                ))}
              </div>

              <form onSubmit={doLogin}>
                <div className="fg">
                  <label>Email address</label>
                  <input
                    type="email"
                    autoComplete="username"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="fg">
                  <label>Password</label>
                  <div className="pw">
                    <input
                      type={show ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Your password"
                      value={pw}
                      onChange={(e) => setPw(e.target.value)}
                      required
                    />
                    <button type="button" onClick={() => setShow(!show)} aria-label="Show password">
                      <Icon name={show ? "eye-slash" : "eye"} />
                    </button>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    margin: "4px 0 22px",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      fontSize: 13,
                      color: "var(--ink-2)",
                      cursor: "pointer",
                    }}
                  >
                    <input type="checkbox" defaultChecked /> Keep me signed in
                  </label>
                  <a href="#" onClick={switchMode("forgot")} style={{ fontSize: 13, fontWeight: 700 }}>
                    Forgot password?
                  </a>
                </div>
                <button
                  className="btn btn-p btn-lg"
                  type="submit"
                  disabled={busy}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {busy ? (
                    <>
                      <Icon name="circle-notch" className="spin" /> Signing in…
                    </>
                  ) : (
                    <>
                      <Icon name="arrow-right-to-bracket" /> Sign in
                      {roleMeta ? ` as ${roleMeta.name.toLowerCase()}` : ""}
                    </>
                  )}
                </button>
              </form>

              {(signin?.sso ?? []).length > 0 && (
                <>
                  <div className="hr">or</div>
                  <div style={{ display: "grid", gap: 9 }}>
                    {(signin?.sso ?? []).map((s, i) => (
                      <button
                        key={i}
                        className="btn btn-ghost"
                        style={{ width: "100%", justifyContent: "center" }}
                        onClick={() =>
                          setErrText("Single sign-on is not enabled on this demo account.")
                        }
                      >
                        <Icon name={s.icon} /> Continue with {s.provider}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {signin?.demo_note && <DemoNote text={signin.demo_note} />}

              {signin?.footer_link && (
                <div
                  style={{ textAlign: "center", marginTop: 24, fontSize: "13.5px", color: "var(--ink-3)" }}
                >
                  {signin.footer_text}{" "}
                  <a
                    href="#"
                    onClick={switchMode(toMode(signin.footer_link.mode))}
                    style={{ fontWeight: 700 }}
                  >
                    {signin.footer_link.label}
                  </a>
                </div>
              )}
            </div>
          )}

          {!done && mode === "signup" && (
            <div>
              <h1 style={{ fontSize: 31, letterSpacing: "-1.3px" }}>
                <Inline text={signup?.heading} fallback={"Create your account"} />
              </h1>
              {signup?.lead && (
                <p style={{ fontSize: "14.5px", color: "var(--ink-3)", marginTop: 9, marginBottom: 24 }}>
                  <Inline text={signup.lead} />
                </p>
              )}

              <form onSubmit={doSignup}>
                <div className="fg">
                  <label>Full name</label>
                  <input name="suName" placeholder="Your full name" autoComplete="name" required />
                </div>
                <div className="fg">
                  <label>Email address</label>
                  <input name="suEmail" type="email" placeholder="you@email.com" autoComplete="email" required />
                </div>
                <div className="fg">
                  <label>Password</label>
                  <div className="pw">
                    <input
                      name="suPw"
                      type={show ? "text" : "password"}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                    <button type="button" onClick={() => setShow(!show)} aria-label="Show password">
                      <Icon name={show ? "eye-slash" : "eye"} />
                    </button>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div className="fg">
                    <label>Country</label>
                    <select name="suCountry">
                      {(signup?.countries ?? []).map((c, i) => (
                        <option key={i}>{optLabel(c)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="fg">
                    <label>First language</label>
                    <select name="suL1">
                      {(signup?.languages ?? []).map((l, i) => (
                        <option key={i}>{optLabel(l)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="fg">
                  <label>Which exam are you preparing for?</label>
                  <select name="suExam">
                    {(signup?.exams ?? []).map((x, i) => (
                      <option key={i} value={x.value}>
                        {x.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="fg">
                  <label>
                    Course interest{" "}
                    <span
                      style={{
                        textTransform: "none",
                        letterSpacing: 0,
                        fontWeight: 500,
                        color: "var(--ink-4)",
                      }}
                    >
                      (you can change this later)
                    </span>
                  </label>
                  <select name="suPlan" defaultValue={qs("plan") || "PLUS"}>
                    {(signup?.plans ?? []).map((p, i) => (
                      <option key={i} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    fontSize: "12.5px",
                    color: "var(--ink-3)",
                    lineHeight: 1.55,
                    margin: "6px 0 20px",
                    cursor: "pointer",
                  }}
                >
                  <input type="checkbox" required style={{ marginTop: 3 }} />
                  <span>{signup?.terms}</span>
                </label>

                <button
                  className="btn btn-p btn-lg"
                  type="submit"
                  disabled={busy}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {busy ? (
                    <>
                      <Icon name="circle-notch" className="spin" /> Creating your account…
                    </>
                  ) : (
                    <>
                      <Icon name="seedling" /> {signup?.submit_label || "Create account"}
                    </>
                  )}
                </button>
              </form>

              {signup?.footer_link && (
                <div
                  style={{ textAlign: "center", marginTop: 24, fontSize: "13.5px", color: "var(--ink-3)" }}
                >
                  {signup.footer_text}{" "}
                  <a
                    href="#"
                    onClick={switchMode(toMode(signup.footer_link.mode))}
                    style={{ fontWeight: 700 }}
                  >
                    {signup.footer_link.label}
                  </a>
                </div>
              )}
            </div>
          )}

          {!done && mode === "forgot" && (
            <div>
              <h1 style={{ fontSize: 31, letterSpacing: "-1.3px" }}>
                <Inline text={forgot?.heading} fallback={"Reset your password"} />
              </h1>
              {forgot?.lead && (
                <p style={{ fontSize: "14.5px", color: "var(--ink-3)", marginTop: 9, marginBottom: 24 }}>
                  <Inline text={forgot.lead} />
                </p>
              )}
              <form onSubmit={doForgot}>
                <div className="fg">
                  <label>Email address</label>
                  <input name="fgEmail" type="email" placeholder="you@email.com" required />
                </div>
                <button
                  className="btn btn-p btn-lg"
                  type="submit"
                  style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
                >
                  <Icon name="paper-plane" /> {forgot?.submit_label || "Send reset link"}
                </button>
              </form>
              <div
                style={{ textAlign: "center", marginTop: 24, fontSize: "13.5px", color: "var(--ink-3)" }}
              >
                <a href="#" onClick={switchMode("login")} style={{ fontWeight: 700 }}>
                  Back to sign in
                </a>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
