/**
 * Mail Engine — Settings → Email Engine (/admin/mail).
 *
 * Operations console for the self-hosted student mail engine (TEC-183):
 * health status + DNS, mailbox provisioning ops, outbound queue, delivery
 * inspector (metadata only — message bodies are intentionally not shown,
 * approved privacy decision) and a test-send tool.
 *
 * Sub-tabs are URL-addressable nested routes so a refresh/deep-link lands
 * on the same tab. Each tab owns its own data fetch — the contract is
 * deliberately null/`available:false`-tolerant, so engine gaps render as
 * "N/A / not supported" instead of errors (TEC-189).
 */
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import type { AdminSession } from "@/lib/auth";
import { MailStatusTab } from "@/components/admin/MailStatusTab";
import { MailMailboxesTab } from "@/components/admin/MailMailboxesTab";
import { MailQueueTab } from "@/components/admin/MailQueueTab";
import { MailDeliveryTab } from "@/components/admin/MailDeliveryTab";
import { MailToolsTab } from "@/components/admin/MailToolsTab";

const TABS = [
  { to: "status", label: "Status" },
  { to: "mailboxes", label: "Mailboxes" },
  { to: "queue", label: "Queue" },
  { to: "delivery", label: "Delivery" },
  { to: "tools", label: "Tools" },
] as const;

export function MailEngine({ session }: { session: AdminSession }) {
  return (
    <div className="adm-set">
      <div className="adm-phead">
        <div>
          <div className="adm-eyebrow">Settings</div>
          <h1>
            Mail Engine — <em>student mailboxes</em>
          </h1>
          <p>
            Health, mailboxes, outbound queue and delivery metadata for the
            academy mail engine.
          </p>
        </div>
      </div>

      <nav className="adm-mail-tabs" aria-label="Mail engine sections">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              `adm-mail-tab${isActive ? " on" : ""}`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      <Routes>
        <Route index element={<Navigate to="status" replace />} />
        <Route path="status" element={<MailStatusTab session={session} />} />
        <Route
          path="mailboxes"
          element={<MailMailboxesTab session={session} />}
        />
        <Route path="queue" element={<MailQueueTab session={session} />} />
        <Route
          path="delivery"
          element={<MailDeliveryTab session={session} />}
        />
        <Route path="tools" element={<MailToolsTab session={session} />} />
        <Route path="*" element={<Navigate to="status" replace />} />
      </Routes>
    </div>
  );
}
