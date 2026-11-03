import { useEffect, useState } from "react";
import { Head } from "./shared";
import { BLOG_FILTER_EVENT, BLOG_POSTS_EVENT } from "./BlogGridSection";
import { fetchBlogCategories } from "../blog";

interface BlogFilterProps {
  eyebrow?: string;
  heading?: string;
  lead?: string;
  all_label?: string;
  categories?: (string | { label?: string })[];
  /** "live" → pills come from GET /api/content/blog/categories; seeded
      `categories` stay as the error/empty fallback (TEC-169). */
  source?: string;
}

interface PostLike {
  category?: string;
}

const catName = (c: string | { label?: string }) =>
  typeof c === "object" && c !== null ? (c.label ?? "") : String(c);

/* The prototype renders the head + `.pills` row inline above #blogGrid inside
   the same `.sec` — BlogGridSection carries the cards, this section carries
   the head + pills. Category counts come from the live post list, broadcast
   by the grid on `bloom:blog-posts` (prototype derives them the same way). */
export function BlogFilterSection({ props }: { props: BlogFilterProps }) {
  const { eyebrow, heading, lead, all_label, categories, source } = props;
  const [active, setActive] = useState("All");
  const [posts, setPosts] = useState<PostLike[]>([]);
  const [liveCats, setLiveCats] = useState<string[] | null>(null);

  /* TEC-169 — the pill list fetches the real category names once the
     endpoint exists; on 404/empty the seeded `categories` keep working. */
  const wantsLive = source === "live" || !categories;
  useEffect(() => {
    if (!wantsLive) return;
    let on = true;
    fetchBlogCategories()
      .then((cats) => {
        if (on) setLiveCats(cats.length > 0 ? cats.map((c) => c.name) : null);
      })
      .catch(() => {
        if (on) setLiveCats(null);
      });
    return () => {
      on = false;
    };
  }, [wantsLive]);

  useEffect(() => {
    const onPosts = (e: Event) => {
      const detail = (e as CustomEvent<{ posts?: PostLike[] }>).detail;
      setPosts(detail?.posts ?? []);
    };
    window.addEventListener(BLOG_POSTS_EVENT, onPosts);
    return () => window.removeEventListener(BLOG_POSTS_EVENT, onPosts);
  }, []);

  const countFor = (name: string) =>
    name === "All"
      ? posts.length
      : posts.filter((p) => p.category === name).length;

  const pick = (name: string) => {
    setActive(name);
    window.dispatchEvent(
      new CustomEvent(BLOG_FILTER_EVENT, { detail: { category: name } }),
    );
  };

  const pills = [
    all_label || "All",
    ...(liveCats ?? (categories ?? []).map(catName)),
  ];

  /* First section on /blog: top padding clears the fixed nav exactly like
     the prototype's inline `padding-top:calc(var(--nav-h) + 54px)`. Bottom
     padding is zero so it reads as one `.sec` with the blog grid below. */
  return (
    <section
      className="sec"
      style={{ paddingTop: "calc(var(--nav-h) + 54px)", paddingBottom: 0 }}
    >
      <div className="wrap">
        <Head eyebrow={eyebrow} heading={heading} lead={lead} />
        <div className="pills rv" style={{ marginBottom: 26 }}>
          {pills.map((name, i) => {
            const key = i === 0 ? "All" : name;
            return (
              <button
                key={i}
                className={`pill${active === key ? " on" : ""}`}
                onClick={() => pick(key)}
              >
                {name} <span className="n">{countFor(key)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
