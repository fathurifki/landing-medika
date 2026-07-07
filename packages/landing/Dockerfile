FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# ── deps ──────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/landing/package.json ./packages/landing/
RUN pnpm install --frozen-lockfile --filter landing

# ── build ─────────────────────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app
COPY packages/landing ./packages/landing
# Baked in at build time — CapRover doesn't forward app env vars as build
# args, so these defaults target the current CapRover test domain. Update
# before rebuilding for the real production domain (see INSTALL.md).
ARG VITE_API_URL=https://landing-medika.pomerain.org/api
ARG VITE_IMAGE_URL=https://landing-medika.pomerain.org/files
ARG VITE_SITE_URL=https://landing-medika.pomerain.org
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_IMAGE_URL=${VITE_IMAGE_URL}
ENV VITE_SITE_URL=${VITE_SITE_URL}
RUN pnpm --filter landing run build

# ── runner ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/landing/package.json ./packages/landing/
RUN pnpm install --frozen-lockfile --filter landing --prod

COPY --from=builder /app/packages/landing/dist ./packages/landing/dist
COPY --from=builder /app/packages/landing/public ./packages/landing/public

EXPOSE 4321
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

CMD ["node", "packages/landing/dist/server/entry.mjs"]
