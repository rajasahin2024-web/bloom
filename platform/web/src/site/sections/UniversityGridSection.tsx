import { Head, Section } from "./shared";
import { Icon } from "./Icon";
import type { SectionAnimation } from "./types";

interface UniversityGridProps {
  heading: string;
  universities: { name: string; logo_url: string; href: string }[];
}

export function UniversityGridSection({
  props,
  animation,
}: {
  props: UniversityGridProps;
  animation?: SectionAnimation | null;
}) {
  const { heading, universities } = props;
  const marquee = animation?.type === "marquee-ltr";
  const duration = animation?.speed_s ? `${animation.speed_s}s` : "30s";

  if (marquee) {
    const loop = [...universities, ...universities];
    return (
      <Section variant="paper" id="universities">
        <Head eyebrow="Where our students go" heading={heading} mid />
        <div className="rv">
          <div
            className="uni-marquee"
            style={{ animationDuration: duration }}
          >
            {loop.map((u, i) => (
              <a
                key={i}
                className="uni"
                href={u.href || "#"}
                style={{ display: "flex", alignItems: "center", gap: 10 }}
              >
                {u.logo_url ? (
                  <img src={u.logo_url} alt={u.name} style={{ height: 28, width: 28, objectFit: "contain" }} />
                ) : (
                  <Icon name="graduation-cap" />
                )}
                <b>{u.name}</b>
              </a>
            ))}
          </div>
        </div>
      </Section>
    );
  }

  return (
    <Section variant="paper" id="universities">
      <Head eyebrow="Where our students go" heading={heading} mid />
      <div className="unidir rv">
        {universities.map((u, i) => (
          <a key={i} className="unic" href={u.href || "#"}>
            <div className="shot" style={{ display: "grid", placeItems: "center" }}>
              {u.logo_url ? (
                <img src={u.logo_url} alt={u.name} style={{ maxHeight: 90, objectFit: "contain" }} />
              ) : (
                <Icon name="graduation-cap" size={40} />
              )}
            </div>
            <div className="bd">
              <h4>{u.name}</h4>
            </div>
          </a>
        ))}
      </div>
    </Section>
  );
}
