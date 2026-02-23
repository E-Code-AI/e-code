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
echo "  dist/index.js found"
echo "  dist/public/index.html found"

echo ""
echo "Step 2/3: Installing production dependencies..."

if [ -d "node_modules" ] && [ -f "node_modules/.production-optimized" ]; then
  echo "  Already installed (idempotent guard) - skipping"
else
  rm -rf node_modules 2>/dev/null || true

  if [ -f "package-lock.json" ]; then
    echo "  Running npm ci --omit=dev..."
    npm ci --omit=dev --ignore-scripts 2>&1 | tail -5
  else
    echo "  Running npm install --omit=dev..."
    npm install --omit=dev --ignore-scripts 2>&1 | tail -5
  fi

  echo "  Skipping native module rebuild (using JS fallbacks for bcrypt/node-pty/sharp)"

  touch node_modules/.production-optimized
  echo "  Production dependencies installed"
fi

echo ""
echo "Step 3/3: Verification..."

MISSING=0
CRITICAL_PACKAGES="pg jsdom isomorphic-dompurify socket.io"
for pkg in $CRITICAL_PACKAGES; do
  if [ ! -d "node_modules/$pkg" ]; then
    echo "  MISSING: $pkg"
    MISSING=1
  fi
done
if [ "$MISSING" = "1" ]; then
  echo "FATAL: Critical modules missing"
  exit 1
fi
echo "  All critical modules present"

echo ""
echo "============================================"
echo "  Build Summary"
echo "============================================"
DIST_SIZE=$(du -sh dist/ 2>/dev/null | cut -f1)
NM_SIZE=$(du -sh node_modules/ 2>/dev/null | cut -f1)
TOTAL=$(du -shc dist/ node_modules/ 2>/dev/null | tail -1 | cut -f1)
echo "  dist/:         $DIST_SIZE"
echo "  node_modules/: $NM_SIZE"
echo "  Total:         $TOTAL"
echo "============================================"
echo "  Ready for deployment"
echo "============================================"
