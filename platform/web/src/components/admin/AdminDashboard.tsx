/**
 * Minimal admin dashboard placeholder — proves the admin session works.
 * The real console lands in later issues; this stays deliberately small.
 */
import { clearSession } from "@/lib/auth";
import type { AdminSession } from "@/lib/auth";
import { useBranding } from "@/lib/branding";
import { SignInIcon } from "@/components/icons";

interface AdminDashboardProps {
  session: AdminSession;
  onSignOut: () => void;
}

export function AdminDashboard({ session, onSignOut }: AdminDashboardProps) {
  const branding = useBranding();

  function signOut() {
    clearSession();
    onSignOut();
  }

  return (
    <div className="admin-dash">
      <header className="admin-dash-top">
        <div className="fma-crest">
          <img
            src={branding.logo_url ?? "/assets/bloom-mark.png"}
            alt={branding.name}
          />
          <div>
            <strong>{branding.name}</strong>
            <span>Admin Console</span>
          </div>
        </div>
        <div className="admin-dash-user">
          <span className="admin-dash-email">{session.user.email}</span>
          <button
            type="button"
            className="fma-btn fma-btn-ghost"
            onClick={signOut}
          >
            <SignInIcon size={12} /> Sign out
          </button>
        </div>
      </header>
      <main className="admin-dash-main">
        <div className="admin-dash-card">
          <div className="fma-eyebrow">Admin console</div>
          <h1>Dashboard</h1>
          <p>
            Signed in as <b>{session.user.full_name}</b> (
            {session.user.email}) — role <code>admin</code>.
          </p>
          <p className="admin-dash-soon">
            The admin console modules arrive in a later stage. This page is the
            verified landing point for the setup wizard + admin sign-in flow.
          </p>
        </div>
      </main>
    </div>
  );
}
