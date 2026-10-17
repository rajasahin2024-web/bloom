import { Head, Section } from "./shared";

interface LifeProps {
  heading: string;
  gallery: { media_url: string; caption: string }[];
}

export function LifeSection({ props }: { props: LifeProps }) {
  const { heading, gallery } = props;
  return (
    <Section variant="paper" id="life">
      <Head eyebrow="Inside Bloom" heading={heading} mid />
      <div className="pband rv">
        {gallery.map((g, i) => (
          <div key={i} className="ph">
            {g.media_url ? (
              <img src={g.media_url} alt={g.caption} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : null}
            <cap>
              {g.caption}
            </cap>
          </div>
        ))}
      </div>
    </Section>
  );
}
