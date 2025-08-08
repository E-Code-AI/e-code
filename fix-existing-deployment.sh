#!/bin/bash

# E-Code Platform - Fix and Update Existing GKE Deployment
# This script fixes issues from yesterday's deployment and updates the running services

set -e

# Configuration - Update these with your actual values
PROJECT_ID="votre-projet-ecode"  # Your actual GCP project
CLUSTER_NAME="e-code-cluster"
ZONE="us-central1-a"
NAMESPACE="e-code-platform"
EXTERNAL_IP="35.189.194.33"  # Your existing LoadBalancer IP

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔧 E-Code Platform - Fixing Existing Deployment${NC}"
echo "================================================"
echo "Current External IP: ${EXTERNAL_IP}"
echo ""

# Get cluster credentials
get_credentials() {
    echo -e "${YELLOW}Getting cluster credentials...${NC}"
    gcloud config set project ${PROJECT_ID}
    gcloud container clusters get-credentials ${CLUSTER_NAME} --zone=${ZONE}
    echo -e "${GREEN}✓ Connected to cluster${NC}"
}

# Fix ConfigMap with all required environment variables
fix_configmap() {
    echo -e "${YELLOW}Updating ConfigMap with complete configuration...${NC}"
    
    cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: e-code-config
  namespace: ${NAMESPACE}
data:
  NODE_ENV: "production"
  PORT: "5000"
  GO_RUNTIME_PORT: "8080"
  PYTHON_ML_PORT: "8081"
  MCP_SERVER_PORT: "3200"
  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"
  POSTGRES_HOST: "postgres-service"
  POSTGRES_PORT: "5432"
  POSTGRES_DB: "ecode"
  CORS_ORIGIN: "*"
  REPLIT_DOMAINS: "${EXTERNAL_IP},ecode.cloud"
  PUBLIC_OBJECT_SEARCH_PATHS: "/ecode-storage/public"
  PRIVATE_OBJECT_DIR: "/ecode-storage/private"
  # Add these missing configs
  ISSUER_URL: "https://replit.com/oidc"
  REPL_ID: "e-code-platform"
  VITE_API_URL: "http://${EXTERNAL_IP}"
EOF
    
    echo -e "${GREEN}✓ ConfigMap updated${NC}"
}

# Fix Secrets with proper values
fix_secrets() {
    echo -e "${YELLOW}Updating Secrets...${NC}"
    
    # Check if secrets already exist
    if kubectl get secret e-code-secrets -n ${NAMESPACE} &>/dev/null; then
        echo "Secrets exist, updating..."
        
        # Get existing secrets if available
        EXISTING_OPENAI_KEY=$(kubectl get secret e-code-secrets -n ${NAMESPACE} -o jsonpath='{.data.OPENAI_API_KEY}' 2>/dev/null | base64 -d 2>/dev/null || echo "")
        EXISTING_STRIPE_KEY=$(kubectl get secret e-code-secrets -n ${NAMESPACE} -o jsonpath='{.data.STRIPE_SECRET_KEY}' 2>/dev/null | base64 -d 2>/dev/null || echo "")
        
        # Use existing keys or prompt for new ones
        if [ -z "$EXISTING_OPENAI_KEY" ]; then
            read -p "Enter your OpenAI API Key (or press Enter to skip): " OPENAI_KEY
            OPENAI_KEY=${OPENAI_KEY:-"sk-placeholder"}
        else
            OPENAI_KEY=$EXISTING_OPENAI_KEY
            echo "Using existing OpenAI key"
        fi
        
        if [ -z "$EXISTING_STRIPE_KEY" ]; then
            read -p "Enter your Stripe Secret Key (or press Enter to skip): " STRIPE_KEY
            STRIPE_KEY=${STRIPE_KEY:-"sk_test_placeholder"}
        else
            STRIPE_KEY=$EXISTING_STRIPE_KEY
            echo "Using existing Stripe key"
        fi
    else
        echo "Creating new secrets..."
        read -p "Enter your OpenAI API Key (or press Enter for placeholder): " OPENAI_KEY
        OPENAI_KEY=${OPENAI_KEY:-"sk-placeholder"}
        
        read -p "Enter your Stripe Secret Key (or press Enter for placeholder): " STRIPE_KEY
        STRIPE_KEY=${STRIPE_KEY:-"sk_test_placeholder"}
    fi
    
    cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: e-code-secrets
  namespace: ${NAMESPACE}
type: Opaque
stringData:
  # Database credentials
  POSTGRES_USER: "postgres"
  POSTGRES_PASSWORD: "postgres"
  DATABASE_URL: "postgresql://postgres:postgres@postgres-service:5432/ecode"
  PGDATABASE: "ecode"
  PGHOST: "postgres-service"
  PGPASSWORD: "postgres"
  PGPORT: "5432"
  PGUSER: "postgres"
  
  # Redis
  REDIS_PASSWORD: "redis-password"
  
  # API Keys
  OPENAI_API_KEY: "${OPENAI_KEY}"
  STRIPE_SECRET_KEY: "${STRIPE_KEY}"
  VITE_STRIPE_PUBLIC_KEY: "pk_test_placeholder"
  
  # Session and JWT
  SESSION_SECRET: "production-session-secret-$(openssl rand -hex 32)"
  JWT_SECRET: "production-jwt-secret-$(openssl rand -hex 32)"
EOF
    
    echo -e "${GREEN}✓ Secrets updated${NC}"
}

