/**
 * Admin storage API — typed client for /api/admin/storage/* (TEC-165 contract,
 * TEC-163 analysis comment). Cloudflare R2 via the S3 API: the backend proxies
 * every bucket call so credentials never touch the browser beyond the initial
 * PUT — reads come back masked.
 *
 * PUT /connection validates with a real ListBuckets call and persists on
 * success — there is no separate "test only" endpoint, so the page offers a
 * single "Test & save" action. Fields left on their masked display value are
 * omitted from the payload so the stored secret is never overwritten by a
 * mask; the backend merges with saved credentials before validating.
 */
import { ApiError, apiFetch } from "@/lib/api";
import { env } from "@/config/env";

export interface StoragePrefixes {
  media: string | null;
  public_uploads: string | null;
  files: string | null;
}

export interface StorageStatus {
  configured: boolean;
  /** Masked values ("********" / tail-only) — display only, never resubmit. */
  account_id: string | null;
  access_key_id: string | null;
  bucket: string | null;
  prefixes: StoragePrefixes;
  reachable: boolean;
}

export interface StorageBucket {
  name: string;
  created_at: string | null;
}

export interface StorageObject {
  key: string;
  size: number;
  last_modified: string | null;
}

export interface StorageObjectPage {
  folders: string[];
  objects: StorageObject[];
  next_token: string | null;
  truncated: boolean;
}

export interface StorageUsage {
  bytes: number;
  object_count: number;
  truncated: boolean;
}

/** Keys of a connection PUT — every field optional so dirty fields can merge. */
export type ConnectionInput = Partial<{
  account_id: string;
  access_key_id: string;
  secret_access_key: string;
}>;

export async function fetchStorageStatus(token: string): Promise<StorageStatus> {
  const { data } = await apiFetch<StorageStatus>("/api/admin/storage/status", {
    token,
  });
  return data;
}

export async function putStorageConnection(
  token: string,
  body: ConnectionInput,
): Promise<StorageStatus> {
  const { data } = await apiFetch<StorageStatus>(
    "/api/admin/storage/connection",
    { method: "PUT", body, token },
  );
  return data;
}

export async function deleteStorageConnection(token: string): Promise<void> {
  await apiFetch<null>("/api/admin/storage/connection", {
    method: "DELETE",
    token,
  });
}

export async function fetchStorageBuckets(
  token: string,
): Promise<StorageBucket[]> {
  const { data } = await apiFetch<StorageBucket[]>(
    "/api/admin/storage/buckets",
    { token },
  );
  return data;
}

export async function createStorageBucket(
  token: string,
  name: string,
  location?: string,
): Promise<StorageBucket> {
  const { data } = await apiFetch<StorageBucket>(
    "/api/admin/storage/buckets",
    {
      method: "POST",
      body: location ? { name, location } : { name },
      token,
    },
  );
  return data;
}

export async function selectStorageBucket(
  token: string,
  bucket: string,
): Promise<StorageStatus> {
  const { data } = await apiFetch<StorageStatus>("/api/admin/storage/select", {
    method: "POST",
    body: { bucket },
    token,
  });
  return data;
}

export async function fetchStorageObjects(
  token: string,
  args: { bucket: string; prefix?: string; continuationToken?: string | null },
): Promise<StorageObjectPage> {
  const params = new URLSearchParams({ bucket: args.bucket, max_keys: "100" });
  if (args.prefix) params.set("prefix", args.prefix);
  if (args.continuationToken) {
    params.set("continuation_token", args.continuationToken);
  }
  const { data } = await apiFetch<StorageObjectPage>(
    `/api/admin/storage/objects?${params.toString()}`,
    { token },
  );
  return data;
}

export async function putStoragePrefixes(
  token: string,
  prefixes: Partial<StoragePrefixes>,
): Promise<StorageStatus> {
  const { data } = await apiFetch<StorageStatus>(
    "/api/admin/storage/prefixes",
    { method: "PUT", body: prefixes, token },
  );
  return data;
}

export async function fetchStorageUsage(
  token: string,
  bucket: string,
): Promise<StorageUsage> {
  const params = new URLSearchParams({ bucket });
  const { data } = await apiFetch<StorageUsage>(
    `/api/admin/storage/usage?${params.toString()}`,
    { token },
  );
  return data;
}

/* ── object ops (TEC-175 contract — TEC-163 explorer follow-up) ── */

export interface StorageUploadResult {
  key: string;
  size: number;
  mime: string | null;
}

export interface StorageObjectContent {
  content: string;
  mime: string;
  size: number;
  truncated: boolean;
}

export interface StorageShareLink {
  url: string;
  expires_at: string;
}

