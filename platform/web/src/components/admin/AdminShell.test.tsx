import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/auth", () => ({
  clearSession: vi.fn(),
  logout: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/branding", () => ({
  useBranding: () => ({ name: "Bloom", tagline: "", logo_url: null }),
}));

import { clearSession, logout } from "@/lib/auth";
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
    refresh_token: "rt-1",
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

describe("AdminShell sign-out (TEC-154 MEDIUM-1)", () => {
  it("revokes the refresh token via /api/auth/logout before clearing", async () => {
    const { getAllByText, onSignOut } = renderShell();
    fireEvent.click(getAllByText("Sign out")[0]);

    await waitFor(() => expect(onSignOut).toHaveBeenCalled());
    expect(logout).toHaveBeenCalledWith("rt-1");
    expect(clearSession).toHaveBeenCalled();
    // Revocation is initiated before the local session is dropped.
    expect(
      vi.mocked(logout).mock.invocationCallOrder[0],
    ).toBeLessThan(vi.mocked(clearSession).mock.invocationCallOrder[0]);
  });

  it("still signs out locally when the logout call fails", async () => {
    vi.mocked(logout).mockRejectedValueOnce(new Error("api down"));
    const { getAllByText, onSignOut } = renderShell();
    fireEvent.click(getAllByText("Sign out")[0]);

    await waitFor(() => expect(onSignOut).toHaveBeenCalled());
    expect(clearSession).toHaveBeenCalled();
  });
});
