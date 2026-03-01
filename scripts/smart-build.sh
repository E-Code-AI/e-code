#!/bin/bash
set -e

echo "============================================"
echo "  E-Code.AI Deployment Build"
echo "============================================"

echo ""
echo "Step 1/3: Verifying pre-built dist..."

if [ ! -f "dist/index.js" ] || [ ! -f "dist/public/index.html" ]; then
  echo "FATAL: dist/index.js or dist/public/index.html not found."
  echo "  dist/ must be pre-built before deploying."
  echo "  Run 'npm run build' in development first."
  exit 1
fi
echo "  dist/index.js found ($(du -sh dist/index.js | cut -f1))"
echo "  dist/public/index.html found"

echo ""
echo "Step 2/3: Verifying node_modules (required for npm packages at runtime)..."

if [ ! -d "node_modules" ]; then
  echo "  node_modules not found — running npm install..."
  npm install --omit=dev --ignore-scripts 2>&1 | tail -5
else
  echo "  node_modules found"
fi

echo ""
echo "Step 3/3: Final checks..."

DIST_SIZE=$(du -sh dist/ 2>/dev/null | cut -f1)
echo "  dist/: $DIST_SIZE"
echo "  Strategy: packages=external (npm packages loaded from node_modules)"

echo ""
echo "============================================"
echo "  Ready for deployment"
echo "============================================"
