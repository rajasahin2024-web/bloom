/**
 * Typed environment configuration.
 *
 * Vite exposes variables prefixed with `VITE_` via `import.meta.env`. We
 * centralize access here so the rest of the app imports a single, validated
 * config object instead of reading `import.meta.env` directly.
 *
 * The `ImportMetaEnv` type is declared globally in `src/vite-env.d.ts`.
 */

function required(value: string | undefined, name: string): string {
  if (!value) {
    // In dev, fall back to same-origin so the app works over any host —
    // vite's /api proxy forwards to the API (see vite.config.ts).
    if (import.meta.env.DEV) {
      return "";
    }
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  apiBaseUrl: required(import.meta.env.VITE_API_BASE_URL, "VITE_API_BASE_URL"),
} as const;
