import { describe, expect, it } from "vitest";
import { ADMIN_NAV } from "@/components/admin/nav";

describe("ADMIN_NAV — approved Plan v7 menu structure", () => {
  it("has the exact approved main-menu order", () => {
    expect(ADMIN_NAV.map((i) => i.label)).toEqual([
      "Dashboard",
      "Masters",
      "Academics",
      "Admin Operations",
      "Accounts / Finance",
      "HR Management",
      "AI",
      "Settings",
    ]);
  });

  it("Dashboard is the landing page with no submenus", () => {
    const dash = ADMIN_NAV.find((i) => i.id === "dashboard");
    expect(dash).toBeDefined();
    expect(dash?.children).toHaveLength(0);
  });

  it("matches the approved sub-menu grouping", () => {
    const subs = (id: string) =>
      ADMIN_NAV.find((i) => i.id === id)?.children.map((c) => c.label);
    expect(subs("masters")).toEqual([
      "Course Plans",
      "Modules",
      "Content Manager",
      "Accounts Master",
      "Employee Master",
      "Students Masters",
      "Enquiries/Leads",
      "Exam Masters / Builder",
    ]);
    expect(subs("academics")).toEqual([
      "Admissions",
      "Track Progress",
      "Communications",
    ]);
    expect(subs("admin-operations")).toEqual([
      "Doubt Clear",
      "1-1 Class",
      "School",
    ]);
    expect(subs("accounts-finance")).toEqual([
      "Fees Payments",
      "Accounts Ledger",
      "Transfer Payment",
      "Expense Payments",
      "Account Overview",
    ]);
    expect(subs("hr-management")).toEqual([
      "Onboarding",
      "Employees",
      "Attendance",
      "Payroll",
      "Leaves",
      "Leave Requests",
      "Leaves Config",
    ]);
    expect(subs("ai")).toEqual([
      "AI Settings",
      "AI Agents",
      "Credit Log",
      "Knowledge Graph",
    ]);
    expect(subs("settings")).toEqual([
      "General Settings",
      "Site Settings",
      "Email Engine",
      "WhatsApp API",
      "SEO Settings",
      "AIO Settings",
      "Sitemaps",
      "Redis",
    ]);
  });

  it("marks every sub-item Soon except the live Settings leaves", () => {
    const live = new Set([
      "general-settings",
      "seo-settings",
      "aio-settings",
      "sitemaps",
    ]);
    for (const item of ADMIN_NAV) {
      for (const sub of item.children) {
        if (live.has(sub.id)) continue;
        expect(sub.soon).toBe(true);
        expect(sub.to).toBeUndefined();
      }
    }
  });

  it("General Settings is a live destination under Settings", () => {
    const leaf = ADMIN_NAV.find((i) => i.id === "settings")?.children.find(
      (c) => c.id === "general-settings",
    );
    expect(leaf).toBeDefined();
    expect(leaf?.soon).toBe(false);
    expect(leaf?.to).toBe("/admin/settings/general");
  });

  it("SEO Settings is a live destination under Settings", () => {
    const leaf = ADMIN_NAV.find((i) => i.id === "settings")?.children.find(
      (c) => c.id === "seo-settings",
    );
    expect(leaf).toBeDefined();
    expect(leaf?.soon).toBe(false);
    expect(leaf?.to).toBe("/admin/settings/seo");
  });

  it("AIO Settings is a live destination under Settings", () => {
    const leaf = ADMIN_NAV.find((i) => i.id === "settings")?.children.find(
      (c) => c.id === "aio-settings",
    );
    expect(leaf).toBeDefined();
    expect(leaf?.soon).toBe(false);
    expect(leaf?.to).toBe("/admin/settings/aio");
  });

  it("Sitemaps is a live destination under Settings", () => {
    const leaf = ADMIN_NAV.find((i) => i.id === "settings")?.children.find(
      (c) => c.id === "sitemaps",
    );
    expect(leaf).toBeDefined();
    expect(leaf?.soon).toBe(false);
    expect(leaf?.to).toBe("/admin/settings/sitemaps");
  });

  it("has unique ids across items and sub-items", () => {
    const ids = new Set<string>();
    for (const item of ADMIN_NAV) {
      expect(ids.has(item.id)).toBe(false);
      ids.add(item.id);
      for (const sub of item.children) {
        expect(ids.has(sub.id)).toBe(false);
        ids.add(sub.id);
      }
    }
  });
});
