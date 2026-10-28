import { useEffect, useState } from "react";
import { Head, Section } from "./shared";
import { Icon } from "./Icon";

export const BLOG_FILTER_EVENT = "bloom:blog-filter";

interface Post {
  cat: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  read: string;
  featured: boolean;
  hero_url: string;
  href: string;
}

interface BlogGridProps {
  eyebrow: string;
  heading: string;
  lead: string;
  posts: Post[];
}

export function BlogGridSection({ props }: { props: BlogGridProps }) {
  const { eyebrow, heading, lead, posts } = props;
  const [cat, setCat] = useState("All");

  /* Pairs with BlogFilterSection: it dispatches `bloom:blog-filter` on window
     when a pill is tapped. This mirrors the prototype's shared blogCat state. */
  useEffect(() => {
    const onFilter = (e: Event) => {
      const detail = (e as CustomEvent<{ category?: string }>).detail;
      setCat(detail?.category || "All");
    };
    window.addEventListener(BLOG_FILTER_EVENT, onFilter);
    return () => window.removeEventListener(BLOG_FILTER_EVENT, onFilter);
  }, []);

  const all = posts ?? [];
  const list = cat === "All" ? all : all.filter((p) => p.cat === cat);
  const feat = cat === "All" ? list.filter((p) => p.featured).slice(0, 1) : [];
  const rest = list.filter((p) => !feat.includes(p));

  return (
    <Section>
      <Head eyebrow={eyebrow} heading={heading} lead={lead} />
      {feat.map((p, i) => (
        <a
          key={`f${i}`}
          className="card rv in"
          href={p.href || "#"}
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
              <span className="tag leaf">{p.cat}</span>
              <span className="tag amb">Featured</span>
            </div>
            <h3 style={{ fontSize: 25, lineHeight: 1.2, marginBottom: 12 }}>{p.title}</h3>
            <p style={{ fontSize: "14.5px", color: "var(--ink-3)", lineHeight: 1.7, marginBottom: 18 }}>
              {p.excerpt}
            </p>
            <div style={{ fontSize: "12.5px", color: "var(--ink-4)" }}>
              {p.author} · {p.date} · {p.read} min read
            </div>
          </div>
        </a>
      ))}
      <div className="grid g3">
        {rest.map((p, i) => (
          <a
            key={i}
            className="tcard rv in"
            href={p.href || "#"}
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
                <span className="tag leaf">{p.cat}</span>
                <span className="tag">{p.read} min</span>
              </div>
              <h3 style={{ fontSize: 17, lineHeight: 1.3, marginBottom: 9 }}>{p.title}</h3>
              <p style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.6, flex: 1 }}>
                {p.excerpt && p.excerpt.length > 132 ? `${p.excerpt.slice(0, 132)}…` : p.excerpt}
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
                {p.author} · {p.date}
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
            Nothing published in this category yet
          </b>
          <span style={{ fontSize: 13 }}>Try another filter.</span>
        </div>
      )}
    </Section>
  );
}
