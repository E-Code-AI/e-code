#!/bin/bash

# Start Polyglot Backend Services
# TypeScript (main) and Python ML services
# Container, file, and build operations are handled by the unified TypeScript executor

echo "🚀 Starting E-Code Polyglot Backend Services..."

# Set environment variables
export PYTHON_ML_PORT=${PYTHON_ML_PORT:-8081}

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  Port $port is already in use"
        return 1
    fi
    return 0
}

# Kill existing processes on our ports
echo "🧹 Cleaning up existing processes..."
pkill -f "python-ml"
sleep 2

# Start Python ML service
echo "🐍 Starting Python ML Service on port $PYTHON_ML_PORT..."
if check_port $PYTHON_ML_PORT; then
    cd services/python-ml
    # Install dependencies if needed
    if [ ! -d ".pythonlibs" ]; then
        echo "📦 Installing Python dependencies..."
        uv add -q fastapi uvicorn numpy pandas scikit-learn nltk textblob websockets
    fi
    
    # Start the service
    PYTHON_ML_PORT=$PYTHON_ML_PORT uv run python main.py &
    PYTHON_PID=$!
    cd ../..
    echo "✅ Python ML Service started with PID $PYTHON_PID"
else
    echo "❌ Cannot start Python service - port $PYTHON_ML_PORT in use"
fi

# Wait a moment for services to start
sleep 3

# Health check all services
echo "🔍 Checking service health..."

services=("localhost:$PYTHON_ML_PORT/health")
for service in "${services[@]}"; do
    if curl -s "http://$service" > /dev/null; then
        echo "✅ $service - Healthy"
    else
        echo "❌ $service - Not responding"
    fi
done

echo ""
echo "🎉 Polyglot Backend Services Status:"
echo "   🔷 TypeScript (main): http://localhost:${PORT:-5000}"
echo "   🐍 Python ML:        http://localhost:$PYTHON_ML_PORT"
echo ""
echo "📖 Available APIs:"
echo "   Container Operations: POST /api/containers/create"
echo "   File Operations:      POST /api/files/batch-operations"
echo "   Fast Builds:         POST /api/builds/fast-build"
echo "   Code Analysis:       POST /api/ai/code-analysis"
echo "   ML Training:         POST /api/ml/train-model"
echo "   Text Analysis:       POST /api/ai/text-analysis"
echo "   Data Processing:     POST /api/data/advanced-processing"
echo "   Smart Routing:       POST /api/smart-route"
echo "   Health Check:        GET /api/polyglot/health"
echo "   Capabilities:        GET /api/polyglot/capabilities"
echo ""

# Keep script running and monitor services
trap 'echo "🛑 Shutting down services..."; kill $PYTHON_PID 2>/dev/null; exit 0' SIGINT SIGTERM

echo "🎯 Services running. Press Ctrl+C to stop all services."
echo "📊 Monitor at: http://localhost:${PORT:-5000}/polyglot"

# Keep alive and monitor
while true; do
    sleep 30
    
    if ! kill -0 $PYTHON_PID 2>/dev/null; then
        echo "⚠️  Python ML Service stopped unexpectedly"
    fi
done
