/**
 * Admin auth — login/me/refresh/logout calls plus the session shape.
 *
 * MEDIUM-2 (TEC-155): nothing is persisted to localStorage anymore. The
 * 30-day refresh token lives only in an HttpOnly SameSite=Strict cookie
 * scoped to /api/auth, so XSS cannot exfiltrate the session. The 30-min
 * access token stays in memory (the AdminSession object in React state);
 * a reload restores the session via a silent cookie refresh below.
 */
import { apiFetch } from "@/lib/api";

/** Wire shape of POST /api/auth/login|register — refresh_token included. */
export interface TokenPair {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
}

/** The part of the pair the client is allowed to hold in memory. */
export interface SessionTokens {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface AdminUser {
  id: string;
  email: string;
  phone: string | null;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface LoginResponse {
  user: AdminUser;
  tokens: TokenPair;
}

export interface AdminSession {
  user: AdminUser;
  tokens: SessionTokens;
}

const LEGACY_STORAGE_KEY = "bloom.admin.session";

/**
 * Pre-MEDIUM-2 sessions persisted both tokens to localStorage — the exfil
 * window this issue closes. The key is dead now; drop it once on load so
 * any token stored before the change is gone from disk.
 */
export function purgeLegacySession(): void {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // storage unavailable (SSR/private mode) — nothing persisted anyway
  }
}

purgeLegacySession();

/**
 * Drop the refresh token before the pair enters app state — JS may hold the
 * short-lived access token only; the long-lived one belongs to the cookie.
 */
export function sessionTokens(tokens: TokenPair): SessionTokens {
  return {
    access_token: tokens.access_token,
    token_type: tokens.token_type,
    expires_in: tokens.expires_in,
  };
}

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const { data } = await apiFetch<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: { email, password },
    credentials: "include",
  });
  return data;
}

export async function fetchMe(accessToken: string): Promise<AdminUser> {
  const { data } = await apiFetch<AdminUser>("/api/auth/me", {
    token: accessToken,
  });
  return data;
}

/**
 * Cookie-transport CSRF proof (TEC-157 F-2): the API requires this custom
 * header on /refresh|/logout when the refresh credential arrives by cookie —
 * a cross-origin form POST can never set it.
 */
const COOKIE_CSRF_HEADER = { "X-Bloom-Auth": "1" };

/**
 * Silent session restore — POST /api/auth/refresh with an empty body; the
 * HttpOnly cookie carries the credential and the rotated value comes back
 * via Set-Cookie. Returns null when there is no valid cookie session.
 */
export async function refreshSession(): Promise<SessionTokens | null> {
  try {
    const { data } = await apiFetch<SessionTokens>("/api/auth/refresh", {
      method: "POST",
      body: {},
      credentials: "include",
      headers: COOKIE_CSRF_HEADER,
    });
    return data;
  } catch {
    return null;
  }
}

/**
 * Revoke the refresh token server-side — the cookie carries it, the body is
 * empty. Best-effort: the timeout keeps a dead network from trapping the
 * sign-out click; callers should still drop the local session on failure.
 */
export async function logout(): Promise<void> {
  await apiFetch("/api/auth/logout", {
    method: "POST",
    body: {},
    credentials: "include",
    headers: COOKIE_CSRF_HEADER,
    signal: AbortSignal.timeout(5000),
  });
}