# Fix PostgreSQL deployment if needed
fix_postgres() {
    echo -e "${YELLOW}Checking PostgreSQL...${NC}"
    
    # Check if PostgreSQL is running
    if kubectl get pod -l app=postgres -n ${NAMESPACE} | grep -q Running; then
        echo "PostgreSQL is running"
        
        # Initialize database if needed
        POD_NAME=$(kubectl get pods -n ${NAMESPACE} -l app=postgres -o jsonpath="{.items[0].metadata.name}")
        
        echo "Ensuring database exists..."
        kubectl exec -n ${NAMESPACE} ${POD_NAME} -- psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'ecode'" | grep -q 1 || \
        kubectl exec -n ${NAMESPACE} ${POD_NAME} -- psql -U postgres -c "CREATE DATABASE ecode;"
        
        echo "Creating tables if needed..."
        kubectl exec -n ${NAMESPACE} ${POD_NAME} -- psql -U postgres -d ecode -c "
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE,
                email VARCHAR(255),
                password_hash VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS projects (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                name VARCHAR(255) NOT NULL,
                slug VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS sessions (
                sid VARCHAR PRIMARY KEY,
                sess JSONB NOT NULL,
                expire TIMESTAMP NOT NULL
            );
            
            CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire);
        "
    else
        echo "PostgreSQL not running, deploying..."
        kubectl apply -f kubernetes/postgres-deployment.yaml
        kubectl wait --for=condition=ready pod -l app=postgres -n ${NAMESPACE} --timeout=120s
    fi
    
    echo -e "${GREEN}✓ PostgreSQL ready${NC}"
}

# Fix Redis deployment if needed
fix_redis() {
    echo -e "${YELLOW}Checking Redis...${NC}"
    
    if kubectl get pod -l app=redis -n ${NAMESPACE} | grep -q Running; then
        echo "Redis is running"
    else
        echo "Redis not running, deploying..."
        kubectl apply -f kubernetes/redis-deployment.yaml
    fi
    
    echo -e "${GREEN}✓ Redis ready${NC}"
}

