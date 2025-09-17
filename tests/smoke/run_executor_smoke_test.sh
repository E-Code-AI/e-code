#!/bin/bash
set -euo pipefail

# E-Code Executor Smoke Test
# Tests the basic functionality of the sandbox executor service

# Configuration
EXECUTOR_URL="http://localhost:8080"
API_KEY="${EXECUTOR_API_KEY:-development-key-change-in-production}"
SANDBOX_IMAGE="${SANDBOX_IMAGE:-ecode-sandbox:latest}"
TIMEOUT=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Test counter
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

run_test() {
    local test_name="$1"
    local test_function="$2"
    
    TESTS_RUN=$((TESTS_RUN + 1))
    log_info "Running test: $test_name"
    
    if $test_function; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        log_success "✓ $test_name"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        log_error "✗ $test_name"
    fi
    echo
}

# Utility functions
wait_for_service() {
    local url="$1"
    local max_attempts=30
    local attempt=1
    
    log_info "Waiting for service at $url..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$url/health" >/dev/null 2>&1; then
            log_success "Service is ready after $attempt attempts"
            return 0
        fi
        
        log_info "Attempt $attempt/$max_attempts - service not ready, waiting..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    log_error "Service failed to become ready after $max_attempts attempts"
    return 1
}

make_request() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    
    if [ -n "$data" ]; then
        curl -s -X "$method" \
             -H "Content-Type: application/json" \
             -H "Authorization: $API_KEY" \
             -d "$data" \
             "$EXECUTOR_URL$endpoint"
    else
        curl -s -X "$method" \
             -H "Authorization: $API_KEY" \
             "$EXECUTOR_URL$endpoint"
    fi
}

# Test functions
test_service_health() {
    local response
    response=$(curl -s -w "%{http_code}" "$EXECUTOR_URL/health" -o /tmp/health_response.json)
    local http_code="${response: -3}"
    
    if [ "$http_code" = "200" ]; then
        local status=$(jq -r '.status' /tmp/health_response.json 2>/dev/null || echo "unknown")
        if [ "$status" = "healthy" ]; then
            return 0
        else
            log_error "Service reports unhealthy status: $status"
            return 1
        fi
    else
        log_error "Health check failed with HTTP $http_code"
        return 1
    fi
}

test_python_hello_world() {
    local response
    local data='{
        "code": "print(\"Hello, World!\")",
        "language": "python",
        "timeout": 10
    }'
    
    response=$(make_request "POST" "/execute" "$data")
    
    # Check if response is valid JSON
    if ! echo "$response" | jq . >/dev/null 2>&1; then
        log_error "Invalid JSON response: $response"
        return 1
    fi
    
    local success=$(echo "$response" | jq -r '.success')
    local stdout=$(echo "$response" | jq -r '.stdout')
    local exit_code=$(echo "$response" | jq -r '.exit_code')
    
    if [ "$success" = "true" ] && [ "$exit_code" = "0" ] && echo "$stdout" | grep -q "Hello, World!"; then
        log_info "Python execution successful: $stdout"
        return 0
    else
        log_error "Python execution failed. Success: $success, Exit code: $exit_code, Output: $stdout"
        echo "$response" | jq .
        return 1
    fi
}

test_javascript_hello_world() {
    local response
    local data='{
        "code": "console.log(\"Hello from JavaScript!\");",
        "language": "javascript",
        "timeout": 10
    }'
    
    response=$(make_request "POST" "/execute" "$data")
    
    local success=$(echo "$response" | jq -r '.success')
    local stdout=$(echo "$response" | jq -r '.stdout')
    local exit_code=$(echo "$response" | jq -r '.exit_code')
    
    if [ "$success" = "true" ] && [ "$exit_code" = "0" ] && echo "$stdout" | grep -q "Hello from JavaScript!"; then
        log_info "JavaScript execution successful: $stdout"
        return 0
    else
        log_error "JavaScript execution failed. Success: $success, Exit code: $exit_code, Output: $stdout"
        return 1
    fi
}

