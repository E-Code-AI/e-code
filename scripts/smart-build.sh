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

# Check if pre-built assets exist (skip rebuild if dist exists - saves deployment time)
SKIP_BUILD=0
if [ -f "dist/index.js" ] && [ -f "dist/public/index.html" ]; then
  DIST_SIZE=$(stat -c %s dist/index.js 2>/dev/null || echo 0)
  # Skip if dist/index.js is > 1MB (valid build)
  if [ "$DIST_SIZE" -gt 1000000 ]; then
    echo "✅ Valid pre-built assets found ($(($DIST_SIZE / 1048576))MB), skipping rebuild for fast deployment"
    SKIP_BUILD=1
  fi
fi

if [ "$SKIP_BUILD" = "0" ]; then
  # In deployment mode, install build tools if missing
  if [ "$REPLIT_DEPLOYMENT" = "1" ] || [ "$NODE_ENV" = "production" ]; then
    if ! command -v npx &> /dev/null || ! npx vite --version &> /dev/null 2>&1; then
      echo "📦 Installing build dependencies..."
      npm install --no-save vite esbuild @vitejs/plugin-react @replit/vite-plugin-shadcn-theme-json 2>/dev/null || true
    fi
  fi

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
