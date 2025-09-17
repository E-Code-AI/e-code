#!/bin/bash
set -euo pipefail

# Sandbox entrypoint script for secure code execution
# Runs inside the container to execute user code safely

# Default values - can be overridden by environment variables
TIMEOUT_SEC=${TIMEOUT_SEC:-30}
MEMORY_LIMIT=${MEMORY_LIMIT:-512m}
WORKSPACE=${WORKSPACE:-/workspace}

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >&2
}

# Function to clean up on exit
cleanup() {
    local exit_code=$?
    log "Cleanup: Exit code $exit_code"
    
    # Kill any remaining processes in our process group
    if [ $$ -ne 1 ]; then
        kill -TERM -$$ 2>/dev/null || true
        sleep 1
        kill -KILL -$$ 2>/dev/null || true
    fi
    
    exit $exit_code
}

# Set up signal handlers
trap cleanup EXIT INT TERM

# Ensure we're in the workspace directory
cd "$WORKSPACE"

# If no command provided, show usage
if [ $# -eq 0 ]; then
    log "No command provided. Usage: entrypoint.sh <command> [args...]"
    echo "Available runtimes:"
    echo "  Python: python3 script.py"
    echo "  Node.js: node script.js"
    echo "  Java: javac Program.java && java Program"
    echo "  Go: go run main.go"
    echo "  Bash: bash script.sh"
    exit 1
fi

log "Starting execution: $*"
log "Timeout: ${TIMEOUT_SEC}s, Memory limit: ${MEMORY_LIMIT}, Workspace: ${WORKSPACE}"

# Resource monitoring function (runs in background)
monitor_resources() {
    while true; do
        # Basic resource monitoring - can be enhanced
        if command -v ps >/dev/null 2>&1; then
            local mem_usage=$(ps -o pid,pcpu,pmem,args --no-headers 2>/dev/null | head -5)
            if [ -n "$mem_usage" ]; then
                log "Resource usage: $mem_usage"
            fi
        fi
        sleep 5
    done
}

# Start resource monitoring in background (optional)
if [ "${ENABLE_MONITORING:-false}" = "true" ]; then
    monitor_resources &
    MONITOR_PID=$!
fi

# Security: Drop additional capabilities if available
if command -v capsh >/dev/null 2>&1; then
    log "Dropping capabilities (if available)"
    # Note: This may not work in all container runtimes
    capsh --drop=all -- -c "$*" 2>/dev/null || exec "$@"
else
    # Use timeout command if available, otherwise exec directly
    if command -v timeout >/dev/null 2>&1; then
        log "Using timeout command for execution"
        timeout "${TIMEOUT_SEC}s" "$@"
    else
        log "Direct execution (no timeout available)"
        exec "$@"
    fi
fi

# Note: If we reach here, the command completed successfully
log "Execution completed successfully"