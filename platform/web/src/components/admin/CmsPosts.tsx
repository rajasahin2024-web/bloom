/**
 * CMS → Blogs → All Posts (/admin/cms/posts).
 *
 * Table of blog posts with a status filter, client-side search over the
 * fetched page, edit/delete row actions and a "New Post" CTA. Delete sits
 * behind the shared confirm modal; server-side pagination kicks in once a
 * status bucket grows past one page.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "@/lib/api";
import type { AdminSession } from "@/lib/auth";
import { deletePost, listPosts } from "@/lib/cms";
import type { CmsPost, CmsStatus, Page } from "@/lib/cms";
import {
  CheckIcon,
  PenIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from "@/components/icons";

const PAGE_SIZE = 20;

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

export function StatusBadge({ status }: { status: CmsStatus }) {
  return (
    <span className={`adm-badge ${status === "published" ? "ok" : "warn"}`}>
      {status === "published" ? "Published" : "Draft"}
    </span>
  );
}

export function CmsPosts({ session }: { session: AdminSession }) {
  const token = session.tokens.access_token;
  const navigate = useNavigate();
  const [page, setPage] = useState<Page<CmsPost> | null>(null);
  const [status, setStatus] = useState<"" | CmsStatus>("");
  const [search, setSearch] = useState("");
  const [pageNo, setPageNo] = useState(1);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<CmsPost | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; kind: "ok" | "err" } | null>(
    null,
  );

  useEffect(() => {
    let live = true;
    setLoading(true);
    listPosts(token, {
      status: status || undefined,
      page: pageNo,
      pageSize: PAGE_SIZE,
    })
      .then((p) => {
        if (live) setPage(p);
      })
      .catch((err: unknown) => {
        if (live)
          setLoadError(
            err instanceof ApiError ? err.message : "Could not load posts.",
          );
      })
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [token, status, pageNo]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  const items = useMemo(() => {
    const rows = page?.items ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.author ?? "").toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q),
    );
  }, [page, search]);

  const totalPages = page ? Math.max(1, Math.ceil(page.total / PAGE_SIZE)) : 1;

  async function confirmDelete() {
    if (!deleting || busy) return;
    setBusy(true);
    try {
      await deletePost(token, deleting.id);
      setDeleting(null);
      setPage((cur) =>
        cur
          ? { ...cur, items: cur.items.filter((p) => p.id !== deleting.id), total: cur.total - 1 }
          : cur,
      );
      setNotice({ text: `Deleted “${deleting.title}”.`, kind: "ok" });
    } catch (err) {
      setNotice({
        text: err instanceof ApiError ? err.message : "Delete failed.",
        kind: "err",
      });
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <div className="adm-set">
        <div className="adm-card adm-set-loaderr" role="alert">
          <b>Posts could not be loaded</b>
          <p>{loadError}</p>
          <button
            type="button"
            className="adm-btn"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="adm-set">
      <div className="adm-phead">
        <div>
          <div className="adm-eyebrow">CMS · Blogs</div>
          <h1>
            All <em>Posts</em>
          </h1>
          <p>Every blog post — drafts and published — in one list.</p>
        </div>
        <div className="adm-phead-actions">
          <button
            type="button"
            className="adm-btn"
            onClick={() => navigate("/admin/cms/posts/new")}
          >
            <PlusIcon size={12} /> New Post
          </button>
        </div>
      </div>

      <div className="adm-cms-filters">
        <label className="adm-cms-search">
          <SearchIcon size={13} />
          <input
            type="search"
            className="adm-input"
            placeholder="Search title, slug, author…"
            value={search}
            aria-label="Search posts"
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          className="adm-input adm-cms-statusf"
          value={status}
          aria-label="Filter by status"
          onChange={(e) => {
            setStatus(e.target.value as "" | CmsStatus);
            setPageNo(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>

      <div className="adm-card">
        <div className="adm-card-bd flush">
          <div className="adm-cms-tablewrap">
            <table className="adm-cms-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Author</th>
                  <th>Status</th>
                  <th>Published</th>
                  <th>Updated</th>
                  <th className="ra">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="adm-cms-skel">
                      <td colSpan={7}>
                        <i />
                      </td>
                    </tr>
                  ))}
                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="adm-cms-empty">
                      {search
                        ? "No posts match the search."
                        : "No posts yet — write the first one."}
                    </td>
                  </tr>
                )}
                {!loading &&
                  items.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Link
                          className="adm-cms-ptitle"
                          to={`/admin/cms/posts/${p.id}/edit`}
                        >
                          {p.title}
                        </Link>
                        <span className="adm-cms-pslug">/{p.slug}</span>
                      </td>
                      <td>
                        {p.category ?? "—"}
                        {p.subcategory ? (
                          <span className="adm-cms-sub"> › {p.subcategory}</span>
                        ) : null}
                      </td>
                      <td>{p.author ?? "—"}</td>
                      <td>
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="adm-cms-date">{fmtDate(p.published_at)}</td>
                      <td className="adm-cms-date">{fmtDate(p.updated_at)}</td>
                      <td className="ra">
                        <div className="adm-cms-rowact">
                          <button
                            type="button"
                            className="adm-icbtn sm"
                            title="Edit post"
                            aria-label={`Edit ${p.title}`}
                            onClick={() =>
                              navigate(`/admin/cms/posts/${p.id}/edit`)
                            }
                          >
                            <PenIcon size={12} />
                          </button>
                          <button
                            type="button"
                            className="adm-icbtn sm danger"
                            title="Delete post"
                            aria-label={`Delete ${p.title}`}
                            onClick={() => setDeleting(p)}
                          >
                            <XIcon size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
        {page && page.total > PAGE_SIZE && (
          <div className="adm-cms-pager">
            <button
              type="button"
              className="adm-btn adm-btn-g"
              disabled={pageNo <= 1}
              onClick={() => setPageNo((n) => n - 1)}
            >
              Previous
            </button>
            <span>
              Page {pageNo} of {totalPages} · {page.total} posts
            </span>
            <button
              type="button"
              className="adm-btn adm-btn-g"
              disabled={pageNo >= totalPages}
              onClick={() => setPageNo((n) => n + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {notice && (
        <div
          className={`adm-toast${notice.kind === "err" ? " err" : ""}`}
          role={notice.kind === "err" ? "alert" : "status"}
        >
          {notice.kind === "err" ? <XIcon size={12} /> : <CheckIcon size={12} />}{" "}
          {notice.text}
        </div>
      )}

      {deleting && (
        <div
          className="adm-modal-scrim"
          role="presentation"
          onClick={() => !busy && setDeleting(null)}
        >
          <div
            className="adm-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="adm-delpost-t"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="adm-delpost-t">Delete this post?</h3>
            <p>
              “{deleting.title}” will be permanently removed. This cannot be
              undone.
            </p>
            <div className="adm-modal-act">
              <button
                type="button"
                className="adm-btn adm-btn-g"
                onClick={() => setDeleting(null)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="adm-btn adm-btn-danger"
                onClick={confirmDelete}
                disabled={busy}
              >
                {busy ? "Deleting…" : "Delete post"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
