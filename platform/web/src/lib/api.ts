/**
 * Typed fetch wrapper for the Bloom API.
 *
 * Every call goes through `apiFetch` so base-URL resolution, JSON handling,
 * and error normalisation live in exactly one place.
 */
import { env } from "@/config/env";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Json = Record<string, unknown> | unknown[] | null;

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: Json;
  token?: string;
  credentials?: RequestCredentials;
  signal?: AbortSignal;
}

function errorMessage(status: number, payload: unknown): string {
  if (
    payload &&
    typeof payload === "object" &&
    "detail" in payload &&
    typeof (payload as { detail: unknown }).detail === "string"
  ) {
    return (payload as { detail: string }).detail;
  }
  return `Request failed (HTTP ${status})`;
}

/**
 * Pull per-field validation messages out of an API error body.
 * FastAPI wraps dict `detail` as {detail: {errors: {key: msg}}}; accept a
 * top-level {errors: {...}} too. Returns null when no usable map exists.
 */
export function apiFieldErrors(err: unknown): Record<string, string> | null {
  if (!(err instanceof ApiError)) return null;
  const body = err.detail;
  if (!body || typeof body !== "object") return null;
  const detail = (body as { detail?: unknown }).detail;
  const errors =
    (body as { errors?: unknown }).errors ??
    (detail && typeof detail === "object"
      ? (detail as { errors?: unknown }).errors
      : undefined);
  if (!errors || typeof errors !== "object" || Array.isArray(errors)) {
    return null;
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(errors)) {
    if (typeof v === "string") out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : null;
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<{ status: number; data: T }> {
  const { method = "GET", body, token, credentials, signal } = options;
  let res: Response;
  try {
    res = await fetch(`${env.apiBaseUrl}${path}`, {
      method,
      signal,
      credentials,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new ApiError(
      err instanceof Error && err.name === "AbortError"
        ? "Request timed out"
        : "Cannot reach the API — check that the backend is running.",
      0,
    );
  }

  let payload: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!res.ok) {
    throw new ApiError(errorMessage(res.status, payload), res.status, payload);
  }
  return { status: res.status, data: payload as T };
}
