#!/bin/bash
set -e

echo "🔍 Smart Build - Checking environment..."

IS_DEPLOY=0
if [ -n "$REPLIT_DEPLOYMENT" ] || [ "$NODE_ENV" = "production" ]; then
  IS_DEPLOY=1
  export REPLIT_DEPLOYMENT=1
  export NODE_ENV=production
  echo "📦 DEPLOYMENT BUILD detected"
fi

HAS_DIST=0
if [ -f "dist/index.js" ] && [ -f "dist/public/index.html" ]; then
  DIST_SIZE=$(stat -c %s dist/index.js 2>/dev/null || echo 0)
  if [ "$DIST_SIZE" -gt 1000000 ]; then
    HAS_DIST=1
    echo "✅ Pre-built dist found ($(($DIST_SIZE / 1048576))MB bundle)"
  fi
fi

if [ "$HAS_DIST" = "1" ] && [ "$IS_DEPLOY" = "1" ]; then
  echo "⚡ Fast path: dist exists, running cleanup only"
  echo "🧹 Running production cleanup..."
  chmod +x scripts/cleanup-for-deploy.sh
  REPLIT_DEPLOYMENT=1 NODE_ENV=production bash scripts/cleanup-for-deploy.sh
  echo "✅ Build complete! (fast path)"
  exit 0
fi

if [ "$HAS_DIST" = "0" ]; then
  echo "📦 No pre-built dist found, building from source..."

  if [ "$IS_DEPLOY" = "1" ]; then
    if ! command -v npx &> /dev/null || ! npx vite --version &> /dev/null 2>&1; then
      echo "📦 Installing build dependencies..."
      npm install --no-save vite esbuild @vitejs/plugin-react @replit/vite-plugin-shadcn-theme-json 2>/dev/null || true
    fi
  fi

  echo "📦 Building frontend with Vite..."
  npx vite build

  echo "📦 Building server bundle..."
  node scripts/build-server.mjs

  if [ "$IS_DEPLOY" = "1" ]; then
    echo "🧹 Running cleanup..."
    chmod +x scripts/cleanup-for-deploy.sh
    REPLIT_DEPLOYMENT=1 NODE_ENV=production bash scripts/cleanup-for-deploy.sh
  fi
fi

echo "✅ Build complete!"
