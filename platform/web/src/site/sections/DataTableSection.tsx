import type { ReactNode } from "react";
import { Head, Section, Tbl, type TblCell } from "./shared";
import { Icon } from "./Icon";

interface SideSpec {
  kind: string;
  title?: string;
  items?: { icon?: string; tone?: string; title: string; body: string }[];
  note?: string;
}

interface DataTableProps {
  eyebrow?: string;
  heading?: string;
  /** Lead paragraph — `lead` and `intro` are both accepted (seeds use intro). */
  lead?: string;
  intro?: string;
  /** Optional small label rendered directly above the table. */
  table_label?: string;
  columns?: (string | { label?: string })[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows?: any[];
  footnote?: string;
  /** /medical — second .g2 card beside the table (kind "subtests"). */
  side?: SideSpec;
  /** Continuation block inside the previous section. */
  pad_top?: number;
  pad_bottom?: number;
}

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

/** Bold the "Label:" lead-in of footnotes the way the prototype does. */
function leadIn(text: string): ReactNode {
  const i = text.indexOf(":");
  if (i <= 0 || i > 32) return text;
  return (
    <>
      <b style={{ color: "var(--ink-2)" }}>{text.slice(0, i + 1)}</b>
      {text.slice(i + 1)}
    </>
  );
}

/** Right-hand card for `side.kind === "subtests"` (the four OET sub-tests). */
function SubtestsCard({ side }: { side: SideSpec }) {
  return (
    <div className="card" style={{ padding: 28 }}>
      {side.title && <div className="eb">{side.title}</div>}
      <div style={{ display: "grid", gap: 13, marginTop: 4 }}>
        {(side.items ?? []).map((it, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 13,
              alignItems: "flex-start",
              padding: "15px 17px",
              background: "var(--paper)",
              borderRadius: 13,
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                flex: "0 0 30px",
                borderRadius: 10,
                background: TONE_BG[it.tone ?? "leaf"],
                color: TONE_FG[it.tone ?? "leaf"],
                display: "grid",
                placeItems: "center",
                fontSize: 12,
              }}
            >
              <Icon name={it.icon ?? "check"} size={12} />
            </div>
            <div>
              <b style={{ fontSize: "13.5px", display: "block", marginBottom: 3 }}>{it.title}</b>
              <span style={{ fontSize: "12.5px", color: "var(--ink-3)", lineHeight: 1.55 }}>
                {it.body}
              </span>
            </div>
          </div>
        ))}
      </div>
      {side.note && (
        <div
          style={{
            marginTop: 16,
            padding: "14px 16px",
            background: "var(--leaf-50)",
            borderRadius: 12,
            fontSize: "12.5px",
            color: "var(--ink-2)",
            lineHeight: 1.6,
          }}
        >
          {leadIn(side.note)}
        </div>
      )}
    </div>
  );
}

export function DataTableSection({ props }: { props: DataTableProps }) {
  const { eyebrow, heading, table_label, columns, rows, footnote, side, pad_top, pad_bottom } =
    props;
  const lead = props.lead ?? props.intro;
  return (
    <Section padTop={pad_top} padBottom={pad_bottom}>
      <Head eyebrow={eyebrow} heading={heading} lead={lead} />
      {side ? (
        <div className="grid g2 rv" style={{ marginBottom: 44 }}>
          <div className="card" style={{ padding: 28 }}>
            {table_label && <div className="eb">{table_label}</div>}
            <Tbl columns={columns} rows={rows as TblCell[][]} flat />
            {footnote && (
              <div
                style={{
                  marginTop: 15,
                  fontSize: "12.5px",
                  color: "var(--ink-3)",
                  lineHeight: 1.6,
                }}
              >
                {leadIn(footnote)}
              </div>
            )}
          </div>
          {side.kind === "subtests" && <SubtestsCard side={side} />}
        </div>
      ) : (
        <>
          {table_label && (
            <div className="rv" style={{ marginBottom: 14, fontWeight: 700 }}>
              {table_label}
            </div>
          )}
          <div className="rv">
            <Tbl columns={columns} rows={rows as TblCell[][]} />
          </div>
          {footnote && (
            <div style={{ fontSize: "12.5px", color: "var(--ink-4)", marginTop: 20 }} className="rv">
              {footnote}
            </div>
          )}
        </>
      )}
    </Section>
  );
}
