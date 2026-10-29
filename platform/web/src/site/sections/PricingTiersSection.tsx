import { Head, Inline, Section } from "./shared";
import { Icon } from "./Icon";

interface PricingTiersProps {
  heading: string;
  tiers: {
    name: string;
    price: string;
    period: string;
    features: string[];
    cta_label: string;
    cta_href: string;
    highlighted: boolean;
  }[];
}

export function PricingTiersSection({ props }: { props: PricingTiersProps }) {
  const { heading, tiers } = props;
  return (
    <Section id="pricing">
      <Head eyebrow="Courses" heading={heading} mid />
      <div className="plans">
        {tiers.map((t, i) => (
          <div key={i} className={`plan rv${t.highlighted ? " pop" : ""}`}>
            {t.highlighted && <span className="rib">Most popular</span>}
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <h3><Inline text={t.name} /></h3>
            </div>
            <div className="pr">
              <b>{t.price}</b>
              <span>{t.period}</span>
            </div>
            <ul>
              {t.features.map((f, j) => (
                <li key={j} className={f.startsWith("—") ? "no" : ""}>
                  <Icon name={f.startsWith("—") ? "xmark" : "check"} />
                  {f.replace(/^—\s*/, "")}
                </li>
              ))}
            </ul>
            <a className={`btn ${t.highlighted ? "btn-p" : "btn-ghost"}`} style={{ justifyContent: "center" }} href={t.cta_href}>
              {t.cta_label}
            </a>
          </div>
        ))}
      </div>
    </Section>
  );
}
