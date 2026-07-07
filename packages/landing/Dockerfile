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
ARG VITE_API_URL
ARG VITE_IMAGE_URL
ARG VITE_SITE_URL
RUN pnpm --filter landing run build

# ── runner ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/landing/package.json ./packages/landing/
RUN pnpm install --frozen-lockfile --filter landing --prod

COPY --from=builder /app/packages/landing/dist ./packages/landing/dist

WORKDIR /app/packages/landing

EXPOSE 4321

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4321/ || exit 1

CMD ["node", "./dist/server/entry.mjs"]
