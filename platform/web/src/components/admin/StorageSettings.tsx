/**
 * Storage Settings — Settings → Storage (/admin/settings/storage).
 *
 * Cloudflare R2 object storage wired through the admin storage API
 * (TEC-165 contract — the backend proxies every bucket call so the secret
 * key never leaves the server; reads come back masked). Five stacked
 * sections in page order: connection → buckets → usage → folder explorer
 * → purpose mapping. Same card/row/button vocabulary as the dashboard and
 * the settings wizard.
 *
 * Connection state machine (driven by GET /status):
 *   configured=false            → "Not configured" — all three fields blank,
 *                                 all required to connect.
 *   configured + reachable      → "Connected" — saved values show as masked
 *                                 placeholders; PUT requires all three fields
 *                                 so any change means re-entering the full
 *                                 key set (the real secret never comes back).
 *   configured + !reachable     → "Unreachable" — inline warning, dependent
 *                                 cards (buckets / usage / explorer) hidden
 *                                 until the connection recovers.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, apiFieldErrors } from "@/lib/api";
import type { AdminSession } from "@/lib/auth";
import {
  createStorageBucket,
  deleteStorageConnection,
  fetchStorageBuckets,
  fetchStorageObjects,
  fetchStorageStatus,
  fetchStorageUsage,
  putStorageConnection,
  putStoragePrefixes,
  selectStorageBucket,
} from "@/lib/storage";
import type {
  ConnectionInput,
  StorageBucket,
  StorageObject,
  StoragePrefixes,
  StorageStatus,
  StorageUsage,
} from "@/lib/storage";
import {
  CheckIcon,
  ChevronIcon,
  DatabaseIcon,
  EyeIcon,
  EyeOffIcon,
  FileIcon,
  FolderIcon,
  InfoIcon,
  PlusIcon,
  RotateLeftIcon,
  ServerIcon,
  XIcon,
} from "@/components/icons";

type Notice = { text: string; kind: "ok" | "err" } | null;

/** Prefix 422s arrive keyed by settings key — map back to the field name. */
const PFX_KEY_MAP: Record<string, keyof StoragePrefixes> = {
  "storage.r2.prefix_media": "media",
  "storage.r2.prefix_public_uploads": "public_uploads",
  "storage.r2.prefix_files": "files",
};

function remapPrefixErrors(
  errs: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(errs)) {
    out[PFX_KEY_MAP[k] ?? k] = v;
  }
  return out;
}

const BUCKET_NAME_RE = /^[a-z0-9][a-z0-9.-]*$/;

/** Status → pill label + tone. */
function statusPill(s: StorageStatus): { label: string; tone: string } {
  if (!s.configured) return { label: "Not configured", tone: "bad" };
  return s.reachable
    ? { label: "Connected", tone: "ok" }
    : { label: "Unreachable", tone: "warn" };
}

