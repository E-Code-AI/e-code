#!/bin/bash

#############################################################################
# Workspace Quick-Start Script
# This script initializes and starts the E-Code workspace environment
#############################################################################

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          E-Code Workspace Initialization Script               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status messages
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Step 1: Check if dependencies are installed
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Checking dependencies..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -d "node_modules" ]; then
    print_warning "node_modules not found. Installing dependencies..."
    npm install
    print_success "Dependencies installed!"
else
    print_success "Dependencies already installed"
fi

echo ""

# Step 2: Check PostgreSQL
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Checking PostgreSQL database..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if PostgreSQL is running
if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    print_success "PostgreSQL is running"
else
    print_warning "PostgreSQL is not running. Attempting to start..."

    # Check if data directory is initialized
    PG_DATA_DIR="/var/lib/postgresql/16/main"

    if [ ! -d "$PG_DATA_DIR" ] || [ -z "$(ls -A $PG_DATA_DIR 2>/dev/null)" ]; then
        print_status "Initializing PostgreSQL data directory..."
        mkdir -p "$PG_DATA_DIR"
        /usr/lib/postgresql/16/bin/initdb -D "$PG_DATA_DIR" -U postgres
        print_success "PostgreSQL initialized"
    fi

    # Start PostgreSQL
    print_status "Starting PostgreSQL server..."
    /usr/lib/postgresql/16/bin/pg_ctl -D "$PG_DATA_DIR" -l /tmp/postgres.log start -o "-p 5432"

    # Wait for PostgreSQL to start
    sleep 3

    if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
        print_success "PostgreSQL started successfully"
    else
        print_error "Failed to start PostgreSQL"
        print_error "Check logs at: /tmp/postgres.log"
        exit 1
    fi
fi

echo ""

# Step 3: Check/Create database and user
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Checking database and user..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Create user if doesn't exist
print_status "Checking/creating database user..."
psql -U postgres -h localhost -c "SELECT 1" >/dev/null 2>&1 || {
    print_error "Cannot connect to PostgreSQL as postgres user"
    print_warning "You may need to run: sudo -u postgres psql"
}

# Try to create user and database (ignore errors if they exist)
psql -U postgres -h localhost -c "CREATE USER ecode WITH SUPERUSER PASSWORD 'password';" 2>/dev/null && \
    print_success "User 'ecode' created" || \
    print_status "User 'ecode' already exists"

psql -U postgres -h localhost -c "CREATE DATABASE ecode_dev OWNER ecode;" 2>/dev/null && \
    print_success "Database 'ecode_dev' created" || \
    print_status "Database 'ecode_dev' already exists"

echo ""

# Step 4: Run database migrations
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4: Running database migrations..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

print_status "Applying database schema..."
npm run db:push || {
    print_warning "Database push failed or skipped"
    print_status "You may need to run 'npm run db:push' manually"
}

echo ""

# Step 5: Check environment variables
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 5: Checking environment configuration..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f ".env" ]; then
    print_success "Found .env file"
    export $(grep -v '^#' .env | xargs)
else
    print_warning ".env file not found"
fi

# Check critical environment variables
if [ -z "$DATABASE_URL" ]; then
    print_warning "DATABASE_URL not set, using default from .env"
    export DATABASE_URL="postgresql://ecode:password@localhost:5432/ecode_dev"
fi

if [ -z "$PORT" ]; then
    print_warning "PORT not set, using default: 5000"
    export PORT=5000
fi

if [ -z "$NODE_ENV" ]; then
    print_warning "NODE_ENV not set, using: development"
    export NODE_ENV=development
fi

print_status "Environment: $NODE_ENV"
print_status "Port: $PORT"
print_status "Database: ${DATABASE_URL%%@*}@***"

echo ""

# Step 6: Start the application
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 6: Starting application..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

print_success "All checks passed! Starting E-Code server..."
echo ""
print_status "Application will be available at: http://localhost:$PORT"
print_status "WebSocket endpoint: ws://localhost:$PORT/ws/agent"
echo ""
print_status "Press Ctrl+C to stop the server"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Run the application
npm run dev
