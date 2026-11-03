/**
 * CMS → Blogs → Authors (/admin/cms/authors).
 *
 * Author list with create/edit in a large modal (`AuthorModal` — also
 * reused by the post editor's inline "new author" flow). Delete warns
 * that linked posts lose their author (BE sets posts.author_id to NULL).
 */
import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { env } from "@/config/env";
import type { AdminSession } from "@/lib/auth";
import {
  createAuthor,
  deleteAuthor,
  getMedia,
  isSlugTaken,
  listAuthors,
  patchAuthor,
  slugify,
} from "@/lib/cms";
import type { CmsAuthor } from "@/lib/cms";
import { uploadMediaFile } from "@/site/useMediaUpload";
import {
  CheckIcon,
  PenIcon,
  PlusIcon,
  SearchIcon,
  UploadIcon,
  UserIcon,
  XIcon,
} from "@/components/icons";

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

function Avatar({ name, url }: { name: string; url?: string | null }) {
  const src = url ? (url.startsWith("http") ? url : `${env.apiBaseUrl}${url}`) : null;
  return (
    <span className="adm-cms-avatar">
      {src ? (
        <img src={src} alt="" />
      ) : (
        name
          .split(" ")
          .filter(Boolean)
          .slice(0, 2)
          .map((w) => w[0]?.toUpperCase())
          .join("")
      )}
    </span>
  );
}

interface AuthorModalProps {
  token: string;
  /** Editing an existing author; omit for create. */
  author?: CmsAuthor | null;
  /** Compact variant — hides bio + socials for the inline editor flow. */
  compact?: boolean;
  onClose: () => void;
  onSaved: (author: CmsAuthor) => void;
}

