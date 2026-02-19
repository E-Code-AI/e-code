#!/bin/bash
# Production-only cleanup script - DO NOT run in development!
# Aggressively removes packages and files not needed at runtime
# Run this ONLY during deployment build, not during npm run dev

set -e

# Safety check
if [ "$NODE_ENV" != "production" ] && [ "$REPLIT_DEPLOYMENT" != "1" ]; then
  echo "⚠️  Skipping cleanup - not in production/deployment mode"
  exit 0
fi

echo "🧹 Production cleanup starting..."
echo "Before cleanup:"
du -sh . --exclude=.git 2>/dev/null || true
du -sh node_modules 2>/dev/null || true

# ===== 1. Remove dev-only node_modules (biggest impact) =====
echo "📦 Phase 1: Removing dev-only packages..."
rm -rf node_modules/playwright node_modules/playwright-core node_modules/@playwright 2>/dev/null || true
rm -rf node_modules/typescript node_modules/tsx node_modules/esbuild 2>/dev/null || true
rm -rf node_modules/eslint node_modules/@typescript-eslint 2>/dev/null || true
rm -rf node_modules/jest node_modules/vitest node_modules/@jest node_modules/@testing-library 2>/dev/null || true
rm -rf node_modules/drizzle-kit node_modules/rollup node_modules/@rollup node_modules/vite node_modules/@vitejs 2>/dev/null || true
rm -rf node_modules/@types node_modules/@babel 2>/dev/null || true
rm -rf node_modules/prettier node_modules/nodemon node_modules/ts-node 2>/dev/null || true
rm -rf node_modules/@replit/vite-plugin-shadcn-theme-json 2>/dev/null || true

# ===== 2. Remove frontend packages (bundled in dist/public/) =====
echo "🎨 Phase 2: Removing bundled frontend packages..."
rm -rf node_modules/react node_modules/react-dom node_modules/@radix-ui 2>/dev/null || true
rm -rf node_modules/monaco-editor node_modules/@monaco-editor 2>/dev/null || true
rm -rf node_modules/@codemirror node_modules/@lezer 2>/dev/null || true
rm -rf node_modules/@tanstack node_modules/framer-motion node_modules/recharts 2>/dev/null || true
rm -rf node_modules/ag-grid-community node_modules/ag-grid-react 2>/dev/null || true
rm -rf node_modules/@dnd-kit node_modules/@uppy 2>/dev/null || true
rm -rf node_modules/tailwindcss node_modules/@tailwindcss node_modules/autoprefixer node_modules/postcss 2>/dev/null || true
rm -rf node_modules/lucide-react node_modules/cmdk node_modules/sonner node_modules/vaul 2>/dev/null || true
rm -rf node_modules/react-icons 2>/dev/null || true
rm -rf node_modules/react-hook-form node_modules/@hookform 2>/dev/null || true
rm -rf node_modules/wouter node_modules/class-variance-authority node_modules/clsx 2>/dev/null || true

# ===== 3. Remove large packages not needed at runtime =====
echo "🗑️  Phase 3: Removing large unnecessary packages..."
rm -rf node_modules/@kubernetes 2>/dev/null || true
rm -rf node_modules/@sentry node_modules/@sentry-internal 2>/dev/null || true
rm -rf node_modules/@opentelemetry 2>/dev/null || true

# ===== 4. Clean caches and temp directories =====
echo "🧹 Phase 4: Cleaning caches and temp files..."
rm -rf node_modules/.cache .npm .cache 2>/dev/null || true
rm -rf test-results playwright-report 2>/dev/null || true
rm -rf .cache/ms-playwright 2>/dev/null || true

# ===== 5. Remove non-essential project directories =====
echo "📂 Phase 5: Removing non-essential directories..."
rm -rf desktop mobile 2>/dev/null || true
rm -rf docs introspected 2>/dev/null || true
rm -rf tests 2>/dev/null || true
rm -rf memory-bank 2>/dev/null || true

# ===== 6. Remove source files (bundled in dist/) =====
echo "📝 Phase 6: Removing source files..."
rm -rf client/src 2>/dev/null || true

# ===== 7. Remove build config not needed at runtime =====
rm -f vite.config.ts tsconfig.json tailwind.config.ts postcss.config.js 2>/dev/null || true
rm -f drizzle.config.ts components.json theme.json 2>/dev/null || true

# ===== 8. Clean up screenshot/paste attachments =====
rm -f attached_assets/Pasted-*.txt attached_assets/Capture* 2>/dev/null || true
rm -f attached_assets/IMG_*.png attached_assets/screenshot* 2>/dev/null || true
rm -f *.png *.jpg 2>/dev/null || true
rm -f build.log deployment.log 2>/dev/null || true

# ===== 9. Ensure node/npm are in PATH at runtime =====
echo "🔗 Phase 9: Ensuring runtime binaries are accessible..."
NODE_BIN=$(which node 2>/dev/null)
NPM_BIN=$(which npm 2>/dev/null)
NODE_DIR=""
if [ -n "$NODE_BIN" ]; then
  NODE_DIR=$(dirname "$NODE_BIN")
  echo "  node at: $NODE_BIN"
  echo "  npm at: $NPM_BIN"
  
  # Try /usr/local/bin first
  mkdir -p /usr/local/bin 2>/dev/null || true
  ln -sf "$NODE_BIN" /usr/local/bin/node 2>/dev/null || true
  ln -sf "$NPM_BIN" /usr/local/bin/npm 2>/dev/null || true
  
  # Also try ~/.local/bin as fallback
  mkdir -p "$HOME/.local/bin" 2>/dev/null || true
  ln -sf "$NODE_BIN" "$HOME/.local/bin/node" 2>/dev/null || true
  ln -sf "$NPM_BIN" "$HOME/.local/bin/npm" 2>/dev/null || true
  
  # Also try /home/runner/.local/bin explicitly  
  mkdir -p /home/runner/.local/bin 2>/dev/null || true
  ln -sf "$NODE_BIN" /home/runner/.local/bin/node 2>/dev/null || true
  ln -sf "$NPM_BIN" /home/runner/.local/bin/npm 2>/dev/null || true
  
  # Create a PATH setup script for runtime
  cat > /home/runner/workspace/.env.deploy 2>/dev/null << ENVEOF || true
export PATH="$NODE_DIR:/home/runner/.local/bin:\$PATH"
ENVEOF
  
  echo "  Symlinks and .env.deploy created"
fi

echo ""
echo "✅ Production cleanup complete!"
echo "After cleanup:"
du -sh node_modules 2>/dev/null || true
du -sh . --exclude=.git 2>/dev/null || true
