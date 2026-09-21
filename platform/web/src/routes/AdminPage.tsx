/**
 * /admin route — dedicated admin entrance.
 *
 * Session revalidation: a stored token is re-checked against /api/auth/me on
 * every load; non-admin or expired sessions fall back to the sign-in form.
 */
import { useEffect, useState } from "react";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
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
        <AdminDashboard session={session} />
      </AdminShell>
    );
  }
  return <AdminLogin onSuccess={setSession} />;
}
