/**
 * Light logo preloader for the public site — replaces the shared
 * `.wiz-loading` wizard spinner (dark gradient) on site routes. Uses the
 * static `/site/bloom-mark.png` so it renders before site-chrome data
 * arrives. Styles live in site.css, scoped under `.site-root`.
 */
export function SitePreloader() {
  return (
    <div className="site-preloader" role="status" aria-label="Loading">
      <div className="pl-orb">
        <img src="/site/bloom-mark.png" alt="" />
        <span className="pl-ring" aria-hidden="true" />
      </div>
    </div>
  );
}
