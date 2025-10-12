#!/bin/bash
# Manual Verification Script for Single-Port Architecture
# This script helps verify that the single-port proxy setup is working correctly

set -e

echo "🔍 Verifying Single-Port Architecture Implementation"
echo "=================================================="
echo ""

# 1. Check if preview service has been updated
echo "✓ Checking preview service..."
if grep -q "registerRoutes(app: express.Application)" server/preview/preview-service.ts; then
    echo "  ✓ Preview service uses registerRoutes pattern"
else
    echo "  ✗ Preview service not updated"
    exit 1
fi

if grep -q "setupPreviewRoutes" server/preview/preview-service.ts; then
    echo "  ✓ setupPreviewRoutes function exists"
else
    echo "  ✗ setupPreviewRoutes function missing"
    exit 1
fi

# 2. Check if polyglot services have proxy routes
echo ""
echo "✓ Checking polyglot services..."
if grep -q "setupPolyglotProxyRoutes" server/polyglot-services.ts; then
    echo "  ✓ setupPolyglotProxyRoutes function exists"
else
    echo "  ✗ setupPolyglotProxyRoutes function missing"
    exit 1
fi

# 3. Check if main server uses the new functions
echo ""
echo "✓ Checking main server integration..."
if grep -q "setupPreviewRoutes(app)" server/index.ts; then
    echo "  ✓ Preview routes registered in main server"
else
    echo "  ✗ Preview routes not registered"
    exit 1
fi

if grep -q "setupPolyglotProxyRoutes(app)" server/index.ts; then
    echo "  ✓ Polyglot proxy routes registered in main server"
else
    echo "  ✗ Polyglot proxy routes not registered"
    exit 1
fi

# 4. Check if old preview server is removed
echo ""
echo "✓ Checking deprecated code removal..."
if grep -q "startPreviewServer()" server/index.ts; then
    echo "  ✗ Old preview server still referenced"
    exit 1
else
    echo "  ✓ Old preview server removed"
fi

# 5. Check .replit configuration
echo ""
echo "✓ Checking Replit configuration..."
PORT_COUNT=$(grep -c "localPort = " .replit || true)
if [ "$PORT_COUNT" -eq "1" ]; then
    echo "  ✓ Single port configuration (only port 5000)"
else
    echo "  ✗ Multiple ports configured ($PORT_COUNT ports)"
    exit 1
fi

# 6. Check WebSocket support
echo ""
echo "✓ Checking WebSocket support..."
if grep -q "ws: true" server/preview/preview-service.ts; then
    echo "  ✓ WebSocket support enabled in preview proxy"
else
    echo "  ✗ WebSocket support missing in preview proxy"
    exit 1
fi

if grep -q "ws: true" server/polyglot-services.ts; then
    echo "  ✓ WebSocket support enabled in Go runtime proxy"
else
    echo "  ✗ WebSocket support missing in Go runtime proxy"
    exit 1
fi

# 7. Check path patterns
echo ""
echo "✓ Checking proxy path patterns..."
if grep -q "/preview/:projectId/:port/\*" server/preview/preview-service.ts; then
    echo "  ✓ Preview multi-port path pattern correct"
else
    echo "  ✗ Preview multi-port path pattern missing"
    exit 1
fi

if grep -q "/polyglot/go" server/polyglot-services.ts; then
    echo "  ✓ Go runtime proxy path correct"
else
    echo "  ✗ Go runtime proxy path missing"
    exit 1
fi

if grep -q "/polyglot/python" server/polyglot-services.ts; then
    echo "  ✓ Python ML proxy path correct"
else
    echo "  ✗ Python ML proxy path missing"
    exit 1
fi

# 8. Check target URLs use 127.0.0.1
echo ""
echo "✓ Checking proxy targets..."
if grep -q "127.0.0.1" server/preview/preview-service.ts; then
    echo "  ✓ Preview targets use 127.0.0.1 (localhost only)"
else
    echo "  ✗ Preview targets not using 127.0.0.1"
    exit 1
fi

if grep -q "127.0.0.1:8080" server/polyglot-services.ts; then
    echo "  ✓ Go runtime target correct (127.0.0.1:8080)"
else
    echo "  ✗ Go runtime target incorrect"
    exit 1
fi

if grep -q "127.0.0.1:8081" server/polyglot-services.ts; then
    echo "  ✓ Python ML target correct (127.0.0.1:8081)"
else
    echo "  ✗ Python ML target incorrect"
    exit 1
fi

# 9. Verify documentation exists
echo ""
echo "✓ Checking documentation..."
if [ -f "REPLIT_SINGLE_PORT_ARCHITECTURE.md" ]; then
    echo "  ✓ Architecture documentation exists"
else
    echo "  ✗ Architecture documentation missing"
    exit 1
fi

if grep -q "Single-Port" REPLIT_DEPLOYMENT_STATUS.md; then
    echo "  ✓ Deployment status updated"
else
    echo "  ✗ Deployment status not updated"
    exit 1
fi

echo ""
echo "=================================================="
echo "✅ All verification checks passed!"
echo ""
echo "Summary of changes:"
echo "  - Preview server now uses path-based routing: /preview/:projectId/:port/*"
echo "  - Go runtime proxied through: /polyglot/go/*"
echo "  - Python ML proxied through: /polyglot/python/*"
echo "  - WebSocket support enabled for all proxies"
echo "  - Single port configuration in .replit (port 5000 → 80)"
echo "  - Documentation added: REPLIT_SINGLE_PORT_ARCHITECTURE.md"
echo ""
echo "Next steps:"
echo "  1. Test locally: npm run dev"
echo "  2. Verify preview access: http://localhost:5000/preview/:projectId/:port/"
echo "  3. Verify polyglot services: http://localhost:5000/polyglot/go/health"
echo "  4. Deploy to Replit and test with custom domain"
