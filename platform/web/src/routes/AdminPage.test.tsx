/**
 * /admin boot — TEC-155 MEDIUM-2. There is no persisted session: the route
 * silently rotates the HttpOnly refresh cookie into an access token, then
 * gates on /me role=admin. No cookie session → sign-in form.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/auth", () => ({
  refreshSession: vi.fn(),
  fetchMe: vi.fn(),
}));

vi.mock("@/lib/branding", () => ({
  useBranding: () => ({ name: "Bloom", tagline: "", logo_url: null }),
}));

import { fetchMe, refreshSession } from "@/lib/auth";
import { AdminPage } from "./AdminPage";

const tokens = { access_token: "at-1", token_type: "bearer", expires_in: 1800 };

function user(role: string) {
  return {
    id: "u1",
    email: "admin@example.com",
    phone: null,
    full_name: "Admin User",
    role,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
  };
}

function renderAdmin() {
  return render(
    <MemoryRouter initialEntries={["/admin"]}>
      <AdminPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminPage session restore", () => {
  it("restores the admin session via the refresh cookie", async () => {
    vi.mocked(refreshSession).mockResolvedValue(tokens);
    vi.mocked(fetchMe).mockResolvedValue(user("admin"));

    renderAdmin();
    await waitFor(() => expect(screen.getAllByText("Sign out").length).toBeGreaterThan(0));
    expect(fetchMe).toHaveBeenCalledWith("at-1");
    expect(localStorage.length).toBe(0);
  });

  it("shows the sign-in form when no cookie session exists", async () => {
    vi.mocked(refreshSession).mockResolvedValue(null);

    renderAdmin();
    await waitFor(() => expect(screen.getByText("Admin console")).toBeTruthy());
    expect(fetchMe).not.toHaveBeenCalled();
  });

  it("falls back to sign-in when the restored user is not an admin", async () => {
    vi.mocked(refreshSession).mockResolvedValue(tokens);
    vi.mocked(fetchMe).mockResolvedValue(user("student"));

    renderAdmin();
    await waitFor(() => expect(screen.getByText("Admin console")).toBeTruthy());
  });
});
