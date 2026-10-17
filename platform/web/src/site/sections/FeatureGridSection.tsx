import { Head, Section } from "./shared";
import { Icon } from "./Icon";

interface FeatureGridProps {
  heading: string;
  features: { icon: string; title: string; body: string }[];
}

export function FeatureGridSection({ props }: { props: FeatureGridProps }) {
  const { heading, features } = props;
  return (
    <Section variant="dark" id="features">
      <Head heading={heading} mid />
      <div className="grid g3">
        {features.map((f, i) => (
          <div
            key={i}
            className="feat rv"
            style={{
              background: "rgba(255,255,255,.06)",
              borderColor: "rgba(255,255,255,.14)",
              color: "#fff",
            }}
          >
            <div
              className="ic"
              style={{ background: "rgba(255,255,255,.14)", color: "var(--leaf-300)" }}
            >
              <Icon name={f.icon} />
            </div>
            <h3>{f.title}</h3>
            <p style={{ color: "rgba(255,255,255,.7)" }}>{f.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
