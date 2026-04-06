#!/bin/bash

set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set" >&2
  exit 1
fi

if [ -z "${ADMIN_SECRET:-}" ]; then
  echo "ADMIN_SECRET is not set" >&2
  exit 1
fi

docker compose up postgres -d

cd api

export API_URL="${API_URL:-http://localhost:3000}"

npx tsx src/db/migrate.ts

npm run dev &
DEV_PID=$!
trap "kill $DEV_PID" EXIT

echo "Waiting for dev server..."
until curl -s http://localhost:3000/health > /dev/null; do
  sleep 1
done

npm run seed
