#!/bin/bash

# 🚀 Script de Test des Endpoints Fortune 500
# Usage: ./test-fortune500-endpoints.sh [BASE_URL]
# Example: ./test-fortune500-endpoints.sh https://votre-app.replit.app

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Base URL (default to localhost)
BASE_URL="${1:-http://localhost:5000}"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     FORTUNE 500 ENDPOINTS TEST - E-CODE PLATFORM          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Base URL: ${BASE_URL}${NC}"
echo ""

# Test function
test_endpoint() {
    local name=$1
    local endpoint=$2
    local expected_status=${3:-200}

    echo -e "${BLUE}▶ Testing: ${name}${NC}"
    echo -e "  Endpoint: ${endpoint}"

    response=$(curl -s -w "\n%{http_code}" "${BASE_URL}${endpoint}")
    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" -eq "$expected_status" ]; then
        echo -e "  ${GREEN}✓ Status: ${http_code} (Expected: ${expected_status})${NC}"
        if command -v jq &> /dev/null; then
            echo -e "  ${GREEN}✓ Response:${NC}"
            echo "$body" | jq '.' 2>/dev/null || echo "$body" | head -c 200
        else
            echo -e "  ${GREEN}✓ Response: ${body:0:100}...${NC}"
        fi
    else
        echo -e "  ${RED}✗ Status: ${http_code} (Expected: ${expected_status})${NC}"
        echo -e "  ${RED}✗ Response: ${body:0:100}${NC}"
    fi
    echo ""
}

# 1. Basic Health Check
echo -e "${YELLOW}═══ 1. BASIC HEALTH CHECK ═══${NC}"
test_endpoint "Basic Health" "/health" 200

# 2. Kubernetes Health Checks
echo -e "${YELLOW}═══ 2. KUBERNETES HEALTH CHECKS ═══${NC}"
test_endpoint "Liveness Probe" "/health/liveness" 200
test_endpoint "Readiness Probe" "/health/readiness" 200

# 3. Detailed Health
echo -e "${YELLOW}═══ 3. DETAILED DIAGNOSTICS ═══${NC}"
test_endpoint "Detailed Health" "/health/detailed" 200

# 4. Prometheus Metrics
echo -e "${YELLOW}═══ 4. PROMETHEUS METRICS ═══${NC}"
test_endpoint "Metrics Endpoint" "/metrics" 200

# 5. API Documentation
echo -e "${YELLOW}═══ 5. API DOCUMENTATION ═══${NC}"
test_endpoint "Swagger UI" "/api/docs" 301
test_endpoint "OpenAPI JSON" "/api/docs/json" 200

# 6. CORS Health
echo -e "${YELLOW}═══ 6. CORS CONFIGURATION ═══${NC}"
test_endpoint "CORS Health" "/api/cors-health" 200

# Summary
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    TEST SUMMARY                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓ All Fortune 500 endpoints tested${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Open Swagger UI: ${BASE_URL}/api/docs"
echo -e "  2. View Metrics: ${BASE_URL}/metrics"
echo -e "  3. Check Detailed Health: ${BASE_URL}/health/detailed"
echo -e "  4. Monitor Logs: tail -f logs/application.log"
echo ""
echo -e "${BLUE}For more information, see: GUIDE-UTILISATION-FORTUNE-500.md${NC}"
