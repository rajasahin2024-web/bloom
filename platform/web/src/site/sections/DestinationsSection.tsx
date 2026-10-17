import { Section } from "./shared";

interface DestinationsProps {
  heading: string;
  items: { name: string; flag_url: string; blurb: string }[];
}

export function DestinationsSection({ props }: { props: DestinationsProps }) {
  const { heading, items } = props;
  return (
    <Section variant="tight">
      <div className="rv" style={{ textAlign: "center", marginTop: 38 }}>
        {heading && (
          <div
            style={{
              fontSize: "9.5px",
              letterSpacing: "2.2px",
              textTransform: "uppercase",
              color: "var(--ink-4)",
              fontWeight: 800,
              marginBottom: 18,
            }}
          >
            {heading}
          </div>
        )}
        <div
          style={{
            display: "flex",
            gap: 34,
            flexWrap: "wrap",
            justifyContent: "center",
            fontFamily: "var(--display)",
            fontSize: 15,
            fontWeight: 700,
            color: "var(--ink-4)",
          }}
        >
          {items.map((it, i) => (
            <span key={i}>{it.name}</span>
          ))}
        </div>
      </div>
    </Section>
  );
}
