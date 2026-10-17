import { Head, Section } from "./shared";
import { Icon } from "./Icon";

interface ShowcaseProps {
  heading: string;
  body: string;
  media: { url: string; type: string };
  cta: { label: string; href: string };
}

export function ShowcaseSection({ props }: { props: ShowcaseProps }) {
  const { heading, body, media, cta } = props;
  return (
    <Section>
      <Head eyebrow="Showcase" heading={heading} lead={body} />
      <div className="rv">
        <div className="shot">
          <div className="chrome">
            <i style={{ background: "#ef6a5a" }} />
            <i style={{ background: "#f0a13a" }} />
            <i style={{ background: "#5da35f" }} />
            <span className="url">bloomielts.com</span>
          </div>
          <div className="body">
            {media?.type === "video" && media.url ? (
              <video src={media.url} controls style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : media?.url ? (
              <img src={media.url} alt={heading} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : null}
          </div>
        </div>
        {cta?.label && (
          <div style={{ textAlign: "center", marginTop: 18 }}>
            <a className="btn btn-p" href={cta.href}>
              <Icon name="arrow-right" /> {cta.label}
            </a>
          </div>
        )}
      </div>
    </Section>
  );
}
