import { Inline, Section } from "./shared";
import { Icon } from "./Icon";

interface CtaStripProps {
  heading: string;
  body: string;
  cta: { label: string; href: string };
}

export function CtaStripSection({ props }: { props: CtaStripProps }) {
  const { heading, body, cta } = props;
  return (
    <Section id="contact">
      <div className="band rv">
        <div className="eb" style={{ justifyContent: "center", color: "var(--leaf-300)" }}>
          Start here
        </div>
        <h2 style={{ maxWidth: 640, margin: "0 auto" }}><Inline text={heading} /></h2>
        {body && (
          <p className="lead" style={{ margin: "18px auto 0", color: "rgba(255,255,255,.76)" }}>
            {body}
          </p>
        )}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 32 }}>
          <a className="btn btn-white btn-lg" href={cta.href}>
            <Icon name="seedling" /> {cta.label}
          </a>
        </div>
      </div>
    </Section>
  );
}
