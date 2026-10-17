import { Head, Section } from "./shared";

interface StepsProps {
  eyebrow: string;
  heading: string;
  steps: { n: string; title: string; body: string }[];
}

export function StepsSection({ props }: { props: StepsProps }) {
  const { eyebrow, heading, steps } = props;
  return (
    <Section variant="paper">
      <Head eyebrow={eyebrow} heading={heading} />
      <div className="steps">
        {steps.map((s, i) => (
          <div key={i} className="step rv">
            <h3>{s.title}</h3>
            <p>{s.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
