/**
 * CMS blog admin UI — posts table, categories tree, post editor slug
 * behaviour. API calls are mocked at the @/lib/cms boundary; TinyMCE is
 * stubbed to a textarea so jsdom never loads the real bundle.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ApiError } from "@/lib/api";
import type { AdminSession } from "@/lib/auth";
import type { CmsPost } from "@/lib/cms";

vi.mock("@/lib/cms", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/cms")>();
  return {
    ...actual,
    listPosts: vi.fn(),
    getPost: vi.fn(),
    createPost: vi.fn(),
    patchPost: vi.fn(),
    deletePost: vi.fn(),
    listAuthors: vi.fn(),
    createAuthor: vi.fn(),
    patchAuthor: vi.fn(),
    deleteAuthor: vi.fn(),
    listCategories: vi.fn(),
    createCategory: vi.fn(),
    patchCategory: vi.fn(),
    deleteCategory: vi.fn(),
    getMedia: vi.fn(),
  };
});

vi.mock("@tinymce/tinymce-react", () => ({
  Editor: ({
    initialValue,
    onEditorChange,
  }: {
    initialValue?: string;
    onEditorChange?: (html: string) => void;
  }) => (
    <textarea
      aria-label="Body editor"
      defaultValue={initialValue}
      onChange={(e) => onEditorChange?.(e.target.value)}
    />
  ),
}));

import {
  createCategory,
  createPost,
  deleteCategory,
  deletePost,
  listAuthors,
  listCategories,
  listPosts,
} from "@/lib/cms";
import { CmsPosts } from "./CmsPosts";
import { CmsCategories } from "./CmsCategories";
import { CmsPostEditor } from "./CmsPostEditor";

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
  tokens: { access_token: "tok", token_type: "bearer", expires_in: 1800 },
};

function post(partial: Partial<CmsPost> = {}): CmsPost {
  return {
    id: "p1",
    slug: "hello-world",
    title: "Hello World",
    category: "IELTS",
    subcategory: "Writing",
    author: "Rafiq",
    author_id: null,
    category_id: null,
    subcategory_id: null,
    author_avatar_url: null,
    excerpt: null,
    body: "<p>x</p>",
    tags: ["ielts"],
    read_minutes: 3,
    hero_media_id: null,
    featured: false,
    meta_title: null,
    meta_description: null,
    status: "draft",
    published_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    ...partial,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listPosts).mockResolvedValue({
    items: [post()],
    total: 1,
    page: 1,
    page_size: 20,
  });
  vi.mocked(listAuthors).mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    page_size: 100,
  });
  vi.mocked(listCategories).mockResolvedValue([]);
});

describe("CmsPosts", () => {
  it("renders post rows with status badge", async () => {
    render(
      <MemoryRouter>
        <CmsPosts session={session} />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText("Hello World")).toBeTruthy());
    expect(
      document.querySelector(".adm-badge")?.textContent,
    ).toBe("Draft");
    expect(screen.getByText("Rafiq")).toBeTruthy();
    expect(screen.getByText(/\/hello-world/)).toBeTruthy();
    expect(screen.getByText(/› Writing/)).toBeTruthy();
  });

  it("client search filters rows", async () => {
    render(
      <MemoryRouter>
        <CmsPosts session={session} />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText("Hello World")).toBeTruthy());
    fireEvent.change(screen.getByLabelText("Search posts"), {
      target: { value: "nomatch" },
    });
    expect(screen.queryByText("Hello World")).toBeNull();
    expect(screen.getByText(/No posts match the search/)).toBeTruthy();
  });

  it("delete goes through the confirm modal", async () => {
    vi.mocked(deletePost).mockResolvedValue(undefined);
    render(
      <MemoryRouter>
        <CmsPosts session={session} />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText("Hello World")).toBeTruthy());
    fireEvent.click(screen.getByLabelText("Delete Hello World"));
    expect(screen.getByText("Delete this post?")).toBeTruthy();
    fireEvent.click(screen.getByText("Delete post"));
    await waitFor(() =>
      expect(vi.mocked(deletePost)).toHaveBeenCalledWith("tok", "p1"),
    );
    await waitFor(() =>
      expect(screen.queryByText("Hello World")).toBeNull(),
    );
  });

  it("status filter reloads with the status param", async () => {
    render(
      <MemoryRouter>
        <CmsPosts session={session} />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText("Hello World")).toBeTruthy());
    fireEvent.change(screen.getByLabelText("Filter by status"), {
      target: { value: "published" },
    });
    await waitFor(() =>
      expect(vi.mocked(listPosts)).toHaveBeenLastCalledWith(
        "tok",
        expect.objectContaining({ status: "published", page: 1 }),
      ),
    );
  });
});

describe("CmsCategories", () => {
  it("renders nested subcategories under their parents", async () => {
    vi.mocked(listCategories).mockResolvedValue([
      {
        id: "c1",
        name: "IELTS",
        slug: "ielts",
        parent_id: null,
        description: null,
        created_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "c2",
        name: "Writing",
        slug: "writing",
        parent_id: "c1",
        description: null,
        created_at: "2026-01-01T00:00:00Z",
      },
    ]);
    render(<CmsCategories session={session} />);
    await waitFor(() => expect(screen.getByText("IELTS")).toBeTruthy());
    expect(screen.getByText("Writing")).toBeTruthy();
  });

  it("inline create posts a new main category", async () => {
    vi.mocked(createCategory).mockResolvedValue({
      id: "c9",
      name: "PTE",
      slug: "pte",
      parent_id: null,
      description: null,
      created_at: "2026-01-01T00:00:00Z",
    });
    render(<CmsCategories session={session} />);
    await waitFor(() =>
      expect(screen.getByText(/No categories yet/)).toBeTruthy(),
    );
    fireEvent.click(screen.getByText("New Category"));
    fireEvent.change(screen.getByPlaceholderText("New category name"), {
      target: { value: "PTE" },
    });
    fireEvent.click(screen.getByText("Create"));
    await waitFor(() =>
      expect(vi.mocked(createCategory)).toHaveBeenCalledWith(
        "tok",
        expect.objectContaining({ name: "PTE", slug: "pte", parent_id: null }),
      ),
    );
    await waitFor(() => expect(screen.getByText("PTE")).toBeTruthy());
  });

  it("409 on parent delete surfaces the children hint", async () => {
    vi.mocked(listCategories).mockResolvedValue([
      {
        id: "c1",
        name: "IELTS",
        slug: "ielts",
        parent_id: null,
        description: null,
        created_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "c2",
        name: "Writing",
        slug: "writing",
        parent_id: "c1",
        description: null,
        created_at: "2026-01-01T00:00:00Z",
      },
    ]);
    vi.mocked(deleteCategory).mockRejectedValue(
      new ApiError("has_children", 409, { detail: "has_children" }),
    );
    render(<CmsCategories session={session} />);
    await waitFor(() => expect(screen.getByText("IELTS")).toBeTruthy());
    fireEvent.click(screen.getByLabelText("Delete IELTS"));
    fireEvent.click(screen.getByText("Delete category"));
    await waitFor(() =>
      expect(
        screen.getAllByText(/delete them first/i).length,
      ).toBeGreaterThan(0),
    );
  });
});

describe("CmsPostEditor (new)", () => {
  function renderNew() {
    return render(
      <MemoryRouter initialEntries={["/admin/cms/posts/new"]}>
        <CmsPostEditor session={session} />
      </MemoryRouter>,
    );
  }

  it("auto-generates the slug from the title", async () => {
    renderNew();
    const title = screen.getByLabelText("Post title");
    fireEvent.change(title, { target: { value: "My Band 9 Tips!" } });
    await waitFor(() =>
      expect(screen.getByText("my-band-9-tips")).toBeTruthy(),
    );
  });

  it("publishes via createPost with the slugified slug", async () => {
    vi.mocked(createPost).mockResolvedValue(
      post({ id: "p2", slug: "band-9-tips", status: "published" }),
    );
    renderNew();
    fireEvent.change(screen.getByLabelText("Post title"), {
      target: { value: "Band 9 Tips" },
    });
    fireEvent.click(screen.getByText("Publish"));
    await waitFor(() =>
      expect(vi.mocked(createPost)).toHaveBeenCalledWith(
        "tok",
        expect.objectContaining({
          title: "Band 9 Tips",
          slug: "band-9-tips",
          status: "published",
        }),
      ),
    );
  });

  it("retries quietly with -2 when the slug is taken", async () => {
    vi.mocked(createPost)
      .mockRejectedValueOnce(
        new ApiError("slug_taken", 409, { detail: "slug_taken" }),
      )
      .mockResolvedValueOnce(post({ id: "p3", slug: "tips-2" }));
    renderNew();
    fireEvent.change(screen.getByLabelText("Post title"), {
      target: { value: "Tips" },
    });
    fireEvent.click(screen.getByText("Publish"));
    await waitFor(() =>
      expect(vi.mocked(createPost)).toHaveBeenCalledTimes(2),
    );
    expect(vi.mocked(createPost)).toHaveBeenLastCalledWith(
      "tok",
      expect.objectContaining({ slug: "tips-2" }),
    );
  });
});
