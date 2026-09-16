# Bloom web — React + Vite + TypeScript
# Multi-stage: `development` runs the Vite dev server, `production` serves the build.

# ── Base: install deps ───────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

# ── Development: Vite dev server on 5173 ─────────────────────
FROM deps AS development
WORKDIR /app
COPY . .
EXPOSE 5173
CMD ["pnpm", "dev"]

# ── Build: production bundle ─────────────────────────────────
FROM deps AS build
WORKDIR /app
COPY . .
RUN pnpm build

# ── Production: serve static build ───────────────────────────
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 5173
CMD ["nginx", "-g", "daemon off;"]
