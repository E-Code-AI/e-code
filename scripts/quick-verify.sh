#!/bin/bash

# Quick verification script for E-Code Platform
set -e

echo "========================================="
echo "  E-Code Platform Quick Verification"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. Git history
echo -e "${BLUE}[1/6] Recent Codex PRs${NC}"
PR_COUNT=$(git log --all --oneline --merges --grep="codex" --since="7 days ago" | grep "Merge pull request #" | wc -l)
echo -e "  ${GREEN}✓${NC} Found $PR_COUNT recent codex PRs"
echo ""

# 2. Database
echo -e "${BLUE}[2/6] Database Status${NC}"
SCHEMA_COUNT=$(grep -oP 'export const \K\w+(?= = pgTable)' shared/schema.ts | wc -l)
DB_COUNT=$(timeout 10 psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
echo -e "  ${GREEN}✓${NC} Schema defines $SCHEMA_COUNT tables"
echo -e "  ${GREEN}✓${NC} Database has $DB_COUNT tables"

# Quick check for critical tables
CRITICAL_TABLES="users projects files sessions"
MISSING=""
for table in $CRITICAL_TABLES; do
  EXISTS=$(timeout 5 psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '$table';" 2>/dev/null | tr -d ' ')
  if [ "$EXISTS" = "0" ]; then
    MISSING="$MISSING $table"
  fi
done

if [ -n "$MISSING" ]; then
  echo -e "  ${RED}✗${NC} Missing critical tables:$MISSING"
else
  echo -e "  ${GREEN}✓${NC} All critical tables exist"
fi
echo ""

# 3. Ports
echo -e "${BLUE}[3/6] Service Ports${NC}"
PORTS="5000 8080"
for port in $PORTS; do
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Port $port listening"
  else
    echo -e "  ${YELLOW}⚠${NC} Port $port not listening"
  fi
done
echo ""

# 4. TypeScript
echo -e "${BLUE}[4/6] TypeScript Compilation${NC}"
TS_ERRORS=$(npx tsc --noEmit 2>&1 | grep -c "error TS" || echo "0")
if [ "$TS_ERRORS" -eq 0 ]; then
  echo -e "  ${GREEN}✓${NC} No TypeScript errors"
else
  echo -e "  ${YELLOW}⚠${NC} Found $TS_ERRORS TypeScript errors"
fi
echo ""

# 5. Application Health
echo -e "${BLUE}[5/6] Application Health${NC}"
HEALTH=$(timeout 5 curl -s http://localhost:5000/api/health 2>/dev/null || echo "")
if echo "$HEALTH" | grep -q "healthy"; then
  echo -e "  ${GREEN}✓${NC} Application is healthy"
else
  echo -e "  ${YELLOW}⚠${NC} Application health check failed"
fi
echo ""

# 6. Recent Migrations
echo -e "${BLUE}[6/6] Recent Migrations${NC}"
MIGRATION_COUNT=$(find server/db/migrations -name "*.sql" -type f 2>/dev/null | wc -l)
if [ "$MIGRATION_COUNT" -gt 0 ]; then
  echo -e "  ${YELLOW}ℹ${NC} Found $MIGRATION_COUNT migration files"
  find server/db/migrations -name "*.sql" -type f 2>/dev/null | tail -3 | while read -r migration; do
    echo "    - $(basename "$migration")"
  done
else
  echo -e "  ${GREEN}✓${NC} No pending migrations"
fi
echo ""

echo "========================================="
echo -e "${GREEN}Verification Complete!${NC}"
echo "========================================="
