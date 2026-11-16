/**
 * BlogPostArticle — the article column shared by the public /blog/:slug
 * page and the admin post preview (TEC-203).
 *
 * Takes the loose article shape both `PublicPostDetail` (public API) and
 * `CmsPost` (admin API / editor sessionStorage hand-off) satisfy, so the
 * preview can render drafts without a mapping layer. Children render after
 * the body inside the same <article> — the public page passes its
 * "Open with AI" row through while the preview passes nothing.
 */
import type { ReactNode } from "react";
import { fmtDate } from "./format";
import { Inline } from "./sections/shared";
import { SafeHtml } from "./SafeHtml";

/** Structural shape: PublicPostDetail, CmsPost and the editor's
 *  sessionStorage payload all fit. */
export interface ArticlePost {
  title: string;
  author?: string | null;
  author_obj?: { name: string } | null;
  author_avatar_url?: string | null;
  category?: string | null;
  category_obj?: { name: string } | null;
  published_at?: string | null;
  created_at?: string | null;
  read_minutes?: number | null;
  hero_url?: string | null;
  body: string;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function BlogPostArticle({
  post,
  children,
}: {
  post: ArticlePost;
  children?: ReactNode;
}) {
  const authorName = post.author_obj?.name ?? post.author ?? "";
  const avatar = post.author_avatar_url ?? null;
  const category = post.category_obj?.name ?? post.category ?? "";
  const date = (post.published_at ?? post.created_at ?? "").slice(0, 10);

  return (
    <article className="bpost-article rv">
      <h1 className="bpost-title">
        <Inline text={post.title} />
      </h1>
      <div className="bpost-meta">
        {avatar ? (
          <img className="bpost-av" src={avatar} alt={authorName} />
        ) : (
          authorName && <span className="bpost-av">{initials(authorName)}</span>
        )}
        {authorName && <b>{authorName}</b>}
        {authorName && <span className="bpost-dot">·</span>}
        {date && <span>{fmtDate(date)}</span>}
        {post.read_minutes != null && (
          <>
            <span className="bpost-dot">·</span>
            <span>{post.read_minutes} min read</span>
          </>
        )}
        {category && <span className="tag leaf">{category}</span>}
      </div>
      {post.hero_url && (
        <div className="bpost-hero">
          <img src={post.hero_url} alt={post.title} />
        </div>
      )}
      <SafeHtml className="bpost-body" html={post.body} />
      {children}
    </article>
  );
}
