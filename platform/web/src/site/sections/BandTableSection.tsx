import { Head, Section } from "./shared";

interface BandRow {
  band?: string;
  title?: string;
  description?: string;
  used_for?: string;
  /** Badge background (new shape). */
  color?: string;
  /** Badge foreground (new shape). */
  text_color?: string;
  // Legacy field names (score/bg/body/usage) still render.
  score?: string;
  bg?: string;
  body?: string;
  usage?: string;
}

interface BandTableProps {
  eyebrow?: string;
  heading?: string;
  lead?: string;
  rows?: BandRow[];
  /** Plain "Label: text" footnotes — array, or newline-separated string. */
  notes?: string | string[];
  footnotes?: { label?: string; text?: string }[];
  pad_top?: number;
  pad_bottom?: number;
}

export function BandTableSection({ props }: { props: BandTableProps }) {
  const { eyebrow, heading, lead, rows, notes, footnotes, pad_top, pad_bottom } = props;
  const notesList = Array.isArray(notes)
    ? notes
    : typeof notes === "string"
      ? notes.split("\n").filter(Boolean)
      : (footnotes ?? []).map((f) => `${f.label}: ${f.text}`);
  return (
    <Section padTop={pad_top} padBottom={pad_bottom}>
      <Head eyebrow={eyebrow} heading={heading} lead={lead} />
      <div className="bandscale rv" style={{ marginBottom: notesList.length ? 22 : 0 }}>
        {(rows ?? []).map((r, i) => {
          const badge = r.band ?? r.score ?? "";
          const isNew = r.band !== undefined;
          return (
            <div key={i} className="brow">
              <div
                className="n"
                style={{
                  background: isNew ? r.color : r.bg,
                  color: (isNew ? r.text_color : r.color) || "#fff",
                }}
              >
                {badge}
              </div>
              <div className="t">
                <b>{r.title}</b>
                <span>{r.description ?? r.body}</span>
              </div>
              <div className="u">{r.used_for ?? r.usage}</div>
            </div>
          );
        })}
      </div>
      {notesList.length > 0 && (
        <div
          style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: "12.5px", color: "var(--ink-4)" }}
          className="rv"
        >
          {notesList.map((n, i) => {
            const idx = n.indexOf(":");
            return (
              <span key={i}>
                {idx > 0 ? (
                  <>
                    <b style={{ color: "var(--ink-2)" }}>{n.slice(0, idx)}:</b>
                    {n.slice(idx + 1)}
                  </>
                ) : (
                  n
                )}
              </span>
            );
          })}
        </div>
      )}
    </Section>
  );
}
