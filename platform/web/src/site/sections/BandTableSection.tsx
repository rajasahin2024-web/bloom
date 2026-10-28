import { Head, Section } from "./shared";

interface BandRow {
  score: string;
  bg: string;
  color: string;
  title: string;
  body: string;
  usage: string;
}

interface BandTableProps {
  eyebrow: string;
  heading: string;
  lead: string;
  rows: BandRow[];
  footnotes: { label: string; text: string }[];
}

export function BandTableSection({ props }: { props: BandTableProps }) {
  const { eyebrow, heading, lead, rows, footnotes } = props;
  return (
    <Section>
      <Head eyebrow={eyebrow} heading={heading} lead={lead} />
      <div className="bandscale rv" style={{ marginBottom: footnotes?.length ? 22 : 0 }}>
        {(rows ?? []).map((r, i) => (
          <div key={i} className="brow">
            <div className="n" style={{ background: r.bg, color: r.color || "#fff" }}>
              {r.score}
            </div>
            <div className="t">
              <b>{r.title}</b>
              <span>{r.body}</span>
            </div>
            <div className="u">{r.usage}</div>
          </div>
        ))}
      </div>
      {footnotes?.length > 0 && (
        <div
          style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: "12.5px", color: "var(--ink-4)" }}
          className="rv"
        >
          {footnotes.map((f, i) => (
            <span key={i}>
              <b style={{ color: "var(--ink-2)" }}>{f.label}:</b> {f.text}
            </span>
          ))}
        </div>
      )}
    </Section>
  );
}
