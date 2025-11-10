#!/bin/bash
#
# Sequential Test Runner for E-Code Platform
# Runs all 6 backend test suites sequentially with cooldown periods
# to prevent rate limiting issues during parallel execution
#

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
COOLDOWN_SECONDS=3
RESULTS_DIR="test-results"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SUMMARY_FILE="$RESULTS_DIR/suite-summary-$TIMESTAMP.txt"

# Create results directory
mkdir -p "$RESULTS_DIR"

# Test suites in order
SUITES=(
  "tests/backend/auth.spec.ts"
  "tests/backend/projects.spec.ts"
  "tests/backend/files.spec.ts"
  "tests/backend/git.spec.ts"
  "tests/backend/ai.spec.ts"
  "tests/backend/admin.spec.ts"
)

SUITE_NAMES=(
  "Authentication (21 tests)"
  "Projects API (4 tests)"
  "Files API (40 tests)"
  "Git API (25 tests)"
  "AI API (35 tests)"
  "Admin API (45 tests)"
)

# Initialize summary
echo "==================================" > "$SUMMARY_FILE"
echo "E-Code Platform Test Suite Report" >> "$SUMMARY_FILE"
echo "Execution Time: $(date)" >> "$SUMMARY_FILE"
echo "==================================" >> "$SUMMARY_FILE"
echo "" >> "$SUMMARY_FILE"

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   E-Code Platform Sequential Test Runner      ║${NC}"
echo -e "${BLUE}║   Total Suites: 6 | Total Tests: 170          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

TOTAL_PASSED=0
TOTAL_FAILED=0
SUITE_RESULTS=()

# Run each suite sequentially
for i in "${!SUITES[@]}"; do
  SUITE="${SUITES[$i]}"
  NAME="${SUITE_NAMES[$i]}"
  
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}Suite $((i+1))/6: $NAME${NC}"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  
  # Run suite with NODE_ENV=test
  OUTPUT_FILE="$RESULTS_DIR/suite-$((i+1))-$(basename $SUITE .spec.ts)-$TIMESTAMP.log"
  
  if NODE_ENV=test npx vitest run "$SUITE" --reporter=verbose 2>&1 | tee "$OUTPUT_FILE"; then
    SUITE_STATUS="PASSED"
    STATUS_COLOR="$GREEN"
    
    # Extract pass/fail counts from output
    PASSED=$(grep -oP '\d+(?= passed)' "$OUTPUT_FILE" | tail -1 || echo "0")
    FAILED=$(grep -oP '\d+(?= failed)' "$OUTPUT_FILE" | tail -1 || echo "0")
    
    TOTAL_PASSED=$((TOTAL_PASSED + PASSED))
    TOTAL_FAILED=$((TOTAL_FAILED + FAILED))
    
    SUITE_RESULTS+=("✓ $NAME: $PASSED passed, $FAILED failed")
    
    echo "" >> "$SUMMARY_FILE"
    echo "✓ $NAME" >> "$SUMMARY_FILE"
    echo "  Passed: $PASSED | Failed: $FAILED" >> "$SUMMARY_FILE"
  else
    SUITE_STATUS="FAILED"
    STATUS_COLOR="$RED"
    
    # Extract pass/fail counts
    PASSED=$(grep -oP '\d+(?= passed)' "$OUTPUT_FILE" | tail -1 || echo "0")
    FAILED=$(grep -oP '\d+(?= failed)' "$OUTPUT_FILE" | tail -1 || echo "0")
    
    TOTAL_PASSED=$((TOTAL_PASSED + PASSED))
    TOTAL_FAILED=$((TOTAL_FAILED + FAILED))
    
    SUITE_RESULTS+=("✗ $NAME: $PASSED passed, $FAILED failed")
    
    echo "" >> "$SUMMARY_FILE"
    echo "✗ $NAME" >> "$SUMMARY_FILE"
    echo "  Passed: $PASSED | Failed: $FAILED" >> "$SUMMARY_FILE"
  fi
  
  echo ""
  echo -e "${STATUS_COLOR}Status: $SUITE_STATUS${NC}"
  echo -e "Results saved: $OUTPUT_FILE"
  echo ""
  
  # Cooldown between suites (except after last one)
  if [ $i -lt $((${#SUITES[@]} - 1)) ]; then
    echo -e "${YELLOW}⏳ Cooldown: ${COOLDOWN_SECONDS}s to prevent rate limiting...${NC}"
    sleep $COOLDOWN_SECONDS
    echo ""
  fi
done

# Final summary
TOTAL_TESTS=$((TOTAL_PASSED + TOTAL_FAILED))
PASS_RATE=$(awk "BEGIN {printf \"%.1f\", ($TOTAL_PASSED / $TOTAL_TESTS) * 100}")

echo "" >> "$SUMMARY_FILE"
echo "==================================" >> "$SUMMARY_FILE"
echo "Final Results" >> "$SUMMARY_FILE"
echo "==================================" >> "$SUMMARY_FILE"
echo "Total Tests: $TOTAL_TESTS" >> "$SUMMARY_FILE"
echo "Passed: $TOTAL_PASSED" >> "$SUMMARY_FILE"
echo "Failed: $TOTAL_FAILED" >> "$SUMMARY_FILE"
echo "Pass Rate: ${PASS_RATE}%" >> "$SUMMARY_FILE"

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║            Final Test Results                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

for result in "${SUITE_RESULTS[@]}"; do
  if [[ $result == ✓* ]]; then
    echo -e "${GREEN}$result${NC}"
  else
    echo -e "${RED}$result${NC}"
  fi
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "Total Tests: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed: ${GREEN}$TOTAL_PASSED${NC}"
echo -e "Failed: ${RED}$TOTAL_FAILED${NC}"
echo -e "Pass Rate: ${YELLOW}${PASS_RATE}%${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Summary saved: $SUMMARY_FILE"
echo "Detailed logs: $RESULTS_DIR/"
echo ""

# Exit with success if pass rate >= 80%
if (( $(echo "$PASS_RATE >= 80.0" | bc -l) )); then
  echo -e "${GREEN}✓ Test suite PASSED (>= 80% pass rate)${NC}"
  exit 0
else
  echo -e "${RED}✗ Test suite FAILED (< 80% pass rate)${NC}"
  exit 1
fi
