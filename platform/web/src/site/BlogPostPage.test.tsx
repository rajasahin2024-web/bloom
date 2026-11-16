import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(
      m: string,
      readonly status: number,
    ) {
      super(m);
    }
  },
}));

vi.mock("./siteRuntime", () => ({
  initSiteRuntime: vi.fn(),
}));

import { apiFetch } from "@/lib/api";
import { BlogPostPage } from "./BlogPostPage";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const post = {
  id: "p1",
  slug: "my-post",
  title: "Test Article Title",
  category: "Strategy",
  author: "Dr. Who",
  excerpt: "A short excerpt",
  body: "<p>Hello <strong>marked body</strong></p>",
  tags: ["Writing"],
  read_minutes: 5,
  featured: false,
  hero_media_id: null,
  hero_url: "/uploads/cms/hero.png",
  meta_title: "SEO title wins",
  meta_description: "SEO description",
  status: "published",
  published_at: "2026-08-28T10:00:00+00:00",
  created_at: "2026-08-28T10:00:00+00:00",
  updated_at: "2026-08-28T10:00:00+00:00",
  author_obj: { id: "a1", name: "Dr. Who", slug: "dr-who" },
  category_obj: { id: "c1", name: "Strategy", slug: "strategy" },
  related_posts: [
    {
      id: "p2",
      slug: "rel-1",
      title: "Related One",
      category: "Strategy",
      author: "A",
      excerpt: "e",
      tags: [],
      read_minutes: 3,
      featured: false,
      published_at: "2026-08-01T00:00:00+00:00",
      created_at: "2026-08-01T00:00:00+00:00",
    },
  ],
};

function renderPage(slug = "my-post") {
  return render(
    <MemoryRouter initialEntries={[`/blog/${slug}`]}>
      <Routes>
        <Route path="/blog/:slug" element={<BlogPostPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  // Default resolution keeps the fire-and-forget view beacon a promise in
  // tests that only mock the GET once.
  vi.mocked(apiFetch).mockResolvedValue({ status: 200, data: {} });
  document.head
    .querySelectorAll('script[type="application/ld+json"], link[rel="canonical"], meta[property^="og:"]')
    .forEach((el) => el.remove());
});

describe("BlogPostPage", () => {
  it("renders the article body, meta row and related rail", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ status: 200, data: post });
    const { container } = renderPage();

    await waitFor(() =>
      expect(container.querySelector(".bpost-title")?.textContent).toContain(
        "Test Article Title",
      ),
    );
    expect(container.querySelector(".bpost-body")?.innerHTML).toContain(
      "<strong>marked body</strong>",
    );
    expect(container.querySelector(".bpost-meta")?.textContent).toContain("Dr. Who");
    expect(container.querySelector(".bpost-meta")?.textContent).toContain("5 min read");
    const rel = container.querySelector<HTMLAnchorElement>(".bpost-rel");
    expect(rel?.getAttribute("href")).toBe("/blog/rel-1");
    expect(rel?.textContent).toContain("Related One");
  });

  it("injects title, canonical, OG tags and Article JSON-LD", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ status: 200, data: post });
    renderPage();

    await waitFor(() =>
      expect(
        document.head.querySelector('link[rel="canonical"]'),
      ).toBeTruthy(),
    );
    expect(document.title).toBe("SEO title wins");
    const canonical = document.head.querySelector('link[rel="canonical"]');
    expect(canonical?.getAttribute("href")).toContain("/blog/my-post");
    expect(
      document.head
        .querySelector('meta[property="og:title"]')
        ?.getAttribute("content"),
    ).toBe("SEO title wins");
    expect(
      document.head
        .querySelector('meta[name="description"]')
        ?.getAttribute("content"),
    ).toBe("SEO description");
    const ld = document.head.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(ld).toBeTruthy();
    const json = JSON.parse(ld!.textContent!);
    expect(json["@type"]).toBe("Article");
    expect(json.headline).toBe("Test Article Title");
    expect(json.author.name).toBe("Dr. Who");
    expect(json.datePublished).toBe("2026-08-28T10:00:00+00:00");
  });

  it("posts the lead form to /api/enquiries with the blog source", async () => {
    vi.mocked(apiFetch).mockImplementation((path: string) =>
      Promise.resolve(
        path === "/api/enquiries"
          ? { status: 201, data: { enquiry: { ref: "E1" }, alert: "sent" } }
          : { status: 200, data: post },
      ),
    );
    const { container } = renderPage();
    await waitFor(() =>
      expect(container.querySelector(".bpost-lead form")).toBeTruthy(),
    );

    const name = container.querySelector<HTMLInputElement>('input[name="name"]')!;
    const email = container.querySelector<HTMLInputElement>('input[name="email"]')!;
    fireEvent.change(name, { target: { value: "Riya" } });
    fireEvent.change(email, { target: { value: "riya@example.com" } });
    fireEvent.submit(container.querySelector(".bpost-lead form")!);

    await waitFor(() =>
      expect(container.textContent).toContain("You're on the list"),
    );
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/enquiries",
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({
          name: "Riya",
          email: "riya@example.com",
          source: "blog:my-post",
          idempotency_key: expect.stringMatching(UUID_RE),
        }),
      }),
    );
  });

  it("fires the view beacon once per session across a remount", async () => {
    const beaconPost = { ...post, slug: "beacon-post", title: "Beacon Article" };
    vi.mocked(apiFetch).mockImplementation((path: string) =>
      Promise.resolve(
        String(path).endsWith("/view")
          ? { status: 200, data: { view_count: 8 } }
          : { status: 200, data: beaconPost },
      ),
    );
    const beaconCalls = () =>
      vi
        .mocked(apiFetch)
        .mock.calls.filter(([p]) => String(p).endsWith("/view"));

    const first = render(
      <MemoryRouter initialEntries={["/blog/beacon-post"]}>
        <Routes>
          <Route path="/blog/:slug" element={<BlogPostPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(
        first.container.querySelector(".bpost-title")?.textContent,
      ).toContain("Beacon Article"),
    );
    await waitFor(() => expect(beaconCalls()).toHaveLength(1));
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/content/posts/beacon-post/view",
      expect.objectContaining({ method: "POST" }),
    );

    // Remount — the sessionStorage flag suppresses a second beacon.
    first.unmount();
    const second = render(
      <MemoryRouter initialEntries={["/blog/beacon-post"]}>
        <Routes>
          <Route path="/blog/:slug" element={<BlogPostPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(
        second.container.querySelector(".bpost-title")?.textContent,
      ).toContain("Beacon Article"),
    );
    expect(beaconCalls()).toHaveLength(1);
  });

  it("shows the not-found state when the post 404s", async () => {
    const { ApiError } = await import("@/lib/api");
    vi.mocked(apiFetch).mockRejectedValueOnce(new ApiError("Post not found", 404));
    const { container } = renderPage("gone");

    await waitFor(() =>
      expect(container.textContent).toContain("Article not found"),
    );
    expect(
      container.querySelector<HTMLAnchorElement>('a[href="/blog"]'),
    ).toBeTruthy();
  });
});
