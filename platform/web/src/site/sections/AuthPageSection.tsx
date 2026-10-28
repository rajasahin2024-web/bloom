import { useState, type FormEvent, type MouseEvent } from "react";
import { Icon } from "./Icon";

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

interface AuthPageProps {
  brand_name: string;
  brand_tagline: string;
  logo_url: string;
  home_href: string;
  eyebrow: string;
  heading: string;
  lead: string;
  features: AuthFeature[];
  quote: string;
  quote_author: string;
  roles: AuthRole[];
  countries: { label: string }[];
  languages: { label: string }[];
  exams: { value: string; label: string }[];
  plans: { value: string; label: string }[];
  notice: string;
}

type Mode = "login" | "signup" | "forgot";

function initialMode(): Mode {
  if (typeof window === "undefined") return "login";
  const m = new URLSearchParams(window.location.search).get("mode");
  return m === "signup" ? "signup" : m === "forgot" ? "forgot" : "login";
}

export function AuthPageSection({ props }: { props: AuthPageProps }) {
  const {
    brand_name,
    brand_tagline,
    logo_url,
    home_href,
    eyebrow,
    heading,
    lead,
    features,
    quote,
    quote_author,
    roles,
    countries,
    languages,
    exams,
    plans,
    notice,
  } = props;
  const [mode, setMode] = useState<Mode>(initialMode);
  const [role, setRole] = useState(roles?.[0]?.key || "student");
  const [show, setShow] = useState(false);
  const [errText, setErrText] = useState("");

  const roleMeta = (roles ?? []).find((r) => r.key === role) ?? roles?.[0];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setErrText(notice || "");
  };

  const switchMode = (m: Mode) => (e: MouseEvent) => {
    e.preventDefault();
    setErrText("");
    setMode(m);
  };

  return (
    <div className="auth">
      <aside className="aside">
        <a className="brand" href={home_href || "/"} style={{ marginBottom: "auto" }}>
          {logo_url && <img src={logo_url} alt={brand_name} />}
          <div>
            <b style={{ color: "#fff" }}>{brand_name}</b>
            <span style={{ color: "var(--leaf-300)" }}>{brand_tagline}</span>
          </div>
        </a>

        <div style={{ maxWidth: 420 }}>
          <div className="eb" style={{ color: "var(--leaf-300)" }}>
            {eyebrow}
          </div>
          <h2 style={{ color: "#fff" }}>{heading}</h2>
          {lead && (
            <p className="lead" style={{ color: "rgba(255,255,255,.7)", marginTop: 16 }}>
              {lead}
            </p>
          )}

          <div style={{ display: "grid", gap: 14, marginTop: 34 }}>
            {(features ?? []).map((f, i) => (
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

        {(quote || quote_author) && (
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
            {quote}
            {quote_author && (
              <div style={{ marginTop: 9, color: "rgba(255,255,255,.72)", fontWeight: 700 }}>
                {quote_author}
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
              href={home_href || "/"}
              style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-4)" }}
            >
              <Icon name="arrow-left" /> Back to site
            </a>
            <a className="brand" href={home_href || "/"} style={{ gap: 8 }}>
              {logo_url && <img src={logo_url} alt={brand_name} style={{ width: 26, height: 26 }} />}
            </a>
          </div>

          {errText && (
            <div className="err">
              <Icon name="circle-info" />
              <span>{errText}</span>
            </div>
          )}

          {mode === "login" && (
            <div>
              <h1 style={{ fontSize: 31, letterSpacing: "-1.3px" }}>Sign in</h1>
              <p style={{ fontSize: "14.5px", color: "var(--ink-3)", marginTop: 9, marginBottom: 26 }}>
                Choose how you are signing in, then enter your details.
              </p>

              <div className="roles">
                {(roles ?? []).map((r) => (
                  <button
                    key={r.key}
                    className={`rolebtn${role === r.key ? " on" : ""}`}
                    onClick={() => setRole(r.key)}
                  >
                    <i>
                      <Icon name={r.icon} size={17} />
                    </i>
                    <b>{r.name}</b>
                    <span>{r.sub}</span>
                  </button>
                ))}
              </div>

              <form onSubmit={submit}>
                <div className="fg">
                  <label>Email address</label>
                  <input type="email" autoComplete="username" placeholder="you@email.com" required />
                </div>
                <div className="fg">
                  <label>Password</label>
                  <div className="pw">
                    <input
                      type={show ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Your password"
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
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  <Icon name="arrow-right-to-bracket" /> Sign in
                  {roleMeta ? ` as ${roleMeta.name.toLowerCase()}` : ""}
                </button>
              </form>

              <div className="hr">or</div>
              <div style={{ display: "grid", gap: 9 }}>
                <button
                  className="btn btn-ghost"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => setErrText("Single sign-on is not enabled on this demo account.")}
                >
                  <Icon name="google" /> Continue with Google
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => setErrText("Single sign-on is not enabled on this demo account.")}
                >
                  <Icon name="microsoft" /> Continue with Microsoft
                </button>
              </div>

              <div className="demo">
                <b>Demo access</b> — all three accounts use the password <code>bloom2026</code>.
                <br />
                <code>student@bloomielts.com</code> · <code>teacher@bloomielts.com</code> ·{" "}
                <code>admin@bloomielts.com</code>
              </div>

              <div
                style={{ textAlign: "center", marginTop: 24, fontSize: "13.5px", color: "var(--ink-3)" }}
              >
                New to Bloom?{" "}
                <a href="#" onClick={switchMode("signup")} style={{ fontWeight: 700 }}>
                  Take the free placement test
                </a>
              </div>
            </div>
          )}

          {mode === "signup" && (
            <div>
              <h1 style={{ fontSize: 31, letterSpacing: "-1.3px" }}>Create your account</h1>
              <p style={{ fontSize: "14.5px", color: "var(--ink-3)", marginTop: 9, marginBottom: 24 }}>
                The placement test and your English profile are free. You can decide about a course
                afterwards.
              </p>

              <form onSubmit={submit}>
                <div className="fg">
                  <label>Full name</label>
                  <input placeholder="Your full name" autoComplete="name" required />
                </div>
                <div className="fg">
                  <label>Email address</label>
                  <input type="email" placeholder="you@email.com" autoComplete="email" required />
                </div>
                <div className="fg">
                  <label>Password</label>
                  <div className="pw">
                    <input
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
                    <select>
                      {(countries ?? []).map((c, i) => (
                        <option key={i}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="fg">
                    <label>First language</label>
                    <select>
                      {(languages ?? []).map((l, i) => (
                        <option key={i}>{l.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="fg">
                  <label>Which exam are you preparing for?</label>
                  <select>
                    {(exams ?? []).map((x, i) => (
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
                  <select>
                    {(plans ?? []).map((p, i) => (
                      <option key={i} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                    <option value="">Just the free placement test for now</option>
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
                  <span>
                    I agree to Bloom's terms and privacy policy. My data is stored on my own device
                    and I can export or erase it at any time.
                  </span>
                </label>

                <button
                  className="btn btn-p btn-lg"
                  type="submit"
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  <Icon name="seedling" /> Create account & start placement test
                </button>
              </form>

              <div
                style={{ textAlign: "center", marginTop: 24, fontSize: "13.5px", color: "var(--ink-3)" }}
              >
                Already have an account?{" "}
                <a href="#" onClick={switchMode("login")} style={{ fontWeight: 700 }}>
                  Sign in
                </a>
              </div>
            </div>
          )}

          {mode === "forgot" && (
            <div>
              <h1 style={{ fontSize: 31, letterSpacing: "-1.3px" }}>Reset your password</h1>
              <p style={{ fontSize: "14.5px", color: "var(--ink-3)", marginTop: 9, marginBottom: 24 }}>
                Enter the email on your account and we will send a reset link. It is valid for one
                hour.
              </p>
              <form onSubmit={submit}>
                <div className="fg">
                  <label>Email address</label>
                  <input type="email" placeholder="you@email.com" required />
                </div>
                <button
                  className="btn btn-p btn-lg"
                  type="submit"
                  style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
                >
                  <Icon name="paper-plane" /> Send reset link
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
