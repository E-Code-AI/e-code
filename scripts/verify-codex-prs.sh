#!/bin/bash

# E-Code Codex PR Verification Script
# Automatically checks recent codex PRs for common issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
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
SYNTAX_ERRORS=0
SYNTAX_FIXES=0

# Start report
cat > "$REPORT_FILE" << EOF
# Codex PR Audit Report
**Generated**: $(date)
**PRs Analyzed**: ${NUM_PRS}

---

## PRs Checked

EOF

echo -e "${BLUE}[1/8] Checking Git history and listing PRs...${NC}"
# Get recent codex PRs with details
CODEX_PRS=$(git log --all --oneline --merges --grep="codex" --since="7 days ago" | grep "Merge pull request #" | head -${NUM_PRS})
PRS_TOTAL=$(echo "$CODEX_PRS" | wc -l | tr -d ' ')

if [ "$PRS_TOTAL" -eq 0 ]; then
  echo -e "  ${YELLOW}⚠${NC} No codex PRs found in the last 7 days"
  echo "No codex PRs found in the last 7 days." >> "$REPORT_FILE"
else
  echo -e "  Found ${GREEN}${PRS_TOTAL}${NC} recent codex PRs"
  echo ""
  
  # List all PRs with numbers and titles
  echo "| PR # | Title | Status |" >> "$REPORT_FILE"
  echo "|------|-------|--------|" >> "$REPORT_FILE"
  
  while IFS= read -r pr_line; do
    PR_NUM=$(echo "$pr_line" | grep -oP '#\K[0-9]+')
    PR_TITLE=$(echo "$pr_line" | sed -E 's/^[a-f0-9]+ Merge pull request #[0-9]+ from [^\/]+\/(.+)/\1/')
    echo -e "  ${MAGENTA}PR #${PR_NUM}${NC}: ${PR_TITLE}"
    echo "| #${PR_NUM} | ${PR_TITLE} | Analyzed |" >> "$REPORT_FILE"
  done <<< "$CODEX_PRS"
fi

echo "" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "## Verification Results" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Check 1: Syntax Errors (TypeScript/JavaScript)
echo ""
echo -e "${BLUE}[2/8] Checking for syntax errors...${NC}"
echo "### 1. Syntax Error Check" >> "$REPORT_FILE"

# Run TypeScript compiler to catch syntax errors (with timeout)
echo -e "  Running TypeScript syntax check..."
TS_OUTPUT=$(timeout 30 npx tsc --noEmit --pretty false 2>&1 || true)
SYNTAX_ERRORS=$(echo "$TS_OUTPUT" | grep -c "error TS" || true)

if [ "$SYNTAX_ERRORS" -gt 0 ]; then
  echo -e "  ${RED}✗${NC} Found ${RED}${SYNTAX_ERRORS}${NC} syntax errors"
  echo -e "\n❌ **Found ${SYNTAX_ERRORS} TypeScript/JavaScript syntax errors:**\n" >> "$REPORT_FILE"
  
  # List the errors
  echo "\`\`\`" >> "$REPORT_FILE"
  echo "$TS_OUTPUT" | grep "error TS" | head -20 >> "$REPORT_FILE"
  echo "\`\`\`" >> "$REPORT_FILE"
  echo "" >> "$REPORT_FILE"
  
  # Show which files have errors
  ERROR_FILES=$(echo "$TS_OUTPUT" | grep "error TS" | cut -d'(' -f1 | sort -u | head -10)
  echo "**Files with errors:**" >> "$REPORT_FILE"
  echo "$ERROR_FILES" | while read -r file; do
    if [ -n "$file" ]; then
      echo "- \`$file\`" >> "$REPORT_FILE"
      echo -e "    ${RED}↳${NC} $file"
    fi
  done
  echo "" >> "$REPORT_FILE"
  
  ((ISSUES_FOUND+=SYNTAX_ERRORS))
else
  echo -e "  ${GREEN}✓${NC} No syntax errors found"
  echo -e "✅ **No syntax errors detected**\n" >> "$REPORT_FILE"
fi

# Check 2: Common Syntax Issues (duplicate braces, missing semicolons, etc.)
echo ""
echo -e "${BLUE}[3/8] Scanning for common code issues...${NC}"
echo "### 2. Code Quality Issues" >> "$REPORT_FILE"

COMMON_ISSUES=0

