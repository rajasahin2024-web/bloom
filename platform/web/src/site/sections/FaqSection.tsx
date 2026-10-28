import { Head, Section } from "./shared";

interface FaqProps {
  eyebrow: string;
  heading: string;
  /** Seed uses {q, a, open}; the editor meta uses {question, answer, open}. */
  items: { q?: string; a?: string; question?: string; answer?: string; open: boolean }[];
  variant?: "paper" | "dark" | "tight";
  mid?: boolean;
}

export function FaqSection({ props }: { props: FaqProps }) {
  const { eyebrow, heading, items, variant = "paper", mid = true } = props;
  return (
    <Section variant={variant} id="faq">
      <Head eyebrow={eyebrow} heading={heading} mid={mid} />
      <div className="faq">
        {(items ?? []).map((it, i) => (
          <details key={i} className="q rv" open={it.open}>
            <summary>{it.q ?? it.question}</summary>
            <div className="a">{it.a ?? it.answer}</div>
          </details>
        ))}
      </div>
    </Section>
  );
}
