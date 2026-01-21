#!/bin/bash
# Smart build script optimized for <8 GiB deployment images
# Uses pre-built assets when available to speed up deployment

set -e

echo "🔍 Checking build environment..."

# Check if this is a deployment build
if [ -n "$REPLIT_DEPLOYMENT" ] || [ "$NODE_ENV" = "production" ]; then
  echo "📦 DEPLOYMENT BUILD detected"
  export REPLIT_DEPLOYMENT=1
  export NODE_ENV=production
else
  echo "🔧 Development build"
fi

# Check if pre-built assets exist (built within last 24 hours)
SKIP_BUILD=0
if [ -f "dist/index.js" ] && [ -f "dist/public/index.html" ]; then
  DIST_AGE=$(( $(date +%s) - $(stat -c %Y dist/index.js 2>/dev/null || echo 0) ))
  if [ "$DIST_AGE" -lt 86400 ]; then
    echo "✅ Recent build found ($(($DIST_AGE / 3600))h old), using pre-built assets"
    SKIP_BUILD=1
  fi
fi

if [ "$SKIP_BUILD" = "0" ]; then
  # Build frontend if needed
  if [ -d "dist/public" ] && [ -f "dist/public/index.html" ]; then
    echo "✅ Pre-built frontend found, skipping Vite build"
  else
    echo "📦 Building frontend with Vite..."
    npx vite build
  fi

  # Build server bundle if needed
  if [ -f "dist/index.js" ]; then
    echo "✅ Pre-built server bundle found, skipping esbuild"
  else
    echo "📦 Building server bundle..."
    node scripts/build-server.mjs
  fi
fi

# Run cleanup ONLY in deployment mode
if [ "$REPLIT_DEPLOYMENT" = "1" ] || [ "$NODE_ENV" = "production" ]; then
  if [ -f "scripts/cleanup-for-deploy.sh" ]; then
    echo "🧹 Running production cleanup..."
    chmod +x scripts/cleanup-for-deploy.sh
    REPLIT_DEPLOYMENT=1 bash scripts/cleanup-for-deploy.sh
  fi
fi

echo "✅ Build complete!"
