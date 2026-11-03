/**
 * CMS → Blogs → Categories (/admin/cms/categories).
 *
 * Nested category list — main categories with expandable subcategories
 * (one level per the contract), inline create/edit rows and delete
 * confirms. Deleting a parent that still has children is blocked by the
 * API (409) — the error surfaces inline on the row.
 */
import { useEffect, useMemo, useState } from "react";
import { ApiError } from "@/lib/api";
import type { AdminSession } from "@/lib/auth";
import {
  createCategory,
  deleteCategory,
  listCategories,
  patchCategory,
  slugify,
} from "@/lib/cms";
import type { CmsCategory } from "@/lib/cms";
import {
  CheckIcon,
  ChevronIcon,
  PenIcon,
  PlusIcon,
  XIcon,
} from "@/components/icons";

interface CatFormProps {
  initial?: { name: string; slug: string; description: string };
  placeholder?: string;
  busy: boolean;
  submitLabel: string;
  onSubmit: (v: { name: string; slug: string; description: string }) => void;
  onCancel: () => void;
}

function CatForm({
  initial,
  placeholder,
  busy,
  submitLabel,
  onSubmit,
  onCancel,
}: CatFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial));
  const [description, setDescription] = useState(initial?.description ?? "");
  return (
    <form
      className="adm-cat-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSubmit({
          name: name.trim(),
          slug: slug.trim() || slugify(name),
          description: description.trim(),
        });
      }}
    >
      <input
        className="adm-input"
        placeholder={placeholder ?? "Category name"}
        value={name}
        autoFocus
        onChange={(e) => {
          setName(e.target.value);
          if (!slugTouched) setSlug(slugify(e.target.value));
        }}
      />
      <input
        className="adm-input"
        placeholder="slug"
        value={slug}
        aria-label="Slug"
        onChange={(e) => {
          setSlugTouched(true);
          setSlug(e.target.value);
        }}
      />
      <input
        className="adm-input"
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="adm-cat-form-act">
        <button type="submit" className="adm-btn sm" disabled={busy || !name.trim()}>
          <CheckIcon size={11} /> {busy ? "Saving…" : submitLabel}
        </button>
        <button
          type="button"
          className="adm-btn adm-btn-g sm"
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

interface CatNode extends CmsCategory {
  children: CmsCategory[];
}

