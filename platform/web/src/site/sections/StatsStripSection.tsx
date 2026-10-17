import { Section } from "./shared";

interface StatsStripProps {
  items: { label: string; value: string; prefix?: string; suffix?: string }[];
}

export function StatsStripSection({ props }: { props: StatsStripProps }) {
  const { items } = props;
  return (
    <Section variant="tight" >
      <div className="strip rv">
        {items.map((it, i) => (
          <div key={i}>
            <b>
              {it.prefix ?? ""}
              {it.value}
              {it.suffix ?? ""}
            </b>
            <span>{it.label}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}
