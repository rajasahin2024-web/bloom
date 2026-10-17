/**
 * Sitemaps — Settings → Sitemaps (/admin/settings/sitemaps).
 *
 * Live runtime sitemap management: the options card edits the sitemap
 * keys (master toggle is the existing `seo.sitemap_enabled`), and the
 * preview card shows exactly what `/sitemap.xml` is serving right now —
 * entry list, lastmod, source — via /api/admin/sitemap. Open live / Copy
 * URL / Download XML work off the same-origin URL the dev proxy serves.
 */
import { useEffect, useMemo, useState } from "react";
import { ApiError, apiFieldErrors } from "@/lib/api";
import { env } from "@/config/env";
import type { AdminSession } from "@/lib/auth";
import {
  fetchSettings,
  fetchSitemapPreview,
  saveSettings,
} from "@/lib/settings";
import type { SettingItem, SettingsPayload, SitemapPreview } from "@/lib/settings";
import { CheckIcon, ExternalIcon, FileIcon, XIcon } from "@/components/icons";

const EDIT_KEYS = [
  "seo.sitemap_enabled",
  "sitemap.include_pages",
  "sitemap.include_posts",
  "sitemap.extra_paths",
] as const;

const SOURCE_LABELS: Record<string, string> = {
  home: "Home",
  page: "CMS page",
  post: "Blog post",
  extra: "Extra path",
};

function rowValue(item: SettingItem, draft: Record<string, unknown>) {
  return item.key in draft ? draft[item.key] : item.value;
}

