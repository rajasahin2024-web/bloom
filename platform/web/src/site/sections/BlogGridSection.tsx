import { useEffect, useState } from "react";
import { fmtDate } from "../format";
import { Icon } from "./Icon";
import { Inline } from "./shared";

export const BLOG_FILTER_EVENT = "bloom:blog-filter";
export const BLOG_POSTS_EVENT = "bloom:blog-posts";

interface Post {
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

interface BlogGridProps {
  variant?: string;
  posts: Post[];
  empty?: { title?: string; body?: string };
}

export function BlogGridSection({ props }: { props: BlogGridProps }) {
  const { variant, posts, empty } = props;
  const [cat, setCat] = useState("All");

  /* Pairs with BlogFilterSection: it dispatches `bloom:blog-filter` on window
     when a pill is tapped, mirroring the prototype's shared blogCat state.
     We broadcast the post list back on `bloom:blog-posts` so the pills can
     show per-category counts exactly like the prototype's renderBlog(). */
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(BLOG_POSTS_EVENT, { detail: { posts: posts ?? [] } }),
    );
  }, [posts]);

  useEffect(() => {
    const onFilter = (e: Event) => {
      const detail = (e as CustomEvent<{ category?: string }>).detail;
      setCat(detail?.category || "All");
    };
    window.addEventListener(BLOG_FILTER_EVENT, onFilter);
    return () => window.removeEventListener(BLOG_FILTER_EVENT, onFilter);
  }, []);

  const all = posts ?? [];
  const list = cat === "All" ? all : all.filter((p) => p.category === cat);
  const feat = cat === "All" ? list.filter((p) => p.featured).slice(0, 1) : [];
  const rest = list.filter((p) => !feat.includes(p));

  /* The prototype renders head + pills + grid inside a single `.sec` whose
     top padding clears the fixed nav. BlogFilterSection renders the head +
     pills half; this section continues it with zero top padding. */
  return (
    <section className={`sec${variant ? ` ${variant}` : ""}`} style={{ paddingTop: 0 }}>
      <div className="wrap">
        {feat.map((p, i) => (
          <a
            key={`f${i}`}
            className="card rv in"
            href="/blog"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 0,
              overflow: "hidden",
              marginBottom: 22,
              boxShadow: "var(--sh-3)",
            }}
          >
            <div style={{ position: "relative", minHeight: 280, background: "var(--paper-2)" }}>
              {p.hero_url && (
                <img
                  src={p.hero_url}
                  alt={p.title}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                />
              )}
            </div>
            <div style={{ padding: 34 }}>
              <div style={{ display: "flex", gap: 7, marginBottom: 14 }}>
                <span className="tag leaf">{p.category}</span>
                <span className="tag amb">Featured</span>
              </div>
              <h3 style={{ fontSize: 25, lineHeight: 1.2, marginBottom: 12 }}><Inline text={p.title} /></h3>
              <p style={{ fontSize: "14.5px", color: "var(--ink-3)", lineHeight: 1.7, marginBottom: 18 }}>
                {p.excerpt}
              </p>
              <div style={{ fontSize: "12.5px", color: "var(--ink-4)" }}>
                {p.author} · {fmtDate(p.date)} · {p.read_minutes} min read
              </div>
            </div>
          </a>
        ))}
        <div className="grid g3">
          {rest.map((p, i) => (
            <a
              key={i}
              className="tcard rv in"
              href="/blog"
              style={{ display: "flex", padding: 0, overflow: "hidden" }}
            >
              <div style={{ position: "relative", height: 158, background: "var(--paper-2)" }}>
                {p.hero_url && (
                  <img
                    src={p.hero_url}
                    alt={p.title}
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                  />
                )}
              </div>
              <div style={{ padding: 20, display: "flex", flexDirection: "column", flex: 1 }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 11 }}>
                  <span className="tag leaf">{p.category}</span>
                  <span className="tag">{p.read_minutes} min</span>
                </div>
                <h3 style={{ fontSize: 17, lineHeight: 1.3, marginBottom: 9 }}><Inline text={p.title} /></h3>
                <p style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.6, flex: 1 }}>
                  {(p.excerpt || "").slice(0, 132)}…
                </p>
                <div
                  style={{
                    fontSize: "11.5px",
                    color: "var(--ink-4)",
                    marginTop: 14,
                    paddingTop: 13,
                    borderTop: "1px solid var(--line)",
                  }}
                >
                  {p.author} · {fmtDate(p.date)}
                </div>
              </div>
            </a>
          ))}
        </div>
        {list.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--ink-4)" }}>
            <span style={{ fontSize: 34, display: "block", marginBottom: 14, opacity: 0.4 }}>
              <Icon name="newspaper" size={34} />
            </span>
            <b style={{ display: "block", color: "var(--ink-2)", marginBottom: 5 }}>
              {empty?.title || "Nothing published in this category yet"}
            </b>
            <span style={{ fontSize: 13 }}>{empty?.body || "Try another filter."}</span>
          </div>
        )}
      </div>
    </section>
  );
}
