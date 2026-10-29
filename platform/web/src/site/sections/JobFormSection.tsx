import { useState, type FormEvent, type ReactNode } from "react";
import { apiFetch } from "@/lib/api";
import { Inline, Section } from "./shared";
import { Icon } from "./Icon";

interface JobFormProps {
  eyebrow: string;
  heading: string;
  lead: string;
  tips_heading: string;
  tips: { title: string; body: string }[];
  note: string;
  roles: { id: string; title?: string; label?: string }[];
  offices: { id: string; label: string }[];
  // T1 seeds ship plain string arrays; the site editor writes {label} items —
  // accept both shapes.
  countries: (string | { label: string })[];
  examiner_options: (string | { label: string })[];
  submit_label: string;
  footnote: string;
  success: { title: string; body: string; cta_label: string };
  whatsapp?: string;
}

/** Bold the "Applied" stage word inside the success lead sentence. */
function boldApplied(text: string): ReactNode {
  const i = text.indexOf("Applied");
  if (i === -1) return text;
  return (
    <>
      {text.slice(0, i)}
      <b>Applied</b>
      {text.slice(i + "Applied".length)}
    </>
  );
}

export function JobFormSection({ props }: { props: JobFormProps }) {
  const {
    eyebrow,
    heading,
    lead,
    tips_heading,
    tips,
    note,
    roles,
    offices,
    countries,
    examiner_options,
    submit_label,
    footnote,
    success,
    whatsapp = "+919008041720",
  } = props;
  const [done, setDone] = useState<{ ref: string; name: string; roleTitle: string } | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? "");
    const roleId = get("role") || "spec";
    const officeId = get("office");
    const roleTitle =
      (roles ?? []).find((r) => r.id === roleId)?.title ??
      (roles ?? []).find((r) => r.id === roleId)?.label ??
      "Speculative application";
    const officeName =
      (offices ?? []).find((o) => o.id === officeId)?.label || officeId || null;
    const fallbackRef = `BL-APP-${String(Date.now()).slice(-4)}`;
    // Real intake: POST /api/applications (stores the record + fires the HR
    // alert). The done panel shows either way — matching the prototype's
    // can't-fail UX — but the ref shown is the stored row's when it succeeds.
    let ref = fallbackRef;
    try {
      const { data } = await apiFetch<{ application: { ref: string } }>(
        "/api/applications",
        {
          method: "POST",
          body: {
            name: get("name").trim(),
            email: get("email"),
            phone: get("phone") || null,
            country: get("country") || null,
            vacancy: roleId === "spec" ? null : roleId,
            role_title: roleTitle,
            years: Number(get("years")) || 0,
            examiner: get("examiner") || null,
            office: officeId || null,
            office_name: officeName,
            cv: get("cv") || null,
            note: get("note").trim() || null,
            source: "careers page",
            idempotency_key: crypto.randomUUID(),
          },
        },
      );
      ref = data.application.ref;
    } catch {
      /* intake down — still confirm to the candidate */
    }
    setDone({ ref, name: get("name").trim(), roleTitle });
  }

  // Prototype splits the aside note into a bolded lead question + the rest.
  const noteSplit = (note ?? "").split("? ");
  const noteQ = noteSplit.length > 1 ? noteSplit[0] + "?" : null;
  const noteRest = noteSplit.length > 1 ? noteSplit.slice(1).join("? ") : (note ?? "");

  const successBody = success?.body ?? "";
  const dot = successBody.indexOf(". ");
  const successLead = dot === -1 ? successBody : successBody.slice(0, dot);
  const successRest = dot === -1 ? "" : successBody.slice(dot + 2);
  const waHref = done
    ? `https://wa.me/${whatsapp.replace(/[^\d]/g, "")}?text=${encodeURIComponent(
        `Hello Bloom HR, I have just applied for ${done.roleTitle}.\n\nName: ${done.name}\nRef: ${done.ref}`,
      )}`
    : "#";

  return (
    <Section id="apply">
      <div className="split" style={{ alignItems: "start" }}>
        <div className="rv">
          <div className="eb"><Inline text={eyebrow} /></div>
          <h2><Inline text={heading} /></h2>
          {lead && <p className="lead"><Inline text={lead} /></p>}
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
                {tips_heading || "What helps your application"}
              </div>
              <div style={{ display: "grid", gap: 11 }}>
                {tips.map((t, i) => (
                  <div key={i} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
                    <span style={{ color: "var(--leaf-500)", marginTop: 3, fontSize: 12 }}>
                      <Icon name="circle-check" size={12} />
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
          {note && (
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
                {noteQ && <b>{noteQ} </b>}
                {noteRest}
              </div>
            </div>
          )}
        </div>

        <div className="card rv" style={{ padding: "26px 28px" }}>
          {done === null ? (
            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div className="fg">
                  <label>Full name</label>
                  <input id="apName" name="name" required placeholder="Your name" />
                </div>
                <div className="fg">
                  <label>Email</label>
                  <input id="apEmail" name="email" type="email" required placeholder="you@email.com" />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
                <div className="fg">
                  <label>Phone / WhatsApp</label>
                  <input id="apPhone" name="phone" placeholder="+91 98450 11234" />
                </div>
                <div className="fg">
                  <label>Country</label>
                  <select id="apCountry" name="country" defaultValue="India">
                    {(countries ?? []).map((c, i) => (
                      <option key={i}>{typeof c === "string" ? c : c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="fg" style={{ marginTop: 14 }}>
                <label>Applying for</label>
                <select id="apRole" name="role">
                  {(roles ?? []).map((r, i) => (
                    <option key={r.id ?? i} value={r.id}>
                      {r.title ?? r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
                <div className="fg">
                  <label>Years of experience</label>
                  <input id="apYears" name="years" type="number" min={0} max={50} defaultValue={3} />
                </div>
                <div className="fg">
                  <label>Examiner status</label>
                  <select id="apExaminer" name="examiner">
                    {(examiner_options ?? []).map((s, i) => (
                      <option key={i}>{typeof s === "string" ? s : s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="fg" style={{ marginTop: 14 }}>
                <label>Where can you teach from?</label>
                <select id="apOffice" name="office">
                  {(offices ?? []).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="fg" style={{ marginTop: 14 }}>
                <label>Tell us about yourself</label>
                <textarea
                  id="apNote"
                  name="note"
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
                <input id="apCv" name="cv" placeholder="Google Drive, Dropbox or LinkedIn URL" />
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
              <h3 style={{ fontSize: 23, marginBottom: 11 }}>
                <Inline text={success?.title} fallback={"Application received"} />
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--ink-3)",
                  lineHeight: 1.7,
                  maxWidth: 400,
                  margin: "0 auto",
                }}
              >
                {boldApplied(successLead)}, with reference <b>{done.ref}</b>.
                {successRest ? ` ${successRest}` : ""}
              </p>
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
                  href={waHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Icon name="whatsapp" /> {success?.cta_label || "Message HR directly"}
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}
