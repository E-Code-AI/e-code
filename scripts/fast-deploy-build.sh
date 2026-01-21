#!/bin/bash
# Fast deployment build - optimized for quick deployments
# Uses npm install with cache instead of npm ci

set -e

echo "🚀 Fast deployment build starting..."
export NODE_ENV=production
export REPLIT_DEPLOYMENT=1

# Use npm install (faster with cache) instead of npm ci
echo "📦 Installing production dependencies..."
npm install --omit=dev --prefer-offline --no-audit --no-fund 2>/dev/null || npm ci --omit=dev

# Check if dist exists and is recent (within last hour)
if [ -f "dist/index.js" ] && [ -f "dist/public/index.html" ]; then
  DIST_AGE=$(( $(date +%s) - $(stat -c %Y dist/index.js 2>/dev/null || echo 0) ))
  if [ "$DIST_AGE" -lt 3600 ]; then
    echo "✅ Recent build found (${DIST_AGE}s old), skipping rebuild"
  else
    echo "🔄 Build is stale, rebuilding..."
    bash scripts/smart-build.sh
  fi
else
  echo "📦 No build found, running full build..."
  bash scripts/smart-build.sh
fi

echo "✅ Fast deployment build complete!"
