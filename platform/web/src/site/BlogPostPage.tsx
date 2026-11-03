/**
 * BlogPostPage — public /blog/:slug article view (TEC-169).
 *
 * Renders the published post from `GET /api/content/posts/{slug}` inside the
 * shared SiteLayout chrome: article column (title, meta row, hero, sanitized
 * body via SafeHtml), a related rail, an "Open with AI" row (A7 honest
 * deep-links) and a lead-collector card posting to /api/enquiries.
 *
 * SEO mirrors SitePage's head management — document.title + meta
 * description — plus canonical, OG tags and an Article JSON-LD block, all
 * injected with a `data-bpost` marker so route-away cleanup removes them.
 */
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch, ApiError } from "@/lib/api";
import { fetchPostDetail, postToCard, type PublicPostDetail } from "./blog";
import { fmtDate } from "./format";
import { Icon } from "./sections/Icon";
import { Inline } from "./sections/shared";
import { SafeHtml } from "./SafeHtml";
import { initSiteRuntime } from "./siteRuntime";
import { SitePreloader } from "./SitePreloader";
import "@/styles/site.css";

const SEO_FLAG = "data-bpost";

function absolutize(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `${window.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;
}

/**
 * Track every head mutation for route-away cleanup: elements this page
 * created are removed; pre-existing ones (meta[name=description] lives in
 * index.html) get their original `content` restored so site-wide meta
 * isn't lost.
 */
type SeoCleanup = () => void;
type Track = (el: Element, created: boolean, attr: string, prev: string | null) => void;

function createSeoTracker(): { track: Track; cleanup: SeoCleanup } {
  const created: Element[] = [];
  const restore: [Element, string, string | null][] = [];
  const track: Track = (el, wasCreated, attr, prev) => {
    if (wasCreated) {
      el.setAttribute(SEO_FLAG, "");
      created.push(el);
    } else if (!el.hasAttribute(SEO_FLAG)) {
      restore.push([el, attr, prev]);
      el.setAttribute(SEO_FLAG, "");
    }
  };
  const cleanup: SeoCleanup = () => {
    created.forEach((el) => el.remove());
    restore.forEach(([el, attr, prev]) => {
      if (prev === null) el.removeAttribute(attr);
      else el.setAttribute(attr, prev);
      el.removeAttribute(SEO_FLAG);
    });
  };
  return { track, cleanup };
}

function upsertMeta(
  kind: "name" | "property",
  key: string,
  content: string,
  track: Track,
) {
  let el = document.head.querySelector(`meta[${kind}="${key}"]`);
  const prev = el?.getAttribute("content") ?? null;
  let made = false;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(kind, key);
    document.head.appendChild(el);
    made = true;
  }
  el.setAttribute("content", content);
  track(el, made, "content", prev);
}

function upsertCanonical(href: string, track: Track) {
  let el = document.head.querySelector('link[rel="canonical"]');
  const prev = el?.getAttribute("href") ?? null;
  let made = false;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
    made = true;
  }
  el.setAttribute("href", href);
  track(el, made, "href", prev);
}

/** title / description / canonical / OG / Article JSON-LD for a loaded post. */
function usePostSeo(post: PublicPostDetail | null, url: string) {
  useEffect(() => {
    if (!post) return;
    const { track, cleanup } = createSeoTracker();
    const title = post.meta_title || post.title;
    const desc = post.meta_description || post.excerpt || "";
    const image = post.hero_url ? absolutize(post.hero_url) : null;

    document.title = title;
    upsertMeta("name", "description", desc, track);
    upsertCanonical(url, track);
    upsertMeta("property", "og:type", "article", track);
    upsertMeta("property", "og:title", title, track);
    upsertMeta("property", "og:description", desc, track);
    upsertMeta("property", "og:url", url, track);
    if (image) upsertMeta("property", "og:image", image, track);
    const authorName = post.author_obj?.name ?? post.author;
    const ld = document.createElement("script");
    ld.setAttribute("type", "application/ld+json");
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      ...(authorName
        ? { author: { "@type": "Person", name: authorName } }
        : {}),
      ...(post.published_at ? { datePublished: post.published_at } : {}),
      ...(image ? { image: [image] } : {}),
      ...(desc ? { description: desc } : {}),
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
    });
    document.head.appendChild(ld);
    track(ld, true, "", null);
    return cleanup;
  }, [post, url]);
}

/* A7 — ChatGPT and Claude accept a `?q=` prefill; Gemini and Codex have no
   URL-prefill endpoint, so those copy the prompt and open the app home —
   the button label flips to "prompt copied" so it doesn't look broken. */
interface AiTarget {
  key: string;
  label: string;
  icon: string;
  href?: string;
  copyUrl?: string;
}

function aiTargets(prompt: string): AiTarget[] {
  const q = encodeURIComponent(prompt);
  return [
    {
      key: "chatgpt",
      label: "ChatGPT",
      icon: "ai-chatgpt",
      href: `https://chatgpt.com/?q=${q}`,
    },
    {
      key: "claude",
      label: "Claude",
      icon: "ai-claude",
      href: `https://claude.ai/new?q=${q}`,
    },
    {
      key: "gemini",
      label: "Gemini",
      icon: "ai-gemini",
      copyUrl: "https://gemini.google.com/app",
    },
    {
      key: "codex",
      label: "Codex",
      icon: "ai-codex",
      copyUrl: "https://chatgpt.com/codex",
    },
  ];
}

