/**
 * Admin auth — login/me calls plus token persistence.
 *
 * Tokens are stored in localStorage under a single key so the admin gate can
 * revalidate on load. Only `/admin` uses this today; the student/teacher
 * login will get its own storage namespace in a later issue.
 */
import { apiFetch } from "@/lib/api";

export interface TokenPair {
  access_token: string;
  refresh_token: string;
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

const STORAGE_KEY = "bloom.admin.session";

export interface AdminSession {
  user: AdminUser;
  tokens: TokenPair;
}

export function loadSession(): AdminSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminSession;
    if (!parsed?.tokens?.access_token || !parsed?.user) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(session: AdminSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const { data } = await apiFetch<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
  return data;
}

export async function fetchMe(accessToken: string): Promise<AdminUser> {
  const { data } = await apiFetch<AdminUser>("/api/auth/me", {
    token: accessToken,
  });
  return data;
}