/** Share-link TTL choices offered by the UI — mirrors the BE allow-list. */
export const SHARE_TTLS = [
  { seconds: 3600, label: "1 hour" },
  { seconds: 86400, label: "24 hours" },
  { seconds: 604800, label: "7 days" },
] as const;

/** POST /objects/upload — real multipart file upload (10MB cap, 409 on key collision). */
export async function uploadStorageObject(
  token: string,
  args: { bucket: string; prefix: string; file: File; overwrite?: boolean },
): Promise<StorageUploadResult> {
  const params = new URLSearchParams({
    bucket: args.bucket,
    prefix: args.prefix,
  });
  if (args.overwrite) params.set("overwrite", "true");
  const formData = new FormData();
  formData.append("file", args.file);
  const { data } = await apiFetch<StorageUploadResult>(
    `/api/admin/storage/objects/upload?${params.toString()}`,
    { method: "POST", formData, token },
  );
  return data;
}

/** POST /objects/mkdir — zero-byte `{prefix}/` marker; BE appends the slash. */
export async function mkdirStorageObject(
  token: string,
  args: { bucket: string; prefix: string },
): Promise<{ prefix: string }> {
  const { data } = await apiFetch<{ prefix: string }>(
    "/api/admin/storage/objects/mkdir",
    { method: "POST", body: args, token },
  );
  return data;
}

/**
 * POST /objects/rename — S3 has no rename; BE does copy+delete. Folder keys
 * move children and need `recursive: true`.
 */
export async function renameStorageObject(
  token: string,
  args: { bucket: string; key: string; new_key: string; recursive?: boolean },
): Promise<{ key: string }> {
  const { data } = await apiFetch<{ key: string }>(
    "/api/admin/storage/objects/rename",
    { method: "POST", body: args, token },
  );
  return data;
}

/** DELETE /objects — folder prefixes need `recursive: true` else the BE 409s. */
export async function deleteStorageObject(
  token: string,
  args: { bucket: string; key: string; recursive?: boolean },
): Promise<void> {
  const params = new URLSearchParams({ bucket: args.bucket, key: args.key });
  if (args.recursive) params.set("recursive", "true");
  await apiFetch<null>(
    `/api/admin/storage/objects?${params.toString()}`,
    { method: "DELETE", token },
  );
}

/** GET /objects/content — text mimes only, ≤1MB; binary keys 415. */
export async function fetchStorageObjectContent(
  token: string,
  args: { bucket: string; key: string },
): Promise<StorageObjectContent> {
  const params = new URLSearchParams({ bucket: args.bucket, key: args.key });
  const { data } = await apiFetch<StorageObjectContent>(
    `/api/admin/storage/objects/content?${params.toString()}`,
    { token },
  );
  return data;
}

/** PUT /objects/content — write back text; same mime/size caps as the GET. */
export async function putStorageObjectContent(
  token: string,
  args: { bucket: string; key: string; content: string },
): Promise<{ key: string; size: number }> {
  const { data } = await apiFetch<{ key: string; size: number }>(
    "/api/admin/storage/objects/content",
    { method: "PUT", body: args, token },
  );
  return data;
}

/** POST /objects/share — presigned GET; anyone with the URL reads until expiry. */
export async function shareStorageObject(
  token: string,
  args: { bucket: string; key: string; expires_in: number },
): Promise<StorageShareLink> {
  const { data } = await apiFetch<StorageShareLink>(
    "/api/admin/storage/objects/share",
    { method: "POST", body: args, token },
  );
  return data;
}

/**
 * GET /objects/preview — admin-gated byte stream. Returns a Blob so the
 * caller can hand out an object URL (img/audio preview, download) — the
 * endpoint needs a bearer header, so it can't be an <img src> directly.
 */
export async function fetchStorageObjectBlob(
  token: string,
  args: { bucket: string; key: string },
): Promise<Blob> {
  const params = new URLSearchParams({ bucket: args.bucket, key: args.key });
  let res: Response;
  try {
    res = await fetch(
      `${env.apiBaseUrl}/api/admin/storage/objects/preview?${params.toString()}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  } catch {
    throw new ApiError(
      "Cannot reach the API — check that the backend is running.",
      0,
    );
  }
  if (!res.ok) {
    let message = `Request failed (HTTP ${res.status})`;
    try {
      const payload: unknown = await res.json();
      if (
        payload &&
        typeof payload === "object" &&
        typeof (payload as { detail?: unknown }).detail === "string"
      ) {
        message = (payload as { detail: string }).detail;
      }
    } catch {
      /* non-JSON error body — keep the generic message */
    }
    throw new ApiError(message, res.status);
  }
  return res.blob();
}