function OpenWithAi({ url }: { url: string }) {
  const prompt = `Summarize this article: ${url}`;
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  async function openCopy(t: AiTarget) {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      /* clipboard blocked — still open the app */
    }
    window.open(t.copyUrl, "_blank", "noopener,noreferrer");
    setCopied(t.key);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(null), 2400);
  }

  return (
    <div className="bpost-ai">
      <span className="bpost-ai-label">
        <Icon name="wand-magic-sparkles" /> Open with AI
      </span>
      <div className="bpost-ai-row">
        {aiTargets(prompt).map((t) =>
          t.href ? (
            <a
              key={t.key}
              className="bpost-ai-btn"
              href={t.href}
              target="_blank"
              rel="noopener noreferrer"
              title={`Open in ${t.label}`}
            >
              <Icon name={t.icon} size={13} /> {t.label}
            </a>
          ) : (
            <button
              key={t.key}
              type="button"
              className="bpost-ai-btn"
              onClick={() => void openCopy(t)}
              title={`Copy prompt & open ${t.label}`}
            >
              <Icon name={t.icon} size={13} />{" "}
              {copied === t.key ? "prompt copied" : t.label}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

function LeadCollector({ slug }: { slug: string }) {
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? "").trim();
    setState("sending");
    setError(null);
    try {
      await apiFetch("/api/enquiries", {
        method: "POST",
        body: {
          name: get("name"),
          email: get("email"),
          phone: get("phone") || null,
          message: get("message") || null,
          source: `blog:${slug}`.slice(0, 50),
          idempotency_key: crypto.randomUUID(),
        },
      });
      setState("done");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not send — check your connection and try again.",
      );
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div className="bpost-lead card rv">
        <div className="bpost-lead-done">
          <span className="bpost-lead-check">
            <Icon name="check" size={20} />
          </span>
          <h3>You&apos;re on the list</h3>
          <p>
            Thanks — we&apos;ll send you the next guide and a note about the
            study plan that fits your target band.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bpost-lead card rv">
      <div className="eb">Keep reading</div>
      <h3>Get the next guide in your inbox</h3>
      <p className="bpost-lead-sub">
        One email when a new guide drops — plus the study plan matching your
        target band. No spam.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="bpost-lead-grid">
          <input name="name" required placeholder="Your name" aria-label="Your name" />
          <input
            name="email"
            type="email"
            required
            placeholder="Email address"
            aria-label="Email address"
          />
          <input name="phone" placeholder="Phone (optional)" aria-label="Phone (optional)" />
          <textarea
            name="message"
            rows={3}
            placeholder="What band are you aiming for? (optional)"
            aria-label="Message (optional)"
          />
        </div>
        <button className="btn btn-p" type="submit" disabled={state === "sending"}>
          <Icon name="paper-plane" /> {state === "sending" ? "Sending…" : "Send me the guide"}
        </button>
        {error && (
          <div className="bpost-lead-err" role="alert">
            {error} — your details are still here, hit send again.
          </div>
        )}
      </form>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function BlogPostPage() {
  const { slug = "" } = useParams();
  const [post, setPost] = useState<PublicPostDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "missing" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const url = useMemo(
    () => `${window.location.origin}/blog/${slug}`,
    [slug],
  );

  useEffect(() => {
    let live = true;
    setPost(null);
    setStatus("loading");
    fetchPostDetail(slug)
      .then((p) => {
        if (!live) return;
        setPost(p);
        setStatus("ok");
      })
      .catch((e: unknown) => {
        if (!live) return;
        if (e instanceof ApiError && e.status === 404) setStatus("missing");
        else {
          setErrorMsg(
            e instanceof ApiError ? e.message : "Could not load this article.",
          );
          setStatus("error");
        }
      });
    return () => {
      live = false;
    };
  }, [slug]);

  usePostSeo(post, url);

  useEffect(() => {
    if (post) initSiteRuntime();
  }, [post]);

  if (status === "loading") {
    return (
      <div className="bpost bpost-loading">
        <SitePreloader />
      </div>
    );
  }

  if (status === "missing" || status === "error") {
    return (
      <div className="bpost">
        <div className="wrap bpost-empty">
          <span className="bpost-empty-icon">
            <Icon name="newspaper" size={30} />
          </span>
          <h1>{status === "missing" ? "Article not found" : "Something went wrong"}</h1>
          <p>
            {status === "missing"
              ? "This post is unpublished or the link is wrong."
              : errorMsg}
          </p>
          <Link className="btn btn-p" to="/blog">
            <Icon name="arrow-left" /> Back to the blog
          </Link>
        </div>
      </div>
    );
  }

  if (!post) return null;

  const authorName = post.author_obj?.name ?? post.author ?? "";
  const avatar = post.author_avatar_url ?? null;
  const category = post.category_obj?.name ?? post.category;
  const date = (post.published_at ?? post.created_at ?? "").slice(0, 10);
  const related = (post.related_posts ?? []).map(postToCard);

  return (
    <div className="bpost">
      <div className="wrap">
        <nav className="bpost-crumb rv">
          <Link to="/blog">Blog</Link>
          <span>/</span>
          {category && <span>{category}</span>}
        </nav>
        <div className="bpost-grid">
          <article className="bpost-article rv">
            <h1 className="bpost-title"><Inline text={post.title} /></h1>
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
            <OpenWithAi url={url} />
          </article>
          {related.length > 0 && (
            <aside className="bpost-rail rv">
              <div className="eb">Keep reading</div>
              {related.map((r) => (
                <Link key={r.slug} className="bpost-rel" to={`/blog/${r.slug}`}>
                  {r.hero_url && (
                    <span className="bpost-rel-img">
                      <img src={r.hero_url} alt="" />
                    </span>
                  )}
                  <span className="bpost-rel-body">
                    <b>{r.title}</b>
                    <span className="bpost-rel-meta">
                      {r.category && <span>{r.category}</span>}
                      {r.read_minutes > 0 && <span>{r.read_minutes} min</span>}
                    </span>
                  </span>
                </Link>
              ))}
            </aside>
          )}
        </div>
        <LeadCollector slug={slug} />
      </div>
    </div>
  );
}
