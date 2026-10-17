import { Icon } from "./Icon";

interface NavProps {
  brand: { name: string; tagline: string; logo_url: string };
  links: { label: string; href: string }[];
  cta: { signin_href: string; signup_href: string; signup_label: string };
}

export function NavSection({ props }: { props: NavProps }) {
  const { brand, links, cta } = props;
  return (
    <>
      <nav className="nav" id="siteNav">
        <div className="in">
          <a className="brand" href="/">
            {brand.logo_url ? (
              <img src={brand.logo_url} alt={brand.name} />
            ) : (
              <Icon name="seedling" size={34} />
            )}
            <div>
              <b>{brand.name}</b>
              <span>{brand.tagline}</span>
            </div>
          </a>
          <div className="links">
            {links.map((l) => (
              <a key={l.href + l.label} href={l.href}>
                {l.label}
              </a>
            ))}
          </div>
          <div className="nav-cta">
            <a className="btn btn-ghost btn-sm" href={cta.signin_href}>
              Sign in
            </a>
            <a className="btn btn-p btn-sm" href={cta.signup_href}>
              {cta.signup_label}
            </a>
            <button
              type="button"
              className="burger"
              aria-label="Menu"
              onClick={() => document.getElementById("mob")?.classList.toggle("on")}
            >
              <Icon name="bars" />
            </button>
          </div>
        </div>
      </nav>
      <div className="mob" id="mob">
        {links.map((l) => (
          <a key={l.href + l.label} href={l.href}>
            {l.label}
          </a>
        ))}
        <div style={{ display: "flex", gap: 9, marginTop: 16 }}>
          <a
            className="btn btn-ghost btn-sm"
            style={{ flex: 1, justifyContent: "center" }}
            href={cta.signin_href}
          >
            Sign in
          </a>
          <a
            className="btn btn-p btn-sm"
            style={{ flex: 1, justifyContent: "center" }}
            href={cta.signup_href}
          >
            {cta.signup_label}
          </a>
        </div>
      </div>
    </>
  );
}
