#!/bin/bash
set -e

echo "🔍 Smart Build - Quick check..."

if [ ! -f "dist/index.js" ] || [ ! -f "dist/public/index.html" ]; then
  echo "❌ ERROR: dist/ not found. Run build in development first."
  exit 1
fi

echo "✅ Pre-built dist found - ready to run"

echo "🧹 Pruning dev dependencies for production..."
npm prune --omit=dev --no-audit --no-fund 2>/dev/null || true

echo "🗑️ Removing large bundled/frontend-only packages..."
REMOVE_PACKAGES=(
  "monaco-editor"
  "react-icons"
  "lucide-react"
  "y-monaco"
  "typescript"
  "ag-grid-community"
  "drizzle-kit"
  "tailwindcss"
  "react-syntax-highlighter"
  "node-sql-parser"
  "esbuild"
  "postcss"
  "autoprefixer"
  "prettier"
  "vite"
  "react-dom"
  "react"
  "framer-motion"
  "recharts"
  "date-fns"
  "zod-to-json-schema"
  "rehype-highlight"
  "highlight.js"
  "swagger-ui-dist"
  "@radix-ui"
  "@tanstack"
  "@hookform"
  "@uppy"
  "@firebase"
  "@prisma"
  "@mistralai"
  "@kubernetes"
  "@opentelemetry"
  "@sentry"
  "@sentry-internal"
  "@esbuild-kit"
  "@esbuild"
  "@types"
  "@babel"
  "@vitejs"
  "@swc"
)

for pkg in "${REMOVE_PACKAGES[@]}"; do
  if [ -d "node_modules/$pkg" ]; then
    rm -rf "node_modules/$pkg"
    echo "  Removed: $pkg"
  fi
done

echo "✅ Production node_modules cleaned"
echo "📦 Final sizes:"
du -sh dist/ 2>/dev/null || true
du -sh node_modules/ 2>/dev/null || true
echo "✅ Build complete!"
