/**
 * /admin route — dedicated admin entrance.
 *
 * Session revalidation: a stored token is re-checked against /api/auth/me on
 * every load; non-admin or expired sessions fall back to the sign-in form.
 *
 * Sub-routing: `/admin` renders the dashboard; deeper pages (e.g.
 * `/admin/settings/general`) render inside the same AdminShell via nested
 * Routes — the URL is the source of truth for which page is shown.
 */
import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { GeneralSettings } from "@/components/admin/GeneralSettings";
import { SeoSettings } from "@/components/admin/SeoSettings";
import {
  clearSession,
  fetchMe,
  loadSession,
} from "@/lib/auth";
import type { AdminSession } from "@/lib/auth";

export function AdminPage() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const stored = loadSession();
    if (!stored) {
      setChecking(false);
      return;
    }
    fetchMe(stored.tokens.access_token)
      .then((user) => {
        if (user.role === "admin") {
          setSession({ ...stored, user });
        } else {
          clearSession();
        }
      })
      .catch(() => clearSession())
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="wiz-loading" role="status">
        <span className="wiz-spinner" />
        Checking admin session…
      </div>
    );
  }

  if (session) {
    return (
      <AdminShell session={session} onSignOut={() => setSession(null)}>
        <Routes>
          <Route index element={<AdminDashboard session={session} />} />
          <Route
            path="settings/general"
            element={<GeneralSettings session={session} />}
          />
          <Route
            path="settings/seo"
            element={<SeoSettings session={session} />}
          />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </AdminShell>
    );
  }
  return <AdminLogin onSuccess={setSession} />;
}