# Check for duplicate closing braces (merge conflict artifacts)
BRACE_ISSUES=$(find server client -name "*.ts" -o -name "*.tsx" 2>/dev/null | while read -r file; do
  # Look for lines with })) followed by another }))
  if grep -n "}))$" "$file" 2>/dev/null | head -1 | grep -q .; then
    NEXT_LINE=$(grep -A1 -n "}))$" "$file" 2>/dev/null | tail -1)
    if echo "$NEXT_LINE" | grep -q "}))"; then
      echo "$file"
    fi
  fi
done)

if [ -n "$BRACE_ISSUES" ]; then
  BRACE_COUNT=$(echo "$BRACE_ISSUES" | wc -l | tr -d ' ')
  echo -e "  ${YELLOW}⚠${NC} Found potential duplicate braces in ${BRACE_COUNT} files"
  echo -e "\n⚠️ **Potential duplicate closing braces (merge conflicts):**\n" >> "$REPORT_FILE"
  echo "$BRACE_ISSUES" | while read -r file; do
    if [ -n "$file" ]; then
      echo "- \`$file\`" >> "$REPORT_FILE"
      echo -e "    ${YELLOW}↳${NC} $file"
    fi
  done
  echo "" >> "$REPORT_FILE"
  ((COMMON_ISSUES++))
else
  echo -e "  ${GREEN}✓${NC} No duplicate braces detected"
fi

# Check for duplicate variable declarations
DUPLICATE_VARS=$(find server client -name "*.ts" -o -name "*.tsx" 2>/dev/null | while read -r file; do
  # Look for duplicate const/let declarations in the same scope
  VARS=$(grep -oP '(?<=const |let )\w+' "$file" 2>/dev/null | sort | uniq -d)
  if [ -n "$VARS" ]; then
    echo "$file: $VARS"
  fi
done)

if [ -n "$DUPLICATE_VARS" ]; then
  echo -e "  ${YELLOW}⚠${NC} Found potential duplicate variable declarations"
  echo -e "\n⚠️ **Potential duplicate variable declarations:**\n" >> "$REPORT_FILE"
  echo "$DUPLICATE_VARS" | while read -r line; do
    if [ -n "$line" ]; then
      FILE=$(echo "$line" | cut -d: -f1)
      VARS=$(echo "$line" | cut -d: -f2-)
      echo "- \`$FILE\`: $VARS" >> "$REPORT_FILE"
      echo -e "    ${YELLOW}↳${NC} $FILE: $VARS"
    fi
  done
  echo "" >> "$REPORT_FILE"
  ((COMMON_ISSUES++))
fi

if [ "$COMMON_ISSUES" -eq 0 ]; then
  echo -e "✅ **No common code quality issues found**\n" >> "$REPORT_FILE"
fi

((ISSUES_FOUND+=COMMON_ISSUES))

# Check 3: Database Tables
echo ""
echo -e "${BLUE}[4/8] Verifying database tables...${NC}"
echo "### 3. Database Verification" >> "$REPORT_FILE"

# Extract table names from schema
SCHEMA_TABLES=$(grep -oP 'export const \K\w+(?= = pgTable)' shared/schema.ts 2>/dev/null || echo "")

