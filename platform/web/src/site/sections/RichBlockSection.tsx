import { Head, IconSlot, Section } from "./shared";

interface RichBlockProps {
  eyebrow: string;
  heading: string;
  body: string;
  cards: { icon: string; title: string; body: string; href: string }[];
}

export function RichBlockSection({ props }: { props: RichBlockProps }) {
  const { eyebrow, heading, body, cards } = props;
  const tones = ["leaf", "sky", "amb", "cor", "vio", "cor", "leaf"];
  return (
    <Section>
      <Head eyebrow={eyebrow} heading={heading} lead={body} mid />
      <div className="grid g3">
        {cards.map((c, i) => {
          const tone = tones[i % tones.length];
          const inner = (
            <>
              <IconSlot icon={c.icon} tone={tone} />
              <h3>{c.title}</h3>
              <p>{c.body}</p>
            </>
          );
          return c.href ? (
            <a key={i} className="feat rv" href={c.href} style={{ display: "block" }}>
              {inner}
            </a>
          ) : (
            <div key={i} className="feat rv">
              {inner}
            </div>
          );
        })}
      </div>
    </Section>
  );
}
