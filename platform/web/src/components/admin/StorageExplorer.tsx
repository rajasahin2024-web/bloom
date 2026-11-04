/**
 * StorageExplorer — full-screen, Windows-like file explorer for the active
 * R2 bucket (TEC-175). Opened from the Folder explorer card header on
 * /admin/settings/storage as a fixed overlay (.adm-explorer-fs) — not a
 * route — so the settings page state underneath is preserved and Esc/close
 * returns to it.
 *
 * Wired to the TEC-174 object-ops contract under /api/admin/storage/objects:
 * upload (multipart), mkdir, rename (copy+delete server-side), delete
 * (recursive for folders), text content get/put, presigned share links,
 * and an admin-gated byte-stream preview. The browser never sees the R2
 * credentials — every call is proxied by the admin API with the session
 * token, so previews/downloads pull a Blob and hand out an object URL.
 *
 * UI vocabulary mirrors the rest of the admin panel: .adm-row list rows,
 * .adm-modal confirms, .adm-toast feedback, .adm-store-* row icons and
 * breadcrumbs. New chrome (toolbar, context menu, preview drawer) lives in
 * the .adm-xpl-* / .adm-ctx-* namespace inside .adm-explorer-fs.
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { ApiError } from "@/lib/api";
import {
  SHARE_TTLS,
  deleteStorageObject,
  fetchStorageObjectBlob,
  fetchStorageObjectContent,
  fetchStorageObjects,
  mkdirStorageObject,
  putStorageObjectContent,
  renameStorageObject,
  shareStorageObject,
  uploadStorageObject,
} from "@/lib/storage";
import type {
  StorageObject,
  StorageShareLink,
} from "@/lib/storage";
import {
  ArrowLeftIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronIcon,
  CopyIcon,
  DotsIcon,
  DownloadIcon,
  EyeIcon,
  FileIcon,
  FileTextIcon,
  FolderIcon,
  FolderPlusIcon,
  ImageIcon,
  LinkIcon,
  PenIcon,
  RotateLeftIcon,
  TrashIcon,
  UploadIcon,
  XIcon,
} from "@/components/icons";

type Notice = { text: string; kind: "ok" | "err" } | null;

/* ── key classification (mime isn't part of the listing — infer from ext) ── */

const IMAGE_EXT = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico", "avif",
]);
const AUDIO_EXT = new Set(["mp3", "wav", "ogg", "m4a", "flac", "aac"]);
const TEXT_EXT = new Set([
  "txt", "md", "markdown", "json", "xml", "csv", "tsv", "html", "htm",
  "css", "js", "mjs", "ts", "tsx", "jsx", "yml", "yaml", "ini", "cfg",
  "conf", "log", "env", "sh", "py", "sql", "toml", "svg", "txt",
]);

function extOf(key: string): string {
  const name = key.replace(/\/$/, "");
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}
const isImageKey = (k: string) => IMAGE_EXT.has(extOf(k));
const isAudioKey = (k: string) => AUDIO_EXT.has(extOf(k));
const isTextKey = (k: string) => TEXT_EXT.has(extOf(k));

/** Last path segment of a key/prefix ("a/b/" → "b", "a/b.txt" → "b.txt"). */
function leafName(path: string, prefix: string): string {
  const rest = path.startsWith(prefix) ? path.slice(prefix.length) : path;
  return rest.replace(/\/$/, "") || path;
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

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function errText(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/** A name typed into a rename/new-folder box — no separators or traversal. */
function cleanName(raw: string): string | null {
  const v = raw.trim().replace(/\/+$/, "");
  if (!v || v === "." || v === ".." || v.includes("/") || v.includes("\\")) {
    return null;
  }
  return v;
}

/* ── context menu model ── */

type MenuTarget =
  | { kind: "folder"; key: string; name: string }
  | { kind: "object"; key: string; name: string }
  | { kind: "blank" };

interface MenuState {
  x: number;
  y: number;
  target: MenuTarget;
}

interface MenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  divider?: boolean;
}

/* ── preview drawer model ── */

type PreviewData =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "binary" }
  | { kind: "media"; url: string; audio: boolean }
  | { kind: "text"; content: string; mime: string; truncated: boolean };

const COUNT_PAGE_LIMIT = 10; // ~1000 objects at max_keys=100 — enough for "N objects"

