#!/bin/sh
set -e

echo "=== E-Code Production Entrypoint ==="

# Validate critical environment variables before proceeding
echo "Validating environment variables..."
MISSING=""
[ -z "$DATABASE_URL" ] && MISSING="$MISSING DATABASE_URL"
[ -z "$SESSION_SECRET" ] && MISSING="$MISSING SESSION_SECRET"
[ -z "$JWT_SECRET" ] && MISSING="$MISSING JWT_SECRET"
[ -z "$ENCRYPTION_KEY" ] && MISSING="$MISSING ENCRYPTION_KEY"

WARN=""
[ -z "$SENTRY_DSN" ] && WARN="$WARN SENTRY_DSN"
[ -z "$REDIS_URL" ] && WARN="$WARN REDIS_URL"
[ -z "$RUNNER_JWT_SECRET" ] && WARN="$WARN RUNNER_JWT_SECRET"

if [ -n "$MISSING" ]; then
  echo "FATAL: Missing required environment variables:$MISSING"
  echo "Set these variables before starting the application."
  echo "See .env.production.example for the full list."
  exit 1
fi

if [ -n "$WARN" ]; then
  echo "WARNING: Recommended variables not set:$WARN"
  echo "Some features may be disabled."
fi

echo "Environment variables validated."

if [ "${APP_URL#https://}" = "$APP_URL" ]; then
  echo "FATAL: APP_URL must be an https:// URL in production"
  exit 1
fi

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
DB_HOST="${PGHOST:-$(echo "$DATABASE_URL" | sed -n 's#.*@\([^:/?]*\).*#\1#p')}"
DB_PORT="${PGPORT:-$(echo "$DATABASE_URL" | sed -n 's#.*:\([0-9][0-9]*\)/.*#\1#p')}"
DB_USER="${PGUSER:-$(echo "$DATABASE_URL" | sed -n 's#.*//\([^:/?]*\):.*#\1#p')}"
DB_NAME="${PGDATABASE:-$(echo "$DATABASE_URL" | sed -n 's#.*/\([^?]*\).*#\1#p')}"

until pg_isready -h "${DB_HOST:-postgres}" -p "${DB_PORT:-5432}" -U "${DB_USER:-ecode}" -d "${DB_NAME:-ecode}" -q; do
  echo "PostgreSQL is unavailable - sleeping 2s..."
  sleep 2
done
echo "PostgreSQL is ready!"

# Run database migrations
echo "Running database migrations..."
if ! npm run db:migrate; then
  if [ "${ALLOW_SCHEMA_PUSH_IN_PRODUCTION}" = "true" ]; then
    echo "WARNING: db:migrate failed, falling back to db:push because ALLOW_SCHEMA_PUSH_IN_PRODUCTION=true"
    npm run db:push
  else
    echo "ERROR: Database migration failed. Refusing to run db:push automatically in production."
    echo "Set ALLOW_SCHEMA_PUSH_IN_PRODUCTION=true only for emergency recovery."
    exit 1
  fi
fi
echo "Migrations complete!"

# Start the application
echo "Starting E-Code application..."
exec node dist/index.js
