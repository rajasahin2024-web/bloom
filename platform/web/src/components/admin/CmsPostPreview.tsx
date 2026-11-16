/**
 * CmsPostPreview — /admin/cms/posts/:id/preview (TEC-203).
 *
 * Standalone admin-only post preview rendered inside the public SiteLayout
 * chrome so it looks like the live article. Declared top-level in
 * router.tsx — its static segments outrank `/admin/*`, so it renders
 * without the AdminShell and restores the admin session itself (a fresh
 * tab only carries the HttpOnly refresh cookie).
 *
 * Data, in order: the editor writes the current (unsaved) form state to
 * sessionStorage["bloom.postPreview.{id}"] right before window.open —
 * sessionStorage clones into target=_blank tabs — which wins when present;
 * otherwise GET /api/cms/posts/{id} renders the last-saved state.
 *
 * No view beacon, no lead collector, no related rail, no SEO head writes.
 */
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "@/lib/api";
import { fetchMe, refreshSession } from "@/lib/auth";
import { getPost } from "@/lib/cms";
import {
  BlogPostArticle,
  type ArticlePost,
} from "@/site/BlogPostArticle";
import { SitePreloader } from "@/site/SitePreloader";

type Stage = "checking" | "denied" | "loading" | "ok" | "error";

/** Article shape plus the status the notice bar reports. */
interface PreviewPost extends ArticlePost {
  status?: string;
}

/** Editor hand-off for unsaved-draft previews — null on absent/corrupt data. */
function readStoredPreview(id: string): PreviewPost | null {
  try {
    const raw = sessionStorage.getItem(`bloom.postPreview.${id}`);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object" || !("title" in data)) return null;
    return data as PreviewPost;
  } catch {
    return null;
  }
}

export function CmsPostPreview() {
  const { id = "" } = useParams();
  const [stage, setStage] = useState<Stage>("checking");
  const [post, setPost] = useState<PreviewPost | null>(null);
  const [unsaved, setUnsaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let live = true;
    (async () => {
      const tokens = await refreshSession();
      if (!live) return;
      if (!tokens) {
        setStage("denied");
        return;
      }
      const user = await fetchMe(tokens.access_token).catch(() => null);
      if (!live) return;
      if (!user || user.role !== "admin") {
        setStage("denied");
        return;
      }
      const stored = readStoredPreview(id);
      if (stored) {
        setPost(stored);
        setUnsaved(true);
        setStage("ok");
        return;
      }
      setStage("loading");
      try {
        const p = await getPost(tokens.access_token, id);
        if (!live) return;
        setPost(p);
        setUnsaved(false);
        setStage("ok");
      } catch (e) {
        if (!live) return;
        setErrorMsg(
          e instanceof ApiError ? e.message : "Could not load this post.",
        );
        setStage("error");
      }
    })();
    return () => {
      live = false;
    };
  }, [id]);

  if (stage === "checking" || stage === "loading") {
    return (
      <div className="bpost bpost-loading">
        <SitePreloader />
      </div>
    );
  }

  if (stage === "denied") {
    return (
      <div className="bpost">
        <div className="wrap bpost-empty">
          <h1>Sign in required</h1>
          <p>Post previews are admin-only — sign in first.</p>
          <Link className="btn btn-p" to="/admin">
            Go to admin sign-in
          </Link>
        </div>
      </div>
    );
  }

  if (stage === "error" || !post) {
    return (
      <div className="bpost">
        <div className="wrap bpost-empty">
          <h1>Preview unavailable</h1>
          <p>{errorMsg || "Could not load this post."}</p>
          <Link className="btn btn-p" to="/admin">
            Back to admin
          </Link>
        </div>
      </div>
    );
  }

  const statusLabel = post.status === "published" ? "published" : "draft";

  return (
    <div className="bpost">
      <div className="wrap">
        <div className="bpost-prevnote" role="status">
          Admin preview — {statusLabel} · {unsaved ? "unsaved" : "saved"}
        </div>
        <div className="bpost-grid">
          <BlogPostArticle post={post} />
        </div>
      </div>
    </div>
  );
}
