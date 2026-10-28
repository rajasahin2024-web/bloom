import { useState } from "react";
import { Section } from "./shared";
import { Icon } from "./Icon";

interface JobFormProps {
  eyebrow: string;
  heading: string;
  lead: string;
  tips_title: string;
  tips: { title: string; body: string }[];
  aside_note: string;
  roles: { label: string }[];
  countries: { label: string }[];
  offices: { label: string }[];
  examiner_statuses: { label: string }[];
  submit_label: string;
  footnote: string;
  whatsapp: string;
}

export function JobFormSection({ props }: { props: JobFormProps }) {
  const {
    eyebrow,
    heading,
    lead,
    tips_title,
    tips,
    aside_note,
    roles,
    countries,
    offices,
    examiner_statuses,
    submit_label,
    footnote,
    whatsapp,
  } = props;
  const [ref, setRef] = useState<string | null>(null);

  return (
    <Section id="apply">
      <div className="split" style={{ alignItems: "start" }}>
        <div className="rv">
          <div className="eb">{eyebrow}</div>
          <h2>{heading}</h2>
          {lead && <p className="lead">{lead}</p>}
          {(tips ?? []).length > 0 && (
            <div className="card" style={{ marginTop: 24, padding: "20px 22px" }}>
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: "1.6px",
                  textTransform: "uppercase",
                  color: "var(--leaf-700)",
                  fontWeight: 800,
                  marginBottom: 13,
                }}
              >
                {tips_title || "What helps your application"}
              </div>
              <div style={{ display: "grid", gap: 11 }}>
                {tips.map((t, i) => (
                  <div key={i} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
                    <span style={{ color: "var(--leaf-500)", marginTop: 3, fontSize: 12 }}>
                      <Icon name="check" size={12} />
                    </span>
                    <div>
                      <b style={{ fontSize: 13, display: "block" }}>{t.title}</b>
                      <span style={{ fontSize: 12, color: "var(--ink-4)", lineHeight: 1.5 }}>
                        {t.body}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {aside_note && (
            <div
              className="card"
              style={{
                marginTop: 13,
                padding: "18px 22px",
                background: "var(--leaf-50)",
                borderColor: "var(--leaf-200)",
              }}
            >
              <div style={{ fontSize: "12.5px", color: "var(--ink-2)", lineHeight: 1.7 }}>
                {aside_note}
              </div>
            </div>
          )}
        </div>

        <div className="card rv" style={{ padding: "26px 28px" }}>
          {ref === null ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setRef(`BL-APP-${String(Date.now()).slice(-4)}`);
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div className="fg">
                  <label>Full name</label>
                  <input required placeholder="Your name" />
                </div>
                <div className="fg">
                  <label>Email</label>
                  <input type="email" required placeholder="you@email.com" />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
                <div className="fg">
                  <label>Phone / WhatsApp</label>
                  <input placeholder="+91 98450 11234" />
                </div>
                <div className="fg">
                  <label>Country</label>
                  <select>
                    {(countries ?? []).map((c, i) => (
                      <option key={i}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="fg" style={{ marginTop: 14 }}>
                <label>Applying for</label>
                <select>
                  {(roles ?? []).map((r, i) => (
                    <option key={i}>{r.label}</option>
                  ))}
                  <option>Speculative — no specific role</option>
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
                <div className="fg">
                  <label>Years of experience</label>
                  <input type="number" min={0} max={50} defaultValue={3} />
                </div>
                <div className="fg">
                  <label>Examiner status</label>
                  <select>
                    {(examiner_statuses ?? []).map((s, i) => (
                      <option key={i}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="fg" style={{ marginTop: 14 }}>
                <label>Where can you teach from?</label>
                <select>
                  {(offices ?? []).map((o, i) => (
                    <option key={i}>{o.label}</option>
                  ))}
                  <option>🌍 Remote — any time zone</option>
                </select>
              </div>
              <div className="fg" style={{ marginTop: 14 }}>
                <label>Tell us about yourself</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Which part of the exam you want to own, a number that shows your impact, and why Bloom."
                />
              </div>
              <div className="fg" style={{ marginTop: 14 }}>
                <label>
                  Link to your CV{" "}
                  <span
                    style={{
                      textTransform: "none",
                      letterSpacing: 0,
                      fontWeight: 500,
                      color: "var(--ink-4)",
                    }}
                  >
                    (optional)
                  </span>
                </label>
                <input placeholder="Google Drive, Dropbox or LinkedIn URL" />
              </div>
              <button
                className="btn btn-p btn-lg"
                type="submit"
                style={{ width: "100%", justifyContent: "center", marginTop: 20 }}
              >
                <Icon name="paper-plane" /> {submit_label || "Submit application"}
              </button>
              {footnote && (
                <div style={{ fontSize: 12, color: "var(--ink-4)", marginTop: 12, textAlign: "center" }}>
                  {footnote}
                </div>
              )}
            </form>
          ) : (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: "50%",
                  background: "var(--ok-soft)",
                  color: "var(--ok)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 23,
                  margin: "0 auto 20px",
                }}
              >
                <Icon name="check" size={23} />
              </div>
              <h3 style={{ fontSize: 23, marginBottom: 11 }}>Application received</h3>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--ink-3)",
                  lineHeight: 1.7,
                  maxWidth: 400,
                  margin: "0 auto",
                }}
              >
                Your application is in our hiring pipeline at the <b>Applied</b> stage, with
                reference <b>{ref}</b>. We will be in touch within two working days.
              </p>
              {whatsapp && (
                <div
                  style={{
                    display: "flex",
                    gap: 9,
                    justifyContent: "center",
                    flexWrap: "wrap",
                    marginTop: 20,
                  }}
                >
                  <a
                    className="btn btn-lg"
                    style={{ background: "#25D366", color: "#fff" }}
                    href={`https://wa.me/${whatsapp.replace(/[^\d]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Icon name="whatsapp" /> Message HR directly
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}
