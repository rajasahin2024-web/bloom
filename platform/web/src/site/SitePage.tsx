/**
 * Site page — renders a CMS page's ordered sections verbatim.
 *
 * The section `html` is the prototype markup stored in cms_pages.sections;
 * the prototype runtime scripts (cms data store, site bindings, image-slot
 * custom element) are loaded after render so JS-filled collections render
 * exactly like the prototype.
 *
 * Admin edit mode: a fixed "Edit site" toolbar appears for admin sessions;
 * each section gets an Edit affordance opening a drawer with per-text-node
 * fields, a raw-HTML editor and a visibility toggle. Saving PATCHes the
 * whole sections array to /api/cms/pages/{id} — live immediately.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { fetchMe, loadSession } from "@/lib/auth";
import "@/styles/site.css";
import "@/styles/site-edit.css";

export interface SiteSection {
  id: string;
  label: string;
  type: string;
  enabled: boolean;
  html: string;
  rawHtml?: string;
}

interface SitePageData {
  id: string;
  title: string;
  meta_description: string | null;
  sections: SiteSection[];
}

const SCRIPTS = ["bloom-cms-data.js", "image-slot.js", "bloom-site-cms.js"];
let assetsLoaded = false;

function loadSiteRuntime() {
  if (assetsLoaded) return;
  assetsLoaded = true;
  const fa = document.createElement("link");
  fa.rel = "stylesheet";
  fa.href =
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css";
  document.head.appendChild(fa);
  // Sequential — cms-data defines cms(), site-cms binds containers.
  SCRIPTS.reduce<Promise<void>>(
    (p, name) =>
      p.then(
        () =>
          new Promise((res) => {
            const el = document.createElement("script");
            el.src = `/site/${name}`;
            el.onload = () => res();
            el.onerror = () => res();
            document.body.appendChild(el);
          }),
      ),
    Promise.resolve(),
  );
}

/** Non-trivial text nodes of a section's markup, in document order. */
function extractTexts(html: string): string[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const out: string[] = [];
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const v = (n.nodeValue ?? "").trim();
    if (v.length > 1) out.push(v);
  }
  return out;
}

/** Write edited text-node values back into the markup. */
function applyTexts(html: string, values: string[]): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const kept: Node[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if ((n.nodeValue ?? "").trim().length > 1) kept.push(n);
  }
  kept.forEach((n, i) => {
    if (i < values.length) n.nodeValue = ` ${values[i]} `;
  });
  return doc.body.innerHTML;
}

