/**
 * Institute branding — the "core settings" the IELTS installer wizard pushes
 * at apply time (`INSTITUTE_*` env vars), served publicly at /api/branding.
 *
 * Every page resolves name/logo through `useBranding` so nothing institute-
 * specific is hardcoded. A single module-level promise shares the fetch.
 */
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export interface Branding {
  name: string;
  tagline: string;
  logo_url: string | null;
}

/** Shown until the API answers (or when setup has never run). */
export const DEFAULT_BRANDING: Branding = {
  name: "IELTS Academy",
  tagline: "",
  logo_url: null,
};

let cached: Promise<Branding> | null = null;

export function getBranding(): Promise<Branding> {
  if (!cached) {
    cached = apiFetch<Branding>("/api/branding")
      .then((r) => ({ ...DEFAULT_BRANDING, ...r.data }))
      .catch(() => DEFAULT_BRANDING);
  }
  return cached;
}

const BRANDING_EVENT = "bloom:branding-invalidate";

/** Drop the cached branding + notify subscribers (e.g. after a settings save). */
export function invalidateBranding(): void {
  cached = null;
  window.dispatchEvent(new Event(BRANDING_EVENT));
}

export function useBranding(): Branding {
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING);
  useEffect(() => {
    let live = true;
    const load = () =>
      getBranding().then((b) => {
        if (live) setBranding(b);
      });
    load();
    window.addEventListener(BRANDING_EVENT, load);
    return () => {
      live = false;
      window.removeEventListener(BRANDING_EVENT, load);
    };
  }, []);
  return branding;
}

/** Keep the tab title + favicon in sync with the institute's identity. */
export function applyBrandingToDocument(branding: Branding): void {
  document.title = branding.name || "IELTS Platform";
  if (!branding.logo_url) return;
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (link) link.href = branding.logo_url;
}
