import { Cap, Head, Section } from "./shared";
import { Icon } from "./Icon";

interface Moment {
  size: string;
  media_url: string;
  caption: string;
  sub: string;
}

interface MomentsProps {
  eyebrow: string;
  heading: string;
  lead: string;
  items: Moment[];
  footnote: string;
}

export function MomentsSection({ props }: { props: MomentsProps }) {
  const { eyebrow, heading, lead, items, footnote } = props;
  return (
    <Section variant="paper" id="moments">
      <Head eyebrow={eyebrow} heading={heading} lead={lead} />
      <div className="moments rv">
        {(items ?? []).map((m, i) => (
          <div key={i} className={`mo ${m.size || "b"}`}>
            {m.media_url && (
              <img
                src={m.media_url}
                alt={m.caption}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
              />
            )}
            <Cap>
              {m.caption}
              {m.sub && <small>{m.sub}</small>}
            </Cap>
          </div>
        ))}
      </div>
      {footnote && (
        <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "var(--ink-4)" }} className="rv">
          <Icon name="camera" /> {footnote}
        </div>
      )}
    </Section>
  );
}
