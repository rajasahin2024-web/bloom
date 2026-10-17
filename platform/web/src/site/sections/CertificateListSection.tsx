import { Head, Section } from "./shared";
import { Icon } from "./Icon";

interface CertificateListProps {
  heading: string;
  items: { name: string; logo_url: string; blurb: string }[];
}

export function CertificateListSection({ props }: { props: CertificateListProps }) {
  const { heading, items } = props;
  return (
    <Section variant="paper" id="certificates">
      <Head eyebrow="Certificates" heading={heading} mid />
      <div className="certs">
        {items.map((c, i) => (
          <div key={i} className="cert rv">
            <div className="cert-face">
              <div className="cert-in">
                <div className="cert-org">IELTS · Test Report Form</div>
                <div className="cert-nm">{c.name}</div>
                <div className="cert-for">{c.blurb}</div>
                <div className="cert-seal">
                  <Icon name="award" />
                </div>
              </div>
            </div>
            {c.logo_url && (
              <div className="cert-body">
                <div className="r">
                  <span>Certificate</span>
                  <img src={c.logo_url} alt={c.name} style={{ height: 24 }} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}
