import { Cap, Head, IconSlot, Inline, Section, Tbl } from "./shared";
import { Icon } from "./Icon";

interface SideSpec {
  kind: string;
  eyebrow?: string;
  heading?: string;
  title?: string;
  intro?: string;
  items?: { icon: string; tone?: string; title: string; body: string }[];
  note?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows?: any[];
  footnote?: string;
  /** feedback kind — the Writing-Lab correction card on /ielts. */
  tags?: (string | { text?: string; tone?: string })[];
  wrong?: string;
  right?: string;
  why?: string;
  bands?: { label?: string; score?: string; pct?: number; tone?: string }[];
}

interface RichBlockProps {
  eyebrow: string;
  heading: string;
  body: string;
  cards: { icon: string; title: string; body: string; href: string }[];
  // layout: "hero" — the careers page header (prototype/careers.html):
  // light .hero block with eyebrow/h1/lead, CTA pair, stat line and a
  // 2-column .pband photo grid on the right.
  layout?: string;
  anchor_id?: string;
  primary_btn?: { label: string; href: string; icon?: string };
  secondary_btn?: { label: string; href: string };
  stats?: { value: string; label: string }[];
  photos?: { slot?: string; media_url: string; caption: string; sub?: string }[];
  variant?: "paper" | "dark" | "tight";
  side?: SideSpec;
  ctas?: { label?: string; href?: string; icon?: string; style?: string }[];
  pad_top?: number;
  pad_bottom?: number;
}

const TONE_BG: Record<string, string> = {
  leaf: "var(--leaf-100)",
  sky: "var(--sky-soft)",
  amb: "var(--amber-soft)",
  cor: "var(--coral-soft)",
  vio: "var(--violet-soft)",
};
const TONE_FG: Record<string, string> = {
  leaf: "var(--leaf-700)",
  sky: "#1f6e9e",
  amb: "#a86e14",
  cor: "#b73f31",
  vio: "#5a3fb0",
};
const BAR_TONE: Record<string, string> = {
  amber: "var(--amber)",
  coral: "var(--coral)",
  leaf: "var(--leaf-500)",
};

const SIDE_LABEL = {
  fontSize: "9.5px",
  letterSpacing: "1.5px",
  textTransform: "uppercase",
  color: "var(--ink-4)",
  fontWeight: 800,
} as const;

