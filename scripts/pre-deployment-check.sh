#!/bin/sh
set -eu

echo "🔍 E-Code pre-deployment validation"
echo "=================================="

echo ""
echo "📦 Toolchain"
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"

echo ""
echo "📂 Required files"
for file in package.json Dockerfile docker-entrypoint.sh server/index.ts scripts/build-server.mjs .env.production.example; do
  if [ -f "$file" ]; then
    echo "✅ $file"
  else
    echo "❌ Missing: $file"
    exit 1
  fi
done

echo ""
echo "🔐 Required production env"
missing=0
for var in DATABASE_URL SESSION_SECRET JWT_SECRET ENCRYPTION_KEY APP_URL ALLOWED_ORIGINS; do
  if [ -n "$(printenv "$var" 2>/dev/null || true)" ]; then
    echo "✅ $var"
  else
    echo "❌ $var is not set"
    missing=1
  fi
done

if [ "$missing" -ne 0 ]; then
  echo ""
  echo "FATAL: Missing required production environment variables"
  exit 1
fi

echo ""
echo "🏗️ Build"
npm run build

echo ""
echo "🗄️ Migration configuration"
if [ -d "migrations" ]; then
  find migrations -maxdepth 1 -name '*.sql' | sort | tail -5
else
  echo "❌ migrations/ directory is missing"
  exit 1
fi

echo ""
echo "✅ Pre-deployment validation completed"
