/**
 * Admin menu config — the single source of truth for the organized
 * main/sub menu system (approved Plan v7, TEC-78 / TEC-97).
 *
 * Dashboard and Settings → General Settings are the live destinations.
 * Every other leaf carries a "Soon" badge and never navigates — the menu
 * exists to preview the information architecture, not to route to pages
 * that do not exist yet.
 */

export interface AdminSubItem {
  id: string;
  label: string;
  /** Icon key — rendered in the desktop dropdown and the mobile drawer. */
  icon: AdminNavIcon;
  soon: boolean;
  /** Live destination — when set, the leaf navigates instead of showing Soon. */
  to?: string;
}

export interface AdminNavItem {
  id: string;
  label: string;
  /** Icon key — rendered in the desktop navbar and the mobile drawer. */
  icon: AdminNavIcon;
  /** The main item is a live destination only when it has no children. */
  children: AdminSubItem[];
}

export type AdminNavIcon =
  | "gauge"
  | "database"
  | "book"
  | "briefcase"
  | "banknote"
  | "users"
  | "spark"
  | "gear"
  | "layout"
  | "pen"
  | "gradcap"
  | "inbox"
  | "tasklist"
  | "userplus"
  | "chartline"
  | "envelope"
  | "quoteleft"
  | "user"
  | "file"
  | "arrowright"
  | "clock"
  | "calendarcheck"
  | "whatsapp"
  | "search"
  | "server";

const soon = (id: string, label: string, icon: AdminNavIcon): AdminSubItem => ({
  id,
  label,
  icon,
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
    id: "masters",
    label: "Masters",
    icon: "database",
    children: [
      soon("course-plans", "Course Plans", "layout"),
      soon("modules", "Modules", "book"),
      soon("content-manager", "Content Manager", "pen"),
      soon("accounts-master", "Accounts Master", "banknote"),
      soon("employee-master", "Employee Master", "briefcase"),
      soon("students-masters", "Students Masters", "gradcap"),
      soon("enquiries-leads", "Enquiries/Leads", "inbox"),
      soon("exam-masters-builder", "Exam Masters / Builder", "tasklist"),
    ],
  },
  {
    id: "academics",
    label: "Academics",
    icon: "book",
    children: [
      soon("admissions", "Admissions", "userplus"),
      soon("track-progress", "Track Progress", "chartline"),
      soon("communications", "Communications", "envelope"),
    ],
  },
  {
    id: "admin-operations",
    label: "Admin Operations",
    icon: "briefcase",
    children: [
      soon("doubt-clear", "Doubt Clear", "quoteleft"),
      soon("one-one-class", "1-1 Class", "user"),
      soon("school", "School", "gradcap"),
    ],
  },
  {
    id: "accounts-finance",
    label: "Accounts / Finance",
    icon: "banknote",
    children: [
      soon("fees-payments", "Fees Payments", "banknote"),
      soon("accounts-ledger", "Accounts Ledger", "book"),
      soon("transfer-payment", "Transfer Payment", "arrowright"),
      soon("expense-payments", "Expense Payments", "file"),
      soon("account-overview", "Account Overview", "gauge"),
    ],
  },
  {
    id: "hr-management",
    label: "HR Management",
    icon: "users",
    children: [
      soon("onboarding", "Onboarding", "userplus"),
      soon("employees", "Employees", "users"),
      soon("attendance", "Attendance", "clock"),
      soon("payroll", "Payroll", "banknote"),
      soon("leaves", "Leaves", "calendarcheck"),
      soon("leave-requests", "Leave Requests", "tasklist"),
      soon("leaves-config", "Leaves Config", "gear"),
    ],
  },
  {
    id: "ai",
    label: "AI",
    icon: "spark",
    children: [
      soon("ai-settings", "AI Settings", "gear"),
      soon("ai-agents", "AI Agents", "spark"),
      soon("credit-log", "Credit Log", "tasklist"),
      soon("knowledge-graph", "Knowledge Graph", "database"),
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: "gear",
    children: [
      {
        id: "general-settings",
        label: "General Settings",
        icon: "gear",
        soon: false,
        to: "/admin/settings/general",
      },
      soon("site-settings", "Site Settings", "layout"),
      soon("email-engine", "Email Engine", "envelope"),
      soon("whatsapp-api", "WhatsApp API", "whatsapp"),
      {
        id: "seo-settings",
        label: "SEO Settings",
        icon: "search",
        soon: false,
        to: "/admin/settings/seo",
      },
      {
        id: "aio-settings",
        label: "AIO Settings",
        icon: "spark",
        soon: false,
        to: "/admin/settings/aio",
      },
      {
        id: "sitemaps",
        label: "Sitemaps",
        icon: "file",
        soon: false,
        to: "/admin/settings/sitemaps",
      },
      soon("redis", "Redis", "server"),
    ],
  },
];
