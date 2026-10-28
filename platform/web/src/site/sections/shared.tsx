import { createElement, type ReactNode } from "react";
import { Icon } from "./Icon";

/**
 * The prototype's `<cap>` caption tag used inside `.mo` moment cells.
 * `cap` is not a standard HTML element, so it is created imperatively to
 * keep the exact prototype markup (`.mo cap`) without a JSX declaration.
 */
export function Cap({ children }: { children: ReactNode }) {
  return createElement("cap", null, children);
}

/** Section heading block — eyebrow + h2 + lead, matching `.head`/`.head.mid`. */
export function Head({
  eyebrow,
  heading,
  lead,
  mid = false,
}: {
  eyebrow?: string;
  heading?: string;
  lead?: string;
  mid?: boolean;
}) {
  if (!heading && !eyebrow) return null;
  return (
    <div className={`head rv${mid ? " mid" : ""}`}>
      {eyebrow && <div className="eb">{eyebrow}</div>}
      {heading && <h2>{heading}</h2>}
      {lead && <p className="lead">{lead}</p>}
    </div>
  );
}

/** Render an icon by name inside a coloured `.ic` slot. */
export function IconSlot({ icon, tone = "leaf" }: { icon: string; tone?: string }) {
  return (
    <div className={`ic ic-${tone}`}>
      <Icon name={icon} />
    </div>
  );
}

/**
 * Wrap children in a `.sec` with optional variant class (paper/dark/tight).
 *
 * `padTop`/`padBottom` override the section's vertical padding (px). The
 * prototype often packs several content blocks into one `.sec` with ~50–75px
 * gaps; a CMS page splits them into separate sections, so seeds set tight
 * pads to reproduce the same rhythm instead of the default 96+96.
 */
export function Section({
  variant,
  id,
  padTop,
  padBottom,
  children,
}: {
  variant?: "paper" | "dark" | "tight";
  id?: string;
  padTop?: number;
  padBottom?: number;
  children: ReactNode;
}) {
  const cls = ["sec"];
  if (variant) cls.push(variant);
  const style: Record<string, number> = {};
  if (padTop !== undefined) style.paddingTop = padTop;
  if (padBottom !== undefined) style.paddingBottom = padBottom;
  return (
    <section
      className={cls.join(" ")}
      id={id}
      style={padTop !== undefined || padBottom !== undefined ? style : undefined}
    >
      <div className="wrap">{children}</div>
    </section>
  );
}

/** A `.tbl` cell — plain text or a two-line {text, sub} with optional bold/mono. */
export interface TblCell {
  text?: string;
  sub?: string;
  bold?: boolean;
  /** Bold only the leading token (e.g. `<b>7.5</b> overall, 7.0 each`). */
  strong?: boolean;
  mono?: boolean;
}

type CellInput = string | number | TblCell;

function normCell(cell: CellInput): TblCell {
  return typeof cell === "object" && cell !== null ? cell : { text: String(cell) };
}

/**
 * Prototype `.tbl` renderer shared by `data_table` sections and `rich_block`
 * side cards. Columns may be strings or {label}; rows may be cell arrays or
 * {cells: [...]} objects.
 */
export function Tbl({
  columns,
  rows,
  flat,
}: {
  columns?: (string | { label?: string })[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows?: any[];
  flat?: boolean;
}) {
  const cols = (columns ?? []).map((c) =>
    typeof c === "object" && c !== null ? (c.label ?? "") : String(c),
  );
  const body = (rows ?? []).map((r) =>
    Array.isArray(r) ? r : (r?.cells ?? []),
  ) as CellInput[][];
  return (
    <div className="tbl-wrap">
      <table className="tbl" style={flat ? { boxShadow: "none" } : undefined}>
        <thead>
          <tr>
            {cols.map((c, i) => (
              <th key={i}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((cells, i) => (
            <tr key={i}>
              {cells.map((raw, j) => {
                const cell = normCell(raw);
                return (
                  <td key={j} className={cell.mono ? "mono" : undefined}>
                    {cell.bold ? (
                      <b>{cell.text}</b>
                    ) : cell.strong && cell.text ? (
                      <>
                        <b>{cell.text.split(/\s+/)[0]}</b>
                        {cell.text.slice(cell.text.split(/\s+/)[0].length)}
                      </>
                    ) : (
                      cell.text
                    )}
                    {cell.sub && (
                      <div
                        style={
                          cell.mono
                            ? { fontSize: "11px", color: "var(--ink-4)" }
                            : { fontSize: "11.5px", color: "var(--ink-4)", marginTop: 3 }
                        }
                      >
                        {cell.sub}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
