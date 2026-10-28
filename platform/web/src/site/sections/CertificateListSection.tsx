import { Head, Section } from "./shared";
import { Icon } from "./Icon";

interface CertItem {
  name: string;
  logo_url?: string;
  blurb?: string;
  org?: string;
  overall?: string;
  cefr?: string;
  skills?: { label: string; value: string }[];
}

interface CertificateListProps {
  eyebrow?: string;
  heading: string;
  lead?: string;
  items: CertItem[];
  /** /results — the 4-up stats strip under the cert grid. */
  stats?: { value: string; label: string }[];
  variant?: "paper" | "dark" | "tight";
  mid?: boolean;
}

export function CertificateListSection({ props }: { props: CertificateListProps }) {
  const { eyebrow, heading, lead, items, stats, variant = "paper", mid = true } = props;
  return (
    <Section variant={variant} id="certificates">
      <Head eyebrow={eyebrow ?? "Certificates"} heading={heading} lead={lead} mid={mid} />
      <div className="certs">
        {items.map((c, i) => (
          <div key={i} className="cert rv">
            <div className="cert-face">
              <div className="cert-in">
                <div className="cert-org">{c.org ?? "IELTS · Test Report Form"}</div>
                <div className="cert-nm">{c.name}</div>
                <div className="cert-for">Overall Band Score</div>
                {c.overall && <div className="cert-score">{c.overall}</div>}
                {c.cefr && <div className="cert-sub">{c.cefr}</div>}
                <div className="cert-seal">
                  <Icon name="award" />
                </div>
              </div>
            </div>
            {c.skills && c.skills.length > 0 && (
              <div className="cert-body">
                {c.skills.map((r, j) => (
                  <div key={j} className="r">
                    <span>{r.label}</span>
                    <b>{r.value}</b>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {(stats ?? []).length > 0 && (
        <div className="grid g4" style={{ marginTop: 50 }}>
          {(stats ?? []).map((s, i) => (
            <div key={i} className="feat rv" style={{ textAlign: "center", padding: 24 }}>
              <div
                style={{
                  fontFamily: "var(--display)",
                  fontSize: 36,
                  fontWeight: 800,
                  letterSpacing: "-1.8px",
                  color: "var(--leaf-700)",
                  lineHeight: 1,
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontSize: "12.5px",
                  color: "var(--ink-3)",
                  marginTop: 9,
                  fontWeight: 600,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