export function SitemapSettings({ session }: { session: AdminSession }) {
  const token = session.tokens.access_token;
  const [payload, setPayload] = useState<SettingsPayload | null>(null);
  const [preview, setPreview] = useState<SitemapPreview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<{
    text: string;
    kind: "ok" | "err";
  } | null>(null);

  function refreshPreview() {
    fetchSitemapPreview(token)
      .then(setPreview)
      .catch(() => setPreview(null));
  }

  useEffect(() => {
    let live = true;
    Promise.all([fetchSettings(token), fetchSitemapPreview(token)])
      .then(([settings, prev]) => {
        if (!live) return;
        setPayload(settings);
        setPreview(prev);
      })
      .catch((err: unknown) => {
        if (!live) return;
        setLoadError(
          err instanceof ApiError ? err.message : "Could not load sitemap settings.",
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

  const itemByKey = useMemo(() => {
    const map = new Map<string, SettingItem>();
    for (const g of payload?.groups ?? []) {
      for (const i of g.items) map.set(i.key, i);
    }
    return map;
  }, [payload]);

  const editItems = useMemo(
    () =>
      EDIT_KEYS.map((k) => itemByKey.get(k)).filter(
        (i): i is SettingItem => Boolean(i),
      ),
    [itemByKey],
  );

  function setKey(item: SettingItem, value: unknown) {
    setDraft((cur) => {
      const next = { ...cur };
      if (Object.is(value, item.value)) delete next[item.key];
      else next[item.key] = value;
      return next;
    });
    setFieldErrors((cur) => {
      if (!(item.key in cur)) return cur;
      const next = { ...cur };
      delete next[item.key];
      return next;
    });
  }

  const dirtyCount = Object.keys(draft).length;

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const next = await saveSettings(token, draft);
      setPayload(next);
      setDraft({});
      setFieldErrors({});
      refreshPreview();
      setNotice({ text: "Sitemap settings saved.", kind: "ok" });
    } catch (err) {
      const errors = apiFieldErrors(err);
      if (errors) setFieldErrors(errors);
      const msgs = errors ? Object.values(errors) : [];
      setNotice({
        text:
          msgs.length > 0
            ? `Save failed — ${msgs[0]}`
            : err instanceof ApiError
              ? err.message
              : "Save failed.",
        kind: "err",
      });
    } finally {
      setSaving(false);
    }
  }

  async function copyUrl() {
    const url = preview?.sitemap_url || `${env.apiBaseUrl}/sitemap.xml`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setNotice({ text: "Copy failed — select the URL manually.", kind: "err" });
    }
  }

  function downloadXml() {
    if (!preview?.xml) return;
    const blob = new Blob([preview.xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sitemap.xml";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loadError) {
    return (
      <div className="adm-set">
        <div className="adm-card adm-set-loaderr" role="alert">
          <b>Sitemap settings could not be loaded</b>
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

  if (!payload) {
    return (
      <div className="wiz-loading" role="status">
        <span className="wiz-spinner" />
        Loading sitemap settings…
      </div>
    );
  }

  const enabled = preview?.enabled ?? false;
  const base = preview?.base_url ?? "";
  const liveUrl = `${env.apiBaseUrl}/sitemap.xml`;

  return (
    <div className="adm-set">
      <div className="adm-phead">
        <div>
          <div className="adm-eyebrow">Settings</div>
          <h1>
            Site<em>maps</em>
          </h1>
          <p>
            The sitemap is generated live at runtime from the Website URL plus
            published CMS content — no manual rebuild needed.
          </p>
        </div>
        <div className="adm-phead-actions">
          <button
            type="button"
            className="adm-btn adm-btn-g"
            onClick={refreshPreview}
          >
            Refresh preview
          </button>
        </div>
      </div>

      {/* status */}
      <div className="adm-card" style={{ marginBottom: "14px" }}>
        <div className="adm-card-bd" style={{ padding: "16px 18px" }}>
          <div className="adm-status-grid">
            <div className="adm-status">
              <span className="adm-status-l">Sitemap</span>
              <span className={`adm-status-v ${enabled ? "ok" : "bad"}`}>
                <i />
                {enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            <div className="adm-status">
              <span className="adm-status-l">Canonical base</span>
              <span className={`adm-status-v ${base ? "ok" : "warn"}`}>
                <i />
                {base || "Website URL not set"}
              </span>
            </div>
            <div className="adm-status">
              <span className="adm-status-l">URLs listed</span>
              <span className="adm-status-v info">
                <i />
                {preview ? preview.entry_count : "—"}
              </span>
            </div>
            <div className="adm-status">
              <span className="adm-status-l">Served at</span>
              <span className="adm-status-v info">
                <i />
                /sitemap.xml
              </span>
            </div>
          </div>
          {!base && (
            <p style={{ margin: "12px 0 0", fontSize: "13px", color: "var(--adm-warn, #b45309)" }}>
              Set the <b>Website URL</b> under{" "}
              <a href="/admin/settings/general">Settings → General Settings</a>{" "}
              — without it the live <code>/sitemap.xml</code> returns 404.
            </p>
          )}
        </div>
      </div>

      {/* options */}
      <div className="adm-card" style={{ marginBottom: "14px" }}>
        <div className="adm-card-hd">
          <b>Sitemap options</b>
        </div>
        <div className="adm-card-bd" style={{ padding: 0 }}>
          <div className="adm-setwiz-rows">
            {editItems.map((item) => {
              const value = rowValue(item, draft);
              const fieldError = fieldErrors[item.key];
              return (
                <div
                  key={item.key}
                  className={`adm-set-row${item.key in draft ? " dirty" : ""}`}
                >
                  <div className="adm-set-info">
                    <div className="adm-set-lb">
                      <span className="adm-set-lb-t">{item.label}</span>
                      <span className={`adm-src ${item.source}`}>
                        {item.source === "db" ? "DB override" : "env default"}
                      </span>
                    </div>
                    <p>{item.description}</p>
                    {fieldError && (
                      <span className="adm-set-err">{fieldError}</span>
                    )}
                  </div>
                  <div className="adm-set-ctl">
                    {item.type === "toggle" ? (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={Boolean(value)}
                        aria-label={item.label}
                        className={`adm-switch${value ? " on" : ""}`}
                        onClick={() => setKey(item, !value)}
                      >
                        <i />
                      </button>
                    ) : (
                      <textarea
                        className={`adm-input adm-textarea${item.key in draft ? " dirty" : ""}`}
                        rows={4}
                        value={String(value ?? "")}
                        aria-label={item.label}
                        aria-invalid={Boolean(fieldError) || undefined}
                        onChange={(e) => setKey(item, e.target.value)}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* live preview */}
      <div className="adm-card">
        <div className="adm-card-hd" style={{ justifyContent: "space-between" }}>
          <b>Live preview</b>
          <span style={{ display: "flex", gap: "8px" }}>
            <a
              className="adm-btn adm-btn-g adm-btn-sm"
              href={liveUrl}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalIcon size={11} /> Open live
            </a>
            <button
              type="button"
              className="adm-btn adm-btn-g adm-btn-sm"
              onClick={copyUrl}
            >
              {copied ? <CheckIcon size={11} /> : <FileIcon size={11} />}{" "}
              {copied ? "Copied" : "Copy URL"}
            </button>
            <button
              type="button"
              className="adm-btn adm-btn-g adm-btn-sm"
              onClick={downloadXml}
              disabled={!preview?.xml}
            >
              <FileIcon size={11} /> Download XML
            </button>
          </span>
        </div>
        <div className="adm-card-bd" style={{ padding: 0 }}>
          {!enabled || !base ? (
            <p style={{ padding: "16px 18px", margin: 0, fontSize: "13px" }}>
              {!enabled
                ? "The sitemap is disabled — turn on 'Auto sitemap.xml' above to serve it."
                : "Set the Website URL to activate the sitemap."}
            </p>
          ) : (
            <table className="adm-tbl" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>URL</th>
                  <th style={{ textAlign: "left" }}>Source</th>
                  <th style={{ textAlign: "left" }}>Last modified</th>
                </tr>
              </thead>
              <tbody>
                {(preview?.entries ?? []).map((e) => (
                  <tr key={e.path}>
                    <td>
                      <code style={{ fontSize: "12.5px" }}>{e.loc}</code>
                    </td>
                    <td>{SOURCE_LABELS[e.source] ?? e.source}</td>
                    <td>{e.lastmod ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* unsaved-changes bar */}
      {dirtyCount > 0 && (
        <div className="adm-savebar" role="status">
          <span className="adm-savebar-n">
            <b>{dirtyCount}</b> unsaved {dirtyCount === 1 ? "change" : "changes"}
          </span>
          <div className="adm-savebar-act">
            <button
              type="button"
              className="adm-btn adm-btn-g"
              onClick={() => {
                setDraft({});
                setFieldErrors({});
              }}
              disabled={saving}
            >
              Discard
            </button>
            <button
              type="button"
              className="adm-btn"
              onClick={save}
              disabled={saving}
            >
              <CheckIcon size={12} /> {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      )}

      {notice && (
        <div
          className={`adm-toast${notice.kind === "err" ? " err" : ""}${dirtyCount > 0 ? " raised" : ""}`}
          role={notice.kind === "err" ? "alert" : "status"}
        >
          {notice.kind === "err" ? <XIcon size={12} /> : <CheckIcon size={12} />}{" "}
          {notice.text}
        </div>
      )}
    </div>
  );
}
