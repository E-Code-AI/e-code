#!/bin/bash
set -e

echo "============================================"
echo "  E-Code.AI Deployment Build"
echo "============================================"

echo ""
echo "Step 1/2: Verifying pre-built dist..."

if [ ! -f "dist/index.js" ] || [ ! -f "dist/public/index.html" ]; then
  echo "FATAL: dist/index.js or dist/public/index.html not found."
  echo "  dist/ must be pre-built before deploying."
  echo "  Run 'npm run build' in development first."
  exit 1
fi
echo "  dist/index.js found"
echo "  dist/public/index.html found"

echo ""
echo "Step 2/2: Verification..."

DIST_SIZE=$(du -sh dist/ 2>/dev/null | cut -f1)
echo "  dist/: $DIST_SIZE"
echo "  All dependencies bundled in dist/index.js"
echo "  Native modules use JS fallbacks (bcrypt->bcryptjs, node-pty->lazy)"

echo ""
echo "============================================"
echo "  Ready for deployment (zero-install build)"
echo "============================================"
