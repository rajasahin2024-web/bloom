import { Route, Routes } from "react-router-dom";
import { BaseLayout } from "@/layouts/BaseLayout";
import { SiteLayout } from "@/layouts/SiteLayout";
import { SetupGate } from "@/components/SetupGate";
import { SitePage } from "@/site/SitePage";
import { SetupPage } from "@/routes/SetupPage";
import { AdminPage } from "@/routes/AdminPage";

export function AppRouter() {
  return (
    <Routes>
      <Route element={<SetupGate />}>
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/admin/*" element={<AdminPage />} />
        {/* Public site pages share the common Navbar + Footer chrome. */}
        <Route element={<SiteLayout />}>
          <Route path="/" element={<SitePage slug="home" />} />
          <Route path="/:slug" element={<SitePage />} />
        </Route>
        {/* /login is standalone — the prototype's auth page has no site
            chrome, so it renders outside SiteLayout. The static path
            outranks /:slug above regardless of declaration order. */}
        <Route path="/login" element={<SitePage slug="login" />} />
        <Route element={<BaseLayout />}>
          <Route
            path="*"
            element={
              <main style={{ padding: "2rem" }}>
                <h1>404</h1>
                <p>Page not found.</p>
              </main>
            }
          />
        </Route>
      </Route>
    </Routes>
  );
}
