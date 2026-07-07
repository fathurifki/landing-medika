# Panduan Instalasi — APM Medical

Dokumen ini menjelaskan cara memasang dan menjalankan monorepo APM Medical
(`landing` + `dashboard` + `backend`) baik untuk pengembangan lokal maupun
produksi (VPS/Docker).

## 1. Prasyarat

Pasang perangkat lunak berikut sebelum memulai:

| Kebutuhan | Versi Minimum | Catatan |
|---|---|---|
| Node.js | 20.x | disarankan pakai `nvm` |
| pnpm | 9.x | `corepack enable && corepack prepare pnpm@9.0.0 --activate` |
| Docker + Docker Compose | terbaru | untuk PostgreSQL lokal & deployment |
| Git | terbaru | |

Cek versi:

```bash
node -v
pnpm -v
docker -v
docker compose version
```

## 2. Struktur Proyek

```
landing-medika/
├── packages/
│   ├── landing/      # Astro 4 SSR — website publik
│   ├── dashboard/    # Next.js 14 App Router — panel admin CMS
│   └── backend/      # Hono.js REST API + Drizzle ORM + PostgreSQL
├── scripts/
│   ├── ensure-db.sh   # start Postgres otomatis (skip kalau sudah hidup)
│   ├── backup.sh      # backup database + uploads
│   └── restore.sh      # restore database + uploads
├── docker-compose.yml
├── pnpm-workspace.yaml
├── .env               # satu sumber env untuk semua package (JANGAN commit)
└── .env.example       # template — copy ke .env
```

## 3. Instalasi Lokal (Development)

```bash
# 1. Clone repo
git clone <url-repo-anda> landing-medika
cd landing-medika

# 2. Install semua dependency (root + semua package sekaligus, via pnpm workspace)
pnpm install
```

## 4. Konfigurasi Environment Variables

Proyek ini memakai **satu file `.env` terpusat di root**, dibaca oleh ketiga
package (backend, landing, dashboard) secara langsung.

```bash
cp .env.example .env
```

Lalu isi nilai-nilai berikut di `.env`:

| Variabel | Dipakai oleh | Keterangan |
|---|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Docker Postgres | harus sinkron dengan `DATABASE_URL` |
| `DATABASE_URL` | backend | `postgresql://user:pass@host:5432/db` |
| `ROOT_DOMAIN` / `CERTBOT_EMAIL` | nginx + certbot | domain publik utama dan email Let's Encrypt |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | backend | string acak & panjang |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | backend (seed) | akun admin awal |
| `BACKEND_URL` / `INTERNAL_API_URL` | dashboard + landing SSR | URL internal Docker/local untuk server-side fetch |
| `NEXTAUTH_SECRET` / `NEXTAUTH_URL` | dashboard | `NEXTAUTH_URL` harus ke `https://domain/dashboard/api/auth` |
| `VITE_API_URL` / `VITE_IMAGE_URL` / `VITE_SITE_URL` | landing | URL publik `/api`, `/files`, dan situs |
| `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_IMAGE_URL` | dashboard | URL publik untuk client-side fetch |

### Nilai yang dipakai sekarang

Kalau ingin langsung mengikuti konfigurasi yang sedang dipakai di proyek ini,
isi `.env` seperti berikut:

```env
POSTGRES_USER=apm
POSTGRES_PASSWORD=apm_secret
POSTGRES_DB=apm_medical
DATABASE_URL=postgresql://apm:apm_secret@localhost:5432/apm_medical

ROOT_DOMAIN=apm-medical.co.id
CERTBOT_EMAIL=admin@apm-medical.co.id

BACKEND_PORT=3001
JWT_SECRET=change_this_to_a_long_random_secret
JWT_REFRESH_SECRET=change_this_to_another_long_random_secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

ADMIN_EMAIL=admin@apm-medical.co.id
ADMIN_PASSWORD=Adminm3dic4

BACKEND_URL=http://localhost:3001/api
INTERNAL_API_URL=http://localhost:3001/api

MAX_FILE_SIZE=52428800

DASHBOARD_ORIGIN=https://apm-medical.co.id
LANDING_ORIGIN=https://apm-medical.co.id
ALLOWED_ORIGINS=https://apm-medical.co.id

LANDING_PORT=4321
VITE_API_URL=https://apm-medical.co.id/api
VITE_IMAGE_URL=https://apm-medical.co.id/files
VITE_SITE_URL=https://apm-medical.co.id

DASHBOARD_PORT=3000
NEXT_PUBLIC_API_URL=https://apm-medical.co.id/api
NEXT_PUBLIC_IMAGE_URL=https://apm-medical.co.id/files
NEXTAUTH_SECRET=RfpZ9eXYaAEf9P/BZHVFAb0MLM6wRmADnrUQMcZLUtw=
NEXTAUTH_URL=https://apm-medical.co.id/dashboard/api/auth
```

