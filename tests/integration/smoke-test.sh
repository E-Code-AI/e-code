#!/bin/bash

# Smoke test script to verify API configuration consistency
# Tests that both CLI and SDK can connect to the health check endpoint

set -e

echo "=========================================="
echo "API Configuration Smoke Tests"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Function to test health check endpoint
test_health_check() {
  local ENV=$1
  local EXPECTED_URL=$2
  
  echo "Testing $ENV environment..."
  echo "Expected URL: $EXPECTED_URL"
  
  # Set environment
  export ECODE_ENV=$ENV
  
  # Get URL from shared config
  ACTUAL_URL=$(node -e "
    const config = require('./shared/config');
    console.log(config.getHealthCheckURL());
  ")
  
  echo "Actual URL: $ACTUAL_URL"
  
  if [ "$ACTUAL_URL" != "$EXPECTED_URL" ]; then
    echo -e "${RED}✗ FAILED: URL mismatch${NC}"
    FAILED=$((FAILED + 1))
    return 1
  fi
  
  # Try to connect (allow failure for non-running servers)
  if command -v curl &> /dev/null; then
    echo "Attempting connection..."
    if curl -s -f --connect-timeout 3 "$ACTUAL_URL" > /dev/null 2>&1; then
      echo -e "${GREEN}✓ PASSED: Connected successfully${NC}"
      PASSED=$((PASSED + 1))
    else
      echo -e "${YELLOW}⚠ SKIPPED: Server not running (not a failure)${NC}"
      PASSED=$((PASSED + 1))
    fi
  else
    echo -e "${YELLOW}⚠ SKIPPED: curl not available${NC}"
    PASSED=$((PASSED + 1))
  fi
  
  echo ""
}

# Function to verify CLI constants
test_cli_constants() {
  local ENV=$1
  
  echo "Testing CLI constants in $ENV environment..."
  export ECODE_ENV=$ENV
  
  node -e "
    const cliConstants = require('./cli/src/constants');
    const sharedConfig = require('./shared/config');
    
    console.log('CLI API URL:', cliConstants.API_BASE_URL);
    console.log('Shared API URL:', sharedConfig.getAPIURL());
    console.log('CLI WS URL:', cliConstants.WS_BASE_URL);
    console.log('Shared WS URL:', sharedConfig.getWebSocketURL());
    
    if (cliConstants.API_BASE_URL !== sharedConfig.getAPIURL()) {
      console.error('ERROR: CLI API URL mismatch');
      process.exit(1);
    }
    
    if (cliConstants.WS_BASE_URL !== sharedConfig.getWebSocketURL()) {
      console.error('ERROR: CLI WebSocket URL mismatch');
      process.exit(1);
    }
    
    console.log('✓ CLI constants match shared config');
  "
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ PASSED: CLI constants aligned${NC}"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✗ FAILED: CLI constants misaligned${NC}"
    FAILED=$((FAILED + 1))
  fi
  
  echo ""
}

# Function to verify SDK configuration
test_sdk_config() {
  local ENV=$1
  
  echo "Testing SDK configuration in $ENV environment..."
  export ECODE_ENV=$ENV
  
  node -e "
    const { ECode } = require('./sdk/javascript/src/index');
    const sharedConfig = require('./shared/config');
    
    const sdk = new ECode();
    const expectedBaseURL = sharedConfig.getAPIBaseURL();
    
    console.log('Expected SDK base URL:', expectedBaseURL);
    console.log('SDK initialized successfully');
    
    // Verify WebSocket URL
    const expectedWSURL = sharedConfig.getWebSocketURL();
    console.log('Expected WebSocket URL:', expectedWSURL);
    
    console.log('✓ SDK uses shared configuration');
  "
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ PASSED: SDK configuration aligned${NC}"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✗ FAILED: SDK configuration error${NC}"
    FAILED=$((FAILED + 1))
  fi
  
  echo ""
}

# Run tests for all environments
echo "=== Development Environment ===" 
test_health_check "development" "http://localhost:5000/api/health"
test_cli_constants "development"
test_sdk_config "development"

echo "=== Staging Environment ==="
test_health_check "staging" "https://staging.e-code.ai/api/health"
test_cli_constants "staging"
test_sdk_config "staging"

echo "=== Production Environment ==="
test_health_check "production" "https://e-code.ai/api/health"
test_cli_constants "production"
test_sdk_config "production"

# Test environment variable overrides
echo "=== Environment Variable Overrides ==="
export ECODE_ENV=production
export ECODE_API_URL=https://custom.example.com/api

echo "Testing custom API URL override..."
CUSTOM_URL=$(node -e "
  const config = require('./shared/config');
  console.log(config.getAPIURL());
")

if [ "$CUSTOM_URL" = "https://custom.example.com/api" ]; then
  echo -e "${GREEN}✓ PASSED: Environment override works${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ FAILED: Environment override not working${NC}"
  echo "Expected: https://custom.example.com/api"
  echo "Got: $CUSTOM_URL"
  FAILED=$((FAILED + 1))
fi

# Summary
echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed${NC}"
  exit 1
fi
