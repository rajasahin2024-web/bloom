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
import { apiFetch } from "@/lib/api";

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
