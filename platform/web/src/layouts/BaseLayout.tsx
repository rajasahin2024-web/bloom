import { Outlet } from "react-router-dom";

/**
 * Base layout shared by every page.
 * Stage 0: minimal shell with header + main content slot + footer.
 * Later stages extend this with nav, auth state, and panel-specific chrome.
 */

export function BaseLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <a href="/" className="app-logo">
          Bloom Academy
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
        <span>Bloom Academy — IELTS learning platform</span>
      </footer>
    </div>
  );
}