Untuk lokal, `BACKEND_URL` dan `INTERNAL_API_URL` tetap mengarah ke
`http://localhost:3001/api`. Saat full stack dijalankan via Docker Compose di
VPS, service `dashboard` dan `landing` akan dioverride otomatis ke hostname
internal Docker.

### ⚠️ Langkah wajib khusus dashboard: `.env.local`

Next.js **tidak membaca `.env` di root monorepo** — ia hanya membaca file env
di folder paketnya sendiri (`packages/dashboard/`). Fitur Edge Middleware
(dipakai untuk proteksi login) sama sekali tidak bisa membaca env lewat cara
lain. Karena itu wajib dibuat symlink:

```bash
cd packages/dashboard
ln -s ../../.env .env.local
cd ../..
```

Ini membuat `.env` root "terlihat" oleh Next.js tanpa duplikasi file.
**Jangan hapus `.env.local` ini** — kalau terhapus, dashboard akan selalu
gagal sign-in (loop balik ke halaman `/login`) walau kredensial benar. Lihat
bagian Troubleshooting di bawah kalau ini terjadi.

## 5. Setup Database

Nyalakan PostgreSQL via Docker:

```bash
docker compose up -d postgres
```

Jalankan migrasi lalu buat akun admin awal:

```bash
pnpm --filter backend db:migrate     # buat semua tabel
pnpm --filter backend db:seed        # buat admin dari ADMIN_EMAIL/ADMIN_PASSWORD di .env
```

> Kalau nanti mau **mengganti** email/password admin yang sudah ada (bukan
> yang pertama kali), gunakan `db:sync-admin`, bukan `db:seed` (lihat detail
> di README bagian Development Tips / `CLAUDE.md`):
>
> ```bash
> # edit ADMIN_EMAIL / ADMIN_PASSWORD di .env dulu, lalu:
> pnpm --filter backend db:sync-admin
> ```

## 6. Menjalankan Aplikasi

### Semua sekaligus (disarankan)

```bash
pnpm dev
```

Perintah ini otomatis:

- Mengecek Postgres — kalau sudah hidup & sehat, **tidak** menyalakan ulang
- Menjalankan `backend`, `landing`, `dashboard` secara paralel

| Aplikasi | URL |
|---|---|
| Landing (website publik) | http://localhost:4321 |
| Dashboard (admin CMS) | http://localhost:3000/dashboard |
| Backend API | http://localhost:3001 |

Login dashboard menggunakan `ADMIN_EMAIL` / `ADMIN_PASSWORD` dari `.env`.

### Menjalankan satu per satu

```bash
pnpm dev:backend      # Hono API      → :3001
pnpm dev:landing      # Astro         → :4321
pnpm dev:dashboard    # Next.js       → :3000
```

## 7. Deployment Produksi (Docker / VPS)

### Prasyarat DNS

Sebelum menjalankan Compose pertama kali, arahkan domain utama ke IP VPS:

- `apm-medical.co.id` -> IP VPS
- opsional `www.apm-medical.co.id` -> redirect di level DNS/proxy jika diperlukan

Stack produksi sekarang memakai **satu domain**:

- `https://apm-medical.co.id/` -> landing
- `https://apm-medical.co.id/dashboard` -> dashboard
- `https://apm-medical.co.id/api` -> backend API
- `https://apm-medical.co.id/files` -> backend file serving

```bash
# di server VPS
git clone <url-repo-anda> landing-medika
cd landing-medika
cp .env.example .env
nano .env   # isi semua secret & domain produksi (ROOT_DOMAIN, CERTBOT_EMAIL,
            # JWT_SECRET, NEXTAUTH_SECRET, ADMIN_PASSWORD, NEXTAUTH_URL, dll)
            # WAJIB: un-comment baris `COMPOSE_PROFILES=ssl` di .env supaya
            # certbot_init/certbot_renew ikut jalan (lihat catatan di bawah)

docker compose up -d --build
```

Semua service (`postgres`, `backend`, `dashboard`, `landing`, `nginx`,
`certbot_init`, `certbot_renew`) berjalan lewat satu `docker-compose.yml`.
Migrasi database + bootstrap admin berjalan **otomatis** saat container backend
pertama kali start (lihat `packages/backend/entrypoint.sh`).

> ⚠️ `certbot_init` dan `certbot_renew` hanya ikut ter-start kalau
> `COMPOSE_PROFILES=ssl` di-set di `.env` (lihat `.env.example`). Ini sengaja
> dibuat opt-in: kalau stack ini dijalankan di mesin lain (mis. laptop lokal)
> yang bukan target dari DNS `ROOT_DOMAIN`, Let's Encrypt akan selalu gagal
> validasi (404 di ACME challenge) dan lama-lama kena rate-limit domain. Untuk
> testing lokal dengan `docker compose up -d`, biarkan baris ini tetap
> di-comment — `nginx` tetap jalan normal dengan sertifikat self-signed.

