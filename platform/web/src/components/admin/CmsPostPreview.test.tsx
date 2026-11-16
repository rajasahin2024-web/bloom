/**
 * CmsPostPreview (/admin/cms/posts/:id/preview) — session restore is mocked
 * at @/lib/auth, post data at @/lib/cms. The editor's sessionStorage
 * hand-off wins over the API; without it the saved post loads; non-admin
 * sessions get a sign-in state.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return {
    ...actual,
    refreshSession: vi.fn(),
    fetchMe: vi.fn(),
  };
});

vi.mock("@/lib/cms", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/cms")>();
  return { ...actual, getPost: vi.fn() };
});

import { fetchMe, refreshSession } from "@/lib/auth";
import { getPost } from "@/lib/cms";
import type { CmsPost } from "@/lib/cms";
import { CmsPostPreview } from "./CmsPostPreview";

const tokens = {
  access_token: "tok",
  token_type: "bearer",
  expires_in: 1800,
};

function adminUser(role = "admin") {
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

function savedPost(partial: Partial<CmsPost> = {}): CmsPost {
  return {
    id: "p9",
    slug: "saved-post",
    title: "Saved Post",
    category: "IELTS",
    subcategory: null,
    author: "Rafiq",
    author_id: null,
    category_id: null,
    subcategory_id: null,
    author_avatar_url: null,
    excerpt: null,
    body: "<p>Saved body</p>",
    tags: [],
    read_minutes: 4,
    hero_media_id: null,
    featured: false,
    meta_title: null,
    meta_description: null,
    status: "published",
    published_at: "2026-08-28T10:00:00Z",
    created_at: "2026-08-28T10:00:00Z",
    updated_at: "2026-08-28T10:00:00Z",
    ...partial,
  };
}

function renderPreview(id = "p9") {
  return render(
    <MemoryRouter initialEntries={[`/admin/cms/posts/${id}/preview`]}>
      <Routes>
        <Route
          path="/admin/cms/posts/:id/preview"
          element={<CmsPostPreview />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  vi.mocked(refreshSession).mockResolvedValue(tokens);
  vi.mocked(fetchMe).mockResolvedValue(adminUser());
});

describe("CmsPostPreview", () => {
  it("renders the sessionStorage payload without calling getPost", async () => {
    sessionStorage.setItem(
      "bloom.postPreview.p1",
      JSON.stringify({
        title: "Draft Preview",
        slug: "draft-preview",
        body: "<p>Unsaved body</p>",
        status: "draft",
        author: "Rafiq",
        category: "Writing",
        read_minutes: 6,
      }),
    );
    renderPreview("p1");
    await waitFor(() =>
      expect(screen.getByText("Draft Preview")).toBeTruthy(),
    );
    expect(vi.mocked(getPost)).not.toHaveBeenCalled();
    expect(
      screen.getByText("Admin preview — draft · unsaved"),
    ).toBeTruthy();
    expect(
      document.querySelector(".bpost-body")?.textContent,
    ).toContain("Unsaved body");
    // article only — no lead collector, related rail or AI row
    expect(document.querySelector(".bpost-lead")).toBeNull();
    expect(document.querySelector(".bpost-rail")).toBeNull();
    expect(document.querySelector(".bpost-ai")).toBeNull();
  });

  it("falls back to getPost when no sessionStorage payload exists", async () => {
    vi.mocked(getPost).mockResolvedValue(savedPost());
    renderPreview("p9");
    await waitFor(() => expect(screen.getByText("Saved Post")).toBeTruthy());
    expect(vi.mocked(getPost)).toHaveBeenCalledWith("tok", "p9");
    expect(
      screen.getByText("Admin preview — published · saved"),
    ).toBeTruthy();
    expect(document.querySelector(".bpost-body")?.textContent).toContain(
      "Saved body",
    );
  });

  it("shows the sign-in state for non-admin sessions", async () => {
    vi.mocked(fetchMe).mockResolvedValue(adminUser("learner"));
    renderPreview("p9");
    await waitFor(() =>
      expect(screen.getByText("Sign in required")).toBeTruthy(),
    );
    expect(vi.mocked(getPost)).not.toHaveBeenCalled();
    expect(
      document.querySelector<HTMLAnchorElement>('a[href="/admin"]'),
    ).toBeTruthy();
  });

  it("shows the sign-in state when there is no session at all", async () => {
    vi.mocked(refreshSession).mockResolvedValue(null);
    renderPreview("p9");
    await waitFor(() =>
      expect(screen.getByText("Sign in required")).toBeTruthy(),
    );
    expect(vi.mocked(getPost)).not.toHaveBeenCalled();
  });
});
