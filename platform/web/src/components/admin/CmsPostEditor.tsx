/**
 * CMS → Blogs → New Post / Edit Post
 * (/admin/cms/posts/new, /admin/cms/posts/:id/edit).
 *
 * Full-width editor: title + auto slug + TinyMCE body (self-hosted GPL
 * build served from /tinymce/*) on the left; a right sidebar carries
 * author, category/subcategory, tags, featured image, SEO, excerpt and
 * the status + save/publish controls. Slug conflicts (`409 slug_taken`)
 * retry quietly with a `-2`, `-3`, … suffix.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Editor } from "@tinymce/tinymce-react";
import { ApiError } from "@/lib/api";
import { env } from "@/config/env";
import type { AdminSession } from "@/lib/auth";
import {
  createCategory,
  createPost,
  getMedia,
  getPost,
  isSlugTaken,
  listAuthors,
  listCategories,
  patchPost,
  slugify,
} from "@/lib/cms";
import type {
  CmsAuthor,
  CmsCategory,
  CmsPost,
  CmsPostIn,
  CmsStatus,
} from "@/lib/cms";
import { uploadMediaFile } from "@/site/useMediaUpload";
import { AuthorModal } from "@/components/admin/CmsAuthors";
import {
  ArrowLeftIcon,
  CheckIcon,
  PenIcon,
  PlusIcon,
  UploadIcon,
  XIcon,
} from "@/components/icons";

const META_TITLE_MAX = 300;
const META_DESC_MAX = 500;
const SLUG_RETRIES = 10;

interface TageditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

/** Chips input — Enter or comma commits the pending tag. */
function TagEditor({ tags, onChange }: TageditorProps) {
  const [draft, setDraft] = useState("");
  function commit(raw: string) {
    const t = raw.trim().replace(/,+$/, "").trim();
    if (t && !tags.some((x) => x.toLowerCase() === t.toLowerCase())) {
      onChange([...tags, t]);
    }
    setDraft("");
  }
  return (
    <div className="adm-chips">
      {tags.map((t) => (
        <span key={t} className="adm-chips-tag">
          {t}
          <button
            type="button"
            aria-label={`Remove tag ${t}`}
            onClick={() => onChange(tags.filter((x) => x !== t))}
          >
            <XIcon size={9} />
          </button>
        </span>
      ))}
      <input
        className="adm-chips-in"
        placeholder={tags.length === 0 ? "Add a tag…" : ""}
        value={draft}
        onChange={(e) => {
          if (e.target.value.includes(",")) commit(e.target.value);
          else setDraft(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(draft);
          } else if (e.key === "Backspace" && !draft && tags.length) {
            onChange(tags.slice(0, -1));
          }
        }}
        onBlur={() => commit(draft)}
      />
    </div>
  );
}

/** Small inline create row used for category/subcategory in the sidebar. */
function InlineCreate({
  placeholder,
  busy,
  onCreate,
  onCancel,
}: {
  placeholder: string;
  busy: boolean;
  onCreate: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  return (
    <form
      className="adm-cms-inlineadd"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) onCreate(name.trim());
      }}
    >
      <input
        className="adm-input"
        placeholder={placeholder}
        value={name}
        autoFocus
        onChange={(e) => setName(e.target.value)}
      />
      <button type="submit" className="adm-btn sm" disabled={busy || !name.trim()}>
        {busy ? "…" : <CheckIcon size={11} />}
      </button>
      <button type="button" className="adm-btn adm-btn-g sm" onClick={onCancel}>
        <XIcon size={11} />
      </button>
    </form>
  );
}

function SideCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="adm-card adm-cms-sidecard">
      <div className="adm-card-hd">
        <h3>{title}</h3>
      </div>
      <div className="adm-card-bd">{children}</div>
    </section>
  );
}

