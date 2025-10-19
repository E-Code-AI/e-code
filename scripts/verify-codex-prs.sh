#!/bin/bash

# E-Code Codex PR Verification Script
# Automatically checks recent codex PRs for common issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPORT_DIR="reports/codex-audits"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="${REPORT_DIR}/audit_${TIMESTAMP}.md"
NUM_PRS=${1:-15} # Default to last 15 PRs

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  E-Code Codex PR Verification${NC}"
echo -e "${BLUE}  Analyzing last ${NUM_PRS} PRs${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Create report directory
mkdir -p "$REPORT_DIR"

# Initialize counters
ISSUES_FOUND=0
PRS_CLEAN=0
PRS_TOTAL=0

# Start report
cat > "$REPORT_FILE" << EOF
# Codex PR Audit Report
**Generated**: $(date)
**PRs Analyzed**: ${NUM_PRS}

---

## Summary
EOF

echo -e "${BLUE}[1/7] Checking Git history...${NC}"
# Get recent codex PRs
CODEX_PRS=$(git log --all --oneline --merges --grep="codex" --since="7 days ago" | grep "Merge pull request #" | head -${NUM_PRS})
PRS_TOTAL=$(echo "$CODEX_PRS" | wc -l | tr -d ' ')

echo -e "  Found ${PRS_TOTAL} recent codex PRs"
echo "" >> "$REPORT_FILE"

# Check 1: Database Tables
echo -e "${BLUE}[2/7] Verifying database tables...${NC}"
echo "## Database Verification" >> "$REPORT_FILE"

# Extract table names from schema
SCHEMA_TABLES=$(grep -oP 'export const \K\w+(?= = pgTable)' shared/schema.ts 2>/dev/null || echo "")

