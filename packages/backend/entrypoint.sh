#!/bin/sh
set -e

echo "⏳ Running database migrations..."
node packages/backend/dist/db/migrate.js

echo "🌱 Ensuring initial admin user exists..."
node packages/backend/dist/db/seed.js

echo "🚀 Starting backend server..."
exec node packages/backend/dist/index.js