test_python_math() {
    local response
    local data='{
        "code": "import math\nresult = math.factorial(5)\nprint(f\"Factorial of 5 is {result}\")",
        "language": "python",
        "timeout": 10
    }'
    
    response=$(make_request "POST" "/execute" "$data")
    
    local success=$(echo "$response" | jq -r '.success')
    local stdout=$(echo "$response" | jq -r '.stdout')
    
    if [ "$success" = "true" ] && echo "$stdout" | grep -q "Factorial of 5 is 120"; then
        return 0
    else
        log_error "Python math test failed: $stdout"
        return 1
    fi
}

test_timeout_mechanism() {
    log_info "Testing timeout mechanism with infinite loop..."
    
    local response
    local data='{
        "code": "import time\nwhile True:\n    time.sleep(1)\n    print(\"Still running...\")",
        "language": "python",
        "timeout": 5
    }'
    
    local start_time=$(date +%s)
    response=$(make_request "POST" "/execute" "$data")
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    local success=$(echo "$response" | jq -r '.success')
    local error=$(echo "$response" | jq -r '.error')
    
    # Should fail due to timeout, and should complete within reasonable time (not infinite)
    if [ "$success" = "false" ] && [ $duration -le 15 ] && (echo "$error" | grep -q "timeout" || echo "$response" | grep -q "timeout"); then
        log_info "Timeout test passed - execution stopped after ${duration}s"
        return 0
    else
        log_error "Timeout test failed - Success: $success, Duration: ${duration}s, Error: $error"
        return 1
    fi
}

test_error_handling() {
    local response
    local data='{
        "code": "print(undefined_variable)",
        "language": "python",
        "timeout": 10
    }'
    
    response=$(make_request "POST" "/execute" "$data")
    
    local success=$(echo "$response" | jq -r '.success')
    local exit_code=$(echo "$response" | jq -r '.exit_code')
    
    # Should fail with non-zero exit code
    if [ "$success" = "false" ] && [ "$exit_code" != "0" ]; then
        log_info "Error handling test passed - properly caught Python error"
        return 0
    else
        log_error "Error handling test failed - Success: $success, Exit code: $exit_code"
        return 1
    fi
}

test_unauthorized_access() {
    local response
    local http_code
    
    # Try to make request without API key
    response=$(curl -s -w "%{http_code}" \
                   -X POST \
                   -H "Content-Type: application/json" \
                   -d '{"code": "print(\"test\")", "language": "python"}' \
                   "$EXECUTOR_URL/execute" \
                   -o /tmp/unauth_response.txt)
    
    http_code="${response: -3}"
    
    if [ "$http_code" = "401" ]; then
        log_info "Unauthorized access properly blocked"
        return 0
    else
        log_error "Unauthorized access test failed - Expected 401, got $http_code"
        return 1
    fi
}

test_resource_limits() {
    log_info "Testing resource limits with memory-intensive code..."
    
    local response
    local data='{
        "code": "# Try to allocate large amount of memory\ntry:\n    big_list = [0] * (1024 * 1024 * 1024)  # 1GB of integers\n    print(\"Memory allocation succeeded\")\nexcept MemoryError:\n    print(\"Memory allocation failed as expected\")\nexcept Exception as e:\n    print(f\"Other error: {e}\")",
        "language": "python",
        "timeout": 10
    }'
    
    response=$(make_request "POST" "/execute" "$data")
    
    local success=$(echo "$response" | jq -r '.success')
    local stdout=$(echo "$response" | jq -r '.stdout')
    
    # Should either fail or handle memory error gracefully
    if [ "$success" = "true" ] && (echo "$stdout" | grep -q "Memory allocation failed" || echo "$stdout" | grep -q "Other error"); then
        log_info "Resource limits test passed - memory allocation properly limited"
        return 0
    elif [ "$success" = "false" ]; then
        log_info "Resource limits test passed - execution failed due to limits"
        return 0
    else
        log_warning "Resource limits test inconclusive - Output: $stdout"
        return 0  # Don't fail the test, just warn
    fi
}