export function CmsPostEditor({ session }: { session: AdminSession }) {
  const token = session.tokens.access_token;
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const editing = Boolean(id);

  const [post, setPost] = useState<CmsPost | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugEditing, setSlugEditing] = useState(false);
  const [body, setBody] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [status, setStatus] = useState<CmsStatus>("draft");
  const [featured, setFeatured] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [authorId, setAuthorId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [heroId, setHeroId] = useState("");
  const [heroUrl, setHeroUrl] = useState<string | null>(null);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDesc, setMetaDesc] = useState("");

  const [authors, setAuthors] = useState<CmsAuthor[]>([]);
  const [cats, setCats] = useState<CmsCategory[]>([]);
  const [showAuthorModal, setShowAuthorModal] = useState(false);
  const [addingCat, setAddingCat] = useState(false);
  const [addingSub, setAddingSub] = useState(false);
  const [sideBusy, setSideBusy] = useState(false);

  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ text: string; kind: "ok" | "err" } | null>(
    null,
  );
  const imgUploadRef = useRef<HTMLInputElement>(null);
  const [heroBusy, setHeroBusy] = useState(false);

  // Load the post (edit mode) plus author + category pick-lists.
  useEffect(() => {
    let live = true;
    listAuthors(token)
      .then((p) => live && setAuthors(p.items))
      .catch(() => {});
    listCategories(token)
      .then((l) => live && setCats(l))
      .catch(() => {});
    if (!id) return;
    setPost(null);
    getPost(token, id)
      .then(async (p) => {
        if (!live) return;
        setPost(p);
        setTitle(p.title);
        setSlug(p.slug);
        setSlugTouched(true);
        setBody(p.body);
        setExcerpt(p.excerpt ?? "");
        setStatus(p.status);
        setFeatured(p.featured);
        setTags(p.tags);
        setAuthorId(p.author_id ?? "");
        setCategoryId(p.category_id ?? "");
        setSubcategoryId(p.subcategory_id ?? "");
        setHeroId(p.hero_media_id ?? "");
        setMetaTitle(p.meta_title ?? "");
        setMetaDesc(p.meta_description ?? "");
        if (p.hero_media_id) {
          const media = await getMedia(token, p.hero_media_id).catch(() => null);
          if (live && media) setHeroUrl(media.url);
        }
      })
      .catch((err: unknown) => {
        if (live)
          setLoadError(
            err instanceof ApiError ? err.message : "Could not load the post.",
          );
      });
    return () => {
      live = false;
    };
  }, [token, id]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  const mainCats = useMemo(() => cats.filter((c) => !c.parent_id), [cats]);
  const subCats = useMemo(
    () => cats.filter((c) => c.parent_id === categoryId),
    [cats, categoryId],
  );

  function onTitle(v: string) {
    setTitle(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  async function pickHero(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || heroBusy) return;
    setHeroBusy(true);
    try {
      const media = await uploadMediaFile(token, file);
      setHeroId(media.id);
      setHeroUrl(media.url);
    } catch (err) {
      setNotice({
        text: err instanceof Error ? err.message : "Upload failed.",
        kind: "err",
      });
    } finally {
      setHeroBusy(false);
    }
  }

  async function inlineCreateCategory(name: string, parentId: string | null) {
    if (sideBusy) return;
    setSideBusy(true);
    try {
      const saved = await createCategory(token, {
        name,
        slug: slugify(name),
        parent_id: parentId,
      });
      setCats((cur) => [...cur, saved]);
      if (parentId) setSubcategoryId(saved.id);
      else setCategoryId(saved.id);
      setAddingCat(false);
      setAddingSub(false);
    } catch (err) {
      setNotice({
        text:
          isSlugTaken(err) || (err instanceof ApiError && err.status === 409)
            ? "A category with that slug already exists."
            : err instanceof ApiError
              ? err.message
              : "Could not create category.",
        kind: "err",
      });
    } finally {
      setSideBusy(false);
    }
  }

  /** Retry save with `-2`, `-3`, … slug suffixes on slug_taken 409s. */
  async function saveWithSlugRetry(payload: CmsPostIn, baseSlug: string) {
    let candidate = baseSlug;
    for (let attempt = 0; attempt <= SLUG_RETRIES; attempt++) {
      try {
        const finalPayload = { ...payload, slug: candidate };
        return post
          ? await patchPost(token, post.id, finalPayload)
          : await createPost(token, finalPayload);
      } catch (err) {
        if (isSlugTaken(err) && attempt < SLUG_RETRIES) {
          candidate = `${baseSlug}-${attempt + 2}`;
          continue;
        }
        throw err;
      }
    }
    throw new Error("unreachable");
  }

  async function save(publish: boolean) {
    if (saving) return;
    if (!title.trim()) {
      setNotice({ text: "Title is required.", kind: "err" });
      return;
    }
    setSaving(true);
    setNotice(null);
    const nextStatus: CmsStatus = publish ? "published" : status;
    const baseSlug = (slug.trim() || slugify(title) || "post").replace(
      /^-|-$/g,
      "",
    );
    const payload: CmsPostIn = {
      title: title.trim(),
      slug: baseSlug,
      author_id: authorId || null,
      category_id: categoryId || null,
      subcategory_id: categoryId ? subcategoryId || null : null,
      excerpt: excerpt.trim() || null,
      body,
      tags,
      hero_media_id: heroId || null,
      featured,
      meta_title: metaTitle.trim() || null,
      meta_description: metaDesc.trim() || null,
      status: nextStatus,
    };
    try {
      const saved = await saveWithSlugRetry(payload, baseSlug);
      setNotice({
        text: publish ? "Post published." : "Post saved.",
        kind: "ok",
      });
      setPost(saved);
      setSlug(saved.slug);
      setSlugTouched(true);
      setStatus(saved.status);
      if (!editing) {
        navigate(`/admin/cms/posts/${saved.id}/edit`, { replace: true });
      }
    } catch (err) {
      setNotice({
        text: err instanceof ApiError ? err.message : "Save failed.",
        kind: "err",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loadError) {
    return (
      <div className="adm-set">
        <div className="adm-card adm-set-loaderr" role="alert">
          <b>Post could not be loaded</b>
          <p>{loadError}</p>
          <Link className="adm-btn" to="/admin/cms/posts">
            Back to posts
          </Link>
        </div>
      </div>
    );
  }

  if (editing && !post) {
    return (
      <div className="wiz-loading" role="status">
        <span className="wiz-spinner" />
        Loading post…
      </div>
    );
  }

  return (
    <div className="adm-set adm-cms-ed">
      <div className="adm-phead">
        <div>
          <div className="adm-eyebrow">CMS · Blogs</div>
          <h1>
            {editing ? (
              <>
                Edit <em>Post</em>
              </>
            ) : (
              <>
                New <em>Post</em>
              </>
            )}
          </h1>
          <p>
            {post?.status === "published"
              ? "Published — changes go live on save."
              : "Draft until published."}
          </p>
        </div>
        <div className="adm-phead-actions">
          <Link className="adm-btn adm-btn-g" to="/admin/cms/posts">
            <ArrowLeftIcon size={12} /> All Posts
          </Link>
        </div>
      </div>

      <div className="adm-cms-edgrid">
        {/* ── main column ── */}
        <div className="adm-cms-edmain">
          <div className="adm-card">
            <div className="adm-card-bd">
              <input
                className="adm-input adm-cms-title"
                placeholder="Post title"
                aria-label="Post title"
                value={title}
                onChange={(e) => onTitle(e.target.value)}
              />
              <div className="adm-cms-slugline">
                <span className="adm-cms-sluglabel">Permalink:</span>
                {slugEditing ? (
                  <input
                    className="adm-input adm-cms-slugin"
                    value={slug}
                    autoFocus
                    onChange={(e) => setSlug(e.target.value)}
                    onBlur={() => setSlugEditing(false)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "Escape") {
                        setSlugEditing(false);
                      }
                    }}
                  />
                ) : (
                  <>
                    <span className="adm-cms-slugval">
                      /blog/<b>{slug || <i>auto-from-title</i>}</b>
                    </span>
                    <button
                      type="button"
                      className="adm-icbtn sm"
                      title="Edit slug"
                      aria-label="Edit slug"
                      onClick={() => {
                        setSlugTouched(true);
                        setSlugEditing(true);
                      }}
                    >
                      <PenIcon size={11} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="adm-card">
            <div className="adm-card-hd">
              <h3>Body</h3>
              <p>Full post content — rich text, images, tables.</p>
            </div>
            <div className="adm-card-bd flush adm-cms-editor">
              <Editor
                tinymceScriptSrc="/tinymce/tinymce.min.js"
                licenseKey="gpl"
                initialValue={post?.body ?? ""}
                onEditorChange={(html) => setBody(html)}
                init={{
                  min_height: 480,
                  menubar: "file edit view insert format tools table",
                  plugins:
                    "advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table help wordcount autoresize",
                  toolbar:
                    "undo redo | blocks | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image media table | removeformat code fullscreen",
                  skin: "oxide",
                  content_css: "default",
                  autoresize_bottom_margin: 32,
                  branding: false,
                  promotion: false,
                  // Body images go through the CMS media store so they share
                  // the same backend (local disk today, R2 when configured).
                  images_upload_handler: (blobInfo) =>
                    uploadMediaFile(
                      token,
                      new File([blobInfo.blob()], blobInfo.filename(), {
                        type: blobInfo.blob().type,
                      }),
                    ).then((m) => m.url),
                }}
              />
            </div>
          </div>
          <p className="adm-cms-note">
            Post HTML is sanitised on save — markup outside the allowed set is
            stripped automatically.
          </p>
        </div>

        {/* ── right sidebar ── */}
        <aside className="adm-cms-side">
          <SideCard title="Status">
            <label className="adm-fl">
              <span>Status</span>
              <select
                className="adm-input"
                value={status}
                onChange={(e) => setStatus(e.target.value as CmsStatus)}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>
            {post?.published_at && (
              <p className="adm-cms-sidehint">
                Published{" "}
                {new Date(post.published_at).toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            )}
            <label className="adm-cms-check">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
              />
              Featured post
            </label>
            <div className="adm-cms-sideact">
              <button
                type="button"
                className="adm-btn adm-btn-g"
                disabled={saving}
                onClick={() => save(false)}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                className="adm-btn"
                disabled={saving}
                onClick={() => save(true)}
              >
                {saving
                  ? "Saving…"
                  : status === "published" || post?.status === "published"
                    ? "Update"
                    : "Publish"}
              </button>
            </div>
          </SideCard>

          <SideCard title="Author">
            <label className="adm-fl">
              <span>Author</span>
              <select
                className="adm-input"
                value={authorId}
                onChange={(e) => setAuthorId(e.target.value)}
              >
                <option value="">— none —</option>
                {authors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="adm-cms-linkbtn"
              onClick={() => setShowAuthorModal(true)}
            >
              <PlusIcon size={11} /> New author
            </button>
          </SideCard>

          <SideCard title="Categories">
            <label className="adm-fl">
              <span>Category</span>
              <select
                className="adm-input"
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setSubcategoryId("");
                  setAddingSub(false);
                }}
              >
                <option value="">— none —</option>
                {mainCats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            {addingCat ? (
              <InlineCreate
                placeholder="New category name"
                busy={sideBusy}
                onCreate={(n) => inlineCreateCategory(n, null)}
                onCancel={() => setAddingCat(false)}
              />
            ) : (
              <button
                type="button"
                className="adm-cms-linkbtn"
                onClick={() => setAddingCat(true)}
              >
                <PlusIcon size={11} /> New category
              </button>
            )}
            {categoryId && (
              <>
                <label className="adm-fl">
                  <span>Subcategory</span>
                  <select
                    className="adm-input"
                    value={subcategoryId}
                    onChange={(e) => setSubcategoryId(e.target.value)}
                  >
                    <option value="">— none —</option>
                    {subCats.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                {addingSub ? (
                  <InlineCreate
                    placeholder="New subcategory name"
                    busy={sideBusy}
                    onCreate={(n) => inlineCreateCategory(n, categoryId)}
                    onCancel={() => setAddingSub(false)}
                  />
                ) : (
                  <button
                    type="button"
                    className="adm-cms-linkbtn"
                    onClick={() => setAddingSub(true)}
                  >
                    <PlusIcon size={11} /> New subcategory
                  </button>
                )}
              </>
            )}
          </SideCard>

          <SideCard title="Tags">
            <TagEditor tags={tags} onChange={setTags} />
          </SideCard>

          <SideCard title="Featured image">
            <div className="adm-cms-hero">
              {heroUrl ? (
                <div className="adm-cms-heroprev">
                  <img
                    src={
                      heroUrl.startsWith("http")
                        ? heroUrl
                        : `${env.apiBaseUrl}${heroUrl}`
                    }
                    alt="Featured"
                  />
                </div>
              ) : (
                <div className="adm-cms-heroprev empty">
                  <UploadIcon size={16} />
                  <span>No image</span>
                </div>
              )}
              <div className="adm-cms-heroact">
                <label className="adm-btn adm-btn-g adm-imgup-btn">
                  <UploadIcon size={11} />{" "}
                  {heroBusy ? "Uploading…" : heroId ? "Replace" : "Upload"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    hidden
                    ref={imgUploadRef}
                    disabled={heroBusy}
                    onChange={pickHero}
                  />
                </label>
                {heroId && (
                  <button
                    type="button"
                    className="adm-imgup-rm"
                    onClick={() => {
                      setHeroId("");
                      setHeroUrl(null);
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </SideCard>

          <SideCard title="Excerpt">
            <textarea
              className="adm-input adm-textarea"
              rows={4}
              placeholder="Short summary shown on cards and listings…"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
            />
          </SideCard>

          <SideCard title="SEO">
            <label className="adm-fl">
              <span>
                Meta title{" "}
                <em className="adm-count">
                  {metaTitle.length}/{META_TITLE_MAX}
                </em>
              </span>
              <input
                className="adm-input"
                maxLength={META_TITLE_MAX}
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
              />
            </label>
            <label className="adm-fl">
              <span>
                Meta description{" "}
                <em className="adm-count">
                  {metaDesc.length}/{META_DESC_MAX}
                </em>
              </span>
              <textarea
                className="adm-input adm-textarea"
                rows={3}
                maxLength={META_DESC_MAX}
                value={metaDesc}
                onChange={(e) => setMetaDesc(e.target.value)}
              />
            </label>
          </SideCard>
        </aside>
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

      {showAuthorModal && (
        <AuthorModal
          compact
          token={token}
          onClose={() => setShowAuthorModal(false)}
          onSaved={(a) => {
            setAuthors((cur) => [...cur, a]);
            setAuthorId(a.id);
            setShowAuthorModal(false);
          }}
        />
      )}
    </div>
  );
}
