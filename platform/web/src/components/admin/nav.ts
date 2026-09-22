/**
 * Admin menu config — the single source of truth for the organized
 * main/sub menu system (approved Plan v7, TEC-78 / TEC-97).
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
    id: "masters",
    label: "Masters",
    icon: "database",
    children: [
      soon("course-plans", "Course Plans"),
      soon("modules", "Modules"),
      soon("content-manager", "Content Manager"),
      soon("accounts-master", "Accounts Master"),
      soon("employee-master", "Employee Master"),
      soon("students-masters", "Students Masters"),
      soon("enquiries-leads", "Enquiries/Leads"),
      soon("exam-masters-builder", "Exam Masters / Builder"),
    ],
  },
  {
    id: "academics",
    label: "Academics",
    icon: "book",
    children: [
      soon("admissions", "Admissions"),
      soon("track-progress", "Track Progress"),
      soon("communications", "Communications"),
    ],
  },
  {
    id: "admin-operations",
    label: "Admin Operations",
    icon: "briefcase",
    children: [
      soon("doubt-clear", "Doubt Clear"),
      soon("one-one-class", "1-1 Class"),
      soon("school", "School"),
    ],
  },
  {
    id: "accounts-finance",
    label: "Accounts / Finance",
    icon: "banknote",
    children: [
      soon("fees-payments", "Fees Payments"),
      soon("accounts-ledger", "Accounts Ledger"),
      soon("transfer-payment", "Transfer Payment"),
      soon("expense-payments", "Expense Payments"),
      soon("account-overview", "Account Overview"),
    ],
  },
  {
    id: "hr-management",
    label: "HR Management",
    icon: "users",
    children: [
      soon("onboarding", "Onboarding"),
      soon("employees", "Employees"),
      soon("attendance", "Attendance"),
      soon("payroll", "Payroll"),
      soon("leaves", "Leaves"),
      soon("leave-requests", "Leave Requests"),
      soon("leaves-config", "Leaves Config"),
    ],
  },
  {
    id: "ai",
    label: "AI",
    icon: "spark",
    children: [
      soon("ai-settings", "AI Settings"),
      soon("ai-agents", "AI Agents"),
      soon("credit-log", "Credit Log"),
      soon("knowledge-graph", "Knowledge Graph"),
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: "gear",
    children: [
      soon("general-settings", "General Settings"),
      soon("site-settings", "Site Settings"),
      soon("email-engine", "Email Engine"),
      soon("whatsapp-api", "WhatsApp API"),
      soon("seo-settings", "SEO Settings"),
      soon("aeo-settings", "AEO Settings"),
      soon("sitemaps", "Sitemaps"),
      soon("redis", "Redis"),
    ],
  },
];
