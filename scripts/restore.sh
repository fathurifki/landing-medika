#!/usr/bin/env bash
# Restores a database dump + uploads archive produced by scripts/backup.sh.
#
# Usage:
#   ./scripts/restore.sh backups/2026-07-04_100000
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

BACKUP_DIR="${1:-}"
if [ -z "$BACKUP_DIR" ] || [ ! -d "$BACKUP_DIR" ]; then
  echo "Usage: $0 <backup-dir>  (e.g. backups/2026-07-04_100000)" >&2
  exit 1
fi

if [ ! -f .env ]; then
  echo "❌ .env not found at repo root" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

rest="${DATABASE_URL#postgresql://}"
creds="${rest%%@*}"
DB_USER="${creds%%:*}"
hostpart="${rest#*@}"
DB_NAME="${hostpart#*/}"
DB_NAME="${DB_NAME%%\?*}"

PG_CONTAINER="${PG_CONTAINER:-apm_postgres}"
BACKEND_CONTAINER="${BACKEND_CONTAINER:-apm_backend}"

read -r -p "⚠️  This will overwrite the '$DB_NAME' database. Continue? [y/N] " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  echo "Aborted."
  exit 1
fi

if [ -f "$BACKUP_DIR/db.sql.gz" ]; then
  echo "♻️  Restoring database..."
  gunzip -c "$BACKUP_DIR/db.sql.gz" | docker exec -i "$PG_CONTAINER" psql -U "$DB_USER" "$DB_NAME"
  echo "✅ Database restored."
else
  echo "⚠️  No db.sql.gz found in $BACKUP_DIR, skipping DB restore." >&2
fi

if [ -f "$BACKUP_DIR/uploads.tar.gz" ]; then
  echo "♻️  Restoring uploads..."
  if docker ps --format '{{.Names}}' | grep -qx "$BACKEND_CONTAINER"; then
    docker exec -i "$BACKEND_CONTAINER" tar xzf - -C /app < "$BACKUP_DIR/uploads.tar.gz"
  else
    mkdir -p "$REPO_ROOT/packages/backend/uploads"
    tar xzf "$BACKUP_DIR/uploads.tar.gz" -C "$REPO_ROOT/packages/backend"
  fi
  echo "✅ Uploads restored."
else
  echo "⚠️  No uploads.tar.gz found in $BACKUP_DIR, skipping." >&2
fi

echo "✅ Restore complete."
