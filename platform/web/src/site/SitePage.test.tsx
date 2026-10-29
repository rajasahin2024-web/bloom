import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(m: string, readonly status: number) {
      super(m);
    }
  },
}));

vi.mock("@/lib/auth", () => ({
  refreshSession: vi.fn(() => Promise.resolve(null)),
  fetchMe: vi.fn(),
}));

vi.mock("./siteRuntime", () => ({
  initSiteRuntime: vi.fn(),
}));

import { apiFetch } from "@/lib/api";
import { refreshSession } from "@/lib/auth";
import { SitePage } from "./SitePage";

const mockPage = {
  id: "home",
  title: "Home",
  meta_description: null,
  sections: [
    {
      id: "s1",
      label: "Hero",
      type: "hero",
      enabled: true,
      animation: null,
      props: {
        badge: "Test badge",
        headline: "Test headline",
        subhead: "Test subhead",
        primary_btn: { label: "Start", href: "/start" },
        secondary_btn: { label: "See", href: "/see" },
        stats_line: { students: "100", band_gain: "+1", reach_pct: "90%" },
        avatars: [],
      },
    },
    {
      id: "s2",
      label: "Stats",
      type: "stats_strip",
      enabled: false,
      animation: null,
      props: { items: [{ label: "Students", value: "100" }] },
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SitePage", () => {
  it("renders enabled sections from the API response", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({
      status: 200,
      data: mockPage,
    });
    render(<SitePage slug="home" />);

    await waitFor(() => {
      expect(screen.getByText("Test headline")).toBeTruthy();
    });
    expect(screen.getByText("Test badge")).toBeTruthy();
  });

  it("hides disabled sections in normal mode", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({
      status: 200,
      data: mockPage,
    });
    render(<SitePage slug="home" />);

    await waitFor(() => {
      expect(screen.getByText("Test headline")).toBeTruthy();
    });
    expect(screen.queryByText("Students")).toBeNull();
  });

  it("shows edit chips when admin session is active", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({
      status: 200,
      data: mockPage,
    });
    vi.mocked(refreshSession).mockResolvedValueOnce({
      access_token: "tok",
      token_type: "bearer",
      expires_in: 3600,
    });
    const { fetchMe } = await import("@/lib/auth");
    vi.mocked(fetchMe).mockResolvedValueOnce({
      id: "u1", email: "a@b.co", phone: null, full_name: "A", role: "admin", is_active: true, created_at: "",
    });

    render(<SitePage slug="home" />);

    await waitFor(() => {
      expect(screen.getByText(/Edit mode/i)).toBeTruthy();
    });
  });

  it("shows error state on API failure", async () => {
    const { ApiError } = await import("@/lib/api");
    vi.mocked(apiFetch).mockRejectedValueOnce(new ApiError("Not found", 404));
    render(<SitePage slug="home" />);

    await waitFor(() => {
      expect(screen.getByText("Not found")).toBeTruthy();
    });
  });
});
