#!/bin/bash
# Production-only cleanup script - DO NOT run in development!
# This removes packages that are already bundled in dist/ or only needed for dev
# Run this ONLY during deployment build, not during npm run dev

set -e

# Safety check - don't run in development
if [ "$NODE_ENV" != "production" ] && [ "$REPLIT_DEPLOYMENT" != "1" ]; then
  echo "⚠️  Skipping cleanup - not in production/deployment mode"
  echo "   Set NODE_ENV=production or REPLIT_DEPLOYMENT=1 to enable"
  exit 0
fi

echo "🧹 Production cleanup starting..."

# Remove dev-only packages (testing, linting, build tools)
echo "📦 Removing dev-only packages..."
rm -rf node_modules/playwright node_modules/playwright-core node_modules/@playwright 2>/dev/null || true
rm -rf node_modules/typescript node_modules/tsx node_modules/esbuild 2>/dev/null || true
rm -rf node_modules/eslint node_modules/@typescript-eslint 2>/dev/null || true
rm -rf node_modules/jest node_modules/vitest node_modules/@jest node_modules/@testing-library 2>/dev/null || true
rm -rf node_modules/drizzle-kit node_modules/rollup node_modules/@rollup node_modules/vite 2>/dev/null || true
rm -rf node_modules/@types node_modules/@babel 2>/dev/null || true
rm -rf .cache/ms-playwright 2>/dev/null || true

# Remove frontend packages (already bundled in dist/)
echo "🎨 Removing bundled frontend packages..."
rm -rf node_modules/react node_modules/react-dom node_modules/@radix-ui 2>/dev/null || true
rm -rf node_modules/monaco-editor node_modules/@monaco-editor 2>/dev/null || true
rm -rf node_modules/@codemirror node_modules/@lezer 2>/dev/null || true
rm -rf node_modules/@tanstack node_modules/framer-motion node_modules/recharts 2>/dev/null || true
rm -rf node_modules/ag-grid-community node_modules/ag-grid-react 2>/dev/null || true
rm -rf node_modules/@dnd-kit node_modules/@uppy 2>/dev/null || true
rm -rf node_modules/tailwindcss node_modules/@tailwindcss node_modules/autoprefixer node_modules/postcss 2>/dev/null || true
rm -rf node_modules/lucide-react node_modules/cmdk node_modules/sonner node_modules/vaul 2>/dev/null || true

# Clean caches
rm -rf node_modules/.cache .npm 2>/dev/null || true
rm -f attached_assets/Pasted-*.txt attached_assets/Capture* 2>/dev/null || true

echo "✅ Production cleanup complete!"
du -sh node_modules 2>/dev/null || true
