import { Head, Section } from "./shared";
import { Icon } from "./Icon";

interface CourseFeature {
  text: string;
  included: boolean;
}

interface Course {
  icon: string;
  icon_tone?: string;
  name: string;
  price: string;
  period: string;
  blurb: string;
  features: CourseFeature[];
  cta_label: string;
  cta_href: string;
  highlighted: boolean;
  ribbon?: string;
}

interface CourseGridProps {
  eyebrow: string;
  heading: string;
  lead: string;
  courses: Course[];
  footnote?: string;
}

/** Icon-chip tone → (background, foreground) pairs used by the prototype's
 * inline-styled 32px plan icons (`.plan` cards). */
const TONE_BG: Record<string, string> = {
  leaf: "var(--leaf-100)",
  sky: "var(--sky-soft)",
  amber: "var(--amber-soft)",
  amb: "var(--amber-soft)",
  coral: "var(--coral-soft)",
  cor: "var(--coral-soft)",
  vio: "var(--violet-soft)",
};
const TONE_FG: Record<string, string> = {
  leaf: "var(--leaf-700)",
  sky: "#1f6e9e",
  amber: "#a86e14",
  amb: "#a86e14",
  coral: "#b73f31",
  cor: "#b73f31",
  vio: "#5a3fb0",
};

export function CourseGridSection({ props }: { props: CourseGridProps }) {
  const { eyebrow, heading, lead, courses, footnote } = props;
  return (
    <Section id="pricing">
      <Head eyebrow={eyebrow} heading={heading} lead={lead} mid />
      <div className="plans">
        {(courses ?? []).map((c, i) => (
          <div key={i} className={`plan rv${c.highlighted ? " pop" : ""}`}>
            {c.ribbon && <span className="rib">{c.ribbon}</span>}
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: TONE_BG[c.icon_tone ?? "leaf"],
                  color: TONE_FG[c.icon_tone ?? "leaf"],
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Icon name={c.icon || "seedling"} />
              </div>
              <h3>{c.name}</h3>
            </div>
            <div className="pr">
              <b>{c.price}</b>
              <span>/ {c.period}</span>
            </div>
            <div style={{ fontSize: 13, color: "var(--ink-3)" }}>{c.blurb}</div>
            <ul>
              {(c.features ?? []).map((f, j) => (
                <li key={j} className={f.included ? undefined : "no"}>
                  <i>
                    <Icon name={f.included ? "check" : "xmark"} size={11} />
                  </i>
                  {f.text}
                </li>
              ))}
            </ul>
            <a
              className={`btn ${c.highlighted ? "btn-p" : "btn-ghost"}`}
              style={{ justifyContent: "center" }}
              href={c.cta_href}
            >
              {c.cta_label}
            </a>
          </div>
        ))}
      </div>
      {footnote && (
        <div
          className="rv"
          style={{
            textAlign: "center",
            marginTop: 26,
            fontSize: 13,
            color: "var(--ink-4)",
          }}
        >
          {footnote}
        </div>
      )}
    </Section>
  );
}
