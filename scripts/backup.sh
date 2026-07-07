#!/usr/bin/env bash
# Backs up the Postgres database + uploaded media into backups/<timestamp>/.
#
# Usage:
#   ./scripts/backup.sh
#
# Works both in local dev (postgres in Docker, backend on host) and on a VPS
# running the full docker-compose stack (all services containerized) — it
# auto-detects where the uploads actually live.
#
# Later, schedule this on the VPS with cron, e.g.:
#   0 2 * * * cd /path/to/app && ./scripts/backup.sh >> backups/backup.log 2>&1
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [ ! -f .env ]; then
  echo "❌ .env not found at repo root" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ DATABASE_URL not set in .env" >&2
  exit 1
fi

# Parse postgresql://user:pass@host:port/dbname out of DATABASE_URL without
# extra dependencies (works in plain bash/sh on any VPS).
rest="${DATABASE_URL#postgresql://}"
creds="${rest%%@*}"
DB_USER="${creds%%:*}"
hostpart="${rest#*@}"
DB_NAME="${hostpart#*/}"
DB_NAME="${DB_NAME%%\?*}"

PG_CONTAINER="${PG_CONTAINER:-apm_postgres}"
BACKEND_CONTAINER="${BACKEND_CONTAINER:-apm_backend}"

if ! docker ps --format '{{.Names}}' | grep -qx "$PG_CONTAINER"; then
  echo "❌ Postgres container '$PG_CONTAINER' is not running" >&2
  exit 1
fi

STAMP="$(date +%Y-%m-%d_%H%M%S)"
OUT_DIR="$REPO_ROOT/backups/$STAMP"
mkdir -p "$OUT_DIR"

echo "📦 Backing up database ($DB_NAME) from container $PG_CONTAINER..."
# --clean --if-exists makes the dump safe to restore on top of an existing DB.
docker exec "$PG_CONTAINER" pg_dump -U "$DB_USER" --clean --if-exists "$DB_NAME" \
  | gzip > "$OUT_DIR/db.sql.gz"
echo "   -> $OUT_DIR/db.sql.gz ($(du -h "$OUT_DIR/db.sql.gz" | cut -f1))"

echo "📦 Backing up uploads..."
if docker ps --format '{{.Names}}' | grep -qx "$BACKEND_CONTAINER"; then
  # Full docker-compose stack: uploads live in the backend container's volume.
  docker exec "$BACKEND_CONTAINER" tar czf - -C /app uploads > "$OUT_DIR/uploads.tar.gz"
elif [ -d "$REPO_ROOT/packages/backend/uploads" ]; then
  # Local/mixed dev mode: backend runs on host, uploads are a plain folder.
  tar czf "$OUT_DIR/uploads.tar.gz" -C "$REPO_ROOT/packages/backend" uploads
else
  echo "   ⚠️  No uploads source found, skipping." >&2
fi
[ -f "$OUT_DIR/uploads.tar.gz" ] && echo "   -> $OUT_DIR/uploads.tar.gz ($(du -h "$OUT_DIR/uploads.tar.gz" | cut -f1))"

echo "✅ Backup complete: $OUT_DIR"