export function SitePage({ slug = "home" }: { slug?: string }) {
  const [page, setPage] = useState<SitePageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SiteSection | null>(null);
  const [texts, setTexts] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.title =
      "Bloom IELTS Academy — the school for English, accepted all over the globe";
    apiFetch<SitePageData>(`/api/content/pages/${slug}`)
      .then(({ data }) => {
        setPage(data);
        return data;
      })
      .then(() => setTimeout(loadSiteRuntime, 0))
      .catch((e: unknown) =>
        setError(e instanceof ApiError ? e.message : "Could not load the page."),
      );
  }, [slug]);

  // Admin session → show the editing affordances.
  useEffect(() => {
    const s = loadSession();
    if (!s) return;
    fetchMe(s.tokens.access_token)
      .then((u) => {
        if (u.role === "admin") setAdminToken(s.tokens.access_token);
      })
      .catch(() => setAdminToken(null));
  }, []);

  useEffect(() => {
    if (!note) return;
    const t = window.setTimeout(() => setNote(null), 3500);
    return () => window.clearTimeout(t);
  }, [note]);

  const sections = useMemo(() => page?.sections ?? [], [page]);
  const current = sections.find((s) => s.id === openId) ?? null;

  function openEditor(s: SiteSection) {
    setOpenId(s.id);
    setDraft({ ...s });
    setTexts(extractTexts(s.html));
    setTimeout(
      () => drawerRef.current?.scrollIntoView({ block: "nearest" }),
      30,
    );
  }

  function patchSection(mut: (s: SiteSection) => SiteSection, save: boolean) {
    if (!openId || !adminToken || !page) return;
    const next = sections.map((s) => (s.id === openId ? mut(s) : s));
    void persist(next, save);
  }

  async function persist(next: SiteSection[], notify: boolean) {
    if (!adminToken || !page) return;
    setSaving(true);
    try {
      const { data } = await apiFetch<SitePageData>(
        `/api/cms/pages/${page.id}`,
        { method: "PATCH", body: { sections: next }, token: adminToken },
      );
      setPage(data);
      if (notify) setNote("Saved — live now.");
    } catch (e) {
      setNote(e instanceof ApiError ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  function saveDraft() {
    if (!draft) return;
    const html =
      draft.rawHtml !== undefined ? draft.rawHtml : applyTexts(draft.html, texts);
    patchSection(
      () => ({ ...draft, html }),
      true,
    );
    setOpenId(null);
    setDraft(null);
  }

  if (error) {
    return (
      <main style={{ padding: "2rem" }}>
        <h1>Home</h1>
        <p className="error">{error}</p>
      </main>
    );
  }
  if (!page) {
    return (
      <div className="wiz-loading" role="status">
        <span className="wiz-spinner" />
        Loading…
      </div>
    );
  }

  return (
    <>
      {adminToken && (
        <div className="site-edit-bar">
          <b>Edit mode</b>
          <button
            type="button"
            className={`adm-switch${editing ? " on" : ""}`}
            role="switch"
            aria-checked={editing}
            onClick={() => setEditing(!editing)}
          >
            <i />
          </button>
          <span>{editing ? "Click a section’s Edit chip" : "off"}</span>
        </div>
      )}
      <div className={`site-root${editing ? " editing" : ""}`}>
        {sections
          .filter((s) => s.enabled || editing)
          .map((s) => (
            <div
              key={s.id}
              className={`site-sec${editing ? " editable" : ""}${s.enabled ? "" : " off"}`}
            >
              {editing && (
                <button
                  type="button"
                  className="site-sec-edit"
                  onClick={() => openEditor(s)}
                >
                  Edit — {s.label}
                </button>
              )}
              <div dangerouslySetInnerHTML={{ __html: s.html }} />
            </div>
          ))}
      </div>

      {draft && current && (
        <div className="site-edit-scrim" onClick={() => setDraft(null)}>
          <div
            className="site-edit-drawer"
            role="dialog"
            aria-label={`Edit ${current.label}`}
            ref={drawerRef}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="site-edit-head">
              <b>{current.label}</b>
              <label className="site-edit-vis">
                <input
                  type="checkbox"
                  checked={draft.enabled}
                  onChange={(e) =>
                    setDraft({ ...draft, enabled: e.target.checked })
                  }
                />
                Visible
              </label>
            </div>
            <div className="site-edit-body">
              {texts.map((t, i) => (
                <label key={i} className="site-edit-f">
                  <span>{t.slice(0, 42)}</span>
                  <textarea
                    rows={Math.min(4, Math.max(1, Math.ceil(t.length / 60)))}
                    value={texts[i]}
                    onChange={(e) => {
                      const n = [...texts];
                      n[i] = e.target.value;
                      setTexts(n);
                    }}
                  />
                </label>
              ))}
              <label className="site-edit-f">
                <span>Raw HTML (overrides fields above)</span>
                <textarea
                  rows={10}
                  className="mono"
                  defaultValue={draft.html}
                  onChange={(e) =>
                    setDraft({ ...draft, rawHtml: e.target.value })
                  }
                />
              </label>
            </div>
            <div className="site-edit-foot">
              <button
                type="button"
                className="adm-btn adm-btn-g"
                onClick={() => setDraft(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="adm-btn"
                onClick={saveDraft}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save — go live"}
              </button>
            </div>
          </div>
        </div>
      )}
      {note && <div className="adm-toast">{note}</div>}
    </>
  );
}