export function CmsCategories({ session }: { session: AdminSession }) {
  const token = session.tokens.access_token;
  const [cats, setCats] = useState<CmsCategory[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [creatingMain, setCreatingMain] = useState(false);
  const [creatingUnder, setCreatingUnder] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<CmsCategory | null>(null);
  const [busy, setBusy] = useState(false);
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ text: string; kind: "ok" | "err" } | null>(
    null,
  );

  useEffect(() => {
    let live = true;
    listCategories(token)
      .then((list) => {
        if (!live) return;
        setCats(list);
        // Start with every parent expanded — admins see the full tree.
        setExpanded(new Set(list.map((c) => c.id)));
      })
      .catch((err: unknown) => {
        if (live)
          setLoadError(
            err instanceof ApiError ? err.message : "Could not load categories.",
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

  const tree = useMemo<CatNode[]>(() => {
    const list = cats ?? [];
    const mains = list.filter((c) => !c.parent_id);
    return mains.map((m) => ({
      ...m,
      children: list.filter((c) => c.parent_id === m.id),
    }));
  }, [cats]);

  function toggle(id: string) {
    setExpanded((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function errFor(err: unknown): string {
    if (err instanceof ApiError) {
      if (err.status === 409)
        return err.message === "slug_taken"
          ? "That slug is already in use."
          : err.message;
      return err.message;
    }
    return "Save failed.";
  }

  async function save(
    v: { name: string; slug: string; description: string },
    opts: { parentId?: string | null; editId?: string },
  ) {
    setBusy(true);
    try {
      const body = {
        name: v.name,
        slug: v.slug,
        description: v.description || null,
      };
      const saved = opts.editId
        ? await patchCategory(token, opts.editId, body)
        : await createCategory(token, {
            ...body,
            parent_id: opts.parentId ?? null,
          });
      setCats((cur) => {
        const list = cur ?? [];
        const idx = list.findIndex((c) => c.id === saved.id);
        if (idx === -1) return [...list, saved];
        const next = [...list];
        next[idx] = saved;
        return next;
      });
      setCreatingMain(false);
      setCreatingUnder(null);
      setEditingId(null);
      if (opts.parentId) {
        setExpanded((cur) => new Set(cur).add(opts.parentId!));
      }
      setNotice({ text: `Saved “${saved.name}”.`, kind: "ok" });
    } catch (err) {
      setNotice({ text: errFor(err), kind: "err" });
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleting || busy) return;
    setBusy(true);
    try {
      await deleteCategory(token, deleting.id);
      setCats((cur) => (cur ?? []).filter((c) => c.id !== deleting.id));
      setRowError((cur) => {
        const next = { ...cur };
        delete next[deleting.id];
        return next;
      });
      setDeleting(null);
      setNotice({ text: `Deleted “${deleting.name}”.`, kind: "ok" });
    } catch (err) {
      const msg =
        err instanceof ApiError && err.status === 409
          ? "Category has subcategories — delete them first."
          : errFor(err);
      setRowError((cur) => ({ ...cur, [deleting.id]: msg }));
      setDeleting(null);
      setNotice({ text: msg, kind: "err" });
    } finally {
      setBusy(false);
    }
  }

  function catRow(c: CmsCategory, isSub = false) {
    const err = rowError[c.id];
    return (
      <div key={c.id} className={`adm-cat-row${isSub ? " sub" : ""}`}>
        {editingId === c.id ? (
          <CatForm
            initial={{
              name: c.name,
              slug: c.slug,
              description: c.description ?? "",
            }}
            busy={busy}
            submitLabel="Save"
            onSubmit={(v) => save(v, { editId: c.id })}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <>
            {!isSub && (
              <button
                type="button"
                className={`adm-cat-chev${expanded.has(c.id) ? " open" : ""}`}
                aria-label={expanded.has(c.id) ? "Collapse" : "Expand"}
                aria-expanded={expanded.has(c.id)}
                onClick={() => toggle(c.id)}
              >
                <ChevronIcon size={11} />
              </button>
            )}
            {isSub && <span className="adm-cat-indent" aria-hidden="true" />}
            <div className="adm-cat-info">
              <b>{c.name}</b>
              <span className="adm-cms-pslug">/{c.slug}</span>
              {c.description && <p>{c.description}</p>}
              {err && (
                <span className="adm-set-err" role="alert">
                  {err}
                </span>
              )}
            </div>
            <div className="adm-cms-rowact">
              {!isSub && (
                <button
                  type="button"
                  className="adm-icbtn sm"
                  title="Add subcategory"
                  aria-label={`Add subcategory under ${c.name}`}
                  onClick={() => {
                    setCreatingUnder(c.id);
                    setEditingId(null);
                    setExpanded((cur) => new Set(cur).add(c.id));
                  }}
                >
                  <PlusIcon size={12} />
                </button>
              )}
              <button
                type="button"
                className="adm-icbtn sm"
                title="Edit category"
                aria-label={`Edit ${c.name}`}
                onClick={() => {
                  setEditingId(c.id);
                  setCreatingUnder(null);
                  setCreatingMain(false);
                }}
              >
                <PenIcon size={12} />
              </button>
              <button
                type="button"
                className="adm-icbtn sm danger"
                title="Delete category"
                aria-label={`Delete ${c.name}`}
                onClick={() => setDeleting(c)}
              >
                <XIcon size={12} />
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="adm-set">
        <div className="adm-card adm-set-loaderr" role="alert">
          <b>Categories could not be loaded</b>
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
            <em>Categories</em>
          </h1>
          <p>Main categories and their subcategories used to organise posts.</p>
        </div>
        <div className="adm-phead-actions">
          <button
            type="button"
            className="adm-btn"
            onClick={() => {
              setCreatingMain(true);
              setCreatingUnder(null);
              setEditingId(null);
            }}
          >
            <PlusIcon size={12} /> New Category
          </button>
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-bd flush">
          <div className="adm-cat-tree">
            {creatingMain && (
              <div className="adm-cat-row form">
                <CatForm
                  busy={busy}
                  submitLabel="Create"
                  placeholder="New category name"
                  onSubmit={(v) => save(v, {})}
                  onCancel={() => setCreatingMain(false)}
                />
              </div>
            )}
            {!cats &&
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="adm-cat-row adm-cms-skel">
                  <i />
                </div>
              ))}
            {cats && tree.length === 0 && !creatingMain && (
              <div className="adm-cms-empty pad">
                No categories yet — create the first one.
              </div>
            )}
            {tree.map((node) => (
              <div key={node.id} className="adm-cat-grp">
                {catRow(node)}
                {expanded.has(node.id) && (
                  <div className="adm-cat-subs">
                    {node.children.map((sub) => catRow(sub, true))}
                    {creatingUnder === node.id && (
                      <div className="adm-cat-row sub form">
                        <CatForm
                          busy={busy}
                          submitLabel="Create"
                          placeholder="Subcategory name"
                          onSubmit={(v) => save(v, { parentId: node.id })}
                          onCancel={() => setCreatingUnder(null)}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
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
            aria-labelledby="adm-delcat-t"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="adm-delcat-t">Delete this category?</h3>
            <p>
              “{deleting.name}” will be removed. Posts in it lose the category
              assignment. A category that still has subcategories cannot be
              deleted.
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
                {busy ? "Deleting…" : "Delete category"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
