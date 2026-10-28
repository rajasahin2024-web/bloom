/**
 * Site page — renders a CMS page's ordered typed sections.
 *
 * Each section is `{id, label, type, enabled, animation, props}`. The
 * SECTION_REGISTRY maps `type` → a React component that reproduces the
 * prototype markup using the existing site.css classes — no raw HTML,
 * no prototype runtime scripts.
 *
 * Admin edit mode: a fixed "Edit site" toolbar appears for admin sessions;
 * each section gets a hover outline + an "Edit" chip that opens the
 * full-screen SiteEditor modal. Saving PATCHes the whole sections array
 * to /api/cms/pages/{id} — live immediately.
 */
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch, ApiError } from "@/lib/api";
import { fetchMe, loadSession } from "@/lib/auth";
import { SECTION_REGISTRY, SECTION_TYPES } from "./sections/registry";
import type { SiteSection } from "./sections/types";
import { SiteEditor } from "./SiteEditor";
import { initSiteRuntime } from "./siteRuntime";
import "@/styles/site.css";
import "@/styles/site-edit.css";

interface SitePageData {
  id: string;
  title: string;
  meta_description: string | null;
  sections: SiteSection[];
}

function blankSection(type: string, index: number): SiteSection {
  return {
    id: `${type}-${Date.now()}-${index}`,
    label: type.replace(/_/g, " "),
    type,
    enabled: true,
    animation: null,
    props: {},
  };
}

export function SitePage({ slug: slugProp }: { slug?: string }) {
  const params = useParams();
  const slug = slugProp ?? params.slug ?? "home";
  const [page, setPage] = useState<SitePageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    setPage(null);
    setError(null);
    document.title =
      "Bloom IELTS Academy — the school for English, accepted all over the globe";
    apiFetch<SitePageData>(`/api/content/pages/${slug}`)
      .then(({ data }) => {
        setPage(data);
        if (data.title) document.title = data.title;
        if (data.meta_description) {
          document
            .querySelector('meta[name="description"]')
            ?.setAttribute("content", data.meta_description);
        }
      })
      .catch((e: unknown) =>
        setError(e instanceof ApiError ? e.message : "Could not load the page."),
      );
  }, [slug]);

  useEffect(() => {
    initSiteRuntime();
  }, [page]);

  // Deep links like /about#staff must scroll after async content renders —
  // the target element does not exist at initial navigation time.
  useEffect(() => {
    if (!page || !window.location.hash) return;
    try {
      document
        .querySelector(window.location.hash)
        ?.scrollIntoView();
    } catch {
      /* malformed hash — ignore */
    }
  }, [page]);

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

  const sections = useMemo(
    () =>
      (page?.sections ?? []).filter(
        (s) => s.type !== "nav" && s.type !== "footer",
      ),
    [page],
  );
  const current = sections.find((s) => s.id === openId) ?? null;

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

  function handleSave(updated: SiteSection) {
    const next = sections.map((s) => (s.id === updated.id ? updated : s));
    void persist(next, true);
    setOpenId(null);
  }

  function handleDelete() {
    if (!current) return;
    const next = sections.filter((s) => s.id !== current.id);
    void persist(next, true);
    setOpenId(null);
  }

  function addSection(type: string) {
    const next = [...sections, blankSection(type, sections.length)];
    void persist(next, true);
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
          .map((s) => {
            const C = SECTION_REGISTRY[s.type];
            return (
              <div
                key={s.id}
                className={`site-sec${editing ? " editable" : ""}${s.enabled ? "" : " off"}`}
              >
                {editing && (
                  <button
                    type="button"
                    className="site-sec-edit"
                    onClick={() => setOpenId(s.id)}
                  >
                    Edit — {s.label}
                  </button>
                )}
                {C ? <C props={s.props} animation={s.animation} /> : null}
              </div>
            );
          })}
        {editing && (
          <div className="site-add-section">
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) addSection(e.target.value);
                e.target.value = "";
              }}
            >
              <option value="">+ Add section…</option>
              {SECTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {current && adminToken && (
        <SiteEditor
          section={current}
          token={adminToken}
          onSave={handleSave}
          onClose={() => setOpenId(null)}
          onDelete={handleDelete}
        />
      )}
      {note && <div className="adm-toast">{note}</div>}
      {saving && <div className="adm-toast">Saving…</div>}
    </>
  );
}
