#!/usr/bin/env bash
# Makes sure the Postgres container is up before dev servers start.
# If it's already running & healthy, this is a no-op — no restart, no noise.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

CONTAINER="${PG_CONTAINER:-apm_postgres}"

if ! command -v docker >/dev/null 2>&1; then
  echo "⚠️  docker not found — assuming Postgres is managed elsewhere, skipping." >&2
  exit 0
fi

is_running() {
  docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$CONTAINER"
}

is_healthy() {
  local status
  status="$(docker inspect --format '{{.State.Health.Status}}' "$CONTAINER" 2>/dev/null || echo "missing")"
  [ "$status" = "healthy" ]
}

if is_running && is_healthy; then
  echo "✅ Postgres ($CONTAINER) already running and healthy — skipping."
  exit 0
fi

if is_running; then
  echo "⏳ Postgres ($CONTAINER) is running but not healthy yet, waiting..."
else
  echo "🐘 Postgres not running — starting via docker compose..."
  docker compose up -d postgres
fi

echo -n "⏳ Waiting for Postgres to become healthy"
for _ in $(seq 1 30); do
  if is_healthy; then
    echo ""
    echo "✅ Postgres is healthy."
    exit 0
  fi
  printf "."
  sleep 1
done

echo ""
echo "❌ Postgres did not become healthy in time." >&2
exit 1