/** Pull per-field messages out of a 422 — dict form or FastAPI loc/msg list. */
function fieldErrors(err: unknown): Record<string, string> | null {
  const mapped = apiFieldErrors(err);
  if (mapped) return mapped;
  if (!(err instanceof ApiError) || err.status !== 422) return null;
  const det =
    err.detail && typeof err.detail === "object"
      ? (err.detail as { detail?: unknown }).detail
      : null;
  if (!Array.isArray(det)) return null;
  const out: Record<string, string> = {};
  for (const item of det) {
    if (!item || typeof item !== "object") continue;
    const loc = (item as { loc?: unknown }).loc;
    const msg = (item as { msg?: unknown }).msg;
    if (Array.isArray(loc) && typeof msg === "string") {
      const key = String(loc[loc.length - 1] ?? "");
      if (key) out[key] = msg;
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = bytes;
  let u = -1;
  do {
    v /= 1024;
    u += 1;
  } while (v >= 1024 && u < units.length - 1);
  return `${v >= 100 ? Math.round(v) : v.toFixed(1)} ${units[u]}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Last path segment of a prefix ("a/b/" → "b"), or the key minus its prefix. */
function leafName(path: string, prefix: string): string {
  const rest = path.startsWith(prefix) ? path.slice(prefix.length) : path;
  return rest.replace(/\/$/, "") || path;
}

const PREFIX_FIELDS: {
  key: keyof StoragePrefixes;
  label: string;
  hint: string;
  placeholder: string;
}[] = [
  {
    key: "media",
    label: "Media uploads",
    hint: "CMS media library uploads are written to this folder — images and files picked in the editor land here.",
    placeholder: "media/",
  },
  {
    key: "public_uploads",
    label: "Public uploads",
    hint: "Files meant to be served publicly through /api/media/serve/… — e.g. downloads linked from the site.",
    placeholder: "public/",
  },
  {
    key: "files",
    label: "Project files",
    hint: "Internal exports and platform files that stay out of the public media flow.",
    placeholder: "files/",
  },
];

export function StorageSettings({ session }: { session: AdminSession }) {
  const token = session.tokens.access_token;

  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  /* ── connection form ── */
  const [connVals, setConnVals] = useState({
    account_id: "",
    access_key_id: "",
    secret_access_key: "",
  });
  const [connErrors, setConnErrors] = useState<Record<string, string>>({});
  const [connBusy, setConnBusy] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  /* ── buckets ── */
  const [buckets, setBuckets] = useState<StorageBucket[] | null>(null);
  const [bucketsErr, setBucketsErr] = useState<string | null>(null);
  const [bucketsBusy, setBucketsBusy] = useState(false);
  const [newBucket, setNewBucket] = useState({ name: "", location: "" });
  const [createErr, setCreateErr] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [selecting, setSelecting] = useState<string | null>(null);

  /* ── usage ── */
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [usageErr, setUsageErr] = useState<string | null>(null);

  /* ── folder explorer ── */
  const [prefix, setPrefix] = useState("");
  const [folders, setFolders] = useState<string[]>([]);
  const [objects, setObjects] = useState<StorageObject[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [explErr, setExplErr] = useState<string | null>(null);
  const [explBusy, setExplBusy] = useState(false);

  /* ── prefix mapping ── */
  const [pfxVals, setPfxVals] = useState<StoragePrefixes>({
    media: "",
    public_uploads: "",
    files: "",
  });
  const [pfxTouched, setPfxTouched] = useState<Set<string>>(new Set());
  const [pfxErrors, setPfxErrors] = useState<Record<string, string>>({});
  const [pfxBusy, setPfxBusy] = useState(false);

  const connected = Boolean(status?.configured && status.reachable);
  const unreachable = Boolean(status?.configured && !status.reachable);
  const activeBucket = status?.bucket ?? null;

  /* ── loaders ── */

  const applyStatus = useCallback((s: StorageStatus) => {
    setStatus(s);
    // Never prefill masked values — PUT needs the real trio, so fields stay
    // empty with the masked display value as the placeholder instead.
    setConnVals({ account_id: "", access_key_id: "", secret_access_key: "" });
    setConnErrors({});
    setPfxVals({
      media: s.prefixes?.media ?? "",
      public_uploads: s.prefixes?.public_uploads ?? "",
      files: s.prefixes?.files ?? "",
    });
    setPfxTouched(new Set());
    setPfxErrors({});
  }, []);

  const reloadStatus = useCallback(async () => {
    const s = await fetchStorageStatus(token);
    applyStatus(s);
    return s;
  }, [token, applyStatus]);

  const loadBuckets = useCallback(async () => {
    setBucketsBusy(true);
    setBucketsErr(null);
    try {
      setBuckets(await fetchStorageBuckets(token));
    } catch (err) {
      setBucketsErr(
        err instanceof ApiError ? err.message : "Could not list buckets.",
      );
    } finally {
      setBucketsBusy(false);
    }
  }, [token]);

  const loadUsage = useCallback(
    async (bucket: string) => {
      setUsageErr(null);
      try {
        setUsage(await fetchStorageUsage(token, bucket));
      } catch (err) {
        setUsage(null);
        setUsageErr(
          err instanceof ApiError ? err.message : "Could not read usage.",
        );
      }
    },
    [token],
  );

  const loadObjects = useCallback(
    async (bucket: string, pfx: string, continuation: string | null) => {
      setExplBusy(true);
      setExplErr(null);
      try {
        const page = await fetchStorageObjects(token, {
          bucket,
          prefix: pfx,
          continuationToken: continuation,
        });
        if (continuation) {
          setFolders((cur) => [...cur, ...page.folders]);
          setObjects((cur) => [...cur, ...page.objects]);
        } else {
          setFolders(page.folders);
          setObjects(page.objects);
        }
        setNextToken(page.next_token);
      } catch (err) {
        setExplErr(
          err instanceof ApiError ? err.message : "Could not list objects.",
        );
      } finally {
        setExplBusy(false);
      }
    },
    [token],
  );

  /* initial load — status first; dependent cards follow its flags */
  useEffect(() => {
    let live = true;
    fetchStorageStatus(token)
      .then((s) => {
        if (!live) return;
        applyStatus(s);
      })
      .catch((err: unknown) => {
        if (!live) return;
        setLoadError(
          err instanceof ApiError
            ? err.message
            : "Could not load storage settings.",
        );
      });
    return () => {
      live = false;
    };
  }, [token, applyStatus]);

  /* connected → list buckets once */
  useEffect(() => {
    if (connected) void loadBuckets();
    else setBuckets(null);
  }, [connected, loadBuckets]);

  /* active bucket → usage + fresh explorer */
  useEffect(() => {
    if (connected && activeBucket) {
      void loadUsage(activeBucket);
      setPrefix("");
      void loadObjects(activeBucket, "", null);
    } else {
      setUsage(null);
      setFolders([]);
      setObjects([]);
      setNextToken(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, activeBucket]);

  /* toast auto-dismiss */
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  /* ── connection actions ── */

  function editConn(key: keyof typeof connVals, value: string) {
    setConnVals((cur) => ({ ...cur, [key]: value }));
    setConnErrors((cur) => {
      if (!(key in cur)) return cur;
      const next = { ...cur };
      delete next[key];
      return next;
    });
  }

  // PUT /connection requires the full trio (BE has no merge-with-stored),
  // so "changed" = the admin started typing anywhere.
  const connDirty = Object.values(connVals).some((v) => v.trim() !== "");

  async function connect() {
    if (connBusy) return;
    const errs: Record<string, string> = {};
    const payload: Required<ConnectionInput> = {
      account_id: "",
      access_key_id: "",
      secret_access_key: "",
    };
    for (const k of Object.keys(payload) as (keyof typeof payload)[]) {
      const v = connVals[k].trim();
      if (!v) errs[k] = "Required to connect.";
      else payload[k] = v;
    }
    setConnErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setConnBusy(true);
    try {
      await putStorageConnection(token, payload);
      const s = await reloadStatus();
      setNotice(
        s.reachable
          ? { text: "Connection verified — credentials saved.", kind: "ok" }
          : {
              text: "Saved, but R2 is unreachable — check the credentials.",
              kind: "err",
            },
      );
    } catch (err) {
      const fe = fieldErrors(err);
      if (fe) setConnErrors(fe);
      setNotice({
        text:
          fe && Object.keys(fe).length > 0
            ? "Fix the highlighted fields and try again."
            : err instanceof ApiError && err.message === "connection_failed"
              ? "R2 rejected those credentials — check the Account ID and key pair."
              : err instanceof ApiError
                ? err.message
                : "Connection test failed.",
        kind: "err",
      });
    } finally {
      setConnBusy(false);
    }
  }

  async function disconnect() {
    if (connBusy) return;
    setConnBusy(true);
    try {
      await deleteStorageConnection(token);
      await reloadStatus();
      setNotice({ text: "R2 connection removed.", kind: "ok" });
    } catch (err) {
      setNotice({
        text: err instanceof ApiError ? err.message : "Disconnect failed.",
        kind: "err",
      });
    } finally {
      setConnBusy(false);
      setConfirmDisconnect(false);
    }
  }

  /* ── bucket actions ── */

  async function createBucket() {
    if (creating) return;
    const name = newBucket.name.trim();
    if (name.length < 3 || name.length > 63 || !BUCKET_NAME_RE.test(name)) {
      setCreateErr({
        name: "3–63 chars: lowercase letters, digits, dots and hyphens — starting with a letter or digit.",
      });
      return;
    }
    setCreating(true);
    setCreateErr({});
    try {
      await createStorageBucket(
        token,
        name,
        newBucket.location.trim() || undefined,
      );
      setNewBucket({ name: "", location: "" });
      await loadBuckets();
      setNotice({ text: `Bucket “${name}” created.`, kind: "ok" });
    } catch (err) {
      const fe = fieldErrors(err);
      if (fe) setCreateErr(fe);
      setNotice({
        text: err instanceof ApiError ? err.message : "Could not create bucket.",
        kind: "err",
      });
    } finally {
      setCreating(false);
    }
  }

  async function selectBucket(name: string) {
    if (selecting) return;
    setSelecting(name);
    try {
      await selectStorageBucket(token, name);
      await reloadStatus();
      setNotice({ text: `Active bucket set to “${name}”.`, kind: "ok" });
    } catch (err) {
      setNotice({
        text: err instanceof ApiError ? err.message : "Could not select bucket.",
        kind: "err",
      });
    } finally {
      setSelecting(null);
    }
  }

  /* ── explorer actions ── */

  function gotoPrefix(p: string) {
    if (!activeBucket || p === prefix) return;
    setPrefix(p);
    void loadObjects(activeBucket, p, null);
  }

  /* ── prefix mapping actions ── */

  function editPfx(key: keyof StoragePrefixes, value: string) {
    setPfxVals((cur) => ({ ...cur, [key]: value }));
    setPfxTouched((cur) => new Set(cur).add(key));
    setPfxErrors((cur) => {
      if (!(key in cur)) return cur;
      const next = { ...cur };
      delete next[key];
      return next;
    });
  }

  async function savePrefixes() {
    if (pfxBusy) return;
    const errs: Record<string, string> = {};
    const payload: Partial<StoragePrefixes> = {};
    for (const f of PREFIX_FIELDS) {
      if (!pfxTouched.has(f.key)) continue;
      const v = (pfxVals[f.key] ?? "").trim();
      if (!v || !v.endsWith("/") || v.startsWith("/") || v.includes("../")) {
        errs[f.key] = "Folder paths must end in “/”.";
      } else {
        payload[f.key] = v;
      }
    }
    setPfxErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setPfxBusy(true);
    try {
      await putStoragePrefixes(token, payload);
      await reloadStatus();
      setNotice({ text: "Folder mapping saved.", kind: "ok" });
    } catch (err) {
      const fe = fieldErrors(err);
      if (fe) setPfxErrors(remapPrefixErrors(fe));
      setNotice({
        text: err instanceof ApiError ? err.message : "Could not save mapping.",
        kind: "err",
      });
    } finally {
      setPfxBusy(false);
    }
  }

  /* ── render ── */

  const crumbs = useMemo(() => prefix.split("/").filter(Boolean), [prefix]);

  if (loadError) {
    return (
      <div className="adm-set">
        <div className="adm-card adm-set-loaderr" role="alert">
          <b>Storage settings could not be loaded</b>
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

  if (!status) {
    return (
      <div className="wiz-loading" role="status">
        <span className="wiz-spinner" />
        Loading storage settings…
      </div>
    );
  }

  const pill = statusPill(status);

  function field(
    key: keyof typeof connVals,
    label: string,
    desc: string,
    opts?: { secret?: boolean },
  ) {
    const err = connErrors[key];
    const isSecret = opts?.secret;
    // Configured → the masked value from /status is the placeholder so the
    // admin can see which credential is stored; the real value never returns.
    const masked =
      status?.configured && key !== "secret_access_key"
        ? status[key]
        : status?.configured
          ? "********"
          : null;
    return (
      <div className="adm-store-field" key={key}>
        <label className="adm-store-lb" htmlFor={`store-${key}`}>
          {label}
        </label>
        <p className="adm-store-hint">{desc}</p>
        <div className={isSecret ? "adm-store-pw" : undefined}>
          <input
            id={`store-${key}`}
            type={isSecret && !showSecret ? "password" : "text"}
            className={`adm-input${connVals[key] ? " dirty" : ""}`}
            value={connVals[key]}
            placeholder={masked ? `${masked} (saved)` : undefined}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(err) || undefined}
            onChange={(e) => editConn(key, e.target.value)}
          />
          {isSecret && (
            <button
              type="button"
              className="adm-store-pw-eye"
              aria-label={showSecret ? "Hide secret key" : "Show secret key"}
              onClick={() => setShowSecret((s) => !s)}
            >
              {showSecret ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
            </button>
          )}
        </div>
        {err && <span className="adm-set-err">{err}</span>}
      </div>
    );
  }

  return (
    <div className="adm-set">
      {/* page head */}
      <div className="adm-phead">
        <div>
          <div className="adm-eyebrow">Settings</div>
          <h1>
            Storage — <em>Cloudflare R2</em>
          </h1>
          <p>
            Object storage for media uploads, public files and project files —
            credentials stay on the server; the admin API proxies every bucket
            call.
          </p>
        </div>
        <div className="adm-phead-actions">
          <button
            type="button"
            className="adm-btn adm-btn-g"
            onClick={() =>
              void reloadStatus().catch(() =>
                setNotice({ text: "Could not refresh status.", kind: "err" }),
              )
            }
          >
            <RotateLeftIcon size={12} /> Re-check status
          </button>
        </div>
      </div>

      {/* 1 · connection */}
      <div className="adm-card">
        <div className="adm-card-hd">
          <div style={{ flex: 1 }}>
            <h3>R2 connection</h3>
            <p>S3-compatible API token scoped to your R2 buckets</p>
          </div>
          <span className={`adm-pill ${pill.tone}`}>
            <i />
            {pill.label}
          </span>
        </div>
        <div className="adm-card-bd">
          <div className="adm-store-note">
            <InfoIcon size={13} />
            <p>
              <b>What is R2?</b> Cloudflare’s S3-compatible object storage —
              files live in buckets and are served through this API, so you
              don’t need a public bucket. Create a token under{" "}
              <b>Cloudflare dashboard → R2 → Manage R2 API Tokens</b>{" "}
              (Object Read &amp; Write), then paste the Account ID and key pair
              here.
            </p>
          </div>

          {unreachable && (
            <div className="adm-store-warn" role="alert">
              <b>R2 is unreachable.</b> The saved credentials did not answer on
              the last check — uploads are falling back to local disk. Verify
              the keys below or your Cloudflare account status, then re-check.
            </div>
          )}

          <div className="adm-store-form">
            {field(
              "account_id",
              "Account ID",
              "From the R2 overview page — the ID in the endpoint https://<account-id>.r2.cloudflarestorage.com.",
            )}
            {field(
              "access_key_id",
              "Access key ID",
              "Token’s access key — shown once at creation in the Cloudflare dashboard.",
            )}
            {field(
              "secret_access_key",
              "Secret access key",
              "Stored on the server only — never shown again after saving.",
              { secret: true },
            )}
          </div>
          <p className="adm-store-sub">
            {status.configured
              ? "Saved values are masked — changing the connection means re-entering all three; leave every field blank to keep the stored credentials."
              : "All three values come from the same R2 API token screen."}
          </p>

          <div className="adm-store-actions">
            <button
              type="button"
              className="adm-btn"
              onClick={connect}
              disabled={connBusy || !connDirty}
            >
              <CheckIcon size={12} />{" "}
              {connBusy
                ? "Checking…"
                : status.configured
                  ? "Test & save changes"
                  : "Test & save connection"}
            </button>
            {status.configured && (
              <button
                type="button"
                className="adm-btn adm-btn-g adm-btn-danger-g"
                onClick={() => setConfirmDisconnect(true)}
                disabled={connBusy}
              >
                <XIcon size={12} /> Disconnect
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2 · buckets — connected only */}
      {connected && (
        <div className="adm-card">
          <div className="adm-card-hd">
            <div style={{ flex: 1 }}>
              <h3>Buckets</h3>
              <p>
                {buckets
                  ? `${buckets.length} bucket${buckets.length === 1 ? "" : "s"} on this account — one is active`
                  : "Loading bucket list…"}
              </p>
            </div>
            <button
              type="button"
              className="adm-icbtn"
              aria-label="Refresh buckets"
              onClick={() => void loadBuckets()}
              disabled={bucketsBusy}
            >
              <RotateLeftIcon size={13} />
            </button>
          </div>
          <div className="adm-card-bd flush">
            {bucketsErr && (
              <div className="adm-store-listerr" role="alert">
                {bucketsErr}
              </div>
            )}
            {buckets?.length === 0 && !bucketsErr && (
              <div className="adm-store-empty">
                No buckets yet — create the first one below.
              </div>
            )}
            {buckets?.map((b) => {
              const active = b.name === activeBucket;
              return (
                <div
                  key={b.name}
                  className={`adm-row${active ? " adm-store-active" : ""}`}
                >
                  <span className="adm-store-rowic">
                    <DatabaseIcon size={14} />
                  </span>
                  <div className="adm-row-tx">
                    <b>{b.name}</b>
                    <span>Created {formatDate(b.created_at)}</span>
                  </div>
                  {active ? (
                    <span className="adm-chip">Active</span>
                  ) : (
                    <button
                      type="button"
                      className="adm-btn adm-btn-g adm-btn-sm"
                      onClick={() => void selectBucket(b.name)}
                      disabled={selecting !== null}
                    >
                      {selecting === b.name ? "Selecting…" : "Select"}
                    </button>
                  )}
                </div>
              );
            })}

            {/* create form */}
            <div className="adm-store-create">
              <span className="adm-store-rowic">
                <PlusIcon size={13} />
              </span>
              <div className="adm-store-create-fields">
                <div>
                  <input
                    className="adm-input"
                    placeholder="new-bucket-name"
                    aria-label="New bucket name"
                    aria-invalid={Boolean(createErr.name) || undefined}
                    value={newBucket.name}
                    onChange={(e) => {
                      setNewBucket((c) => ({ ...c, name: e.target.value }));
                      setCreateErr((c) => {
                        if (!("name" in c)) return c;
                        const n = { ...c };
                        delete n.name;
                        return n;
                      });
                    }}
                  />
                  {createErr.name && (
                    <span className="adm-set-err">{createErr.name}</span>
                  )}
                </div>
                <input
                  className="adm-input"
                  placeholder="Location hint — optional (e.g. apac)"
                  aria-label="Bucket location (optional)"
                  value={newBucket.location}
                  onChange={(e) =>
                    setNewBucket((c) => ({ ...c, location: e.target.value }))
                  }
                />
              </div>
              <button
                type="button"
                className="adm-btn adm-btn-g adm-btn-sm"
                onClick={createBucket}
                disabled={creating}
              >
                {creating ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3 · usage — needs an active bucket */}
      {connected && activeBucket && (
        <div className="adm-card">
          <div className="adm-card-hd">
            <div style={{ flex: 1 }}>
              <h3>Usage</h3>
              <p>
                Server-side total for <b>{activeBucket}</b>
              </p>
            </div>
            <ServerIcon size={14} className="adm-hd-ic" />
          </div>
          <div className="adm-card-bd">
            {usageErr ? (
              <div className="adm-store-listerr" role="alert">
                {usageErr}
              </div>
            ) : !usage ? (
              <div className="adm-store-empty">Reading usage…</div>
            ) : (
              <>
                <div className="adm-status-grid">
                  <div className="adm-status">
                    <span className="adm-status-l">Storage used</span>
                    <span className="adm-status-v info">
                      {formatBytes(usage.bytes)}
                    </span>
                  </div>
                  <div className="adm-status">
                    <span className="adm-status-l">Objects</span>
                    <span className="adm-status-v info">
                      {usage.object_count.toLocaleString()}
                    </span>
                  </div>
                  <div className="adm-status">
                    <span className="adm-status-l">Free tier</span>
                    <span className="adm-status-v info">~10 GB included</span>
                  </div>
                </div>
                <p className="adm-store-sub">
                  {usage.truncated
                    ? "10k+ objects — exact usage unavailable."
                    : "Cloudflare’s free tier covers ~10 GB of storage before charges apply."}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* 4 · folder explorer — read-only */}
      {connected && activeBucket && (
        <div className="adm-card">
          <div className="adm-card-hd">
            <div style={{ flex: 1 }}>
              <h3>Folder explorer</h3>
              <p>Read-only browse of objects in the active bucket</p>
            </div>
            <FolderIcon size={14} className="adm-hd-ic" />
          </div>
          <div className="adm-store-crumb">
            <button
              type="button"
              className={`adm-store-crumb-b${prefix === "" ? " on" : ""}`}
              onClick={() => gotoPrefix("")}
            >
              {activeBucket}
            </button>
            {crumbs.map((seg, i) => {
              const p = crumbs.slice(0, i + 1).join("/") + "/";
              return (
                <span key={p} className="adm-store-crumb-seg">
                  <ChevronIcon size={9} className="adm-store-crumb-chev" />
                  <button
                    type="button"
                    className={`adm-store-crumb-b${p === prefix ? " on" : ""}`}
                    onClick={() => gotoPrefix(p)}
                  >
                    {seg}
                  </button>
                </span>
              );
            })}
          </div>
          <div className="adm-card-bd flush">
            {explErr && (
              <div className="adm-store-listerr" role="alert">
                {explErr}
              </div>
            )}
            {!explErr && folders.length === 0 && objects.length === 0 && (
              <div className="adm-store-empty">
                {explBusy ? "Listing…" : "This folder is empty."}
              </div>
            )}
            {folders.map((f) => (
              <button
                key={f}
                type="button"
                className="adm-row adm-store-folder"
                onClick={() => gotoPrefix(f)}
              >
                <span className="adm-store-rowic fold">
                  <FolderIcon size={14} />
                </span>
                <div className="adm-row-tx">
                  <b>{leafName(f, prefix)}/</b>
                  <span>Folder</span>
                </div>
                <ChevronIcon size={10} className="adm-store-go" />
              </button>
            ))}
            {objects.map((o) => (
              <div key={o.key} className="adm-row">
                <span className="adm-store-rowic">
                  <FileIcon size={14} />
                </span>
                <div className="adm-row-tx">
                  <b>{leafName(o.key, prefix)}</b>
                  <span>
                    {formatBytes(o.size)} · {formatDate(o.last_modified)}
                  </span>
                </div>
              </div>
            ))}
            {nextToken && (
              <div className="adm-store-more">
                <button
                  type="button"
                  className="adm-btn adm-btn-g adm-btn-sm"
                  disabled={explBusy}
                  onClick={() =>
                    activeBucket && void loadObjects(activeBucket, prefix, nextToken)
                  }
                >
                  {explBusy ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5 · purpose mapping — editable whenever configured */}
      {status.configured && (
        <div className="adm-card">
          <div className="adm-card-hd">
            <div style={{ flex: 1 }}>
              <h3>Purpose mapping</h3>
              <p>Which folders each kind of upload lands in</p>
            </div>
          </div>
          <div className="adm-card-bd flush">
            {PREFIX_FIELDS.map((f) => {
              const err = pfxErrors[f.key];
              const dirty = pfxTouched.has(f.key);
              return (
                <div key={f.key} className={`adm-set-row${dirty ? " dirty" : ""}`}>
                  <div className="adm-set-info">
                    <div className="adm-set-lb">
                      <span className="adm-set-lb-t">{f.label}</span>
                    </div>
                    <p>{f.hint}</p>
                    {err && <span className="adm-set-err">{err}</span>}
                  </div>
                  <div className="adm-set-ctl">
                    <input
                      className={`adm-input${dirty ? " dirty" : ""}`}
                      value={pfxVals[f.key] ?? ""}
                      placeholder={f.placeholder}
                      spellCheck={false}
                      aria-label={f.label}
                      aria-invalid={Boolean(err) || undefined}
                      onChange={(e) => editPfx(f.key, e.target.value)}
                    />
                  </div>
                </div>
              );
            })}
            <div className="adm-store-actions pad">
              <button
                type="button"
                className="adm-btn"
                onClick={savePrefixes}
                disabled={pfxBusy || pfxTouched.size === 0}
              >
                <CheckIcon size={12} />{" "}
                {pfxBusy ? "Saving…" : "Save mapping"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* transient notice */}
      {notice && (
        <div
          className={`adm-toast${notice.kind === "err" ? " err" : ""}`}
          role={notice.kind === "err" ? "alert" : "status"}
        >
          {notice.kind === "err" ? <XIcon size={12} /> : <CheckIcon size={12} />}{" "}
          {notice.text}
        </div>
      )}

      {/* disconnect confirm */}
      {confirmDisconnect && (
        <div
          className="adm-modal-scrim"
          role="presentation"
          onClick={() => !connBusy && setConfirmDisconnect(false)}
        >
          <div
            className="adm-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="adm-disc-t"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="adm-disc-t">Disconnect R2?</h3>
            <p>
              Saved credentials and the active bucket selection are cleared.
              Uploads fall back to local disk until you reconnect — existing
              objects are not deleted from Cloudflare.
            </p>
            <div className="adm-modal-act">
              <button
                type="button"
                className="adm-btn adm-btn-g"
                onClick={() => setConfirmDisconnect(false)}
                disabled={connBusy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="adm-btn adm-btn-danger"
                onClick={disconnect}
                disabled={connBusy}
              >
                {connBusy ? "Disconnecting…" : "Disconnect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