Hanya `nginx` yang membuka port publik `80/443`. Service lain tetap berada di
jaringan internal Docker.

Saat first boot, `nginx` membuat sertifikat self-signed sementara agar bisa
start, lalu `certbot_init` mencoba mengambil sertifikat Let's Encrypt yang
sebenarnya dan me-reload `nginx` sesudah berhasil. Jika DNS belum mengarah ke
VPS atau port `80/443` masih diblok firewall, sertifikat publik tidak akan
terbit.

Cek status:

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f nginx
docker compose logs -f certbot_init
```

## 8. Backup & Restore

```bash
# Backup database + folder uploads ke backups/<timestamp>/
pnpm run backup

# Restore dari salah satu folder backup
pnpm run restore backups/2026-07-04_101355
```

Script ini otomatis mendeteksi apakah stack berjalan penuh via Docker atau
campuran (Postgres di Docker, backend di host) — cocok dipakai baik di lokal
maupun VPS. Untuk backup otomatis terjadwal di VPS, tambahkan ke crontab:

```cron
0 2 * * * cd /path/to/landing-medika && ./scripts/backup.sh >> backups/backup.log 2>&1
```

## 9. Troubleshooting

### Dashboard tidak bisa sign-in / selalu balik ke `/dashboard/login`

Cek log dashboard saat startup — kalau muncul warning berikut:

```
[next-auth][warn][NEXTAUTH_URL]
[next-auth][warn][NO_SECRET]
```

Artinya `packages/dashboard/.env.local` **tidak ada / terhapus**. Buat ulang:

```bash
cd packages/dashboard
ln -s ../../.env .env.local
cd ../..
```

Lalu restart dashboard (`pnpm dev:dashboard` atau restart `pnpm dev`).

### `EADDRINUSE: address already in use`

Ada proses dev server lama yang masih menahan port. Cari & matikan:

```bash
lsof -nP -iTCP:3000 -iTCP:3001 -iTCP:4321 -sTCP:LISTEN
kill <PID>
```

### Postgres container "Recreate" terus setiap `docker compose up`

Pastikan `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` di `.env` **sama
persis** dengan yang tercantum di `DATABASE_URL`. Kalau berbeda, Docker
Compose menganggap konfigurasi berubah dan akan me-recreate container setiap
kali dijalankan (data tetap aman di volume, tapi start jadi lebih lambat).

### Upload gambar/video hilang setelah `git pull` atau pindah komputer

Folder `packages/backend/uploads/` sengaja di-`.gitignore` (bukan bagian dari
repo). Gunakan `pnpm run restore <backup-dir>` untuk mengembalikan data upload
dari backup.

### Sertifikat HTTPS belum terbit / browser masih lihat self-signed cert

Pastikan:

- `COMPOSE_PROFILES=ssl` sudah di-set di `.env` (kalau tidak, `certbot_init`
  dan `certbot_renew` tidak ikut jalan sama sekali — ini normal untuk lokal)
- `ROOT_DOMAIN` di `.env` benar
- domain sudah resolve ke IP VPS ini (bukan mesin lain)
- port `80` dan `443` terbuka dari internet ke VPS ini

Lalu cek:

```bash
docker compose logs -f certbot_init
docker compose logs -f nginx
```

### `certbot_init` / `certbot_renew` statusnya "Exited" (merah) di Docker

Container ini di-desain untuk **hanya berjalan di VPS produksi** yang benar
sudah menjadi tujuan DNS `ROOT_DOMAIN`. Kalau kamu menjalankan
`docker compose up -d` di mesin lain (laptop lokal, dsb) sementara
`ROOT_DOMAIN` mengarah ke IP VPS yang lain, Let's Encrypt akan selalu gagal
validasi ACME challenge (404) — dan setelah beberapa kali gagal, domain kena
rate-limit ("too many failed authorizations") selama ~1 jam.

Sejak `docker-compose.yml` memakai `profiles: ["ssl"]` untuk kedua service
ini, `docker compose up -d` biasa **tidak lagi menjalankannya** kecuali
`COMPOSE_PROFILES=ssl` di-set di `.env`. Kalau container lama masih tersisa
dalam status Exited, bersihkan dengan:

```bash
docker compose rm -f certbot_init certbot_renew
```

### Error koneksi database / SSL certificate

Pastikan `DATABASE_URL` mengarah ke host & port yang benar, dan Postgres
sudah `healthy`:

```bash
docker compose ps postgres
```
