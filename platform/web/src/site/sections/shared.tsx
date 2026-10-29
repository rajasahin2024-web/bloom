import { createElement, Fragment, type ReactNode } from "react";
import { Icon } from "./Icon";

/**
 * The prototype's `<cap>` caption tag used inside `.mo` moment cells.
 * `cap` is not a standard HTML element, so it is created imperatively to
 * keep the exact prototype markup (`.mo cap`) without a JSX declaration.
 */
export function Cap({ children }: { children: ReactNode }) {
  return createElement("cap", null, children);
}

/**
 * Bounded inline markup for heading-ish seed fields (TEC-146 contract).
 *
 * Heading/headline/subhead/lead/eyebrow and item `title` fields rendered
 * inside h1/h2/h3 MAY carry a whitelist of inline tags — `<em>`, `<strong>`,
 * `<br>` — matching how the prototype marks accent words. `renderInline`
 * tokenizes ONLY those tags into React elements; everything else, including
 * unknown tags and malformed/unclosed markup, renders as literal text.
 * No raw HTML is ever injected, so seeds stay XSS-safe.
 */
const INLINE_TAG = /<(\/?)(em|strong|br)\s*(\/?)>/gi;

function renderInline(text: string | null | undefined): ReactNode {
  if (text == null) return null;
  if (!text.includes("<")) return text;

  interface Level {
    tag: string;
    raw: string;
    children: ReactNode[];
  }
  const stack: Level[] = [{ tag: "", raw: "", children: [] }];
  const top = () => stack[stack.length - 1];
  const pushText = (t: string) => {
    if (t) top().children.push(t);
  };
  // Turn an unclosed open level back into literal text inside its parent.
  const unwind = () => {
    const lv = stack.pop()!;
    top().children.push(lv.raw, ...lv.children);
  };

  INLINE_TAG.lastIndex = 0;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = INLINE_TAG.exec(text))) {
    pushText(text.slice(last, m.index));
    last = INLINE_TAG.lastIndex;
    const closing = m[1] === "/";
    const tag = m[2].toLowerCase();
    const selfClose = m[3] === "/";
    if (!closing && (tag === "br" || selfClose)) {
      if (tag === "br") top().children.push(<br key={key++} />);
      else pushText(m[0]); // <em/> isn't a valid container — keep literal
    } else if (!closing) {
      stack.push({ tag, raw: m[0], children: [] });
    } else {
      let idx = -1;
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === tag) {
          idx = i;
          break;
        }
      }
      if (idx === -1) {
        pushText(m[0]); // unmatched close tag — literal
        continue;
      }
      while (stack.length - 1 > idx) unwind();
      const lv = stack.pop()!;
      top().children.push(createElement(tag, { key: key++ }, ...lv.children));
    }
  }
  pushText(text.slice(last));
  while (stack.length > 1) unwind();

  const out = stack[0].children;
  if (out.length === 0) return null;
  if (out.length === 1) return out[0];
  return <Fragment>{out}</Fragment>;
}

/** Inline-markup renderer for seed text fields — see {@link renderInline}. */
export function Inline({
  text,
  fallback,
}: {
  text: string | null | undefined;
  fallback?: ReactNode;
}) {
  return <>{renderInline(text) ?? fallback ?? null}</>;
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
      {eyebrow && <div className="eb"><Inline text={eyebrow} /></div>}
      {heading && <h2><Inline text={heading} /></h2>}
      {lead && <p className="lead"><Inline text={lead} /></p>}
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
