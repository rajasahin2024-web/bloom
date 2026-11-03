/**
 * CMS blog API client — typed wrappers around /api/cms/*.
 *
 * Contract: TEC-163 Tech Lead analysis (parent of TEC-167). Posts carry
 * denormalized `author`/`category`/`subcategory` text plus entity FKs;
 * the backend fills the text columns from the selected entities on save.
 * Slug conflicts surface as `409 {detail:"slug_taken"}`.
 */
import { ApiError, apiFetch } from "@/lib/api";

export type CmsStatus = "draft" | "published";

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface CmsAuthor {
  id: string;
  name: string;
  slug: string;
  role: string | null;
  bio: string | null;
  avatar_media_id: string | null;
  email: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  website_url: string | null;
  created_at: string;
  updated_at: string;
}

export type CmsAuthorIn = {
  name: string;
  slug?: string;
  role?: string | null;
  bio?: string | null;
  avatar_media_id?: string | null;
  email?: string | null;
  linkedin_url?: string | null;
  instagram_url?: string | null;
  twitter_url?: string | null;
  website_url?: string | null;
};

export type CmsAuthorPatch = Partial<CmsAuthorIn>;

export interface CmsCategory {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  description: string | null;
  created_at: string;
}

export type CmsCategoryIn = {
  name: string;
  slug?: string;
  parent_id?: string | null;
  description?: string | null;
};

export type CmsCategoryPatch = Partial<CmsCategoryIn>;

export interface CmsPost {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  subcategory: string | null;
  author: string | null;
  author_id: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  author_avatar_url: string | null;
  excerpt: string | null;
  body: string;
  tags: string[];
  read_minutes: number | null;
  hero_media_id: string | null;
  featured: boolean;
  meta_title: string | null;
  meta_description: string | null;
  status: CmsStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export type CmsPostIn = {
  slug: string;
  title: string;
  category_id?: string | null;
  subcategory_id?: string | null;
  author_id?: string | null;
  excerpt?: string | null;
  body?: string;
  tags?: string[];
  read_minutes?: number | null;
  hero_media_id?: string | null;
  featured?: boolean;
  meta_title?: string | null;
  meta_description?: string | null;
  status?: CmsStatus;
  published_at?: string | null;
};

export type CmsPostPatch = Partial<CmsPostIn>;

/** Lowercase kebab slug — mirrors the backend `^[a-z0-9][a-z0-9\-_]*$` rule. */
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

/** The 409 `slug_taken` contract error from POST/PATCH endpoints. */
export function isSlugTaken(err: unknown): boolean {
  if (!(err instanceof ApiError) || err.status !== 409) return false;
  if (err.message === "slug_taken") return true;
  const detail = (err.detail as { detail?: unknown } | null)?.detail;
  return detail === "slug_taken";
}

// ── Posts ─────────────────────────────────────────────────────────────────

export function listPosts(
  token: string,
  opts: { status?: CmsStatus; page?: number; pageSize?: number } = {},
) {
  const params = new URLSearchParams();
  if (opts.status) params.set("status", opts.status);
  if (opts.page) params.set("page", String(opts.page));
  if (opts.pageSize) params.set("page_size", String(opts.pageSize));
  const qs = params.toString();
  return apiFetch<Page<CmsPost>>(`/api/cms/posts${qs ? `?${qs}` : ""}`, {
    token,
  }).then((r) => r.data);
}

export const getPost = (token: string, id: string) =>
  apiFetch<CmsPost>(`/api/cms/posts/${id}`, { token }).then((r) => r.data);

export const createPost = (token: string, body: CmsPostIn) =>
  apiFetch<CmsPost>("/api/cms/posts", { method: "POST", token, body }).then(
    (r) => r.data,
  );

export const patchPost = (token: string, id: string, body: CmsPostPatch) =>
  apiFetch<CmsPost>(`/api/cms/posts/${id}`, {
    method: "PATCH",
    token,
    body,
  }).then((r) => r.data);

export const deletePost = (token: string, id: string) =>
  apiFetch<null>(`/api/cms/posts/${id}`, { method: "DELETE", token }).then(
    () => undefined,
  );

// ── Media ─────────────────────────────────────────────────────────────────

export interface CmsMedia {
  id: string;
  storage_key: string;
  url: string;
  filename: string;
  alt_text: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

export const getMedia = (token: string, id: string) =>
  apiFetch<CmsMedia>(`/api/cms/media/${id}`, { token }).then((r) => r.data);

// ── Authors ───────────────────────────────────────────────────────────────

export function listAuthors(token: string, q?: string) {
  const params = new URLSearchParams({ page_size: "100" });
  if (q) params.set("q", q);
  return apiFetch<Page<CmsAuthor>>(`/api/cms/authors?${params}`, {
    token,
  }).then((r) => r.data);
}

export const createAuthor = (token: string, body: CmsAuthorIn) =>
  apiFetch<CmsAuthor>("/api/cms/authors", {
    method: "POST",
    token,
    body,
  }).then((r) => r.data);

export const patchAuthor = (
  token: string,
  id: string,
  body: CmsAuthorPatch,
) =>
  apiFetch<CmsAuthor>(`/api/cms/authors/${id}`, {
    method: "PATCH",
    token,
    body,
  }).then((r) => r.data);

export const deleteAuthor = (token: string, id: string) =>
  apiFetch<null>(`/api/cms/authors/${id}`, { method: "DELETE", token }).then(
    () => undefined,
  );

// ── Categories ────────────────────────────────────────────────────────────

/** Flat list ordered parent-then-child — the FE builds the tree. */
export const listCategories = (token: string) =>
  apiFetch<CmsCategory[]>("/api/cms/categories", { token }).then((r) => r.data);

export const createCategory = (token: string, body: CmsCategoryIn) =>
  apiFetch<CmsCategory>("/api/cms/categories", {
    method: "POST",
    token,
    body,
  }).then((r) => r.data);

export const patchCategory = (
  token: string,
  id: string,
  body: CmsCategoryPatch,
) =>
  apiFetch<CmsCategory>(`/api/cms/categories/${id}`, {
    method: "PATCH",
    token,
    body,
  }).then((r) => r.data);

export const deleteCategory = (token: string, id: string) =>
  apiFetch<null>(`/api/cms/categories/${id}`, {
    method: "DELETE",
    token,
  }).then(() => undefined);
