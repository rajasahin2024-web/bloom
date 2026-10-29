import { Icon } from "./Icon";

interface FooterProps {
  brand?: { name: string; tagline: string; logo_url: string; blurb?: string; blurb_title?: string };
  columns: { heading: string; links: { label: string; href: string }[] }[];
  social: { icon: string; href: string }[];
  copyright: string;
  legal?: string;
  legal_links?: { label: string; href: string }[];
}

export function FooterSection({ props }: { props: FooterProps }) {
  const { brand, columns, social, copyright, legal, legal_links } = props;
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="cols">
          <div>
            <a className="brand" href="/" style={{ marginBottom: 16 }}>
              {brand?.logo_url ? (
                <img src={brand.logo_url} alt={brand?.name ?? "Bloom"} />
              ) : null}
              <div>
                <b>{brand?.name ?? "Bloom"}</b>
                <span>{brand?.tagline ?? "IELTS Academy"}</span>
              </div>
            </a>
            {(brand?.blurb_title || brand?.blurb) && (
              <div style={{ lineHeight: 1.7, maxWidth: 300 }}>
                {brand?.blurb_title && (
                  <b
                    style={{
                      color: "var(--leaf-300)",
                      display: "block",
                      marginBottom: 7,
                    }}
                  >
                    {brand.blurb_title}
                  </b>
                )}
                {brand?.blurb}
              </div>
            )}
            {social?.length > 0 && (
              <div className="socials">
                {social.map((s, i) => (
                  <a key={i} href={s.href} aria-label={s.icon}>
                    <Icon name={s.icon} />
                  </a>
                ))}
              </div>
            )}
          </div>
          {columns.map((c, i) => (
            <div key={i}>
              <h4>{c.heading}</h4>
              {c.links.map((l, j) => (
                <a key={j} href={l.href}>
                  {l.label}
                </a>
              ))}
            </div>
          ))}
        </div>
        <div className="bot">
          <span>{copyright}</span>
          {legal_links && legal_links.length > 0 && (
            <span style={{ marginLeft: "auto" }}>
              {legal_links.map((l, i) => (
                <span key={i}>
                  {i > 0 && " · "}
                  <a href={l.href} style={{ display: "inline" }}>
                    {l.label}
                  </a>
                </span>
              ))}
            </span>
          )}
        </div>
        {legal && (
          <div
            style={{
              marginTop: 16,
              fontSize: 11,
              color: "rgba(255,255,255,.34)",
              lineHeight: 1.6,
            }}
          >
            {legal}
          </div>
        )}
      </div>
    </footer>
  );
}
