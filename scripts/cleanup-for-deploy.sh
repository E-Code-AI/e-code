#!/bin/bash
# Aggressive cleanup script to reduce deployment image size to <8 GiB
# Run this AFTER build completes

set -e

echo "🧹 Aggressive cleanup for deployment..."

# ═══════════════════════════════════════════════════════════════
# STEP 1: Remove dev-only packages (already in devDependencies but installed)
# ═══════════════════════════════════════════════════════════════
echo "📦 Removing dev-only packages..."

# Playwright & testing (500MB+)
rm -rf node_modules/playwright 2>/dev/null || true
rm -rf node_modules/playwright-core 2>/dev/null || true
rm -rf node_modules/@playwright 2>/dev/null || true
rm -rf .cache/ms-playwright 2>/dev/null || true

# TypeScript & build tools (100MB+)
rm -rf node_modules/typescript 2>/dev/null || true
rm -rf node_modules/tsx 2>/dev/null || true
rm -rf node_modules/esbuild 2>/dev/null || true

# ESLint & linting (50MB+)
rm -rf node_modules/eslint 2>/dev/null || true
rm -rf node_modules/@typescript-eslint 2>/dev/null || true

# Testing frameworks (50MB+)
rm -rf node_modules/jest 2>/dev/null || true
rm -rf node_modules/vitest 2>/dev/null || true
rm -rf node_modules/@jest 2>/dev/null || true
rm -rf node_modules/@testing-library 2>/dev/null || true
rm -rf node_modules/supertest 2>/dev/null || true

# Drizzle kit (dev tool, not needed at runtime)
rm -rf node_modules/drizzle-kit 2>/dev/null || true

# Rollup & Vite (already bundled, not needed)
rm -rf node_modules/rollup 2>/dev/null || true
rm -rf node_modules/@rollup 2>/dev/null || true
rm -rf node_modules/vite 2>/dev/null || true

# Type definitions (100MB+)
rm -rf node_modules/@types 2>/dev/null || true

# Babel (dev tool)
rm -rf node_modules/@babel 2>/dev/null || true

# ═══════════════════════════════════════════════════════════════
# STEP 2: Remove frontend packages (already bundled in dist/)
# ═══════════════════════════════════════════════════════════════
echo "🎨 Removing frontend packages (bundled in dist/)..."

# React ecosystem (bundled)
rm -rf node_modules/react 2>/dev/null || true
rm -rf node_modules/react-dom 2>/dev/null || true
rm -rf node_modules/react-hook-form 2>/dev/null || true
rm -rf node_modules/react-icons 2>/dev/null || true
rm -rf node_modules/react-markdown 2>/dev/null || true
rm -rf node_modules/react-syntax-highlighter 2>/dev/null || true
rm -rf node_modules/react-responsive 2>/dev/null || true
rm -rf node_modules/react-i18next 2>/dev/null || true
rm -rf node_modules/react-dnd 2>/dev/null || true
rm -rf node_modules/react-dnd-html5-backend 2>/dev/null || true
rm -rf node_modules/react-dropzone 2>/dev/null || true
rm -rf node_modules/react-day-picker 2>/dev/null || true
rm -rf node_modules/react-resizable-panels 2>/dev/null || true

# Radix UI (bundled)
rm -rf node_modules/@radix-ui 2>/dev/null || true

# Monaco editor (bundled, huge)
rm -rf node_modules/monaco-editor 2>/dev/null || true
rm -rf node_modules/@monaco-editor 2>/dev/null || true

# CodeMirror (bundled)
rm -rf node_modules/@codemirror 2>/dev/null || true
rm -rf node_modules/@lezer 2>/dev/null || true

# TanStack (bundled)
rm -rf node_modules/@tanstack 2>/dev/null || true

# Framer motion (bundled)
rm -rf node_modules/framer-motion 2>/dev/null || true

# Charts (bundled)
rm -rf node_modules/recharts 2>/dev/null || true

# AG Grid (bundled)
rm -rf node_modules/ag-grid-community 2>/dev/null || true
rm -rf node_modules/ag-grid-react 2>/dev/null || true

# DnD kit (bundled)
rm -rf node_modules/@dnd-kit 2>/dev/null || true

# Uppy (bundled)
rm -rf node_modules/@uppy 2>/dev/null || true

# Tailwind (CSS already generated)
rm -rf node_modules/tailwindcss 2>/dev/null || true
rm -rf node_modules/@tailwindcss 2>/dev/null || true
rm -rf node_modules/tailwind-merge 2>/dev/null || true
rm -rf node_modules/tailwindcss-animate 2>/dev/null || true
rm -rf node_modules/autoprefixer 2>/dev/null || true
rm -rf node_modules/postcss 2>/dev/null || true

# Other frontend-only (bundled)
rm -rf node_modules/lucide-react 2>/dev/null || true
rm -rf node_modules/cmdk 2>/dev/null || true
rm -rf node_modules/embla-carousel-react 2>/dev/null || true
rm -rf node_modules/sonner 2>/dev/null || true
rm -rf node_modules/vaul 2>/dev/null || true
rm -rf node_modules/input-otp 2>/dev/null || true
rm -rf node_modules/next-themes 2>/dev/null || true
rm -rf node_modules/prismjs 2>/dev/null || true
rm -rf node_modules/i18next 2>/dev/null || true
rm -rf node_modules/i18next-browser-languagedetector 2>/dev/null || true
rm -rf node_modules/web-vitals 2>/dev/null || true

# ═══════════════════════════════════════════════════════════════
# STEP 3: Remove Sentry dev assets
# ═══════════════════════════════════════════════════════════════
echo "🔧 Removing Sentry source maps..."
rm -rf node_modules/@sentry/cli 2>/dev/null || true

# ═══════════════════════════════════════════════════════════════
# STEP 4: Remove caches and temp files
# ═══════════════════════════════════════════════════════════════
echo "🗑️ Removing caches..."
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf .npm 2>/dev/null || true

# Remove attached assets not needed
rm -f attached_assets/Pasted-*.txt 2>/dev/null || true
rm -f attached_assets/Capture* 2>/dev/null || true

echo "✅ Aggressive cleanup complete!"
du -sh node_modules 2>/dev/null || true
