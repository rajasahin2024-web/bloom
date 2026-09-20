/**
 * Setup gate — decides between the wizard and the app.
 *
 * GET /api/setup/status runs once per full load:
 *   unconfigured → any route redirects to /setup (the wizard)
 *   configured   → /setup redirects to /admin (wizard is locked, the API
 *                  also answers 410 which getSetupStatus maps to true)
 *   unreachable  → fail open so local dev still renders the shell
 */
import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { applyBrandingToDocument, getBranding } from "@/lib/branding";
import { getSetupStatus } from "@/lib/setup";

export function SetupGate() {
  const location = useLocation();
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getSetupStatus(controller.signal)
      .then(setConfigured)
      .catch(() => setConfigured(true));
    getBranding().then(applyBrandingToDocument);
    return () => controller.abort();
  }, []);

  if (configured === null) {
    return (
      <div className="wiz-loading" role="status">
        <span className="wiz-spinner" />
        Checking platform setup…
      </div>
    );
  }

  const onSetup = location.pathname === "/setup";
  if (!configured && !onSetup) {
    return <Navigate to="/setup" replace />;
  }
  if (configured && onSetup) {
    return <Navigate to="/admin" replace />;
  }
  return <Outlet />;
}
