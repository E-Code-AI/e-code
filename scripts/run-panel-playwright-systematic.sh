#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-5064}"
HOST="${HOST:-127.0.0.1}"
BASE_URL="${BASE_URL:-http://${HOST}:${PORT}}"
LOG="${LOG:-/tmp/ecode-panel-playwright-${PORT}.log}"
SEED_FILE="${PANEL_TEST_SEED_FILE:-.tmp/playwright-panel-seed.json}"
DB_URL="${DATABASE_URL:-$(grep -E '^DATABASE_URL=' .env.local 2>/dev/null | tail -n1 | cut -d= -f2-)}"

rm -f "$LOG" "$SEED_FILE" /tmp/ecode-panel-readiness-${PORT}.json

NODE_ENV=development \
PORT="$PORT" \
HOST="$HOST" \
DATABASE_URL="$DB_URL" \
REDIS_URL= \
SESSION_SECRET="${SESSION_SECRET:-local-session-secret-at-least-32-chars}" \
JWT_SECRET="${JWT_SECRET:-local-jwt-secret-at-least-32-chars-123}" \
ENCRYPTION_KEY="${ENCRYPTION_KEY:-local-encryption-key-32-chars-123}" \
PLAYWRIGHT_PANEL_E2E=true \
SENTRY_DSN= \
VITE_SENTRY_DSN= \
npm run dev >"$LOG" 2>&1 &
PID=$!

cleanup() {
  kill "$PID" 2>/dev/null || true
  wait "$PID" 2>/dev/null || true
}
trap cleanup EXIT

READY=0
for _ in $(seq 1 120); do
  code="$(curl -sS -o "/tmp/ecode-panel-readiness-${PORT}.json" -w '%{http_code}' "${BASE_URL}/health/readiness" 2>/dev/null || true)"
  if [ "$code" = "200" ] && grep -Eq '"(status|ready|checks)"' "/tmp/ecode-panel-readiness-${PORT}.json" 2>/dev/null; then
    READY=1
    break
  fi
  if ! kill -0 "$PID" 2>/dev/null; then
    echo "server exited before readiness"
    tail -n 180 "$LOG"
    exit 1
  fi
  sleep 1
done

if [ "$READY" != "1" ]; then
  echo "server did not reach readiness 200"
  cat "/tmp/ecode-panel-readiness-${PORT}.json" 2>/dev/null || true
  tail -n 180 "$LOG"
  exit 1
fi

BASE_URL="$BASE_URL" PANEL_TEST_SEED_FILE="$SEED_FILE" node scripts/playwright-seed-panels.mjs > /tmp/ecode-panel-seed-${PORT}.json
PANEL_TEST_SEED="$(cat "$SEED_FILE")" BASE_URL="$BASE_URL" npx playwright test --config=playwright.panels.config.ts "$@"
