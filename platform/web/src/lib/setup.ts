/**
 * First-run setup wizard API — fixed contract from TEC-79.
 *
 * Once setup completes, EVERY `/api/setup/*` endpoint returns 410 Gone.
 * `getSetupStatus` maps that 410 onto `configured: true` so callers never
 * have to special-case the lock.
 */
import { apiFetch, ApiError } from "@/lib/api";

export interface DatabaseTarget {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  connection_type: "direct" | "pgbouncer";
}

export interface RedisTarget {
  host: string;
  port: number;
  password: string | null;
}

export interface SetupCheck {
  name: string;
  ok: boolean;
  detail: string | null;
}

export interface DatabaseTestResult {
  ok: boolean;
  checks: SetupCheck[];
  postgres_version: string | null;
  pgvector_installed: boolean;
  pgbouncer_detected: boolean;
  error: string | null;
  hint: string | null;
}

export interface RedisTestResult {
  ok: boolean;
  error: string | null;
}

export interface SetupApplyPayload {
  database: DatabaseTarget;
  redis: RedisTarget | null;
  /** First-admin credentials — all three together, or all null when skipped. */
  admin_email: string | null;
  admin_password: string | null;
  admin_name: string | null;
  institute_name: string;
  institute_tagline: string;
  /** `data:image/...;base64,…` URL, or null when no logo was picked. */
  institute_logo: string | null;
}

export interface SetupApplyResult {
  ok: boolean;
  configured: boolean;
  error: string | null;
}

/** true when the wizard is locked — either a 200 {configured:true} or a 410. */
export async function getSetupStatus(signal?: AbortSignal): Promise<boolean> {
  try {
    const { data } = await apiFetch<{ configured: boolean }>(
      "/api/setup/status",
      { signal },
    );
    return data.configured;
  } catch (err) {
    if (err instanceof ApiError && err.status === 410) return true;
    throw err;
  }
}

export function testDatabase(target: DatabaseTarget): Promise<DatabaseTestResult> {
  return apiFetch<DatabaseTestResult>("/api/setup/test-database", {
    method: "POST",
    body: target as unknown as Record<string, unknown>,
  }).then((r) => r.data);
}

export function testRedis(target: RedisTarget): Promise<RedisTestResult> {
  return apiFetch<RedisTestResult>("/api/setup/test-redis", {
    method: "POST",
    body: target as unknown as Record<string, unknown>,
  }).then((r) => r.data);
}

export function applySetup(
  payload: SetupApplyPayload,
): Promise<SetupApplyResult> {
  return apiFetch<SetupApplyResult>("/api/setup/apply", {
    method: "POST",
    body: payload as unknown as Record<string, unknown>,
  }).then((r) => r.data);
}
