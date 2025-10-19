#!/bin/bash

# E-Code Codex PR Verification Script V2
# Simplified and more reliable version

# Configuration
REPORT_DIR="reports/codex-audits"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="${REPORT_DIR}/audit_${TIMESTAMP}.md"
NUM_PRS=${1:-15}

echo "========================================"
echo "  E-Code Codex PR Verification V2"
echo "  Analyzing last ${NUM_PRS} PRs"
echo "========================================"
echo ""

# Create report directory
mkdir -p "$REPORT_DIR"

# Initialize counters
ISSUES_FOUND=0
PRS_TOTAL=0

# Start report
cat > "$REPORT_FILE" << EOF
# Codex PR Audit Report
**Generated**: $(date)
**PRs Analyzed**: ${NUM_PRS}

---

## Summary
EOF

echo "[1/7] Checking Git history..."
# Get recent codex PRs
CODEX_PRS=$(git log --all --oneline --merges --grep="codex" --since="7 days ago" 2>/dev/null | grep "Merge pull request #" | head -${NUM_PRS} || true)
if [ -n "$CODEX_PRS" ]; then
  PRS_TOTAL=$(echo "$CODEX_PRS" | wc -l | tr -d ' ')
  echo "  Found ${PRS_TOTAL} recent codex PRs"
else
  echo "  No recent codex PRs found"
  PRS_TOTAL=0
fi
echo "" >> "$REPORT_FILE"

# Check 1: Database Tables
echo "[2/7] Verifying database tables..."
echo "" >> "$REPORT_FILE"
echo "## Database Verification" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if [ -n "$DATABASE_URL" ]; then
  # Get schema tables
  SCHEMA_TABLES=$(grep -oP 'export const \K\w+(?= = pgTable)' shared/schema.ts 2>/dev/null || true)
  
  if [ -n "$SCHEMA_TABLES" ]; then
    # Get existing tables from database
    EXISTING_TABLES=$(timeout 10 psql "$DATABASE_URL" -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" 2>/dev/null | tr -d ' ' | tr '\n' ' ' || true)
    
    TABLE_COUNT=0
    MISSING_COUNT=0
    MISSING_TABLES=""
    
    for table in $SCHEMA_TABLES; do
      # Convert camelCase to snake_case
      snake_case=$(echo "$table" | sed 's/\([A-Z]\)/_\L\1/g' | sed 's/^_//')
      TABLE_COUNT=$((TABLE_COUNT + 1))
      
      # Check if table exists
      if echo "$EXISTING_TABLES" | grep -qw "$snake_case"; then
        echo "  ✓ $snake_case"
      else
        echo "  ✗ MISSING: $snake_case"
        MISSING_TABLES="${MISSING_TABLES}\n- ${snake_case} (defined as ${table})"
        MISSING_COUNT=$((MISSING_COUNT + 1))
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
      fi
    done
    
    echo "  Checked ${TABLE_COUNT} schema tables, ${MISSING_COUNT} missing"
    
    if [ $MISSING_COUNT -gt 0 ]; then
      echo -e "❌ **Missing Tables (${MISSING_COUNT}/${TABLE_COUNT}):**${MISSING_TABLES}" >> "$REPORT_FILE"
    else
      echo "✅ All ${TABLE_COUNT} schema tables exist in database" >> "$REPORT_FILE"
    fi
  else
    echo "⚠️ Could not extract schema tables" >> "$REPORT_FILE"
  fi
else
  echo "⚠️ DATABASE_URL not set, skipping database checks" >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"

# Check 2: Port Status
echo "[3/7] Checking port status..."
echo "## Port Status" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

REQUIRED_PORTS="3200 5000 8080 8081"
PORT_ISSUES=""
PORTS_ACTIVE=0

for port in $REQUIRED_PORTS; do
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 || ss -ltn 2>/dev/null | grep -q ":${port} "; then
    echo "  ✓ Port ${port} active"
    PORTS_ACTIVE=$((PORTS_ACTIVE + 1))
  else
    echo "  ⚠ Port ${port} not listening"
    PORT_ISSUES="${PORT_ISSUES}\n- Port ${port} not listening"
  fi
done

if [ -n "$PORT_ISSUES" ]; then
  echo -e "⚠️ **Port Status (${PORTS_ACTIVE}/4 active):**${PORT_ISSUES}" >> "$REPORT_FILE"
else
  echo "✅ All required ports are active (4/4)" >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"

# Check 3: Application Status
echo "[4/7] Checking application status..."
echo "## Application Status" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if curl -s -f http://localhost:5000 >/dev/null 2>&1; then
  echo "  ✓ Application responding on port 5000"
  echo "✅ Application is running and responding" >> "$REPORT_FILE"
else
  echo "  ✗ Application not responding"
  echo "❌ Application not responding on port 5000" >> "$REPORT_FILE"
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi
echo "" >> "$REPORT_FILE"

# Check 4: TypeScript Compilation
echo "[5/7] Checking TypeScript..."
echo "## TypeScript Status" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if npm run typecheck >/dev/null 2>&1; then
  echo "  ✓ TypeScript compilation successful"
  echo "✅ No TypeScript errors" >> "$REPORT_FILE"
else
  echo "  ✗ TypeScript errors found"
  echo "❌ TypeScript compilation has errors" >> "$REPORT_FILE"
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi
echo "" >> "$REPORT_FILE"

# Check 5: Recent PRs Summary
echo "[6/7] Analyzing recent PRs..."
echo "## Recent PRs" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if [ $PRS_TOTAL -gt 0 ]; then
  echo "**Last ${PRS_TOTAL} Codex PRs:**" >> "$REPORT_FILE"
  echo '```' >> "$REPORT_FILE"
  echo "$CODEX_PRS" >> "$REPORT_FILE"
  echo '```' >> "$REPORT_FILE"
else
  echo "No recent Codex PRs found" >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"

# Final Summary
echo "[7/7] Generating final report..."
echo "---" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "## Final Summary" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "- **PRs Analyzed:** ${PRS_TOTAL}" >> "$REPORT_FILE"
echo "- **Issues Found:** ${ISSUES_FOUND}" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if [ $ISSUES_FOUND -eq 0 ]; then
  echo "✅ **Status:** All checks passed!" >> "$REPORT_FILE"
  echo ""
  echo "========================================"
  echo "  ✅ ALL CHECKS PASSED"
  echo "  No issues found"
  echo "========================================"
else
  echo "⚠️ **Status:** ${ISSUES_FOUND} issue(s) found" >> "$REPORT_FILE"
  echo ""
  echo "========================================"
  echo "  ⚠️  ${ISSUES_FOUND} ISSUE(S) FOUND"
  echo "  See report for details"
  echo "========================================"
fi

echo ""
echo "Report saved to: $REPORT_FILE"
echo ""
