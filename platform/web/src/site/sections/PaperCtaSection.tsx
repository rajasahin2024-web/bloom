import { Head, Section } from "./shared";
import { Icon } from "./Icon";

interface PaperCtaProps {
  heading: string;
  body: string;
  cta: { label: string; href: string };
}

export function PaperCtaSection({ props }: { props: PaperCtaProps }) {
  const { heading, body, cta } = props;
  return (
    <Section variant="paper">
      <Head eyebrow="Explore Bloom" heading={heading} lead={body} mid />
      {cta?.label && (
        <div style={{ textAlign: "center", marginTop: 30 }} className="rv">
          <a className="btn btn-p" href={cta.href}>
            <Icon name="arrow-right" /> {cta.label}
          </a>
        </div>
      )}
    </Section>
  );
}
