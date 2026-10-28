import { Head, Section } from "./shared";

interface FaqProps {
  eyebrow: string;
  heading: string;
  items: { question: string; answer: string; open: boolean }[];
}

export function FaqSection({ props }: { props: FaqProps }) {
  const { eyebrow, heading, items } = props;
  return (
    <Section variant="paper" id="faq">
      <Head eyebrow={eyebrow} heading={heading} mid />
      <div className="faq">
        {(items ?? []).map((it, i) => (
          <details key={i} className="q rv" open={it.open}>
            <summary>{it.question}</summary>
            <div className="a">{it.answer}</div>
          </details>
        ))}
      </div>
    </Section>
  );
}
