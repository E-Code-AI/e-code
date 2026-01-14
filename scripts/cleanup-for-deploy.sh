#!/bin/bash
# Fast cleanup script to reduce deployment image size
# Focuses on the biggest space savings with minimal time

set -e

echo "🧹 Quick cleanup for deployment..."

# Remove Playwright browsers (500MB+) - BIGGEST WIN
rm -rf node_modules/playwright/.local-browsers 2>/dev/null || true
rm -rf node_modules/playwright-core/.local-browsers 2>/dev/null || true
rm -rf .cache/ms-playwright 2>/dev/null || true

# Remove type definitions (100MB+)
rm -rf node_modules/@types 2>/dev/null || true

# Remove TypeScript lib (50MB+)
rm -rf node_modules/typescript/lib 2>/dev/null || true

# Remove ESLint (30MB+)
rm -rf node_modules/eslint 2>/dev/null || true
rm -rf node_modules/@typescript-eslint 2>/dev/null || true

# Remove Jest/Vitest (50MB+)
rm -rf node_modules/jest 2>/dev/null || true
rm -rf node_modules/vitest 2>/dev/null || true
rm -rf node_modules/@jest 2>/dev/null || true

# Remove caches
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf .npm 2>/dev/null || true

# Remove pasted chat attachments
rm -f attached_assets/Pasted-*.txt 2>/dev/null || true
rm -f attached_assets/Capture* 2>/dev/null || true

echo "✅ Quick cleanup complete!"
