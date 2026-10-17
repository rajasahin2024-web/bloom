import { Icon } from "./Icon";

interface FooterProps {
  columns: { heading: string; links: { label: string; href: string }[] }[];
  social: { icon: string; href: string }[];
  copyright: string;
}

export function FooterSection({ props }: { props: FooterProps }) {
  const { columns, social, copyright } = props;
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="cols">
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
        {social?.length > 0 && (
          <div className="socials">
            {social.map((s, i) => (
              <a key={i} href={s.href} aria-label={s.icon}>
                <Icon name={s.icon} />
              </a>
            ))}
          </div>
        )}
        <div className="bot">
          <span>{copyright}</span>
        </div>
      </div>
    </footer>
  );
}
