/**
 * Admin settings API — typed client for /api/admin/settings.
 *
 * The GET payload is the grouped registry: every known key with its
 * effective value, control type, option list, description and `source`
 * ("db" = admin override, "env" = installer/default). PATCH takes a flat
 * {key: value} map and returns the fresh grouped payload.
 */
import { apiFetch } from "@/lib/api";

export type SettingSource = "db" | "env";

export interface SettingItem {
  key: string;
  group: string;
  label: string;
  type:
    | "text"
    | "email"
    | "url"
    | "textarea"
    | "select"
    | "toggle"
    | "number"
    | "image";
  value: unknown;
  default: unknown;
  source: SettingSource;
  options: string[] | null;
  description: string;
  updated_at: string | null;
}

export interface SettingGroup {
  id: string;
  label: string;
  description: string;
  items: SettingItem[];
}

export interface PlatformStatus {
  ok: boolean;
  detail: string | null;
}

export interface SettingsPayload {
  groups: SettingGroup[];
  platform: {
    env: string;
    version: string;
    storage: PlatformStatus;
    mail_engine: PlatformStatus;
  };
}

export interface HealthPayload {
  status: string;
  env: string;
  checks: {
    postgres: { ok: boolean; pgvector?: boolean };
    redis: { ok: boolean };
  };
}

export async function fetchSettings(token: string): Promise<SettingsPayload> {
  const { data } = await apiFetch<SettingsPayload>("/api/admin/settings", {
    token,
  });
  return data;
}

export async function saveSettings(
  token: string,
  changes: Record<string, unknown>,
): Promise<SettingsPayload> {
  const { data } = await apiFetch<SettingsPayload>("/api/admin/settings", {
    method: "PATCH",
    body: changes,
    token,
  });
  return data;
}

export async function resetSettings(token: string): Promise<SettingsPayload> {
  const { data } = await apiFetch<SettingsPayload>(
    "/api/admin/settings/reset",
    { method: "POST", token },
  );
  return data;
}

export async function fetchHealth(): Promise<HealthPayload> {
  const { data } = await apiFetch<HealthPayload>("/api/health");
  return data;
}

export interface SitemapEntry {
  loc: string;
  path: string;
  lastmod: string | null;
  source: string;
}

export interface SitemapPreview {
  enabled: boolean;
  base_url: string;
  sitemap_url: string;
  entry_count: number;
  entries: SitemapEntry[];
  xml: string;
}

export async function fetchSitemapPreview(
  token: string,
): Promise<SitemapPreview> {
  const { data } = await apiFetch<SitemapPreview>("/api/admin/sitemap", {
    token,
  });
  return data;
}
