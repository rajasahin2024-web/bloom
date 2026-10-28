import { Head, Section } from "./shared";
import { Icon } from "./Icon";

interface Course {
  icon: string;
  name: string;
  blurb: string;
  level: string;
  weeks: string;
  tier: string;
  price: string;
}

interface CourseGridProps {
  eyebrow: string;
  heading: string;
  lead: string;
  courses: Course[];
}

export function CourseGridSection({ props }: { props: CourseGridProps }) {
  const { eyebrow, heading, lead, courses } = props;
  return (
    <Section>
      <Head eyebrow={eyebrow} heading={heading} lead={lead} mid />
      <div className="grid g3">
        {(courses ?? []).map((c, i) => (
          <div key={i} className="feat rv">
            <div className="ic ic-leaf">
              <Icon name={c.icon || "book-open"} />
            </div>
            <h3>{c.name}</h3>
            <p>{c.blurb}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 15 }}>
              {c.level && <span className="tag leaf">{c.level}</span>}
              {c.weeks && <span className="tag">{c.weeks} weeks</span>}
              {c.tier && <span className="tag amb">{c.tier}</span>}
            </div>
            {c.price && (
              <div
                style={{
                  marginTop: 13,
                  fontFamily: "var(--mono)",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  color: "var(--leaf-700)",
                }}
              >
                {c.price}
              </div>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}
