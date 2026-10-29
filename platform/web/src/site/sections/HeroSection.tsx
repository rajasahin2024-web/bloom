import { Icon } from "./Icon";
import { Inline } from "./shared";

interface HeroProps {
  badge: string;
  headline: string;
  subhead: string;
  primary_btn: { label: string; href: string };
  secondary_btn: { label: string; href: string };
  stats_line: { students: string; band_gain: string; reach_pct: string };
  avatars: { media_url: string; initials: string }[];
}

export function HeroSection({ props }: { props: HeroProps }) {
  const p = props;
  return (
    <header className="hero" id="top">
      <div className="wrap in">
        <div>
          {p.badge && (
            <div className="badge">
              <span>New</span> {p.badge}
            </div>
          )}
          <h1><Inline text={p.headline} /></h1>
          <p className="lead" style={{ marginTop: 22 }}>
            <Inline text={p.subhead} />
          </p>
          <div className="hero-cta">
            <a className="btn btn-p btn-lg" href={p.primary_btn.href}>
              <Icon name="seedling" /> {p.primary_btn.label}
            </a>
            <a className="btn btn-ghost btn-lg" href={p.secondary_btn.href}>
              {p.secondary_btn.label}
            </a>
          </div>
          <div className="hero-note">
            {p.avatars?.length > 0 && (
              <span className="havs">
                {p.avatars.slice(0, 4).map((a, i) => (
                  <i key={i}>{a.initials}</i>
                ))}
              </span>
            )}
            <span>
              <b>{p.stats_line.students}</b> students taught
            </span>
            <span>
              <b>{p.stats_line.band_gain}</b> average band gain
            </span>
            <span>
              <b>{p.stats_line.reach_pct}</b> reach their target
            </span>
          </div>
        </div>
        {/* Right-side student-progress viz panel — exact clone of prototype/index.html */}
        <div style={{ position: "relative" }}>
          <div className="viz">
            <div className="floaty f1">
              <i className="ic-leaf">
                <Icon name="arrow-trend-up" size={12} />
              </i>
              Band 6.0 → 7.5 in 11 weeks
            </div>
            <div className="floaty f2">
              <i className="ic-amb">
                <Icon name="fire" size={12} />
              </i>
              34-day study streak
            </div>
            <div className="viz-hd">
              <div className="viz-av">PS</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Priya Sharma</div>
                <div style={{ fontSize: "11.5px", color: "var(--ink-4)" }}>
                  IELTS Academic · target Band 7.0 · C1
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontFamily: "var(--display)",
                    fontSize: 26,
                    fontWeight: 800,
                    letterSpacing: "-1px",
                    color: "var(--leaf-700)",
                    lineHeight: 1,
                  }}
                >
                  7.0
                </div>
                <div
                  style={{
                    fontSize: 8,
                    letterSpacing: "1.3px",
                    textTransform: "uppercase",
                    color: "var(--ink-4)",
                    fontWeight: 800,
                  }}
                >
                  Estimated
                </div>
              </div>
            </div>
            <div className="viz-band">
              <div className="bandbox">
                <b>7.5</b>
                <span>Listening</span>
              </div>
              <div className="bandbox">
                <b>7.0</b>
                <span>Reading</span>
              </div>
              <div className="bandbox">
                <b>6.5</b>
                <span>Writing</span>
              </div>
              <div className="bandbox">
                <b>7.0</b>
                <span>Speaking</span>
              </div>
            </div>
            <div className="prow">
              <div className="lb">
                <span>Writing — Task Response</span>
                <b>6.5 → 7.0</b>
              </div>
              <div className="bar">
                <i style={{ width: "72%" }} />
              </div>
            </div>
            <div className="prow">
              <div className="lb">
                <span>Writing — Grammatical Range</span>
                <b>6.0 → 7.0</b>
              </div>
              <div className="bar">
                <i style={{ width: "66%", background: "var(--amber)" }} />
              </div>
            </div>
            <div className="prow" style={{ marginBottom: 0 }}>
              <div className="lb">
                <span>Vocabulary mastered</span>
                <b>412 / 570</b>
              </div>
              <div className="bar">
                <i style={{ width: "72%", background: "var(--sky)" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