export function AuthorModal({
  token,
  author,
  compact = false,
  onClose,
  onSaved,
}: AuthorModalProps) {
  const editing = Boolean(author);
  const [name, setName] = useState(author?.name ?? "");
  const [slug, setSlug] = useState(author?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(editing);
  const [role, setRole] = useState(author?.role ?? "");
  const [bio, setBio] = useState(author?.bio ?? "");
  const [email, setEmail] = useState(author?.email ?? "");
  const [linkedin, setLinkedin] = useState(author?.linkedin_url ?? "");
  const [instagram, setInstagram] = useState(author?.instagram_url ?? "");
  const [twitter, setTwitter] = useState(author?.twitter_url ?? "");
  const [website, setWebsite] = useState(author?.website_url ?? "");
  const [avatarId, setAvatarId] = useState(author?.avatar_media_id ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Resolve the existing avatar URL for previews in edit mode.
  useEffect(() => {
    if (!author?.avatar_media_id) return;
    let live = true;
    getMedia(token, author.avatar_media_id)
      .then((m) => live && setAvatarUrl(m.url))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [token, author?.avatar_media_id]);

  function onName(v: string) {
    setName(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const media = await uploadMediaFile(token, file);
      setAvatarId(media.id);
      setAvatarUrl(media.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (saving) return;
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      name: name.trim(),
      slug: slug.trim() || slugify(name),
      role: role.trim() || null,
      bio: bio.trim() || null,
      avatar_media_id: avatarId || null,
      email: email.trim() || null,
      linkedin_url: linkedin.trim() || null,
      instagram_url: instagram.trim() || null,
      twitter_url: twitter.trim() || null,
      website_url: website.trim() || null,
    };
    try {
      const saved = editing
        ? await patchAuthor(token, author!.id, payload)
        : await createAuthor(token, payload);
      onSaved(saved);
    } catch (err) {
      setError(
        isSlugTaken(err)
          ? "That slug is already in use — pick another."
          : err instanceof ApiError
            ? err.message
            : "Save failed.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="adm-modal-scrim"
      role="presentation"
      onClick={() => !saving && onClose()}
    >
      <div
        className="adm-modal adm-modal-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adm-author-t"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="adm-author-t">{editing ? "Edit author" : "New author"}</h3>
        <div className="adm-form">
          <div className="adm-form-row">
            <label className="adm-fl">
              <span>Name</span>
              <input
                className="adm-input"
                value={name}
                onChange={(e) => onName(e.target.value)}
                autoFocus
              />
            </label>
            <label className="adm-fl">
              <span>Slug</span>
              <input
                className="adm-input"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
              />
            </label>
          </div>
          <div className="adm-form-row">
            <label className="adm-fl">
              <span>Role</span>
              <input
                className="adm-input"
                placeholder="IELTS Instructor"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              />
            </label>
            <label className="adm-fl">
              <span>Email</span>
              <input
                type="email"
                className="adm-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          </div>
          <div className="adm-form-row">
            <div className="adm-fl">
              <span>Avatar</span>
              <div className="adm-imgup">
                <span className={`adm-imgup-prev${avatarUrl ? "" : " empty"}`}>
                  {avatarUrl ? (
                    <img
                      src={
                        avatarUrl.startsWith("http")
                          ? avatarUrl
                          : `${env.apiBaseUrl}${avatarUrl}`
                      }
                      alt=""
                    />
                  ) : (
                    <UserIcon size={13} />
                  )}
                </span>
                <label className="adm-btn adm-btn-g adm-imgup-btn">
                  <UploadIcon size={11} /> {uploading ? "Uploading…" : "Upload"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    hidden
                    ref={fileRef}
                    disabled={uploading}
                    onChange={onPickAvatar}
                  />
                </label>
                {avatarId && (
                  <button
                    type="button"
                    className="adm-imgup-rm"
                    onClick={() => {
                      setAvatarId("");
                      setAvatarUrl(null);
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
          {!compact && (
            <>
              <label className="adm-fl">
                <span>Bio</span>
                <textarea
                  className="adm-input adm-textarea"
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </label>
              <div className="adm-form-row">
                <label className="adm-fl">
                  <span>LinkedIn URL</span>
                  <input
                    type="url"
                    className="adm-input"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                  />
                </label>
                <label className="adm-fl">
                  <span>Instagram URL</span>
                  <input
                    type="url"
                    className="adm-input"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                  />
                </label>
              </div>
              <div className="adm-form-row">
                <label className="adm-fl">
                  <span>Twitter / X URL</span>
                  <input
                    type="url"
                    className="adm-input"
                    value={twitter}
                    onChange={(e) => setTwitter(e.target.value)}
                  />
                </label>
                <label className="adm-fl">
                  <span>Website URL</span>
                  <input
                    type="url"
                    className="adm-input"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </label>
              </div>
            </>
          )}
          {error && (
            <div className="adm-set-err" role="alert">
              {error}
            </div>
          )}
        </div>
        <div className="adm-modal-act">
          <button
            type="button"
            className="adm-btn adm-btn-g"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="adm-btn"
            onClick={save}
            disabled={saving}
          >
            <CheckIcon size={12} /> {saving ? "Saving…" : editing ? "Save changes" : "Create author"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CmsAuthors({ session }: { session: AdminSession }) {
  const token = session.tokens.access_token;
  const [authors, setAuthors] = useState<CmsAuthor[] | null>(null);
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ author?: CmsAuthor } | null>(null);
  const [deleting, setDeleting] = useState<CmsAuthor | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; kind: "ok" | "err" } | null>(
    null,
  );

  useEffect(() => {
    let live = true;
    listAuthors(token)
      .then((p) => live && setAuthors(p.items))
      .catch((err: unknown) => {
        if (live)
          setLoadError(
            err instanceof ApiError ? err.message : "Could not load authors.",
          );
      });
    return () => {
      live = false;
    };
  }, [token]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  const filtered = (authors ?? []).filter((a) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      a.name.toLowerCase().includes(q) ||
      (a.role ?? "").toLowerCase().includes(q) ||
      (a.email ?? "").toLowerCase().includes(q)
    );
  });

  async function confirmDelete() {
    if (!deleting || busy) return;
    setBusy(true);
    try {
      await deleteAuthor(token, deleting.id);
      setAuthors((cur) => (cur ?? []).filter((a) => a.id !== deleting.id));
      setDeleting(null);
      setNotice({ text: `Deleted “${deleting.name}”.`, kind: "ok" });
    } catch (err) {
      setNotice({
        text: err instanceof ApiError ? err.message : "Delete failed.",
        kind: "err",
      });
    } finally {
      setBusy(false);
    }
  }

  function onSaved(a: CmsAuthor) {
    setAuthors((cur) => {
      const list = cur ?? [];
      const idx = list.findIndex((x) => x.id === a.id);
      if (idx === -1) return [...list, a];
      const next = [...list];
      next[idx] = a;
      return next;
    });
    setModal(null);
    setNotice({ text: `Saved “${a.name}”.`, kind: "ok" });
  }

  if (loadError) {
    return (
      <div className="adm-set">
        <div className="adm-card adm-set-loaderr" role="alert">
          <b>Authors could not be loaded</b>
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
            <em>Authors</em>
          </h1>
          <p>Byline identities attached to blog posts.</p>
        </div>
        <div className="adm-phead-actions">
          <button
            type="button"
            className="adm-btn"
            onClick={() => setModal({})}
          >
            <PlusIcon size={12} /> New Author
          </button>
        </div>
      </div>

      <div className="adm-cms-filters">
        <label className="adm-cms-search">
          <SearchIcon size={13} />
          <input
            type="search"
            className="adm-input"
            placeholder="Search name, role, email…"
            value={search}
            aria-label="Search authors"
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      <div className="adm-card">
        <div className="adm-card-bd flush">
          <div className="adm-cms-tablewrap">
            <table className="adm-cms-table">
              <thead>
                <tr>
                  <th>Author</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Added</th>
                  <th className="ra">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!authors &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="adm-cms-skel">
                      <td colSpan={5}>
                        <i />
                      </td>
                    </tr>
                  ))}
                {authors && filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="adm-cms-empty">
                      {search
                        ? "No authors match the search."
                        : "No authors yet — add the first one."}
                    </td>
                  </tr>
                )}
                {authors &&
                  filtered.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <span className="adm-cms-acell">
                          <Avatar name={a.name} />
                          <span>
                            <b className="adm-cms-ptitle">{a.name}</b>
                            <span className="adm-cms-pslug">/{a.slug}</span>
                          </span>
                        </span>
                      </td>
                      <td>{a.role ?? "—"}</td>
                      <td>{a.email ?? "—"}</td>
                      <td className="adm-cms-date">{fmtDate(a.created_at)}</td>
                      <td className="ra">
                        <div className="adm-cms-rowact">
                          <button
                            type="button"
                            className="adm-icbtn sm"
                            title="Edit author"
                            aria-label={`Edit ${a.name}`}
                            onClick={() => setModal({ author: a })}
                          >
                            <PenIcon size={12} />
                          </button>
                          <button
                            type="button"
                            className="adm-icbtn sm danger"
                            title="Delete author"
                            aria-label={`Delete ${a.name}`}
                            onClick={() => setDeleting(a)}
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

      {modal && (
        <AuthorModal
          token={token}
          author={modal.author ?? null}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
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
            aria-labelledby="adm-delauthor-t"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="adm-delauthor-t">Delete this author?</h3>
            <p>
              “{deleting.name}” will be removed. Posts by this author are kept
              — their author field is cleared instead.
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
                {busy ? "Deleting…" : "Delete author"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
