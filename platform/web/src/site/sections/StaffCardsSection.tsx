import { Head, Section } from "./shared";
import { Icon } from "./Icon";

interface Staff {
  name: string;
  role: string;
  photo_url: string;
  bio: string;
  from?: string;
  spec?: string;
  langs?: string;
  years?: string | number;
  lead?: boolean;
}

interface StaffCardsProps {
  eyebrow?: string;
  heading: string;
  lead?: string;
  mid?: boolean;
  anchor_id?: string;
  cta?: { label: string; href: string; icon?: string };
  staff: Staff[];
}

export function StaffCardsSection({ props }: { props: StaffCardsProps }) {
  const {
    eyebrow = "Who teaches you",
    heading,
    lead,
    mid = true,
    anchor_id = "faculty",
    cta,
    staff,
  } = props;
  return (
    <Section id={anchor_id}>
      <Head eyebrow={eyebrow} heading={heading} lead={lead} mid={mid} />
      <div className="facgrid rv">
        {staff.map((s, i) => (
          <article key={i} className={`facc${s.lead ? " lead" : ""}`}>
            <div className="pic">
              {s.photo_url ? (
                <img
                  src={s.photo_url}
                  alt={`Photograph of ${s.name}`}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : null}
              {s.years && <div className="yrs">{s.years} years</div>}
            </div>
            <div className="bd">
              {s.lead && <div className="eb">{s.role}</div>}
              <h4>{s.name}</h4>
              <div className="rl">{s.role}</div>
              <p>{s.bio}</p>
              {s.spec && (
                <div className="tags">
                  <span className="tag leaf">{s.spec}</span>
                </div>
              )}
              {s.langs && (
                <div className="lg">
                  <i>
                    <Icon name="language" />
                  </i>
                  <span>{s.langs}</span>
                </div>
              )}
              {s.from && (
                <div className="lg">
                  <i>
                    <Icon name="location-dot" />
                  </i>
                  <span>{s.from}</span>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
      {cta && (
        <div style={{ textAlign: "center", marginTop: 30 }}>
          <a className="btn btn-ghost" href={cta.href}>
            {cta.icon && <Icon name={cta.icon} />} {cta.label}
          </a>
        </div>
      )}
    </Section>
  );
}
