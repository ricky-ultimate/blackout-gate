#!/bin/bash

docker compose up postgres -d
cd api

export DATABASE_URL="postgresql://postgres:BRNXMNXTTX@localhost:5432/blackout_gate"
export ADMIN_SECRET="a39b6f72dbe439c6aa77bde8df2f8f5fc2369184245ea4098fd16c2b02ccb704"
export API_URL="http://localhost:3000"

npx tsx src/db/migrate.ts

npm run dev &
DEV_PID=$!
trap "kill $DEV_PID" EXIT

echo "Waiting for dev server..."
until curl -s http://localhost:3000/health > /dev/null; do
  sleep 1
done

npm run seed

API_KEY="68946005a5aa0b35710b1b3de0a1eddc7b1d1806b9edc8e290814ef41e795d6b"

curl -X GET http://localhost:3000/v1/audit \
  -H "Authorization: Bearer $API_KEY"

curl -X POST http://localhost:3000/v1/evaluate \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"repo":"acme-corp/backend","environment":"production","branch":"main","triggered_by":"riches","outcome":"blocked","window_id":"q1-freeze","window_name":"Q1 Quarter-End Change Freeze","reason":"SOX-mandated change freeze."}'

curl http://localhost:3000/v1/audit \
  -H "Authorization: Bearer $API_KEY"