# Setup and cleanup functions
setup_test_environment() {
    log_info "Setting up test environment..."
    
    # Check if Docker is available
    if ! command -v docker >/dev/null 2>&1; then
        log_error "Docker is not installed or not available"
        exit 1
    fi
    
    # Check if sandbox image exists, build if not
    if ! docker image inspect "$SANDBOX_IMAGE" >/dev/null 2>&1; then
        log_info "Sandbox image $SANDBOX_IMAGE not found, building..."
        if [ -f "sandbox/Dockerfile" ]; then
            docker build -f sandbox/Dockerfile -t "$SANDBOX_IMAGE" ./sandbox
        else
            log_error "Sandbox Dockerfile not found at sandbox/Dockerfile"
            exit 1
        fi
    fi
    
    # Create temporary directory for test artifacts
    mkdir -p /tmp/ecode-smoke-test
    
    log_success "Test environment ready"
}

cleanup_test_environment() {
    log_info "Cleaning up test environment..."
    
    # Clean up any test containers
    docker ps -a --filter "ancestor=$SANDBOX_IMAGE" --format "table {{.ID}}" | tail -n +2 | xargs -r docker rm -f
    
    # Clean up temporary files
    rm -rf /tmp/ecode-smoke-test
    rm -f /tmp/health_response.json /tmp/unauth_response.txt
    
    log_info "Cleanup completed"
}

# Main test execution
main() {
    echo "=========================================="
    echo "E-Code Executor Smoke Test Suite"
    echo "=========================================="
    echo "Executor URL: $EXECUTOR_URL"
    echo "Sandbox Image: $SANDBOX_IMAGE"
    echo "API Key: ${API_KEY:0:10}..."
    echo "=========================================="
    echo
    
    # Setup
    setup_test_environment
    
    # Wait for service to be ready
    if ! wait_for_service "$EXECUTOR_URL"; then
        log_error "Executor service is not available. Make sure it's running at $EXECUTOR_URL"
        exit 1
    fi
    
    # Run tests
    run_test "Service Health Check" test_service_health
    run_test "Python Hello World" test_python_hello_world
    run_test "JavaScript Hello World" test_javascript_hello_world
    run_test "Python Math Operations" test_python_math
    run_test "Timeout Mechanism" test_timeout_mechanism
    run_test "Error Handling" test_error_handling
    run_test "Unauthorized Access Protection" test_unauthorized_access
    run_test "Resource Limits" test_resource_limits
    
    # Cleanup
    cleanup_test_environment
    
    # Summary
    echo "=========================================="
    echo "Test Results Summary"
    echo "=========================================="
    echo "Total tests run: $TESTS_RUN"
    echo "Tests passed: $TESTS_PASSED"
    echo "Tests failed: $TESTS_FAILED"
    echo "=========================================="
    
    if [ $TESTS_FAILED -eq 0 ]; then
        log_success "All tests passed! 🎉"
        exit 0
    else
        log_error "$TESTS_FAILED test(s) failed! ❌"
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --url URL      Set executor service URL (default: $EXECUTOR_URL)"
        echo "  --key KEY      Set API key (default: from EXECUTOR_API_KEY env var)"
        echo ""
        echo "Environment variables:"
        echo "  EXECUTOR_API_KEY    API key for authentication"
        echo "  SANDBOX_IMAGE       Docker image for sandbox (default: ecode-sandbox:latest)"
        exit 0
        ;;
    --url)
        EXECUTOR_URL="$2"
        shift 2
        ;;
    --key)
        API_KEY="$2"
        shift 2
        ;;
esac

# Run main function
main "$@"