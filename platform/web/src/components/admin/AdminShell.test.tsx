import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/auth", () => ({
  logout: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/branding", () => ({
  useBranding: () => ({ name: "Bloom", tagline: "", logo_url: null }),
}));

import { logout } from "@/lib/auth";
import { AdminShell } from "./AdminShell";
import type { AdminSession } from "@/lib/auth";

const session: AdminSession = {
  user: {
    id: "u1",
    email: "admin@example.com",
    phone: null,
    full_name: "Admin User",
    role: "admin",
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
  },
  tokens: {
    access_token: "at-1",
    token_type: "bearer",
    expires_in: 1800,
  },
};

function renderShell(onSignOut = vi.fn()) {
  return {
    onSignOut,
    ...render(
      <MemoryRouter>
        <AdminShell session={session} onSignOut={onSignOut}>
          <div>child</div>
        </AdminShell>
      </MemoryRouter>,
    ),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminShell sign-out (TEC-154 MEDIUM-1, TEC-155 MEDIUM-2)", () => {
  it("revokes via /api/auth/logout (cookie-carried, empty body) before clearing", async () => {
    const { getAllByText, onSignOut } = renderShell();
    fireEvent.click(getAllByText("Sign out")[0]);

    await waitFor(() => expect(onSignOut).toHaveBeenCalled());
    expect(logout).toHaveBeenCalledWith();
  });

  it("still signs out locally when the logout call fails", async () => {
    vi.mocked(logout).mockRejectedValueOnce(new Error("api down"));
    const { getAllByText, onSignOut } = renderShell();
    fireEvent.click(getAllByText("Sign out")[0]);

    await waitFor(() => expect(onSignOut).toHaveBeenCalled());
  });
});

describe("AdminShell 3-level nav (TEC-166)", () => {
  it("renders the CMS → Blogs flyout with third-level leaves", () => {
    const { container, getAllByRole } = renderShell();
    const fly = container.querySelector(".adm-fly");
    expect(fly).not.toBeNull();
    const labels = [...fly!.querySelectorAll(".adm-di")].map((b) =>
      b.textContent,
    );
    expect(labels).toEqual([
      "New Post",
      "All Posts",
      "Authors",
      "Categories",
    ]);

    // hovering the Blogs host opens the flyout (same .show pattern as .adm-drop)
    const host = container.querySelector(".adm-di-host")!;
    expect(fly!.classList.contains("show")).toBe(false);
    fireEvent.mouseEnter(host);
    expect(container.querySelector(".adm-fly")!.classList.contains("show")).toBe(
      true,
    );
    fireEvent.mouseLeave(host);
    expect(container.querySelector(".adm-fly")!.classList.contains("show")).toBe(
      false,
    );

    // the CMS dropdown itself opens on hover of its nav item
    const cmsBtn = getAllByRole("button", { name: /CMS/ })[0];
    fireEvent.mouseEnter(cmsBtn.parentElement!);
    expect(container.querySelector(".adm-drop.show")).not.toBeNull();
  });

  it("renders a nested accordion level in the mobile drawer", () => {
    const { container } = renderShell();
    const nested = container.querySelector(".adm-dsub .adm-dsub");
    expect(nested).not.toBeNull();
    const parent = container.querySelector(".adm-dsi-parent")!;
    fireEvent.click(parent);
    expect(
      container.querySelector(".adm-dsub .adm-dsub")!.classList.contains("show"),
    ).toBe(true);
  });

  it("ships hover-bridge selectors closing the dropdown gap", () => {
    const css = readFileSync(
      resolve(process.cwd(), "src/styles/admin.css"),
      "utf8",
    );
    expect(css).toMatch(/\.adm-drop::before\s*\{/);
    expect(css).toMatch(/\.adm-fly::before\s*\{/);
  });
});
