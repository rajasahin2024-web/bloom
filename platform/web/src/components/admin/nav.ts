/**
 * Admin menu config — the single source of truth for the organized
 * main/sub menu system (approved Plan v5, TEC-78 rev 74e3bb4e).
 *
 * Only Dashboard is a live destination today. Every other leaf carries a
 * "Soon" badge and never navigates — the menu exists to preview the
 * information architecture, not to route to pages that do not exist yet.
 */

export interface AdminSubItem {
  id: string;
  label: string;
  soon: boolean;
}

export interface AdminNavItem {
  id: string;
  label: string;
  /** Drawer icon key — desktop nav is text-only. */
  icon: AdminNavIcon;
  /** The main item is a live destination only when it has no children. */
  children: AdminSubItem[];
}

export type AdminNavIcon =
  | "gauge"
  | "book"
  | "users"
  | "envelope"
  | "briefcase"
  | "cms"
  | "gear";

const soon = (id: string, label: string): AdminSubItem => ({
  id,
  label,
  soon: true,
});

export const ADMIN_NAV: AdminNavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "gauge",
    children: [],
  },
  {
    id: "academics",
    label: "Academics",
    icon: "book",
    children: [
      soon("academic", "Academic"),
      soon("exam-builder", "Exam Builder"),
      soon("exam-tracks", "Exam Tracks"),
      soon("content-manager", "Content Manager"),
    ],
  },
  {
    id: "people",
    label: "People",
    icon: "users",
    children: [
      soon("admissions", "Admissions"),
      soon("personnel", "Personnel"),
      soon("human-resources", "Human Resources"),
    ],
  },
  {
    id: "communication",
    label: "Communication",
    icon: "envelope",
    children: [
      soon("communications", "Communications"),
      soon("enquiries", "Enquiries"),
      soon("whatsapp-alerts", "WhatsApp Alerts"),
    ],
  },
  {
    id: "business",
    label: "Business",
    icon: "briefcase",
    children: [
      soon("finance", "Finance"),
      soon("operations", "Operations"),
      soon("analytics", "Analytics"),
      soon("admin-planner", "Admin Planner"),
    ],
  },
  {
    id: "cms",
    label: "CMS",
    icon: "cms",
    children: [
      soon("website-page-creation", "Website Page Creation"),
      soon("blogs-creation", "Blogs Creation"),
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: "gear",
    children: [
      soon("site-settings", "Site Settings"),
      soon("seo-settings", "SEO Settings"),
      soon("ai-settings", "AI Settings"),
      soon("general-settings", "General Settings"),
    ],
  },
];
