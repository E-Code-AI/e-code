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
  
  # Save node/npm paths BEFORE cleanup
  NODE_BIN_PATH=$(which node 2>/dev/null || echo "")
  NPM_BIN_PATH=$(which npm 2>/dev/null || echo "")
  NODE_BIN_DIR=""
  if [ -n "$NODE_BIN_PATH" ]; then
    NODE_BIN_DIR=$(dirname "$NODE_BIN_PATH")
  fi
  echo "📍 node at: $NODE_BIN_PATH"
  echo "📍 npm at: $NPM_BIN_PATH"
  echo "📍 node dir: $NODE_BIN_DIR"
  
  echo "🧹 Running production cleanup..."
  chmod +x scripts/cleanup-for-deploy.sh
  REPLIT_DEPLOYMENT=1 NODE_ENV=production bash scripts/cleanup-for-deploy.sh
  
  # CRITICAL: Create a startup wrapper that works without npm in PATH
  # The .replit run command is: sh -c "npm run start"
  # If npm isn't in PATH, we need a fallback
  if [ -n "$NODE_BIN_PATH" ]; then
    # Create a self-contained start script with hardcoded node path
    cat > ./start.sh << STARTEOF
#!/bin/sh
export NODE_ENV=production
export PATH="$NODE_BIN_DIR:\$PATH"
exec $NODE_BIN_PATH dist/index.js
STARTEOF
    chmod +x ./start.sh
    echo "📝 Created start.sh with node at $NODE_BIN_PATH"
  fi
  
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
