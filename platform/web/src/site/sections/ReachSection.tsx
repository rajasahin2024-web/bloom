import { Head, Section } from "./shared";

interface ReachProps {
  heading: string;
  items: { label: string; value: string }[];
}

export function ReachSection({ props }: { props: ReachProps }) {
  const { heading, items } = props;
  return (
    <Section variant="dark" id="reach">
      <Head eyebrow="Our reach" heading={heading} />
      <div className="reach">
        <div className="rv">
          <div className="countries">
            {items.map((it, i) => (
              <div key={i} className="crow">
                <span className="fl">🌍</span>
                <span className="nm">{it.label}</span>
                <div className="bar">
                  <i style={{ width: "60%", background: "var(--leaf-300)" }} />
                </div>
                <span className="n">{it.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
