import { Outlet } from "react-router-dom";
import { useBranding } from "@/lib/branding";

/**
 * Base layout shared by every page.
 * Stage 0: minimal shell with header + main content slot + footer.
 * Later stages extend this with nav, auth state, and panel-specific chrome.
 */

export function BaseLayout() {
  const branding = useBranding();

  return (
    <div className="app-shell">
      <header className="app-header">
        <a href="/" className="app-logo">
          {branding.name}
        </a>
        <nav className="app-nav">
          <a href="/about">About</a>
          <a href="/contact">Contact</a>
        </nav>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <footer className="app-footer">
        <span>
          {branding.name} — {branding.tagline || "IELTS learning platform"}
        </span>
      </footer>
    </div>
  );
}