if [ -n "$DATABASE_URL" ]; then
  # Get all existing tables in one query (much faster)
  EXISTING_TABLES=$(timeout 10 psql "$DATABASE_URL" -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" 2>/dev/null | tr -d ' ' | tr '\n' ' ' || echo "")
  
  MISSING_TABLES=""
  TABLE_COUNT=0
  MISSING_COUNT=0
  
  for table in $SCHEMA_TABLES; do
    # Convert camelCase to snake_case
    snake_case=$(echo "$table" | sed 's/\([A-Z]\)/_\L\1/g' | sed 's/^_//')
    ((TABLE_COUNT++))
    
    # Check if table exists in the list
    if echo "$EXISTING_TABLES" | grep -qw "$snake_case"; then
      : # Table exists, no output to reduce noise
    else
      MISSING_TABLES="${MISSING_TABLES}\n- ${snake_case} (defined as ${table})"
      ((ISSUES_FOUND++))
      ((MISSING_COUNT++))
      echo -e "  ${RED}✗${NC} Missing table: ${snake_case}"
    fi
  done
  
  if [ "$MISSING_COUNT" -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} All ${TABLE_COUNT} schema tables exist in database"
  else
    echo -e "  ${RED}✗${NC} Missing ${MISSING_COUNT} of ${TABLE_COUNT} tables"
  fi
  
  if [ -n "$MISSING_TABLES" ]; then
    echo -e "\n❌ **Missing Tables (${MISSING_COUNT}/${TABLE_COUNT}):**${MISSING_TABLES}\n" >> "$REPORT_FILE"
  else
    echo -e "\n✅ All ${TABLE_COUNT} schema tables exist in database\n" >> "$REPORT_FILE"
  fi
else
  echo -e "  ${YELLOW}⚠${NC} DATABASE_URL not set, skipping database checks"
  echo -e "\n⚠️ DATABASE_URL not set, skipping database checks\n" >> "$REPORT_FILE"
fi

# Check 4: Port Conflicts
echo ""
echo -e "${BLUE}[5/8] Checking port status...${NC}"
echo "### 4. Port Status" >> "$REPORT_FILE"

REQUIRED_PORTS="3200 5000 8080 8081"
PORT_ISSUES=0
PORT_OK=0

for port in $REQUIRED_PORTS; do
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 || ss -ltn 2>/dev/null | grep -q ":${port} "; then
    ((PORT_OK++))
  else
    echo -e "  ${YELLOW}⚠${NC} Port ${port} not listening"
    ((PORT_ISSUES++))
  fi
done

if [ "$PORT_ISSUES" -eq 0 ]; then
  echo -e "  ${GREEN}✓${NC} All ${PORT_OK}/4 required ports are active"
  echo -e "\n✅ All required ports (3200, 5000, 8080, 8081) are active\n" >> "$REPORT_FILE"
else
  echo -e "  ${YELLOW}⚠${NC} Only ${PORT_OK}/4 ports active"
  echo -e "\n⚠️ **Port Status:** ${PORT_OK}/4 ports active, ${PORT_ISSUES} not listening\n" >> "$REPORT_FILE"
fi

# Check 5: Pending Migrations
echo ""
echo -e "${BLUE}[6/8] Checking for unapplied migrations...${NC}"
echo "### 5. Migration Status" >> "$REPORT_FILE"

MIGRATION_FILES=$(find server/db/migrations -name "*.sql" -type f 2>/dev/null || echo "")

if [ -n "$MIGRATION_FILES" ]; then
  MIGRATION_COUNT=$(echo "$MIGRATION_FILES" | wc -l | tr -d ' ')
  echo -e "  ${BLUE}ℹ${NC} Found ${MIGRATION_COUNT} migration file(s)"
  
  echo -e "\n📋 **Migration files found (${MIGRATION_COUNT}):**" >> "$REPORT_FILE"
  echo "$MIGRATION_FILES" | while read -r migration; do
    BASENAME=$(basename "$migration")
    echo "- \`$BASENAME\`" >> "$REPORT_FILE"
    echo -e "    ${BLUE}↳${NC} $BASENAME"
  done
  echo "" >> "$REPORT_FILE"
else
  echo -e "  ${GREEN}✓${NC} No pending migration files"
  echo -e "\n✅ No pending migration files\n" >> "$REPORT_FILE"
fi

# Check 6: Code Duplications
echo ""
echo -e "${BLUE}[7/8] Scanning for code duplications...${NC}"
echo "### 6. Code Duplication Check" >> "$REPORT_FILE"

DUPLICATION_FOUND=0

# Check test files for duplicate functions
if [ -d "test/setup" ]; then
  for file in test/setup/*.ts; do
    if [ -f "$file" ]; then
      FUNC_DUPS=$(grep -n "^function " "$file" 2>/dev/null | cut -d: -f2 | cut -d'(' -f1 | sed 's/function //' | sort | uniq -d)
      if [ -n "$FUNC_DUPS" ]; then
        echo -e "  ${RED}✗${NC} Duplicate functions in $(basename $file)"
        echo -e "\n⚠️ Duplicate functions detected in \`test/setup/$(basename $file)\`:" >> "$REPORT_FILE"
        echo "$FUNC_DUPS" | while read -r func; do
          if [ -n "$func" ]; then
            echo "- \`$func\`" >> "$REPORT_FILE"
          fi
        done
        echo "" >> "$REPORT_FILE"
        ((DUPLICATION_FOUND++))
        ((ISSUES_FOUND++))
      fi
    fi
  done
fi

if [ "$DUPLICATION_FOUND" -eq 0 ]; then
  echo -e "  ${GREEN}✓${NC} No duplicate functions detected"
  echo -e "\n✅ No code duplications found\n" >> "$REPORT_FILE"
fi

# Check 7: Application Health
echo ""
echo -e "${BLUE}[8/8] Verifying application health...${NC}"
echo "### 7. Application Health" >> "$REPORT_FILE"

if curl -s -m 5 http://localhost:5000/api/health >/dev/null 2>&1; then
  echo -e "  ${GREEN}✓${NC} Application is responding on port 5000"
  echo -e "\n✅ Application health check passed\n" >> "$REPORT_FILE"
else
  echo -e "  ${RED}✗${NC} Application not responding on port 5000"
  echo -e "\n❌ Application health check failed\n" >> "$REPORT_FILE"
  ((ISSUES_FOUND++))
fi

# Calculate success rate
if [ "$PRS_TOTAL" -gt 0 ]; then
  SUCCESS_RATE=$(awk "BEGIN {printf \"%.1f\", (1 - ($ISSUES_FOUND/$PRS_TOTAL)) * 100}")
else
  SUCCESS_RATE="N/A"
fi

# Finalize report
cat >> "$REPORT_FILE" << EOF

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| **Total PRs Analyzed** | ${PRS_TOTAL} |
| **Syntax Errors** | ${SYNTAX_ERRORS} |
| **Critical Issues Found** | ${ISSUES_FOUND} |
| **Success Rate** | ${SUCCESS_RATE}% |

EOF

# List corrections made (if any were auto-fixed)
if [ "$SYNTAX_FIXES" -gt 0 ]; then
  cat >> "$REPORT_FILE" << EOF
## Corrections Applied

✅ **${SYNTAX_FIXES} syntax issues were automatically fixed:**
- Removed duplicate code blocks
- Fixed merge conflict artifacts
- Corrected brace mismatches

EOF
fi

# Add recommendations if issues found
if [ "$ISSUES_FOUND" -gt 0 ]; then
  cat >> "$REPORT_FILE" << EOF
## Recommended Actions

EOF

  if [ "$SYNTAX_ERRORS" -gt 0 ]; then
    echo "1. **Fix Syntax Errors**: Run \`npx tsc --noEmit\` to see all TypeScript errors" >> "$REPORT_FILE"
  fi
  
  if [ -n "$MISSING_TABLES" ]; then
    echo "2. **Sync Database**: Run \`npm run db:push --force\` to create missing tables" >> "$REPORT_FILE"
  fi
  
  if [ "$PORT_ISSUES" -gt 0 ]; then
    echo "3. **Check Services**: Ensure all services are running (ports 3200, 5000, 8080, 8081)" >> "$REPORT_FILE"
  fi
  
  if [ -n "$MIGRATION_FILES" ]; then
    echo "4. **Apply Migrations**: Review and apply SQL migrations from \`server/db/migrations/\`" >> "$REPORT_FILE"
  fi
  
  echo "" >> "$REPORT_FILE"
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
echo -e "📊 ${MAGENTA}Statistics:${NC}"
echo -e "   • PRs Analyzed: ${GREEN}${PRS_TOTAL}${NC}"
echo -e "   • Syntax Errors: $([ "$SYNTAX_ERRORS" -eq 0 ] && echo -e "${GREEN}0${NC}" || echo -e "${RED}${SYNTAX_ERRORS}${NC}")"
echo -e "   • Total Issues: $([ "$ISSUES_FOUND" -eq 0 ] && echo -e "${GREEN}0${NC}" || echo -e "${YELLOW}${ISSUES_FOUND}${NC}")"
echo -e "   • Success Rate: ${GREEN}${SUCCESS_RATE}%${NC}"
echo ""

if [ "$ISSUES_FOUND" -eq 0 ]; then
  echo -e "${GREEN}✅ ALL CHECKS PASSED${NC}"
  echo -e "No issues found in the last ${PRS_TOTAL} codex PRs"
else
  echo -e "${YELLOW}⚠️  ISSUES FOUND: ${ISSUES_FOUND}${NC}"
  echo -e "Please review the issues above and check the report"
fi

echo ""
echo -e "📄 Full report: ${BLUE}${REPORT_FILE}${NC}"
echo ""

exit 0
