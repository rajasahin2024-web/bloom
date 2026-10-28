import { Head, Section } from "./shared";

interface LifeProps {
  eyebrow?: string;
  heading: string;
  lead?: string;
  mid?: boolean;
  variant?: string;
  gallery: { media_url: string; caption: string }[];
}

export function LifeSection({ props }: { props: LifeProps }) {
  const {
    eyebrow = "Inside Bloom",
    heading,
    lead,
    mid = true,
    variant = "paper",
    gallery,
  } = props;
  return (
    <Section variant={variant === "dark" ? "dark" : "paper"} id="life">
      <Head eyebrow={eyebrow} heading={heading} lead={lead} mid={mid} />
      <div className="pband rv">
        {gallery.map((g, i) => (
          <div key={i} className="ph">
            {g.media_url ? (
              <img src={g.media_url} alt={g.caption} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : null}
            <div className="lc">
              <b>{g.caption.split(" — ")[0]}</b>
              {g.caption.includes(" — ") && (
                <small>{g.caption.split(" — ").slice(1).join(" — ")}</small>
              )}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