if [ -n "$DATABASE_URL" ]; then
  # Get all existing tables in one query (much faster)
  EXISTING_TABLES=$(timeout 10 psql "$DATABASE_URL" -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" 2>/dev/null | tr -d ' ' | tr '\n' ' ')
  
  MISSING_TABLES=""
  TABLE_COUNT=0
  MISSING_COUNT=0
  
  for table in $SCHEMA_TABLES; do
    # Convert camelCase to snake_case
    snake_case=$(echo "$table" | sed 's/\([A-Z]\)/_\L\1/g' | sed 's/^_//')
    ((TABLE_COUNT++))
    
    # Check if table exists in the list
    if echo "$EXISTING_TABLES" | grep -qw "$snake_case"; then
      echo -e "  ${GREEN}✓${NC} Table exists: ${snake_case}"
    else
      MISSING_TABLES="${MISSING_TABLES}\n- ${snake_case} (defined as ${table})"
      ((ISSUES_FOUND++))
      ((MISSING_COUNT++))
      echo -e "  ${RED}✗${NC} Missing table: ${snake_case}"
    fi
  done
  
  echo -e "  Checked ${TABLE_COUNT} schema tables, ${MISSING_COUNT} missing"
  
  if [ -n "$MISSING_TABLES" ]; then
    echo -e "\n❌ **Missing Tables:**${MISSING_TABLES}\n" >> "$REPORT_FILE"
  else
    echo -e "\n✅ All ${TABLE_COUNT} schema tables exist in database\n" >> "$REPORT_FILE"
  fi
else
  echo -e "\n⚠️ DATABASE_URL not set, skipping database checks\n" >> "$REPORT_FILE"
fi

# Check 2: Port Conflicts
echo -e "${BLUE}[3/7] Checking port conflicts...${NC}"
echo "## Port Status" >> "$REPORT_FILE"

REQUIRED_PORTS="3200 5000 8080 8081"
PORT_ISSUES=""

for port in $REQUIRED_PORTS; do
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 || ss -ltn | grep -q ":${port} " 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Port ${port} in use (expected)"
  else
    PORT_ISSUES="${PORT_ISSUES}\n- Port ${port} not listening"
    echo -e "  ${YELLOW}⚠${NC} Port ${port} not listening"
  fi
done

if [ -n "$PORT_ISSUES" ]; then
  echo -e "\n⚠️ **Port Status:**${PORT_ISSUES}\n" >> "$REPORT_FILE"
else
  echo -e "\n✅ All required ports are active\n" >> "$REPORT_FILE"
fi

# Check 3: Pending Migrations
echo -e "${BLUE}[4/7] Checking for unapplied migrations...${NC}"
echo "## Migration Status" >> "$REPORT_FILE"

MIGRATION_FILES=$(find server/db/migrations -name "*.sql" -type f 2>/dev/null || echo "")

if [ -n "$MIGRATION_FILES" ]; then
  echo "$MIGRATION_FILES" | while read -r migration; do
    migration_name=$(basename "$migration" .sql)
    echo -e "  Found migration: ${migration_name}"
  done
  
  echo -e "\n📋 **Migration files found:**" >> "$REPORT_FILE"
  echo "$MIGRATION_FILES" | while read -r migration; do
    echo "- $(basename "$migration")" >> "$REPORT_FILE"
  done
  echo "" >> "$REPORT_FILE"
else
  echo -e "\n✅ No migration files to apply\n" >> "$REPORT_FILE"
fi

# Check 4: TypeScript Compilation
echo -e "${BLUE}[5/7] Checking TypeScript compilation...${NC}"
echo "## TypeScript Status" >> "$REPORT_FILE"

# Quick syntax check on recently modified files
RECENT_TS_FILES=$(git diff HEAD~${NUM_PRS}..HEAD --name-only | grep -E '\.(ts|tsx)$' | head -20)

if [ -n "$RECENT_TS_FILES" ]; then
  TS_ERRORS=$(npx tsc --noEmit 2>&1 | grep "error TS" | wc -l | tr -d ' ')
  
  if [ "$TS_ERRORS" -gt 0 ]; then
    echo -e "  ${RED}✗${NC} Found ${TS_ERRORS} TypeScript errors"
    echo -e "\n❌ **TypeScript compilation errors:** ${TS_ERRORS} errors found\n" >> "$REPORT_FILE"
    ((ISSUES_FOUND++))
  else
    echo -e "  ${GREEN}✓${NC} No TypeScript errors"
    echo -e "\n✅ TypeScript compiles successfully\n" >> "$REPORT_FILE"
  fi
fi

# Check 5: Code Duplications
echo -e "${BLUE}[6/7] Scanning for code duplications...${NC}"
echo "## Code Quality" >> "$REPORT_FILE"

DUPLICATION_FOUND=0

# Check test files for duplicate functions
for file in test/setup/*.ts; do
  if [ -f "$file" ]; then
    FUNC_DUPS=$(grep -n "^function " "$file" 2>/dev/null | cut -d: -f2 | sort | uniq -d)
    if [ -n "$FUNC_DUPS" ]; then
      echo -e "  ${RED}✗${NC} Duplicate functions in $(basename $file)"
      echo -e "\n⚠️ Duplicate functions detected in test/setup/$(basename $file)\n" >> "$REPORT_FILE"
      ((DUPLICATION_FOUND++))
      ((ISSUES_FOUND++))
    fi
  fi
done

if [ "$DUPLICATION_FOUND" -eq 0 ]; then
  echo -e "  ${GREEN}✓${NC} No duplicate functions detected"
  echo -e "\n✅ No code duplications found\n" >> "$REPORT_FILE"
fi

# Check 6: Application Health
echo -e "${BLUE}[7/7] Verifying application health...${NC}"
echo "## Application Health" >> "$REPORT_FILE"

if curl -s http://localhost:5000/api/health >/dev/null 2>&1; then
  echo -e "  ${GREEN}✓${NC} Application is responding"
  echo -e "\n✅ Application health check passed\n" >> "$REPORT_FILE"
else
  echo -e "  ${RED}✗${NC} Application not responding"
  echo -e "\n❌ Application health check failed\n" >> "$REPORT_FILE"
  ((ISSUES_FOUND++))
fi

# Calculate clean PRs
PRS_CLEAN=$((PRS_TOTAL - ISSUES_FOUND))

# Finalize report
cat >> "$REPORT_FILE" << EOF

---

## Final Statistics

- **Total PRs Analyzed**: ${PRS_TOTAL}
- **Critical Issues Found**: ${ISSUES_FOUND}
- **Clean Rate**: $(awk "BEGIN {printf \"%.1f\", ($PRS_CLEAN/$PRS_TOTAL)*100}")%

EOF

# Add recommendations if issues found
if [ "$ISSUES_FOUND" -gt 0 ]; then
  cat >> "$REPORT_FILE" << EOF
## Recommendations

1. **Database**: Run \`npm run db:push --force\` to sync schema
2. **Ports**: Check for zombie processes: \`fuser -k 3200/tcp\`
3. **TypeScript**: Run \`npx tsc --noEmit\` to see full errors
4. **Migrations**: Apply pending migrations from \`server/db/migrations/\`

EOF
fi

cat >> "$REPORT_FILE" << EOF
---

**Report saved**: \`${REPORT_FILE}\`

EOF

# Final summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Verification Complete${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ "$ISSUES_FOUND" -eq 0 ]; then
  echo -e "${GREEN}✅ ALL CHECKS PASSED${NC}"
  echo -e "No issues found in the last ${NUM_PRS} codex PRs"
else
  echo -e "${YELLOW}⚠️  ISSUES FOUND: ${ISSUES_FOUND}${NC}"
  echo -e "Please review the issues above and the report"
fi

echo ""
echo -e "📄 Full report: ${REPORT_FILE}"
echo ""

exit $ISSUES_FOUND
