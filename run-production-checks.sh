#!/bin/bash

# Production Readiness Check Script
# Verifies all critical components before deployment

set -e

echo "================================================"
echo "   PRODUCTION READINESS VERIFICATION SUITE     "
echo "================================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check functions
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 is installed"
        return 0
    else
        echo -e "${RED}✗${NC} $1 is not installed"
        return 1
    fi
}

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 exists"
        return 0
    else
        echo -e "${RED}✗${NC} $1 is missing"
        return 1
    fi
}

check_env() {
    if [ -z "${!1}" ]; then
        echo -e "${YELLOW}⚠${NC} $1 is not set"
        return 1
    else
        echo -e "${GREEN}✓${NC} $1 is configured"
        return 0
    fi
}

# Track failures
FAILURES=0

echo -e "${BLUE}1. Checking Dependencies...${NC}"
echo "----------------------------"
check_command node || ((FAILURES++))
check_command npm || ((FAILURES++))
check_command npx || ((FAILURES++))
echo ""

echo -e "${BLUE}2. Checking Configuration Files...${NC}"
echo "-----------------------------------"
check_file "playwright.config.ts" || ((FAILURES++))
check_file "jest.config.js" || ((FAILURES++))
check_file ".env.staging" || ((FAILURES++))
check_file "scripts/check-all.js" || ((FAILURES++))
echo ""

echo -e "${BLUE}3. Checking Test Infrastructure...${NC}"
echo "-----------------------------------"
check_file "test/e2e/homepage.spec.ts" || ((FAILURES++))
check_file "test/e2e/auth.spec.ts" || ((FAILURES++))
check_file "test/performance/lighthouse.js" || ((FAILURES++))
check_file "test/unit/billing-email.test.ts" || ((FAILURES++))
check_file "test/setup/jest-setup.ts" || ((FAILURES++))
echo ""

echo -e "${BLUE}4. Checking Email Templates...${NC}"
echo "-------------------------------"
check_file "server/utils/billing-email-templates.ts" || ((FAILURES++))
echo ""

echo -e "${BLUE}5. Checking Environment Variables...${NC}"
echo "------------------------------------"
check_env "NODE_ENV" || echo "  → Set NODE_ENV=production for production"
check_env "DATABASE_URL" || echo "  → Required for database connection"
check_env "SENDGRID_API_KEY" || echo "  → Required for email notifications"
check_env "FROM_EMAIL" || echo "  → Set sender email address"
echo ""

echo -e "${BLUE}6. Running Quick Checks...${NC}"
echo "--------------------------"

# TypeScript check
echo -n "TypeScript compilation... "
if npx tsc --noEmit --pretty false --skipLibCheck &> /dev/null; then
    echo -e "${GREEN}✓ Passed${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
    ((FAILURES++))
fi

# Test database connection
echo -n "Database connection... "
if node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT 1')
  .then(() => { console.log('✓ Connected'); process.exit(0); })
  .catch(() => { console.log('✗ Failed'); process.exit(1); });
" 2>/dev/null; then
    :
else
    ((FAILURES++))
fi

# Check health endpoint
echo -n "Health endpoint... "
if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Responding${NC}"
else
    echo -e "${YELLOW}⚠ Server not running${NC}"
fi

echo ""
echo "================================================"
echo -e "${BLUE}SUMMARY${NC}"
echo "================================================"

if [ $FAILURES -eq 0 ]; then
    echo -e "${GREEN}✅ All production checks passed!${NC}"
    echo ""
    echo "You can now run the full test suite with:"
    echo "  ./test/run-all-tests.sh"
    echo ""
    echo "Or run individual checks:"
    echo "  node scripts/check-all.js      # Quality checks"
    echo "  npx jest                        # Unit tests"
    echo "  npx playwright test             # E2E tests"
    echo "  node test/performance/lighthouse.js # Performance"
    exit 0
else
    echo -e "${RED}❌ $FAILURES check(s) failed${NC}"
    echo ""
    echo "Please fix the issues above before deployment."
    echo ""
    echo "Common fixes:"
    echo "  - Install Playwright: npx playwright install chromium"
    echo "  - Set environment: source .env.staging"
    echo "  - Install deps: npm install"
    exit 1
fi