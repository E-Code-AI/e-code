#!/bin/bash

# E-Code Platform - Development Startup Script
# Starts backend and frontend servers with proper health checks

set -e

echo "🚀 E-Code Platform - Starting Development Environment"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js not found. Please install Node.js 20.x or higher.${NC}"
  exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✅ Node.js${NC} $NODE_VERSION"

# Check npm
if ! command -v npm &> /dev/null; then
  echo -e "${RED}❌ npm not found.${NC}"
  exit 1
fi

NPM_VERSION=$(npm -v)
echo -e "${GREEN}✅ npm${NC} $NPM_VERSION"

# Check PostgreSQL (optional warning)
if ! command -v psql &> /dev/null; then
  echo -e "${YELLOW}⚠️  PostgreSQL CLI (psql) not found in PATH${NC}"
  echo -e "${YELLOW}   If you have PostgreSQL installed, this is OK${NC}"
fi

# Check if .env exists
if [ ! -f ".env" ]; then
  echo -e "${YELLOW}⚠️  .env file not found. Copying from .env.example...${NC}"
  if [ -f ".env.example" ]; then
    cp .env.example .env
    echo -e "${GREEN}✅ .env file created. Please edit it with your configuration.${NC}"
  else
    echo -e "${RED}❌ .env.example not found. Cannot create .env file.${NC}"
    exit 1
  fi
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}⚠️  node_modules not found. Running npm install...${NC}"
  npm install
fi

if [ ! -d "client/node_modules" ]; then
  echo -e "${YELLOW}⚠️  client/node_modules not found. Installing client dependencies...${NC}"
  cd client && npm install && cd ..
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 Starting E-Code Platform Services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Function to check if port is in use
check_port() {
  local port=$1
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}⚠️  Port $port is already in use${NC}"
    echo "   You may need to stop the existing process or change the port"
    return 1
  fi
  return 0
}

# Check ports
check_port 5000 || true
check_port 5173 || true

echo ""
echo -e "${GREEN}🔧 Backend Server${NC} - Starting on port 5000..."
echo -e "${GREEN}🎨 Frontend Server${NC} - Starting on port 5173..."
echo ""

# Create log directory
mkdir -p logs

# Start backend in background
echo "📝 Backend logs: logs/backend.log"
npm run dev > logs/backend.log 2>&1 &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Check if backend started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
  echo -e "${RED}❌ Backend failed to start. Check logs/backend.log${NC}"
  tail -20 logs/backend.log
  exit 1
fi

# Start frontend in background
echo "📝 Frontend logs: logs/frontend.log"
cd client
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
sleep 3

# Check if frontend started successfully
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
  echo -e "${RED}❌ Frontend failed to start. Check logs/frontend.log${NC}"
  tail -20 logs/frontend.log
  kill $BACKEND_PID 2>/dev/null || true
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✨ E-Code Platform Started Successfully!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Frontend:  http://localhost:5173"
echo "⚙️  Backend:   http://localhost:5000"
echo "📚 API Docs:  http://localhost:5000/api-docs"
echo "🏥 Health:    http://localhost:5000/health"
echo ""
echo "📊 Process IDs:"
echo "   Backend:  $BACKEND_PID"
echo "   Frontend: $FRONTEND_PID"
echo ""
echo "📝 Logs:"
echo "   Backend:  tail -f logs/backend.log"
echo "   Frontend: tail -f logs/frontend.log"
echo ""
echo "🛑 To stop: Press Ctrl+C or run: kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Function to cleanup on exit
cleanup() {
  echo ""
  echo "🛑 Shutting down E-Code Platform..."
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  echo "✅ Shutdown complete"
  exit 0
}

# Trap Ctrl+C and call cleanup
trap cleanup INT TERM

# Keep script running and show logs
echo ""
echo "📊 Showing combined logs (Ctrl+C to stop):"
echo ""

# Follow both logs
tail -f logs/backend.log logs/frontend.log 2>/dev/null || {
  echo "Waiting for services..."
  wait
}
