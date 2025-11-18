#!/bin/bash

# 📊 Dashboard de Monitoring en Temps Réel
# Usage: ./monitor-dashboard.sh [BASE_URL]

BASE_URL="${1:-http://localhost:5000}"
REFRESH_INTERVAL=5  # secondes

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# Function to get health data
get_health() {
    curl -s "${BASE_URL}/health/detailed" 2>/dev/null
}

# Function to get metrics
get_metrics() {
    curl -s "${BASE_URL}/metrics" 2>/dev/null
}

# Clear screen and show header
show_header() {
    clear
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║          E-CODE PLATFORM - FORTUNE 500 MONITORING DASHBOARD           ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}Server: ${BASE_URL}${NC}"
    echo -e "${CYAN}Refresh: ${REFRESH_INTERVAL}s | Press Ctrl+C to exit${NC}"
    echo -e "${CYAN}Time: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo ""
}

# Main monitoring loop
while true; do
    show_header

    # Get health data
    health_data=$(get_health)

    if [ -z "$health_data" ]; then
        echo -e "${RED}⚠️  Server not responding${NC}"
        echo ""
        echo -e "${YELLOW}Troubleshooting:${NC}"
        echo "  1. Check if server is running: npm run dev"
        echo "  2. Verify URL: $BASE_URL"
        echo "  3. Check firewall/network"
        sleep $REFRESH_INTERVAL
        continue
    fi

    # Parse status
    status=$(echo "$health_data" | jq -r '.status' 2>/dev/null)

    # Show status
    echo -e "${YELLOW}═══ SYSTEM STATUS ═══${NC}"
    if [ "$status" = "healthy" ]; then
        echo -e "  ${GREEN}● HEALTHY${NC}"
    elif [ "$status" = "degraded" ]; then
        echo -e "  ${YELLOW}◐ DEGRADED${NC}"
    else
        echo -e "  ${RED}○ UNHEALTHY${NC}"
    fi
    echo ""

    # Show uptime and version
    if command -v jq &> /dev/null; then
        uptime=$(echo "$health_data" | jq -r '.uptime // 0')
        version=$(echo "$health_data" | jq -r '.version // "N/A"')

        # Convert uptime to human readable
        hours=$((uptime / 3600))
        minutes=$(((uptime % 3600) / 60))
        seconds=$((uptime % 60))

        echo -e "${YELLOW}═══ PLATFORM INFO ═══${NC}"
        echo -e "  Version: ${version}"
        echo -e "  Uptime: ${hours}h ${minutes}m ${seconds}s"
        echo ""

        # Show health checks
        echo -e "${YELLOW}═══ HEALTH CHECKS ═══${NC}"

        db_status=$(echo "$health_data" | jq -r '.checks.database.status // "unknown"')
        db_latency=$(echo "$health_data" | jq -r '.checks.database.latency // 0')
        if [ "$db_status" = "healthy" ]; then
            echo -e "  ${GREEN}✓${NC} Database (${db_latency}ms)"
        else
            echo -e "  ${RED}✗${NC} Database"
        fi

        mem_status=$(echo "$health_data" | jq -r '.checks.memory.status // "unknown"')
        mem_usage=$(echo "$health_data" | jq -r '.checks.memory.usage // 0')
        if [ "$mem_status" = "healthy" ]; then
            echo -e "  ${GREEN}✓${NC} Memory (${mem_usage}%)"
        else
            echo -e "  ${RED}✗${NC} Memory (${mem_usage}%)"
        fi

        disk_status=$(echo "$health_data" | jq -r '.checks.disk.status // "unknown"')
        disk_usage=$(echo "$health_data" | jq -r '.checks.disk.usage // 0')
        if [ "$disk_status" = "healthy" ]; then
            echo -e "  ${GREEN}✓${NC} Disk (${disk_usage}%)"
        else
            echo -e "  ${RED}✗${NC} Disk (${disk_usage}%)"
        fi
        echo ""

        # Show metrics
        echo -e "${YELLOW}═══ PERFORMANCE METRICS ═══${NC}"
        rpm=$(echo "$health_data" | jq -r '.metrics.requestsPerMinute // 0')
        avg_response=$(echo "$health_data" | jq -r '.metrics.averageResponseTime // 0')
        error_rate=$(echo "$health_data" | jq -r '.metrics.errorRate // 0')

        echo -e "  Requests/min: ${rpm}"

        if (( $(echo "$avg_response < 100" | bc -l) )); then
            echo -e "  Avg Response: ${GREEN}${avg_response}ms${NC}"
        elif (( $(echo "$avg_response < 500" | bc -l) )); then
            echo -e "  Avg Response: ${YELLOW}${avg_response}ms${NC}"
        else
            echo -e "  Avg Response: ${RED}${avg_response}ms${NC}"
        fi

        if (( $(echo "$error_rate < 0.01" | bc -l) )); then
            echo -e "  Error Rate: ${GREEN}${error_rate}%${NC}"
        elif (( $(echo "$error_rate < 0.05" | bc -l) )); then
            echo -e "  Error Rate: ${YELLOW}${error_rate}%${NC}"
        else
            echo -e "  Error Rate: ${RED}${error_rate}%${NC}"
        fi
    else
        echo -e "${YELLOW}Note: Install 'jq' for detailed metrics display${NC}"
        echo "$health_data" | head -20
    fi

    echo ""
    echo -e "${BLUE}────────────────────────────────────────────────────────────${NC}"
    echo ""

    # Wait before next refresh
    sleep $REFRESH_INTERVAL
done
