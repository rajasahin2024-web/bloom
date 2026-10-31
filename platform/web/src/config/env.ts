/**
 * Typed environment configuration.
 *
 * Vite exposes variables prefixed with `VITE_` via `import.meta.env`. We
 * centralize access here so the rest of the app imports a single, validated
 * config object instead of reading `import.meta.env` directly.
 *
 * The `ImportMetaEnv` type is declared globally in `src/vite-env.d.ts`.
 */

export const env = {
  // Empty → same-origin: Vite's dev proxy forwards /api to the API, and the
  // production nginx config proxies /api to the api container. A non-empty
  // VITE_API_BASE_URL overrides this for split-origin setups.
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "",
} as const;
