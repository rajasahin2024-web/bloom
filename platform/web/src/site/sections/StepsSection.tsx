import { Head, Inline, Section } from "./shared";
import { Icon } from "./Icon";

interface StepsProps {
  eyebrow: string;
  heading: string;
  lead?: string;
  mid?: boolean;
  variant?: "paper" | "dark" | "tight";
  anchor_id?: string;
  pad_top?: number;
  pad_bottom?: number;
  steps: { n: string | number; title: string; body: string; icon?: string }[];
}

export function StepsSection({ props }: { props: StepsProps }) {
  const { eyebrow, heading, lead, mid, variant, anchor_id, pad_top, pad_bottom, steps } =
    props;
  // Careers hiring stages carry an icon per step and render as a small .card
  // grid (prototype/careers.html); plain steps keep the .steps/.step layout.
  const cardLayout = (steps ?? []).some((s) => s.icon);
  return (
    <Section variant={variant ?? "paper"} id={anchor_id} padTop={pad_top} padBottom={pad_bottom}>
      <Head eyebrow={eyebrow} heading={heading} lead={lead} mid={mid} />
      {cardLayout ? (
        <div
          className="grid rv"
          style={{ gridTemplateColumns: "repeat(auto-fit,minmax(168px,1fr))", gap: 13 }}
        >
          {(steps ?? []).map((s, i) => (
            <div key={i} className="card" style={{ padding: "18px 19px" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 11 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "var(--leaf-700)",
                    color: "#fff",
                    display: "grid",
                    placeItems: "center",
                    fontFamily: "var(--mono)",
                    fontSize: "11.5px",
                    fontWeight: 800,
                  }}
                >
                  {s.n}
                </div>
                {s.icon && (
                  <span style={{ color: "var(--leaf-500)", fontSize: 13 }}>
                    <Icon name={s.icon} size={13} />
                  </span>
                )}
              </div>
              <b
                style={{
                  fontFamily: "var(--display)",
                  fontSize: 15,
                  fontWeight: 700,
                  display: "block",
                  marginBottom: 5,
                }}
              >
                <Inline text={s.title} />
              </b>
              <span style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.55 }}>
                {s.body}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="steps">
          {(steps ?? []).map((s, i) => (
            <div key={i} className="step rv">
              <h3><Inline text={s.title} /></h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
