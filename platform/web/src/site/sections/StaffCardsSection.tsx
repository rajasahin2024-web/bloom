import { Head, Section } from "./shared";

interface StaffCardsProps {
  heading: string;
  staff: { name: string; role: string; photo_url: string; bio: string }[];
}

export function StaffCardsSection({ props }: { props: StaffCardsProps }) {
  const { heading, staff } = props;
  return (
    <Section id="faculty">
      <Head eyebrow="Who teaches you" heading={heading} mid />
      <div className="facgrid rv">
        {staff.map((s, i) => (
          <article key={i} className="facc">
            <div className="pic">
              {s.photo_url ? (
                <img src={s.photo_url} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : null}
            </div>
            <div className="bd">
              <h4>{s.name}</h4>
              <div className="rl">{s.role}</div>
              <p>{s.bio}</p>
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}
