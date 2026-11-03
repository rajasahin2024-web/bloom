/**
 * Public blog API — unauthenticated `/api/content` reads (TEC-163 C1).
 *
 * `PublicPost` mirrors the BE's `CmsPostOut`; `PublicPostDetail` is the
 * TEC-164 `CmsPostDetailOut` extension (author/category objects + related
 * rail). `CardPost` is the shape the seeded `blog_grid` props already use —
 * `postToCard` maps the API payload onto it so the same card markup serves
 * both live and seeded data.
 */
import { apiFetch } from "@/lib/api";

export interface PublicPost {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  subcategory?: string | null;
  author: string | null;
  excerpt: string | null;
  tags: string[];
  read_minutes: number | null;
  featured: boolean;
  published_at: string | null;
  created_at: string;
  hero_media_id?: string | null;
  /** Resolved hero image URL — added by BE alongside author_avatar_url. */
  hero_url?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  author_avatar_url?: string | null;
}

export interface BlogEntityRef {
  id: string;
  name: string;
  slug: string;
}

export interface PublicPostDetail extends PublicPost {
  body: string;
  author_obj?: (BlogEntityRef & {
    role?: string | null;
    bio?: string | null;
    avatar_media_id?: string | null;
  }) | null;
  category_obj?: (BlogEntityRef & {
    parent_id?: string | null;
    description?: string | null;
  }) | null;
  related_posts?: PublicPost[];
}

export interface BlogCategory {
  name: string;
  slug: string;
  post_count: number;
}

export interface CardPost {
  slug: string;
  title: string;
  category: string;
  author: string;
  date: string;
  read_minutes: number;
  hero_url: string;
  excerpt: string;
  featured: boolean;
  tags?: string[];
}

interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

const PAGE_SIZE = 100;
const MAX_PAGES = 10;

/** Map an API post onto the seeded card-prop shape. */
export function postToCard(p: PublicPost): CardPost {
  const stamp = p.published_at ?? p.created_at ?? "";
  return {
    slug: p.slug,
    title: p.title,
    category: p.category ?? "",
    author: p.author ?? "",
    date: stamp.slice(0, 10),
    read_minutes: p.read_minutes ?? 0,
    hero_url: p.hero_url ?? "",
    excerpt: p.excerpt ?? "",
    featured: p.featured ?? false,
    tags: p.tags,
  };
}

/**
 * Every published post, paged through `Page.items`. Throws on API error —
 * callers keep their seeded props as the fallback.
 */
export async function fetchPublishedPosts(): Promise<CardPost[]> {
  const first = await apiFetch<Page<PublicPost>>(
    `/api/content/posts?page=1&page_size=${PAGE_SIZE}`,
  );
  const items = [...first.data.items];
  const pages = Math.min(
    Math.ceil(first.data.total / first.data.page_size) || 1,
    MAX_PAGES,
  );
  if (pages > 1) {
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) =>
        apiFetch<Page<PublicPost>>(
          `/api/content/posts?page=${i + 2}&page_size=${PAGE_SIZE}`,
        ),
      ),
    );
    for (const r of rest) items.push(...r.data.items);
  }
  return items.map(postToCard);
}

/** Blog filter-pill categories — `[{name, slug, post_count}]`, published only. */
export async function fetchBlogCategories(): Promise<BlogCategory[]> {
  const { data } = await apiFetch<BlogCategory[]>("/api/content/blog/categories");
  return data;
}

export async function fetchPostDetail(slug: string): Promise<PublicPostDetail> {
  const { data } = await apiFetch<PublicPostDetail>(
    `/api/content/posts/${encodeURIComponent(slug)}`,
  );
  return data;
}
