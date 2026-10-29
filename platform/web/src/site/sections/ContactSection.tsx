import { useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import { Inline, Section } from "./shared";
import { Icon } from "./Icon";

interface ContactField {
  key: string;
  label: string;
  kind: string;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  half?: boolean;
  options?: string[];
}

interface ContactProps {
  eyebrow?: string;
  heading: string;
  body: string;
  phone?: string;
  email?: string;
  address?: string;
  map_url?: string;
  form_enabled?: boolean;
  primary_btn?: { label: string; href: string; icon?: string };
  secondary_btn?: { label: string; href: string };
  // layout: "page" — the standalone /contact page (prototype/contact.html):
  // form card + Direct / Office hours / Visit us sidebar column.
  layout?: string;
  top_pad?: boolean;
  form?: {
    fields: ContactField[];
    submit_label: string;
    footnote: string;
    success: {
      title: string;
      body: string;
      cta_label: string;
      alt_cta?: { label: string; href: string; icon?: string };
    };
  };
  details?: { icon: string; label: string; value: string; href: string }[];
  hours?: { days: string; time: string }[];
  hours_note?: string;
  office?: { heading: string; photo_url: string };
  whatsapp?: string;
}

const FIELD_TEXTAREA_STYLE = {
  border: "1.5px solid var(--line-2)",
  borderRadius: 12,
  padding: "13px 15px",
  fontFamily: "inherit",
  fontSize: "14.5px",
  background: "var(--surface)",
  color: "var(--ink)",
  width: "100%",
  resize: "vertical",
} as const;

function ContactPage({ props }: { props: ContactProps }) {
  const { eyebrow, heading, body, form, details, hours, hours_note, office, address } = props;
  const [done, setDone] = useState<{ name: string; interest: string; ref: string } | null>(null);
  const waTeam = (props.whatsapp || "+919008041720").replace(/[^\d]/g, "");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? "");
    const fallbackRef = `ENQ-${String(Date.now()).slice(-4)}`;
    // Real intake: POST /api/enquiries (stores the enquiry + fires the
    // alert). The done panel shows either way — matching the prototype's
    // can't-fail UX — but the ref shown is the stored row's when it succeeds.
    let ref = fallbackRef;
    try {
      const { data } = await apiFetch<{ enquiry: { ref: string } }>(
        "/api/enquiries",
        {
          method: "POST",
          body: {
            name: get("name"),
            email: get("email"),
            phone: get("phone") || null,
            country: get("country") || null,
            interest: get("interest") || null,
            band: get("band") || null,
            target: get("target") || null,
            message: get("message") || null,
            source: "website",
            idempotency_key: crypto.randomUUID(),
          },
        },
      );
      ref = data.enquiry.ref;
    } catch {
      /* intake down — still confirm to the visitor */
    }
    setDone({ name: get("name"), interest: get("interest"), ref });
  }

  const waHref = done
    ? `https://wa.me/${waTeam}?text=${encodeURIComponent(
        `Hello Bloom, I have just sent an enquiry from your website.\n\nName: ${done.name}\nInterested in: ${done.interest}\nRef: ${done.ref}`,
      )}`
    : "#";

  // Group the field list: consecutive `half` fields share a 1fr 1fr row,
  // everything else takes a full-width .fg row (prototype/contact.html).
  const rows: ContactField[][] = [];
  for (const f of form?.fields ?? []) {
    const last = rows[rows.length - 1];
    if (f.half && last && last.every((x) => x.half) && last.length < 2) last.push(f);
    else rows.push([f]);
  }

  return (
    <section
      className="sec"
      id="contact"
      style={props.top_pad ? { paddingTop: "calc(var(--nav-h) + 54px)" } : undefined}
    >
      <div className="wrap">
        <div className="head rv">
          {eyebrow && <div className="eb"><Inline text={eyebrow} /></div>}
          <h2><Inline text={heading} /></h2>
          {body && <p className="lead">{body}</p>}
        </div>
        <div className="split" style={{ alignItems: "start" }}>
          <div className="card rv" style={{ padding: 30 }}>
            {done === null ? (
              <form onSubmit={handleSubmit}>
                {rows.map((row, ri) =>
                  row.length === 2 ? (
                    <div
                      key={ri}
                      style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
                    >
                      {row.map((f) => (
                        <Field key={f.key} field={f} />
                      ))}
                    </div>
                  ) : (
                    row.map((f) => <Field key={f.key} field={f} />)
                  ),
                )}
                <button
                  className="btn btn-p btn-lg"
                  type="submit"
                  style={{ width: "100%", justifyContent: "center", marginTop: 6 }}
                >
                  <Icon name="paper-plane" /> {form?.submit_label || "Send"}
                </button>
                {form?.footnote && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--ink-4)",
                      marginTop: 12,
                      textAlign: "center",
                    }}
                  >
                    {form.footnote}
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
                <h3 style={{ fontSize: 23, marginBottom: 11 }}><Inline text={form?.success?.title} /></h3>
                <p
                  style={{
                    fontSize: 14,
                    color: "var(--ink-3)",
                    lineHeight: 1.7,
                    maxWidth: 400,
                    margin: "0 auto",
                  }}
                >
                  {form?.success?.body}
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
                    <Icon name="whatsapp" /> {form?.success?.cta_label}
                  </a>
                </div>
                {form?.success?.alt_cta && (
                  <a
                    className="btn btn-p btn-lg"
                    style={{ marginTop: 22 }}
                    href={form.success.alt_cta.href}
                  >
                    <Icon name={form.success.alt_cta.icon || "seedling"} />{" "}
                    {form.success.alt_cta.label}
                  </a>
                )}
              </div>
            )}
          </div>
          <div style={{ display: "grid", gap: 16 }}>
            {(details ?? []).length > 0 && (
              <div className="card rv" style={{ padding: 26 }}>
                <div className="eb">Direct</div>
                <div style={{ display: "grid", gap: 14, marginTop: 6 }}>
                  {details!.map((d, i) => (
                    <a
                      key={i}
                      href={d.href}
                      style={{ display: "flex", gap: 13, alignItems: "center" }}
                    >
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          flex: "0 0 34px",
                          borderRadius: 11,
                          background: "var(--leaf-100)",
                          color: "var(--leaf-700)",
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        <Icon name={d.icon} />
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 10,
                            letterSpacing: "1.4px",
                            textTransform: "uppercase",
                            color: "var(--ink-4)",
                            fontWeight: 800,
                          }}
                        >
                          {d.label}
                        </div>
                        <div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--ink)" }}>
                          {d.value}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
            {(hours ?? []).length > 0 && (
              <div className="card rv" style={{ padding: 26 }}>
                <div className="eb">Office hours</div>
                <div style={{ display: "grid", gap: 9, fontSize: "13.5px", marginTop: 6 }}>
                  {hours!.map((h, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 14,
                        paddingBottom: 9,
                        borderBottom: "1px dashed var(--line)",
                      }}
                    >
                      <span style={{ color: "var(--ink-3)" }}>{h.days}</span>
                      <b style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{h.time}</b>
                    </div>
                  ))}
                </div>
                {hours_note && (
                  <div
                    style={{
                      marginTop: 16,
                      padding: "13px 15px",
                      background: "var(--leaf-50)",
                      borderRadius: 11,
                      fontSize: "12.5px",
                      color: "var(--ink-2)",
                      lineHeight: 1.6,
                    }}
                  >
                    <span style={{ color: "var(--leaf-600)", marginRight: 7 }}>
                      <Icon name="globe" />
                    </span>
                    {hours_note}
                  </div>
                )}
              </div>
            )}
            <div className="card rv" style={{ padding: 26 }}>
              <div className="eb"><Inline text={office?.heading} fallback={"Visit us"} /></div>
              {address && (
                <div
                  style={{ fontSize: 14, lineHeight: 1.7, color: "var(--ink-2)", marginTop: 6 }}
                >
                  {address.split(", ").map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              )}
              <div
                style={{
                  marginTop: 14,
                  height: 150,
                  borderRadius: 12,
                  background: "var(--paper-2)",
                  position: "relative",
                  overflow: "hidden",
                  border: "1px solid var(--line)",
                }}
              >
                {office?.photo_url && (
                  <img
                    src={office.photo_url}
                    alt="Bloom office"
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({ field: f }: { field: ContactField }) {
  return (
    <div className="fg">
      <label>
        {f.label}
        {f.hint ? (
          <>
            {" "}
            <span
              style={{
                textTransform: "none",
                letterSpacing: 0,
                fontWeight: 500,
                color: "var(--ink-4)",
              }}
            >
              ({f.hint})
            </span>
          </>
        ) : null}
      </label>
      {f.kind === "select" ? (
        <select name={f.key} required={f.required}>
          {(f.options ?? []).map((o, i) => (
            <option key={i}>{o}</option>
          ))}
        </select>
      ) : f.kind === "textarea" ? (
        <textarea
          name={f.key}
          rows={4}
          required={f.required}
          placeholder={f.placeholder}
          style={FIELD_TEXTAREA_STYLE}
        />
      ) : (
        <input
          name={f.key}
          type={f.kind === "email" ? "email" : "text"}
          required={f.required}
          placeholder={f.placeholder}
        />
      )}
    </div>
  );
}

export function ContactSection({ props }: { props: ContactProps }) {
  if (props.layout === "page") return <ContactPage props={props} />;
  const { heading, body, phone, email, address, map_url, form_enabled, primary_btn, secondary_btn } =
    props;
  return (
    <Section id="contact">
      <div className="band rv">
        <div className="eb" style={{ justifyContent: "center", color: "var(--leaf-300)" }}>
          Start here
        </div>
        <h2 style={{ maxWidth: 640, margin: "0 auto" }}><Inline text={heading} /></h2>
        {body && (
          <p className="lead" style={{ margin: "18px auto 0", color: "rgba(255,255,255,.76)" }}>
            {body}
          </p>
        )}
        {(primary_btn || secondary_btn) && (
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
              marginTop: 32,
            }}
          >
            {primary_btn && (
              <a className="btn btn-white btn-lg" href={primary_btn.href}>
                {primary_btn.icon && <Icon name={primary_btn.icon} />} {primary_btn.label}
              </a>
            )}
            {secondary_btn && (
              <a className="btn btn-line btn-lg" href={secondary_btn.href}>
                {secondary_btn.label}
              </a>
            )}
          </div>
        )}
        <div style={{ display: "flex", gap: 26, justifyContent: "center", flexWrap: "wrap", marginTop: 30, fontSize: "12.5px", color: "rgba(255,255,255,.6)" }}>
          {email && (
            <span>
              <Icon name="envelope" /> {email}
            </span>
          )}
          {phone && (
            <span>
              <Icon name="phone" /> {phone}
            </span>
          )}
          {address && (
            <span>
              <Icon name="location-dot" /> {address}
            </span>
          )}
        </div>
        {form_enabled && map_url && (
          <div style={{ marginTop: 24 }}>
            <iframe
              src={map_url}
              title="Map"
              style={{ width: "100%", height: 300, border: 0, borderRadius: 14 }}
              loading="lazy"
            />
          </div>
        )}
      </div>
    </Section>
  );
}
