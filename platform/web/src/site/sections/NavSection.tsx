import { useEffect, useState } from "react";
import { Icon } from "./Icon";

interface NavProps {
  brand: { name: string; tagline: string; logo_url: string };
  links: { label: string; href: string }[];
  /** Mobile menu links (prototype adds Home + Contact). Falls back to links. */
  mobile_links?: { label: string; href: string }[];
  cta: { signin_href: string; signup_href: string; signup_label: string };
}

export function NavSection({ props }: { props: NavProps }) {
  const { brand, links, mobile_links, cta } = props;
  const mob = mobile_links ?? links;
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  // While the drawer is open: Escape closes and body scroll is locked.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // The burger is hidden ≥941px; force-close if the viewport crosses the
  // breakpoint while the drawer is open so it can't stay pinned off-screen.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 941px)");
    const onChange = () => {
      if (mq.matches) setOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

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
              aria-expanded={open}
              aria-controls="mob"
              onClick={() => setOpen((o) => !o)}
            >
              <Icon name="bars" />
            </button>
          </div>
        </div>
      </nav>
      <div className={"mob-scrim" + (open ? " on" : "")} onClick={close} />
      <div
        className={"mob" + (open ? " on" : "")}
        id="mob"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
      >
        <div className="mob-head">
          <img
            src={brand.logo_url || "/site/bloom-mark.png"}
            alt={brand.name}
          />
          <button
            type="button"
            className="mob-x"
            aria-label="Close menu"
            onClick={close}
          >
            &times;
          </button>
        </div>
        <div className="mob-links">
          {mob.map((l) => (
            <a key={l.href + l.label} href={l.href} onClick={close}>
              {l.label}
            </a>
          ))}
        </div>
        <div className="mob-cta">
          <a
            className="btn btn-ghost btn-sm"
            href={cta.signin_href}
            onClick={close}
          >
            Sign in
          </a>
          <a className="btn btn-p btn-sm" href={cta.signup_href} onClick={close}>
            {cta.signup_label}
          </a>
        </div>
      </div>
    </>
  );
}
