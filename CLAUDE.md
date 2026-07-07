# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Structure

```
apm-medical/
├── packages/
│   ├── landing/     # Astro 4 SSR — public-facing website
│   ├── dashboard/   # Next.js 14 App Router — CMS admin panel
│   └── backend/     # Hono.js REST API + Drizzle ORM + PostgreSQL
├── docker-compose.yml
├── pnpm-workspace.yaml
└── .env.example     # copy to .env and fill secrets
```

## Commands

```bash
# Root — run all packages in parallel
pnpm dev

# Individual packages
pnpm dev:landing      # Astro dev server → http://localhost:4321
pnpm dev:backend      # Hono dev server  → http://localhost:3001
pnpm dev:dashboard    # Next.js dev      → http://localhost:3000

# Backend DB
pnpm --filter backend db:generate   # generate Drizzle migration files
pnpm --filter backend db:migrate    # run migrations against DATABASE_URL
pnpm --filter backend db:seed       # create initial admin user

# Docker (full stack)
cp .env.example .env   # fill JWT_SECRET, NEXTAUTH_SECRET, ADMIN_PASSWORD
docker compose up --build
```

## Environment Variables

Copy `.env.example` to `.env`. Required values:

| Variable | Used by |
|---|---|
| `DATABASE_URL` | backend |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | backend |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | backend seed |
| `NEXTAUTH_SECRET` / `NEXTAUTH_URL` | dashboard |
| `VITE_API_URL` / `VITE_IMAGE_URL` / `VITE_SITE_URL` | landing |
| `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_IMAGE_URL` | dashboard |

## Architecture

### Backend (`packages/backend`)

- **Hono.js** + `@hono/node-server`, TypeScript, compiled to `dist/`
- **Drizzle ORM** with PostgreSQL (`drizzle-orm/node-postgres`)
- **JWT auth**: `jose` — access token (15 min) + refresh token (7 days)
- **File uploads**: native `FormData` → written to `UPLOAD_DIR` volume, served at `/files/:uuid`
- Route prefix matches original Directus paths exactly so landing needs zero changes beyond `VITE_API_URL`

**API routes:**
```
POST   /api/auth/login            public
POST   /api/auth/refresh          public
GET    /api/auth/me               protected
GET    /files/:id                 public (file serving)
POST   /files/upload              protected
GET/POST/PUT/DELETE  /api/items/Blog
GET/POST/PUT/DELETE  /api/items/Catalog
GET/POST/PUT/DELETE  /api/items/partners
GET/POST/PUT/DELETE  /api/items/medical_specialty
GET/POST/PUT/DELETE  /api/items/category_product
GET/POST/PUT/DELETE  /api/items/sub_category
GET/POST/PUT/DELETE  /api/items/brand
GET/POST/PUT/DELETE  /api/items/event_types
GET/POST/DELETE      /api/items/Events
POST (public) + GET/PATCH/DELETE  /api/items/client_contact
```

All GET (list + detail) endpoints are public. All writes require `Authorization: Bearer <token>`.

### Dashboard (`packages/dashboard`)

- **Next.js 14 App Router**, shadcn/ui components, Tailwind CSS
- **NextAuth v4** with `CredentialsProvider` — calls `/api/auth/login` on the backend, stores JWT in session
- **Middleware** at `src/middleware.ts` guards all routes except `/login`
- **React Query** (`@tanstack/react-query`) for all data fetching/mutations
- **Tiptap** rich text editor for Blog and Medical Specialty description fields

Route layout:
```
/login                      → auth page
/dashboard                  → overview with stats
/dashboard/blog             → list; /dashboard/blog/[id] or /new
/dashboard/catalog          → list; /dashboard/catalog/[uuid] or /new
/dashboard/partners         → list; /dashboard/partners/[id] or /new
/dashboard/medical-specialty → list; /[id] or /new
/dashboard/categories       → simple taxonomy CRUD (3 tables on one page)
/dashboard/events           → event types list + gallery; /[id] or /new
/dashboard/contacts         → read-only inbox with mark-as-read
/dashboard/media            → file manager (upload / delete)
```

### Landing (`packages/landing`)

- **Astro 4 SSR** with `@astrojs/node` standalone adapter — unchanged from original
- All fetch calls use `VITE_API_URL` / `VITE_IMAGE_URL` env vars
- API paths match the backend routes exactly (e.g. `/items/Blog`, `/items/Catalog`)

### Database Schema (`packages/backend/src/db/schema.ts`)

Tables: `users`, `files`, `blogs`, `partners`, `medical_specialty`, `category_product`, `sub_category`, `brand`, `catalog`, `event_types`, `events`, `client_contact`

File references are stored as `uuid` foreign keys pointing to the `files` table. Images are served at `GET /files/:uuid`.

## Development Tips

- Run `db:seed` once after first `db:migrate` to create the admin user defined in `.env`
- When adding a new collection: update `schema.ts` → `db:generate` → `db:migrate` → add route file → register in `src/index.ts`
- `catalog` uses `uuid` as primary key (not `id`) to match original Directus behaviour
- The `tailwindcss-animate` package is required by the dashboard — install before running `pnpm dev:dashboard`