/** ielts feedback card — wrong/right correction + per-criterion band bars. */
function FeedbackCard({ side }: { side: SideSpec }) {
  return (
    <div className="card" style={{ padding: 26 }}>
      {(side.tags ?? []).length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {(side.tags ?? []).map((t, i) => {
            const tag = typeof t === "string" ? { text: t } : t;
            return (
              <span key={i} className={`tag${tag.tone ? ` ${tag.tone}` : ""}`}>
                {tag.text}
              </span>
            );
          })}
        </div>
      )}
      <div style={{ ...SIDE_LABEL, marginBottom: 11 }}>What you wrote</div>
      <div
        style={{
          background: "var(--coral-soft)",
          borderRadius: 11,
          padding: "13px 15px",
          marginBottom: 8,
          fontSize: "13.5px",
          color: "#8a3529",
        }}
      >
        <s>{side.wrong}</s>
      </div>
      <div
        style={{
          background: "var(--ok-soft)",
          borderRadius: 11,
          padding: "13px 15px",
          fontSize: "13.5px",
          color: "#1f6640",
          fontWeight: 600,
        }}
      >
        {side.right}
      </div>
      {side.why && (
        <div
          style={{
            fontSize: "12.5px",
            color: "var(--ink-3)",
            lineHeight: 1.6,
            marginTop: 11,
            paddingLeft: 2,
          }}
        >
          <b style={{ color: "var(--ink-2)" }}>Why:</b> {side.why}
        </div>
      )}
      {(side.bands ?? []).length > 0 && (
        <div style={{ marginTop: 22, paddingTop: 20, borderTop: "1px solid var(--line)" }}>
          <div style={{ ...SIDE_LABEL, marginBottom: 13 }}>Your bands</div>
          {(side.bands ?? []).map((b, i) => (
            <div
              key={i}
              className="prow"
              style={i === (side.bands?.length ?? 0) - 1 ? { marginBottom: 0 } : undefined}
            >
              <div className="lb">
                <span>{b.label}</span>
                <b>{b.score}</b>
              </div>
              <div className="bar">
                <i
                  style={{
                    width: `${b.pct ?? 0}%`,
                    background: b.tone ? BAR_TONE[b.tone] : undefined,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** medical "four OET sub-tests" — icon item list + optional leaf note. */
function SubtestsCard({ side }: { side: SideSpec }) {
  return (
    <div>
      {(side.eyebrow || side.title) && <div className="eb"><Inline text={side.eyebrow ?? side.title} /></div>}
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
          {side.note}
        </div>
      )}
    </div>
  );
}

/** data_table side — plain card (ielts) or gradient-headed card (medical). */
function SideTable({ side }: { side: SideSpec }) {
  if (side.heading) {
    return (
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div
          style={{
            background: "linear-gradient(135deg,#0d3b6e,#1a6fa8)",
            padding: "24px 26px",
            color: "#fff",
          }}
        >
          {side.eyebrow && (
            <div
              style={{
                fontSize: "9.5px",
                letterSpacing: "2.2px",
                textTransform: "uppercase",
                color: "rgba(255,255,255,.7)",
                fontWeight: 800,
                marginBottom: 9,
              }}
            >
              {side.eyebrow}
            </div>
          )}
          <div
            style={{
              fontFamily: "var(--display)",
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "-.5px",
            }}
          >
            {side.heading}
          </div>
        </div>
        <Tbl columns={side.columns} rows={side.rows} flat />
        {side.footnote && (
          <div
            style={{
              padding: "15px 20px",
              fontSize: "11.5px",
              color: "var(--ink-4)",
              lineHeight: 1.6,
              borderTop: "1px solid var(--line)",
            }}
          >
            {side.footnote}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="card" style={{ padding: 26 }}>
      {side.eyebrow && <div className="eb"><Inline text={side.eyebrow} /></div>}
      {side.intro && (
        <div style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.65, marginBottom: 18 }}>
          {side.intro}
        </div>
      )}
      <Tbl columns={side.columns} rows={side.rows} flat />
      {side.footnote && (
        <div style={{ fontSize: "11.5px", color: "var(--ink-4)", marginTop: 13, lineHeight: 1.6 }}>
          {side.footnote}
        </div>
      )}
    </div>
  );
}

/** About-page variant: `.wrap.split` — intro + stats left, beliefs card right. */
function BeliefsSplit({ props }: { props: RichBlockProps }) {
  const { eyebrow, heading, body, stats, side, anchor_id } = props;
  const paras = String(body ?? "")
    .split(/\n\s*\n/)
    .filter(Boolean);
  return (
    <section className="sec paper" id={anchor_id ?? "about"}>
      <div className="wrap split">
        <div className="rv">
          {eyebrow && <div className="eb"><Inline text={eyebrow} /></div>}
          <h2><Inline text={heading} /></h2>
          {paras.map((p, i) => (
            <p key={i} className="lead" style={{ marginTop: i === 0 ? 16 : 14 }}>
              {p}
            </p>
          ))}
          {stats && stats.length > 0 && (
            <div className="grid g2" style={{ marginTop: 34, gap: 16 }}>
              {stats.map((s, i) => (
                <div key={i}>
                  <div
                    style={{
                      fontFamily: "var(--display)",
                      fontSize: 26,
                      fontWeight: 800,
                      letterSpacing: "-1.2px",
                      color: "var(--leaf-700)",
                    }}
                  >
                    {s.value}
                  </div>
                  <div style={{ fontSize: "12.5px", color: "var(--ink-4)", marginTop: 4 }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rv">
          <div className="card" style={{ padding: 30 }}>
            {side?.eyebrow && <div className="eb"><Inline text={side.eyebrow} /></div>}
            <ul className="checklist" style={{ marginTop: 6 }}>
              {(side?.items ?? []).map((it, i) => (
                <li key={i}>
                  <span className="tk">
                    {/^\d+$/.test(String(it.icon)) ? it.icon : <Icon name={it.icon ?? "check"} />}
                  </span>
                  <div>
                    <b>{it.title}</b>
                    <span>{it.body}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroLayout({ props }: { props: RichBlockProps }) {
  const { eyebrow, heading, body, primary_btn, secondary_btn, stats, photos } = props;
  return (
    <header
      className="hero"
      style={{
        paddingTop: "clamp(46px,7vw,80px)",
        paddingBottom: "clamp(40px,6vw,68px)",
      }}
    >
      <div className="wrap">
        <div className="split" style={{ alignItems: "center" }}>
          <div className="rv">
            {eyebrow && <div className="eb"><Inline text={eyebrow} /></div>}
            <h1><Inline text={heading} /></h1>
            {body && <p className="lead">{body}</p>}
            {(primary_btn || secondary_btn) && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 26 }}>
                {primary_btn && (
                  <a className="btn btn-p btn-lg" href={primary_btn.href}>
                    {primary_btn.icon && <Icon name={primary_btn.icon} />} {primary_btn.label}
                  </a>
                )}
                {secondary_btn && (
                  <a className="btn btn-ghost btn-lg" href={secondary_btn.href}>
                    {secondary_btn.label}
                  </a>
                )}
              </div>
            )}
            {(stats ?? []).length > 0 && (
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 30 }}>
                {stats!.map((s, i) => (
                  <div key={i}>
                    <div
                      style={{
                        fontFamily: "var(--display)",
                        fontSize: 25,
                        fontWeight: 800,
                        color: "var(--leaf-700)",
                        lineHeight: 1,
                      }}
                    >
                      {s.value}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        letterSpacing: "1.4px",
                        textTransform: "uppercase",
                        color: "var(--ink-4)",
                        fontWeight: 800,
                        marginTop: 4,
                      }}
                    >
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rv">
            <div className="pband" style={{ gridTemplateColumns: "1fr 1fr" }}>
              {(photos ?? []).map((p, i) => (
                <div key={i} className="ph">
                  {p.media_url && (
                    <img
                      src={p.media_url}
                      alt={p.caption}
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  )}
                  <Cap>
                    {p.caption}
                    {p.sub && <small>{p.sub}</small>}
                  </Cap>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export function RichBlockSection({ props }: { props: RichBlockProps }) {
  if (props.layout === "hero") return <HeroLayout props={props} />;
  if (props.side?.kind === "beliefs") return <BeliefsSplit props={props} />;
  const { eyebrow, heading, body, cards, side, ctas, pad_top, pad_bottom } = props;
  const tones = ["leaf", "sky", "amb", "cor", "vio", "cor", "leaf"];
  // `.split` layout: checklist (+ ctas) on the left, a typed side card right.
  if (side) {
    const SideBody =
      side.kind === "feedback" ? (
        <FeedbackCard side={side} />
      ) : side.kind === "subtests" ? (
        <SubtestsCard side={side} />
      ) : (
        <SideTable side={side} />
      );
    return (
      <Section variant={props.variant} padTop={pad_top} padBottom={pad_bottom}>
        <div className="split">
          <div className="rv">
            {eyebrow && <div className="eb"><Inline text={eyebrow} /></div>}
            {heading && <h2><Inline text={heading} /></h2>}
            {body && (
              <p className="lead" style={{ marginTop: 16 }}>
                {body}
              </p>
            )}
            {(cards ?? []).length > 0 && (
              <ul className="checklist">
                {cards.map((c, i) => (
                  <li key={i}>
                    <span className="tk">
                      <Icon name={c.icon ?? "check"} size={11} />
                    </span>
                    <div>
                      <b>{c.title}</b>
                      <span>{c.body}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {(ctas ?? []).length > 0 && (
              <div style={{ display: "flex", gap: 11, flexWrap: "wrap", marginTop: 30 }}>
                {(ctas ?? []).map((c, i) => (
                  <a
                    key={i}
                    className={`btn btn-${c.style === "ghost" ? "ghost" : "p"}`}
                    href={c.href}
                  >
                    {c.icon && <Icon name={c.icon} />} {c.label}
                  </a>
                ))}
              </div>
            )}
          </div>
          <div className="rv">{SideBody}</div>
        </div>
      </Section>
    );
  }
  return (
    <Section variant={props.variant} padTop={pad_top} padBottom={pad_bottom}>
      <Head eyebrow={eyebrow} heading={heading} lead={body} mid />
      <div className="grid g3">
        {(cards ?? []).map((c, i) => {
          const tone = tones[i % tones.length];
          const inner = (
            <>
              <IconSlot icon={c.icon} tone={tone} />
              <h3><Inline text={c.title} /></h3>
              <p>{c.body}</p>
            </>
          );
          return c.href ? (
            <a key={i} className="feat rv" href={c.href} style={{ display: "block" }}>
              {inner}
            </a>
          ) : (
            <div key={i} className="feat rv">
              {inner}
            </div>
          );
        })}
      </div>
    </Section>
  );
}
