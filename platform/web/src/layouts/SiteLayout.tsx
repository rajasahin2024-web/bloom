/**
 * SiteLayout — the common chrome shared by every public site page.
 *
 * Fetches the shared navbar + footer chrome from `/api/content/site-chrome`
 * once and renders the typed `NavSection` and `FooterSection` around the
 * page `<Outlet />`. This replaces the old pattern of repeating nav/footer
 * as inline CMS sections on every page (which produced duplicate `#siteNav`
 * ids and meant a nav edit had to touch every page's seed).
 *
 * The homepage and future site pages are nested under this layout in the
 * router, so they only carry their own content sections.
 */
import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { apiFetch, ApiError } from "@/lib/api";
import { NavSection } from "@/site/sections/NavSection";
import { FooterSection } from "@/site/sections/FooterSection";
import { Icon } from "@/site/sections/Icon";
import { initSiteRuntime } from "@/site/siteRuntime";
import "@/styles/site.css";

interface NavChrome {
  brand: { name: string; tagline: string; logo_url: string };
  links: { label: string; href: string }[];
  mobile_links?: { label: string; href: string }[];
  cta: { signin_href: string; signup_href: string; signup_label: string };
}

interface FooterChrome {
  brand?: { name: string; tagline: string; logo_url: string; blurb?: string };
  columns: { heading: string; links: { label: string; href: string }[] }[];
  social: { icon: string; href: string }[];
  copyright: string;
  legal?: string;
  legal_links?: { label: string; href: string }[];
}

interface SiteChrome {
  nav: NavChrome;
  footer: FooterChrome;
  banner?: { on: boolean; text: string; cta_label: string; href: string };
}

export function SiteLayout() {
  const [chrome, setChrome] = useState<SiteChrome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bannerOff, setBannerOff] = useState(false);

  useEffect(() => {
    apiFetch<SiteChrome>("/api/content/site-chrome")
      .then(({ data }) => setChrome(data))
      .catch((e: unknown) =>
        setError(e instanceof ApiError ? e.message : "Could not load site chrome."),
      );
  }, []);

  // Re-run site runtime (sticky nav, scroll reveal, count-up) after the
  // chrome + page sections render. siteRuntime is idempotent.
  useEffect(() => {
    if (chrome) initSiteRuntime();
  }, [chrome]);

  if (error) {
    return (
      <main style={{ padding: "2rem" }}>
        <p className="error">{error}</p>
        <Outlet />
      </main>
    );
  }
  if (!chrome) {
    return (
      <div className="wiz-loading" role="status">
        <span className="wiz-spinner" />
        Loading…
      </div>
    );
  }

  // The prototype's mobile menu (`#mob`) lists a slightly different link set
  // (adds Home + Contact). Prefer `mobile_links` when provided, else links.
  const navProps = {
    brand: chrome.nav.brand,
    links: chrome.nav.links,
    mobile_links: chrome.nav.mobile_links ?? chrome.nav.links,
    cta: chrome.nav.cta,
  };
  const banner = chrome.banner?.on && !bannerOff ? chrome.banner : null;

  return (
    <div className={`site-root${banner ? " has-banner" : ""}`}>
      {banner && <SiteBanner banner={banner} onDismiss={() => setBannerOff(true)} />}
      <NavSection props={navProps} />
      <main className="site-main">
        <Outlet />
      </main>
      <FooterSection props={chrome.footer} />
    </div>
  );
}

/* Announcement banner fixed above the nav — port of the prototype's
   bloom-site-cms.js injector. Publishes its measured height as --banner-h so
   the .has-banner rules offset the nav/page exactly like the prototype. */
function SiteBanner({
  banner,
  onDismiss,
}: {
  banner: { text: string; cta_label: string; href: string };
  onDismiss: () => void;
}) {
  useEffect(() => {
    const el = document.getElementById("cmsBanner");
    const sync = () =>
      document.documentElement.style.setProperty(
        "--banner-h",
        `${el?.offsetHeight ?? 0}px`,
      );
    sync();
    window.addEventListener("resize", sync);
    document.fonts?.ready.then(sync);
    return () => {
      window.removeEventListener("resize", sync);
      document.documentElement.style.setProperty("--banner-h", "0px");
    };
  }, []);

  return (
    <div id="cmsBanner">
      <Icon name="bullhorn" />
      <span>{banner.text}</span>
      <a className="cta" href={banner.href || "#"}>
        {banner.cta_label}
      </a>
      <button className="x" aria-label="Dismiss" onClick={onDismiss}>
        &times;
      </button>
    </div>
  );
}