export function StorageExplorer({
  token,
  bucket,
  onClose,
}: {
  token: string;
  bucket: string;
  onClose: () => void;
}) {
  /* ── listing ── */
  const [prefix, setPrefix] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [objects, setObjects] = useState<StorageObject[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [listErr, setListErr] = useState<string | null>(null);
  const [toast, setToast] = useState<Notice>(null);
  const [dragging, setDragging] = useState(false);

  /* ── context menu ── */
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  /* ── inline edit states ── */
  const [renaming, setRenaming] = useState<{
    kind: "folder" | "object";
    key: string;
  } | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [mkdirOpen, setMkdirOpen] = useState(false);
  const [mkdirVal, setMkdirVal] = useState("");
  const [opBusy, setOpBusy] = useState(false);

  /* ── delete confirm ── */
  const [confirmDel, setConfirmDel] = useState<{
    kind: "folder" | "object";
    key: string;
    name: string;
    count: number | null; // folder contents; null while counting
    counted: boolean;
  } | null>(null);
  const [delBusy, setDelBusy] = useState(false);

  /* ── share modal ── */
  const [share, setShare] = useState<{ key: string; name: string } | null>(null);
  const [shareTtl, setShareTtl] = useState<number>(86400);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareLink, setShareLink] = useState<StorageShareLink | null>(null);

  /* ── preview / edit drawer ── */
  const [preview, setPreview] = useState<{ key: string; name: string } | null>(
    null,
  );
  const [previewData, setPreviewData] = useState<PreviewData>({
    kind: "loading",
  });
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);

  /* ── upload ── */
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadTargetRef = useRef<string>("");
  const [uploadBusy, setUploadBusy] = useState(false);

  const previewUrlRef = useRef<string | null>(null);

  /* ── loaders ── */

  const loadObjects = useCallback(
    async (pfx: string, continuation: string | null) => {
      setBusy(true);
      setListErr(null);
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
        setListErr(errText(err, "Could not list objects."));
      } finally {
        setBusy(false);
      }
    },
    [token, bucket],
  );

  const refresh = useCallback(
    () => loadObjects(prefix, null),
    [loadObjects, prefix],
  );

  useEffect(() => {
    setFolders([]);
    setObjects([]);
    setNextToken(null);
    void loadObjects(prefix, null);
  }, [prefix, loadObjects]);

  /* lock page scroll while the overlay is up */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  /* toast auto-dismiss — same 4s cadence as the settings page */
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(t);
  }, [toast]);

  /* revoke the preview object URL when the drawer target changes/closes */
  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  /* ── navigation ── */

  function gotoPrefix(p: string) {
    if (p === prefix) return;
    setHistory((h) => [...h, prefix]);
    setPrefix(p);
    closeTransient();
  }

  function goBack() {
    setHistory((h) => {
      if (h.length === 0) return h;
      const next = [...h];
      const p = next.pop();
      if (p !== undefined) setPrefix(p);
      return next;
    });
    closeTransient();
  }

  function goUp() {
    if (!prefix) return;
    const segs = prefix.replace(/\/$/, "").split("/");
    segs.pop();
    gotoPrefix(segs.length ? segs.join("/") + "/" : "");
  }

  /** Close menu/inline editors without touching modals or the drawer. */
  function closeTransient() {
    setMenu(null);
    setRenaming(null);
    setMkdirOpen(false);
  }

  /* ── context menu ── */

  function openMenu(x: number, y: number, target: MenuTarget) {
    setMenu({ x, y, target });
  }

  function rowMenuButton(
    e: React.MouseEvent<HTMLButtonElement>,
    target: MenuTarget,
  ) {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    openMenu(r.right, r.bottom + 4, target);
  }

  /* clamp to the viewport once the menu mounts and its size is measurable */
  useLayoutEffect(() => {
    if (!menu) {
      setMenuPos(null);
      return;
    }
    const el = menuRef.current;
    if (!el) {
      setMenuPos({ x: menu.x, y: menu.y });
      return;
    }
    const { width, height } = el.getBoundingClientRect();
    const x = Math.max(8, Math.min(menu.x, window.innerWidth - width - 8));
    const y = Math.max(8, Math.min(menu.y, window.innerHeight - height - 8));
    setMenuPos({ x, y });
  }, [menu]);

  /* click-outside / scroll dismissal (Escape is in the global handler) */
  useEffect(() => {
    if (!menu) return;
    const down = (e: PointerEvent) => {
      if (menuRef.current && e.target instanceof Node && menuRef.current.contains(e.target)) {
        return;
      }
      setMenu(null);
    };
    const dismiss = () => setMenu(null);
    window.addEventListener("pointerdown", down, true);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      window.removeEventListener("pointerdown", down, true);
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [menu]);

  function menuItemsFor(target: MenuTarget): MenuItem[] {
    if (target.kind === "blank") {
      return [
        { id: "mkdir", label: "New folder", icon: <FolderPlusIcon size={12} /> },
        { id: "upload", label: "Upload here", icon: <UploadIcon size={12} /> },
        { id: "refresh", label: "Refresh", icon: <RotateLeftIcon size={12} /> },
      ];
    }
    if (target.kind === "folder") {
      return [
        { id: "open", label: "Open", icon: <FolderIcon size={12} /> },
        { id: "rename", label: "Rename", icon: <PenIcon size={12} /> },
        { id: "mkdir", label: "New folder", icon: <FolderPlusIcon size={12} /> },
        { id: "upload", label: "Upload here", icon: <UploadIcon size={12} /> },
        { id: "delete", label: "Delete", icon: <TrashIcon size={12} />, danger: true, divider: true },
      ];
    }
    const items: MenuItem[] = [
      { id: "preview", label: "Preview / Open", icon: <EyeIcon size={12} /> },
    ];
    if (isTextKey(target.key)) {
      items.push({ id: "edit", label: "Edit", icon: <PenIcon size={12} /> });
    }
    items.push(
      { id: "rename", label: "Rename", icon: <PenIcon size={12} /> },
      { id: "mkdir", label: "New folder", icon: <FolderPlusIcon size={12} /> },
      { id: "upload", label: "Upload here", icon: <UploadIcon size={12} /> },
      { id: "share", label: "Share public link", icon: <LinkIcon size={12} /> },
      { id: "download", label: "Download", icon: <DownloadIcon size={12} /> },
      { id: "delete", label: "Delete", icon: <TrashIcon size={12} />, danger: true, divider: true },
    );
    return items;
  }

  function runMenuAction(id: string) {
    const target = menu?.target;
    setMenu(null);
    if (!target) return;
    switch (id) {
      case "open":
        if (target.kind === "folder") gotoPrefix(target.key);
        break;
      case "preview":
        if (target.kind === "object") void openPreview(target.key, target.name);
        break;
      case "edit":
        if (target.kind === "object") void openEditor(target.key, target.name);
        break;
      case "rename":
        if (target.kind !== "blank") {
          setRenaming({ kind: target.kind === "folder" ? "folder" : "object", key: target.key });
          setRenameVal(target.name);
          setMkdirOpen(false);
        }
        break;
      case "mkdir":
        setMkdirOpen(true);
        setMkdirVal("");
        setRenaming(null);
        break;
      case "upload": {
        uploadTargetRef.current =
          target.kind === "folder" ? target.key : prefix;
        fileInputRef.current?.click();
        break;
      }
      case "refresh":
        void refresh();
        break;
      case "share":
        if (target.kind === "object") {
          setShare({ key: target.key, name: target.name });
          setShareLink(null);
          setShareTtl(86400);
        }
        break;
      case "download":
        if (target.kind === "object") void downloadObject(target.key, target.name);
        break;
      case "delete":
        if (target.kind !== "blank") void askDelete(target);
        break;
    }
  }

  /* ── Escape layering: menu → modal → drawer → overlay ── */

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (menu) setMenu(null);
      else if (confirmDel) setConfirmDel(null);
      else if (share) setShare(null);
      else if (preview) closePreview();
      else onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ── rename ── */

  async function submitRename() {
    if (!renaming || opBusy) return;
    const name = cleanName(renameVal);
    if (!name) {
      setToast({
        text: "Names can't contain slashes or “..”.",
        kind: "err",
      });
      return;
    }
    const newKey =
      renaming.kind === "folder" ? `${prefix}${name}/` : `${prefix}${name}`;
    if (newKey === renaming.key) {
      setRenaming(null);
      return;
    }
    setOpBusy(true);
    try {
      await renameStorageObject(token, {
        bucket,
        key: renaming.key,
        new_key: newKey,
        recursive: renaming.kind === "folder" ? true : undefined,
      });
      setRenaming(null);
      setToast({ text: `Renamed to “${name}”.`, kind: "ok" });
      await refresh();
    } catch (err) {
      setToast({ text: errText(err, "Rename failed."), kind: "err" });
    } finally {
      setOpBusy(false);
    }
  }

  /* ── mkdir ── */

  async function submitMkdir() {
    if (opBusy) return;
    const name = cleanName(mkdirVal);
    if (!name) {
      setToast({
        text: "Folder names can't contain slashes or “..”.",
        kind: "err",
      });
      return;
    }
    setOpBusy(true);
    try {
      await mkdirStorageObject(token, { bucket, prefix: `${prefix}${name}/` });
      setMkdirOpen(false);
      setMkdirVal("");
      setToast({ text: `Folder “${name}” created.`, kind: "ok" });
      await refresh();
    } catch (err) {
      setToast({ text: errText(err, "Could not create folder."), kind: "err" });
    } finally {
      setOpBusy(false);
    }
  }

  /* ── delete ── */

  async function askDelete(target: { kind: "folder" | "object"; key: string; name: string }) {
    setConfirmDel({ ...target, count: null, counted: target.kind === "object" });
    if (target.kind !== "folder") return;
    // Count what a recursive delete would remove — pages through the folder
    // listing, bounded so huge prefixes still answer quickly.
    let count = 0;
    let next: string | null = null;
    try {
      for (let i = 0; i < COUNT_PAGE_LIMIT; i++) {
        const page = await fetchStorageObjects(token, {
          bucket,
          prefix: target.key,
          continuationToken: next,
        });
        count += page.folders.length + page.objects.length;
        next = page.next_token;
        if (!next) break;
      }
    } catch {
      /* count failed — the confirm still works, just without a number */
    }
    setConfirmDel((cur) =>
      cur && cur.key === target.key ? { ...cur, count, counted: true } : cur,
    );
  }

  async function doDelete() {
    if (!confirmDel || delBusy) return;
    setDelBusy(true);
    try {
      await deleteStorageObject(token, {
        bucket,
        key: confirmDel.key,
        recursive: confirmDel.kind === "folder" ? true : undefined,
      });
      setToast({ text: `Deleted “${confirmDel.name}”.`, kind: "ok" });
      setConfirmDel(null);
      if (preview?.key === confirmDel.key) closePreview();
      await refresh();
    } catch (err) {
      setToast({ text: errText(err, "Delete failed."), kind: "err" });
    } finally {
      setDelBusy(false);
    }
  }

  /* ── share ── */

  async function generateShare() {
    if (!share || shareBusy) return;
    setShareBusy(true);
    try {
      const link = await shareStorageObject(token, {
        bucket,
        key: share.key,
        expires_in: shareTtl,
      });
      setShareLink(link);
    } catch (err) {
      setToast({ text: errText(err, "Could not create link."), kind: "err" });
    } finally {
      setShareBusy(false);
    }
  }

  async function copyShare() {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink.url);
      setToast({ text: "Link copied to clipboard.", kind: "ok" });
    } catch {
      setToast({ text: "Copy failed — select the link manually.", kind: "err" });
    }
  }

  /* ── download ── */

  async function downloadObject(key: string, name: string) {
    try {
      const blob = await fetchStorageObjectBlob(token, { bucket, key });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      setToast({ text: errText(err, "Download failed."), kind: "err" });
    }
  }

  /* ── preview + edit drawer ── */

  function closePreview() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreview(null);
    setEditing(false);
    setSaveBusy(false);
  }

  async function openPreview(key: string, name: string) {
    setEditing(false);
    setPreview({ key, name });
    setPreviewData({ kind: "loading" });
    if (isImageKey(key) || isAudioKey(key)) {
      try {
        const blob = await fetchStorageObjectBlob(token, { bucket, key });
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        const url = URL.createObjectURL(blob);
        previewUrlRef.current = url;
        setPreviewData({ kind: "media", url, audio: isAudioKey(key) });
      } catch (err) {
        setPreviewData({
          kind: "error",
          message: errText(err, "Could not load preview."),
        });
      }
    } else if (isTextKey(key)) {
      try {
        const c = await fetchStorageObjectContent(token, { bucket, key });
        setPreviewData({
          kind: "text",
          content: c.content,
          mime: c.mime,
          truncated: c.truncated,
        });
      } catch (err) {
        if (err instanceof ApiError && err.status === 415) {
          setPreviewData({ kind: "binary" });
        } else {
          setPreviewData({
            kind: "error",
            message: errText(err, "Could not load preview."),
          });
        }
      }
    } else {
      setPreviewData({ kind: "binary" });
    }
  }

  async function openEditor(key: string, name: string) {
    setPreview({ key, name });
    setPreviewData({ kind: "loading" });
    try {
      const c = await fetchStorageObjectContent(token, { bucket, key });
      setPreviewData({
        kind: "text",
        content: c.content,
        mime: c.mime,
        truncated: c.truncated,
      });
      // Truncated reads must never enter edit mode — saving would destroy
      // everything past the 1 MB cap.
      setEditVal(c.content);
      setEditing(!c.truncated);
      if (c.truncated) {
        setToast({
          text: "File is over 1 MB — too large to edit here.",
          kind: "err",
        });
      }
    } catch (err) {
      setPreviewData(
        err instanceof ApiError && err.status === 415
          ? { kind: "binary" }
          : { kind: "error", message: errText(err, "Could not load file.") },
      );
      setEditing(false);
    }
  }

  async function saveEdit() {
    if (!preview || saveBusy) return;
    setSaveBusy(true);
    try {
      await putStorageObjectContent(token, {
        bucket,
        key: preview.key,
        content: editVal,
      });
      setToast({ text: `Saved “${preview.name}”.`, kind: "ok" });
      setEditing(false);
      await openPreview(preview.key, preview.name);
      await refresh();
    } catch (err) {
      setToast({ text: errText(err, "Save failed."), kind: "err" });
    } finally {
      setSaveBusy(false);
    }
  }

  /* ── upload ── */

  async function uploadFiles(files: FileList | File[], targetPrefix: string) {
    if (uploadBusy) return;
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploadBusy(true);
    let ok = 0;
    let failed = 0;
    for (const f of list) {
      try {
        await uploadStorageObject(token, {
          bucket,
          prefix: targetPrefix,
          file: f,
        });
        ok += 1;
      } catch (err) {
        failed += 1;
        setToast({
          text: errText(err, `Upload failed for “${f.name}”.`),
          kind: "err",
        });
      }
    }
    if (ok > 0) {
      setToast({
        text:
          failed > 0
            ? `Uploaded ${ok} file${ok === 1 ? "" : "s"} — ${failed} failed.`
            : `Uploaded ${ok} file${ok === 1 ? "" : "s"}.`,
        kind: failed > 0 ? "err" : "ok",
      });
      await refresh();
    }
    setUploadBusy(false);
  }

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      void uploadFiles(files, uploadTargetRef.current || prefix);
    }
    e.target.value = "";
  }

  /* ── render helpers ── */

  const crumbs = prefix.split("/").filter(Boolean);
  const empty = folders.length === 0 && objects.length === 0;

  function fileIconFor(key: string) {
    if (isImageKey(key)) return <ImageIcon size={14} />;
    if (isTextKey(key)) return <FileTextIcon size={14} />;
    return <FileIcon size={14} />;
  }

  const canEdit = preview ? isTextKey(preview.key) : false;

  return (
    <div
      className="adm-explorer-fs"
      role="dialog"
      aria-modal="true"
      aria-label={`File explorer — ${bucket}`}
    >
      {/* header */}
      <div className="adm-xpl-head">
        <div className="adm-xpl-title">
          <FolderIcon size={15} />
          <b>{bucket}</b>
          <span>File explorer</span>
        </div>
        <button
          type="button"
          className="adm-icbtn"
          aria-label="Close file explorer"
          onClick={onClose}
        >
          <XIcon size={14} />
        </button>
      </div>

      {/* toolbar */}
      <div className="adm-xpl-bar">
        <button
          type="button"
          className="adm-icbtn"
          aria-label="Back"
          title="Back"
          disabled={history.length === 0}
          onClick={goBack}
        >
          <ArrowLeftIcon size={13} />
        </button>
        <button
          type="button"
          className="adm-icbtn"
          aria-label="Up one level"
          title="Up one level"
          disabled={!prefix}
          onClick={goUp}
        >
          <ArrowUpIcon size={13} />
        </button>
        <div className="adm-xpl-crumbs">
          <button
            type="button"
            className={`adm-store-crumb-b${prefix === "" ? " on" : ""}`}
            onClick={() => gotoPrefix("")}
          >
            {bucket}
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
        <div className="adm-xpl-bar-act">
          <button
            type="button"
            className="adm-icbtn"
            aria-label="Refresh"
            title="Refresh"
            disabled={busy}
            onClick={() => void refresh()}
          >
            <RotateLeftIcon size={13} />
          </button>
          <button
            type="button"
            className="adm-btn adm-btn-g adm-btn-sm"
            onClick={() => {
              setMkdirOpen(true);
              setMkdirVal("");
              setRenaming(null);
            }}
          >
            <FolderPlusIcon size={12} /> New folder
          </button>
          <button
            type="button"
            className="adm-btn adm-btn-sm"
            disabled={uploadBusy}
            onClick={() => {
              uploadTargetRef.current = prefix;
              fileInputRef.current?.click();
            }}
          >
            <UploadIcon size={12} /> {uploadBusy ? "Uploading…" : "Upload"}
          </button>
        </div>
      </div>

      {/* body: list + optional drawer */}
      <div className="adm-xpl-body">
        <div
          className={`adm-xpl-list${dragging ? " dragging" : ""}`}
          onContextMenu={(e) => {
            e.preventDefault();
            openMenu(e.clientX, e.clientY, { kind: "blank" });
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(e) => {
            if (e.currentTarget === e.target) setDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files.length > 0) {
              void uploadFiles(e.dataTransfer.files, prefix);
            }
          }}
        >
          {listErr && (
            <div className="adm-store-listerr" role="alert">
              {listErr}
            </div>
          )}

          {!listErr && busy && empty && (
            <div aria-hidden="true">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="adm-xpl-skel">
                  <span /> <b /> <i />
                </div>
              ))}
            </div>
          )}

          {!listErr && !busy && empty && !mkdirOpen && (
            <div className="adm-store-empty">
              This folder is empty — right-click for options, or drop files
              here to upload.
            </div>
          )}

          {/* inline new-folder row */}
          {mkdirOpen && (
            <div className="adm-row adm-xpl-row">
              <span className="adm-store-rowic fold">
                <FolderIcon size={14} />
              </span>
              <div className="adm-row-tx">
                <input
                  className="adm-input adm-xpl-inline"
                  placeholder="new-folder-name"
                  aria-label="New folder name"
                  autoFocus
                  value={mkdirVal}
                  disabled={opBusy}
                  onChange={(e) => setMkdirVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void submitMkdir();
                    else if (e.key === "Escape") {
                      e.stopPropagation();
                      setMkdirOpen(false);
                    }
                  }}
                  onBlur={() => {
                    if (!opBusy && !mkdirVal.trim()) setMkdirOpen(false);
                  }}
                />
              </div>
            </div>
          )}

          {folders.map((f) => {
            const name = leafName(f, prefix);
            const isRenaming = renaming?.key === f;
            return (
              <div
                key={f}
                className="adm-row adm-xpl-row adm-xpl-nav"
                role="button"
                tabIndex={0}
                onClick={() => !isRenaming && gotoPrefix(f)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isRenaming) gotoPrefix(f);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openMenu(e.clientX, e.clientY, {
                    kind: "folder",
                    key: f,
                    name,
                  });
                }}
              >
                <span className="adm-store-rowic fold">
                  <FolderIcon size={14} />
                </span>
                <div className="adm-row-tx">
                  {isRenaming ? (
                    <input
                      className="adm-input adm-xpl-inline"
                      aria-label="Rename folder"
                      autoFocus
                      value={renameVal}
                      disabled={opBusy}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setRenameVal(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void submitRename();
                        else if (e.key === "Escape") {
                          e.stopPropagation();
                          setRenaming(null);
                        }
                      }}
                    />
                  ) : (
                    <>
                      <b>{name}/</b>
                      <span>Folder</span>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  className="adm-icbtn adm-xpl-dots"
                  aria-label={`Actions for folder ${name}`}
                  onClick={(e) =>
                    rowMenuButton(e, { kind: "folder", key: f, name })
                  }
                >
                  <DotsIcon size={13} />
                </button>
              </div>
            );
          })}

          {objects.map((o) => {
            const name = leafName(o.key, prefix);
            const isRenaming = renaming?.key === o.key;
            return (
              <div
                key={o.key}
                className="adm-row adm-xpl-row"
                role="button"
                tabIndex={0}
                onClick={() => !isRenaming && void openPreview(o.key, name)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isRenaming) void openPreview(o.key, name);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openMenu(e.clientX, e.clientY, {
                    kind: "object",
                    key: o.key,
                    name,
                  });
                }}
              >
                <span className="adm-store-rowic">
                  {fileIconFor(o.key)}
                </span>
                <div className="adm-row-tx">
                  {isRenaming ? (
                    <input
                      className="adm-input adm-xpl-inline"
                      aria-label="Rename file"
                      autoFocus
                      value={renameVal}
                      disabled={opBusy}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setRenameVal(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void submitRename();
                        else if (e.key === "Escape") {
                          e.stopPropagation();
                          setRenaming(null);
                        }
                      }}
                    />
                  ) : (
                    <>
                      <b>{name}</b>
                      <span>
                        {formatBytes(o.size)} · {formatDate(o.last_modified)}
                      </span>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  className="adm-icbtn adm-xpl-dots"
                  aria-label={`Actions for file ${name}`}
                  onClick={(e) =>
                    rowMenuButton(e, { kind: "object", key: o.key, name })
                  }
                >
                  <DotsIcon size={13} />
                </button>
              </div>
            );
          })}

          {nextToken && (
            <div className="adm-store-more">
              <button
                type="button"
                className="adm-btn adm-btn-g adm-btn-sm"
                disabled={busy}
                onClick={() => void loadObjects(prefix, nextToken)}
              >
                {busy ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </div>

        {/* preview / edit drawer */}
        {preview && (
          <aside className="adm-xpl-drawer" aria-label={`Preview — ${preview.name}`}>
            <div className="adm-xpl-drawer-hd">
              <div className="adm-xpl-drawer-t">
                {fileIconFor(preview.key)}
                <b>{preview.name}</b>
              </div>
              <div className="adm-xpl-drawer-act">
                {canEdit &&
                  !editing &&
                  previewData.kind === "text" &&
                  !previewData.truncated && (
                  <button
                    type="button"
                    className="adm-btn adm-btn-g adm-btn-sm"
                    onClick={() => {
                      if (previewData.kind === "text") {
                        setEditVal(previewData.content);
                        setEditing(true);
                      }
                    }}
                  >
                    <PenIcon size={11} /> Edit
                  </button>
                )}
                <button
                  type="button"
                  className="adm-icbtn"
                  aria-label="Close preview"
                  onClick={closePreview}
                >
                  <XIcon size={13} />
                </button>
              </div>
            </div>

            {editing ? (
              <div className="adm-xpl-edit">
                <textarea
                  className="adm-input adm-xpl-editor"
                  aria-label={`Edit ${preview.name}`}
                  value={editVal}
                  onChange={(e) => setEditVal(e.target.value)}
                  spellCheck={false}
                />
                <div className="adm-xpl-edit-act">
                  <button
                    type="button"
                    className="adm-btn adm-btn-g adm-btn-sm"
                    disabled={saveBusy}
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="adm-btn adm-btn-sm"
                    disabled={saveBusy}
                    onClick={() => void saveEdit()}
                  >
                    <CheckIcon size={11} /> {saveBusy ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="adm-xpl-preview">
                {previewData.kind === "loading" && (
                  <div className="adm-store-empty">Loading preview…</div>
                )}
                {previewData.kind === "error" && (
                  <div className="adm-store-listerr" role="alert">
                    {previewData.message}
                  </div>
                )}
                {previewData.kind === "binary" && (
                  <div className="adm-store-empty">
                    Binary file — preview only.
                  </div>
                )}
                {previewData.kind === "media" &&
                  (previewData.audio ? (
                    <audio controls src={previewData.url} className="adm-xpl-audio" />
                  ) : (
                    <img
                      src={previewData.url}
                      alt={preview.name}
                      className="adm-xpl-img"
                    />
                  ))}
                {previewData.kind === "text" && (
                  <>
                    {previewData.truncated && (
                      <p className="adm-xpl-note">
                        File is over 1 MB — showing the first part only.
                      </p>
                    )}
                    <pre className="adm-xpl-pre">{previewData.content}</pre>
                  </>
                )}
              </div>
            )}
          </aside>
        )}
      </div>

      {/* context menu — hidden until the clamp pass measures its size */}
      {menu && (
        <div
          ref={menuRef}
          className="adm-ctx-menu"
          role="menu"
          style={{
            left: menuPos?.x ?? menu.x,
            top: menuPos?.y ?? menu.y,
            visibility: menuPos ? "visible" : "hidden",
          }}
        >
          {menuItemsFor(menu.target).map((it) => (
            <button
              key={it.id}
              type="button"
              role="menuitem"
              className={`adm-ctx-item${it.danger ? " danger" : ""}${it.divider ? " div" : ""}`}
              onClick={() => runMenuAction(it.id)}
            >
              {it.icon}
              {it.label}
            </button>
          ))}
        </div>
      )}

      {/* hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        aria-hidden="true"
        onChange={onPickFiles}
      />

      {/* delete confirm */}
      {confirmDel && (
        <div
          className="adm-modal-scrim"
          role="presentation"
          onClick={() => !delBusy && setConfirmDel(null)}
        >
          <div
            className="adm-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="adm-xpl-del-t"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="adm-xpl-del-t">
              Delete {confirmDel.kind === "folder" ? "folder" : "file"}?
            </h3>
            <p>
              {confirmDel.kind === "folder" ? (
                confirmDel.counted ? (
                  confirmDel.count === 0 ? (
                    <>
                      <b>{confirmDel.name}/</b> is empty — it will be
                      permanently deleted.
                    </>
                  ) : (
                    <>
                      <b>{confirmDel.name}/</b> contains{" "}
                      {confirmDel.count !== null && confirmDel.count >= COUNT_PAGE_LIMIT * 100
                        ? `${confirmDel.count}+`
                        : confirmDel.count}{" "}
                      object
                      {confirmDel.count === 1 ? "" : "s"} — everything inside it
                      will be permanently deleted.
                    </>
                  )
                ) : (
                  <>
                    <b>{confirmDel.name}/</b> and everything inside it will be
                    permanently deleted — counting contents…
                  </>
                )
              ) : (
                <>
                  <b>{confirmDel.name}</b> will be permanently deleted from the
                  bucket.
                </>
              )}
            </p>
            <div className="adm-modal-act">
              <button
                type="button"
                className="adm-btn adm-btn-g"
                onClick={() => setConfirmDel(null)}
                disabled={delBusy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="adm-btn adm-btn-danger"
                onClick={() => void doDelete()}
                disabled={delBusy}
              >
                {delBusy ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* share modal */}
      {share && (
        <div
          className="adm-modal-scrim"
          role="presentation"
          onClick={() => !shareBusy && setShare(null)}
        >
          <div
            className="adm-modal adm-modal-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="adm-xpl-share-t"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="adm-xpl-share-t">Share public link</h3>
            <p>
              Create a temporary read link for <b>{share.name}</b>. Anyone with
              this link can read the file until it expires.
            </p>
            {!shareLink ? (
              <>
                <div className="adm-xpl-ttl" role="radiogroup" aria-label="Link expiry">
                  {SHARE_TTLS.map((t) => (
                    <label key={t.seconds} className="adm-xpl-ttl-o">
                      <input
                        type="radio"
                        name="share-ttl"
                        value={t.seconds}
                        checked={shareTtl === t.seconds}
                        onChange={() => setShareTtl(t.seconds)}
                      />
                      {t.label}
                    </label>
                  ))}
                </div>
                <div className="adm-modal-act">
                  <button
                    type="button"
                    className="adm-btn adm-btn-g"
                    onClick={() => setShare(null)}
                    disabled={shareBusy}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="adm-btn"
                    onClick={() => void generateShare()}
                    disabled={shareBusy}
                  >
                    {shareBusy ? "Generating…" : "Generate link"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="adm-xpl-share-link">
                  <input
                    className="adm-input"
                    readOnly
                    value={shareLink.url}
                    aria-label="Public link"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <button
                    type="button"
                    className="adm-btn adm-btn-sm"
                    onClick={() => void copyShare()}
                  >
                    <CopyIcon size={11} /> Copy
                  </button>
                </div>
                <p className="adm-xpl-note">
                  Anyone with this link can read the file until{" "}
                  <b>{formatDateTime(shareLink.expires_at)}</b>.
                </p>
                <div className="adm-modal-act">
                  <button
                    type="button"
                    className="adm-btn adm-btn-g"
                    onClick={() => setShare(null)}
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* toast */}
      {toast && (
        <div
          className={`adm-toast${toast.kind === "err" ? " err" : ""}`}
          role={toast.kind === "err" ? "alert" : "status"}
        >
          {toast.kind === "err" ? <XIcon size={12} /> : <CheckIcon size={12} />}{" "}
          {toast.text}
        </div>
      )}
    </div>
  );
}
