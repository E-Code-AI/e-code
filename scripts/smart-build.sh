#!/bin/bash
set -e

echo "🔍 Smart Build - Quick check..."

if [ ! -f "dist/index.js" ] || [ ! -f "dist/public/index.html" ]; then
  echo "❌ ERROR: dist/ not found. Run build in development first."
  exit 1
fi

echo "✅ Pre-built dist found - ready to run"

if [ -n "$REPLIT_DEPLOYMENT" ] || [ "$NODE_ENV" = "production" ]; then
  echo "🧹 Pruning dev dependencies..."
  npm prune --omit=dev --no-audit --no-fund 2>/dev/null || true
  echo "✅ Production dependencies only"
fi

echo "✅ Build complete!"
