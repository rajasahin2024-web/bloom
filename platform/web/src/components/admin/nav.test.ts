import { describe, expect, it } from "vitest";
import { ADMIN_NAV } from "@/components/admin/nav";

describe("ADMIN_NAV — approved Plan v5 menu structure", () => {
  it("has the exact approved main-menu order", () => {
    expect(ADMIN_NAV.map((i) => i.label)).toEqual([
      "Dashboard",
      "Academics",
      "People",
      "Communication",
      "Business",
      "CMS",
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
    expect(subs("academics")).toEqual([
      "Academic",
      "Exam Builder",
      "Exam Tracks",
      "Content Manager",
    ]);
    expect(subs("people")).toEqual([
      "Admissions",
      "Personnel",
      "Human Resources",
    ]);
    expect(subs("communication")).toEqual([
      "Communications",
      "Enquiries",
      "WhatsApp Alerts",
    ]);
    expect(subs("business")).toEqual([
      "Finance",
      "Operations",
      "Analytics",
      "Admin Planner",
    ]);
    expect(subs("cms")).toEqual([
      "Website Page Creation",
      "Blogs Creation",
    ]);
    expect(subs("settings")).toEqual([
      "Site Settings",
      "SEO Settings",
      "AI Settings",
      "General Settings",
    ]);
  });

  it("marks every sub-item Soon — nothing navigates except Dashboard", () => {
    for (const item of ADMIN_NAV) {
      for (const sub of item.children) {
        expect(sub.soon).toBe(true);
      }
    }
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
