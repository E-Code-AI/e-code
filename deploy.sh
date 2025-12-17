#!/bin/bash
#
# E-Code Platform - Production Deployment Script
# For Replit Reserved VM with Docker
#
# Usage: ./deploy.sh [command]
# Commands:
#   up      - Start all services (default)
#   down    - Stop all services
#   restart - Restart all services
#   logs    - View logs
#   status  - Check service status
#   backup  - Backup database
#   update  - Pull latest code and redeploy
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
PROJECT_NAME="ecode"
BACKUP_DIR="./backups"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    if [ ! -f ".env.production" ]; then
        if [ -f ".env.production.example" ]; then
            log_warn ".env.production not found. Copying from .env.production.example..."
            cp .env.production.example .env.production
            log_warn "Please edit .env.production with your actual values!"
        else
            log_error ".env.production not found. Please create it first."
            exit 1
        fi
    fi
    
    log_success "Prerequisites check passed"
}

# Start services
start_services() {
    log_info "Starting E-Code Platform services..."
    
    # Use docker compose (v2) or docker-compose (v1)
    if docker compose version &> /dev/null; then
        docker compose -f $COMPOSE_FILE -p $PROJECT_NAME up -d --build
    else
        docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME up -d --build
    fi
    
    log_success "Services started successfully"
    log_info "Waiting for health checks..."
    sleep 10
    show_status
}

# Stop services
stop_services() {
    log_info "Stopping E-Code Platform services..."
    
    if docker compose version &> /dev/null; then
        docker compose -f $COMPOSE_FILE -p $PROJECT_NAME down
    else
        docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME down
    fi
    
    log_success "Services stopped"
}

# Restart services
restart_services() {
    log_info "Restarting E-Code Platform services..."
    stop_services
    start_services
}

# Show logs
show_logs() {
    log_info "Showing logs (Ctrl+C to exit)..."
    
    if docker compose version &> /dev/null; then
        docker compose -f $COMPOSE_FILE -p $PROJECT_NAME logs -f
    else
        docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME logs -f
    fi
}

# Show status
show_status() {
    log_info "Service Status:"
    echo ""
    
    if docker compose version &> /dev/null; then
        docker compose -f $COMPOSE_FILE -p $PROJECT_NAME ps
    else
        docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME ps
    fi
    
    echo ""
    log_info "Health Check URLs:"
    echo "  - Liveness:  http://localhost:5000/health/liveness"
    echo "  - Readiness: http://localhost:5000/health/readiness"
    echo "  - Deep:      http://localhost:5000/health/deep"
    echo "  - Metrics:   http://localhost:5000/metrics"
    echo "  - API Docs:  http://localhost:5000/api/docs"
}

# Backup database
backup_database() {
    log_info "Backing up database..."
    
    mkdir -p $BACKUP_DIR
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/ecode_backup_$TIMESTAMP.sql"
    
    docker exec ecode-postgres pg_dump -U ecode ecode > $BACKUP_FILE
    
    if [ -f "$BACKUP_FILE" ]; then
        gzip $BACKUP_FILE
        log_success "Database backed up to ${BACKUP_FILE}.gz"
    else
        log_error "Backup failed"
        exit 1
    fi
}

# Update and redeploy
update_deploy() {
    log_info "Pulling latest code..."
    git pull origin main
    
    log_info "Rebuilding and redeploying..."
    start_services
    
    log_info "Cleaning up old images..."
    docker system prune -f
    
    log_success "Update complete!"
}

# Cleanup
cleanup() {
    log_info "Cleaning up Docker resources..."
    docker system prune -f
    docker volume prune -f
    log_success "Cleanup complete"
}

# Main
main() {
    echo ""
    echo "=========================================="
    echo "   E-Code Platform Deployment Script"
    echo "=========================================="
    echo ""
    
    COMMAND=${1:-up}
    
    case $COMMAND in
        up|start)
            check_prerequisites
            start_services
            ;;
        down|stop)
            stop_services
            ;;
        restart)
            check_prerequisites
            restart_services
            ;;
        logs)
            show_logs
            ;;
        status|ps)
            show_status
            ;;
        backup)
            backup_database
            ;;
        update)
            check_prerequisites
            update_deploy
            ;;
        cleanup)
            cleanup
            ;;
        *)
            echo "Usage: $0 {up|down|restart|logs|status|backup|update|cleanup}"
            exit 1
            ;;
    esac
}

main "$@"
