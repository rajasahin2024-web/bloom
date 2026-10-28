import { Head, Section } from "./shared";
import { fmtDate } from "../format";
import { Icon } from "./Icon";

interface FeatureItem {
  icon?: string;
  title: string;
  /** Small sub-line under the title (skillcard header, /ielts). */
  sub?: string;
  body: string;
  kind?: string;
  date?: string;
  /** Header background for skillcard mode (gradient string). */
  color?: string;
  /** Label/value rows inside a skillcard body. */
  rows?: { label?: string; value?: string }[];
  /** "Where it is won" tip box inside a skillcard body. */
  tip?: string;
}

interface FeatureGridProps {
  eyebrow?: string;
  heading: string;
  lead?: string;
  mid?: boolean;
  // "dark" (default, home/platform) keeps the dark feature band; "paper"
  // renders the light .feat cards with .ic-leaf icons (careers/blog).
  variant?: "paper" | "dark" | "tight";
  columns?: number;
  cta?: { label: string; href: string; icon?: string };
  pad_top?: number;
  pad_bottom?: number;
  features: FeatureItem[];
}

/* Items with `kind`/`date` render as news cards (blog "News & updates"
   `.card`s with a sky tag + mono date); items with `rows`/`tip`/`color`/`sub`
   render as `/ielts` `.skillcard`s; everything else is a `.feat` icon card. */
export function FeatureGridSection({ props }: { props: FeatureGridProps }) {
  const { eyebrow, heading, lead, mid, columns, cta, features } = props;
  const skills = (features ?? []).some((f) => f.rows || f.tip || f.color || f.sub);
  const dark = skills ? false : !props.variant || props.variant === "dark";
  const isNews = (features ?? []).some((f) => f.kind || f.date);

  if (skills) {
    return (
      <Section variant={props.variant} padTop={props.pad_top} padBottom={props.pad_bottom}>
        <Head eyebrow={eyebrow} heading={heading} lead={lead} mid={mid} />
        <div className={`grid g${columns || 4}`}>
          {(features ?? []).map((f, i) => (
            <div key={i} className="skillcard rv">
              <div className="hd" style={{ background: f.color }}>
                <div className="ic">
                  <Icon name={f.icon ?? "check"} />
                </div>
                <div>
                  <b>{f.title}</b>
                  <span>{f.sub}</span>
                </div>
              </div>
              <div className="bd">
                {(f.rows ?? []).map((r, j) => (
                  <div key={j} className="row">
                    <span>{r.label}</span>
                    <b>{r.value}</b>
                  </div>
                ))}
                {f.tip && (
                  <div className="tips">
                    <b>Where it is won</b>
                    {f.tip}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>
    );
  }

  return (
    <Section
      variant={dark ? "dark" : props.variant}
      id={dark ? "features" : undefined}
      padTop={props.pad_top}
      padBottom={props.pad_bottom}
    >
      <Head eyebrow={eyebrow} heading={heading} lead={lead} mid={mid} />
      <div
        className={`grid g${columns || 3}`}
        style={isNews ? { maxWidth: 900, margin: "0 auto" } : undefined}
      >
        {(features ?? []).map((f, i) =>
          f.kind || f.date ? (
            <div key={i} className="card rv" style={{ padding: 22 }}>
              <div
                style={{
                  display: "flex",
                  gap: 9,
                  alignItems: "center",
                  marginBottom: 11,
                }}
              >
                {f.kind && <span className="tag sky">{f.kind}</span>}
                {f.date && (
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 11,
                      color: "var(--ink-4)",
                      marginLeft: "auto",
                    }}
                  >
                    {fmtDate(f.date)}
                  </span>
                )}
              </div>
              <h3 style={{ fontSize: 17, lineHeight: 1.3, marginBottom: 9 }}>{f.title}</h3>
              <p style={{ fontSize: "13.5px", color: "var(--ink-3)", lineHeight: 1.65 }}>{f.body}</p>
            </div>
          ) : dark ? (
            <div
              key={i}
              className="feat rv"
              style={{
                background: "rgba(255,255,255,.06)",
                borderColor: "rgba(255,255,255,.14)",
                color: "#fff",
              }}
            >
              <div
                className="ic"
                style={{ background: "rgba(255,255,255,.14)", color: "var(--leaf-300)" }}
              >
                <Icon name={f.icon ?? "bullseye"} />
              </div>
              <h3>{f.title}</h3>
              <p style={{ color: "rgba(255,255,255,.7)" }}>{f.body}</p>
            </div>
          ) : (
            <div key={i} className="feat rv">
              <div className="ic ic-leaf">
                <Icon name={f.icon ?? "bullseye"} />
              </div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ),
        )}
      </div>
      {cta?.label && (
        <div style={{ textAlign: "center", marginTop: 44 }} className="rv">
          <a className={`btn ${dark ? "btn-white" : "btn-p"} btn-lg`} href={cta.href || "#"}>
            {cta.icon && <Icon name={cta.icon} />} {cta.label}
          </a>
        </div>
      )}
    </Section>
  );
}
