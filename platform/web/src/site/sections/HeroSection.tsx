import { Icon } from "./Icon";

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
          <h1>{p.headline}</h1>
          <p className="lead" style={{ marginTop: 22 }}>
            {p.subhead}
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
      </div>
    </header>
  );
}