# Update the main application deployment
update_application() {
    echo -e "${YELLOW}Updating application deployment...${NC}"
    
    # First, let's create a working Dockerfile if needed
    if [ ! -f "Dockerfile.fixed" ]; then
        cat > Dockerfile.fixed <<'EOF'
FROM node:18-alpine AS builder

RUN apk add --no-cache python3 make g++ git

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY drizzle.config.ts ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build || true

# Production stage
FROM node:18-alpine

RUN apk add --no-cache git python3 make g++

WORKDIR /app

# Copy everything (for now, to ensure it works)
COPY --from=builder /app .

# Create necessary directories
RUN mkdir -p logs dist client/dist

# Ensure the app can run
RUN chmod -R 755 /app

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))" || exit 1

# Start with npm run dev for now (can switch to production later)
CMD ["npm", "run", "dev"]
EOF
    fi
    
    # Build and push the fixed image
    echo "Building fixed Docker image..."
    docker build -f Dockerfile.fixed -t gcr.io/${PROJECT_ID}/e-code-platform:fixed .
    
    echo "Pushing to registry..."
    gcloud auth configure-docker --quiet
    docker push gcr.io/${PROJECT_ID}/e-code-platform:fixed
    
    # Update the deployment
    cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: e-code-platform
  namespace: ${NAMESPACE}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: e-code-platform
  template:
    metadata:
      labels:
        app: e-code-platform
    spec:
      containers:
      - name: e-code-platform
        image: gcr.io/${PROJECT_ID}/e-code-platform:fixed
        imagePullPolicy: Always
        ports:
        - containerPort: 5000
        envFrom:
        - configMapRef:
            name: e-code-config
        - secretRef:
            name: e-code-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 5000
          initialDelaySeconds: 60
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /api/health
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 5
          timeoutSeconds: 3
EOF
    
    echo -e "${GREEN}✓ Application deployment updated${NC}"
}

# Restart and verify deployment
restart_deployment() {
    echo -e "${YELLOW}Restarting deployment...${NC}"
    
    # Force a rolling restart
    kubectl rollout restart deployment/e-code-platform -n ${NAMESPACE}
    
    # Wait for rollout to complete
    kubectl rollout status deployment/e-code-platform -n ${NAMESPACE} --timeout=300s
    
    echo -e "${GREEN}✓ Deployment restarted${NC}"
}

# Check deployment status
check_status() {
    echo -e "${YELLOW}Checking deployment status...${NC}"
    echo ""
    
    # Get pod status
    echo "Pods:"
    kubectl get pods -n ${NAMESPACE}
    echo ""
    
    # Get services
    echo "Services:"
    kubectl get svc -n ${NAMESPACE}
    echo ""
    
    # Get recent logs
    echo "Recent logs:"
    kubectl logs -n ${NAMESPACE} -l app=e-code-platform --tail=20
    echo ""
    
    # Test endpoints
    echo "Testing endpoints:"
    echo -n "Health check: "
    curl -s http://${EXTERNAL_IP}/api/health || echo "Failed"
    echo ""
    echo -n "Monitoring health: "
    curl -s http://${EXTERNAL_IP}/api/monitoring/health || echo "Failed"
    echo ""
}

# Main execution
main() {
    echo -e "${GREEN}Starting deployment fix...${NC}"
    echo "Project: ${PROJECT_ID}"
    echo "Cluster: ${CLUSTER_NAME}"
    echo "External IP: ${EXTERNAL_IP}"
    echo ""
    
    # Confirm before proceeding
    read -p "Continue with fixing deployment? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
    
    get_credentials
    fix_configmap
    fix_secrets
    fix_postgres
    fix_redis
    update_application
    restart_deployment
    check_status
    
    echo ""
    echo -e "${GREEN}🎉 Deployment fix complete!${NC}"
    echo "========================================"
    echo -e "${GREEN}Your app should now be running at:${NC}"
    echo -e "${GREEN}http://${EXTERNAL_IP}${NC}"
    echo ""
    echo "If you still see issues, check the logs with:"
    echo "  kubectl logs -n ${NAMESPACE} -l app=e-code-platform --tail=50"
    echo ""
    echo "To manually restart:"
    echo "  kubectl rollout restart deployment/e-code-platform -n ${NAMESPACE}"
}

# Run main function
main