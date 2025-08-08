#!/bin/bash

# E-Code Platform - Google Kubernetes Engine Deployment Script
# This script deploys the entire E-Code platform to GKE with polyglot backend

set -e

# Configuration
PROJECT_ID="votre-projet-ecode"  # CHANGE THIS to your project
CLUSTER_NAME="e-code-cluster"
REGION="europe-west1"  # European region
ZONE="europe-west1-b"  # European zone
REGISTRY="gcr.io"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 E-Code Platform - GKE Deployment Starting${NC}"
echo "================================================"

# Check if required tools are installed
check_requirements() {
    echo -e "${YELLOW}Checking requirements...${NC}"
    
    if ! command -v gcloud &> /dev/null; then
        echo -e "${RED}gcloud CLI is not installed. Please install it first.${NC}"
        exit 1
    fi
    
    if ! command -v kubectl &> /dev/null; then
        echo -e "${RED}kubectl is not installed. Please install it first.${NC}"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Docker is not installed. Please install it first.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ All requirements met${NC}"
}

# Set up GCP project
setup_gcp_project() {
    echo -e "${YELLOW}Setting up GCP project...${NC}"
    
    # Set project
    gcloud config set project ${PROJECT_ID}
    
    # Enable required APIs
    echo "Enabling required GCP APIs..."
    gcloud services enable \
        container.googleapis.com \
        compute.googleapis.com \
        cloudbuild.googleapis.com \
        containerregistry.googleapis.com \
        cloudresourcemanager.googleapis.com
    
    echo -e "${GREEN}✓ GCP project configured${NC}"
}

# Create GKE cluster
create_cluster() {
    echo -e "${YELLOW}Creating GKE cluster...${NC}"
    
    # Check if cluster exists
    if gcloud container clusters describe ${CLUSTER_NAME} --zone=${ZONE} &>/dev/null; then
        echo "Cluster ${CLUSTER_NAME} already exists. Using existing cluster."
    else
        echo "Creating new GKE cluster..."
        gcloud container clusters create ${CLUSTER_NAME} \
            --zone=${ZONE} \
            --num-nodes=3 \
            --node-locations=${ZONE} \
            --machine-type=e2-standard-4 \
            --disk-size=100 \
            --enable-autoscaling \
            --min-nodes=3 \
            --max-nodes=10 \
            --enable-autorepair \
            --enable-autoupgrade \
            --enable-stackdriver-kubernetes \
            --addons=HorizontalPodAutoscaling,HttpLoadBalancing \
            --workload-pool=${PROJECT_ID}.svc.id.goog \
            --enable-shielded-nodes
    fi
    
    # Get cluster credentials
    gcloud container clusters get-credentials ${CLUSTER_NAME} --zone=${ZONE}
    
    echo -e "${GREEN}✓ GKE cluster ready${NC}"
}

# Build and push Docker images
build_and_push_images() {
    echo -e "${YELLOW}Building and pushing Docker images...${NC}"
    
    # Configure Docker for GCR
    gcloud auth configure-docker
    
    # Build TypeScript Core image
    echo "Building TypeScript Core image..."
    docker build -t ${REGISTRY}/${PROJECT_ID}/e-code-platform:latest .
    docker push ${REGISTRY}/${PROJECT_ID}/e-code-platform:latest
    
    # Build Go Runtime image
    echo "Building Go Runtime image..."
    docker build -f Dockerfile.go-runtime -t ${REGISTRY}/${PROJECT_ID}/e-code-go-runtime:latest .
    docker push ${REGISTRY}/${PROJECT_ID}/e-code-go-runtime:latest
    
    # Build Python ML image
    echo "Building Python ML image..."
    docker build -f Dockerfile.python-ml -t ${REGISTRY}/${PROJECT_ID}/e-code-python-ml:latest .
    docker push ${REGISTRY}/${PROJECT_ID}/e-code-python-ml:latest
    
    # Build MCP Server image (using main Dockerfile with different entrypoint)
    echo "Building MCP Server image..."
    docker build -t ${REGISTRY}/${PROJECT_ID}/e-code-mcp:latest .
    docker push ${REGISTRY}/${PROJECT_ID}/e-code-mcp:latest
    
    echo -e "${GREEN}✓ All images built and pushed${NC}"
}

# Update Kubernetes manifests with project ID
update_manifests() {
    echo -e "${YELLOW}Updating Kubernetes manifests...${NC}"
    
    # Replace PROJECT_ID in all yaml files
    find kubernetes/ -name "*.yaml" -exec sed -i "s/PROJECT_ID/${PROJECT_ID}/g" {} \;
    
    echo -e "${GREEN}✓ Manifests updated${NC}"
}

# Deploy to Kubernetes
deploy_to_kubernetes() {
    echo -e "${YELLOW}Deploying to Kubernetes...${NC}"
    
    # Create namespace
    kubectl apply -f kubernetes/namespace.yaml
    
    # Create ConfigMap and Secrets
    kubectl apply -f kubernetes/configmap.yaml
    kubectl apply -f kubernetes/secrets.yaml
    
    # Deploy PostgreSQL
    echo "Deploying PostgreSQL..."
    kubectl apply -f kubernetes/postgres-deployment.yaml
    
    # Wait for PostgreSQL to be ready
    kubectl wait --for=condition=ready pod -l app=postgres -n e-code-platform --timeout=120s
    
    # Deploy Redis
    echo "Deploying Redis..."
    kubectl apply -f kubernetes/redis-deployment.yaml
    
    # Deploy application services
    echo "Deploying application services..."
    kubectl apply -f kubernetes/app-deployment.yaml
    kubectl apply -f kubernetes/services.yaml
    
    # Deploy Ingress
    echo "Deploying Ingress..."
    kubectl apply -f kubernetes/ingress.yaml
    
    # Deploy Autoscaling
    echo "Setting up autoscaling..."
    kubectl apply -f kubernetes/autoscaling.yaml
    
    echo -e "${GREEN}✓ All components deployed${NC}"
}

# Initialize database
initialize_database() {
    echo -e "${YELLOW}Initializing database...${NC}"
    
    # Get PostgreSQL pod name
    POD_NAME=$(kubectl get pods -n e-code-platform -l app=postgres -o jsonpath="{.items[0].metadata.name}")
    
    # Run database migrations
    echo "Running database migrations..."
    kubectl exec -n e-code-platform ${POD_NAME} -- psql -U ecode_admin -d ecode_production -c "
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS projects (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            name VARCHAR(255) NOT NULL,
            slug VARCHAR(255) UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS sessions (
            sid VARCHAR PRIMARY KEY,
            sess JSONB NOT NULL,
            expire TIMESTAMP NOT NULL
        );
        
        CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire);
    "
    
    echo -e "${GREEN}✓ Database initialized${NC}"
}

# Get deployment info
get_deployment_info() {
    echo -e "${YELLOW}Getting deployment information...${NC}"
    
    # Get LoadBalancer IP
    echo "Waiting for LoadBalancer IP..."
    EXTERNAL_IP=""
    while [ -z $EXTERNAL_IP ]; do
        echo "Waiting for external IP..."
        EXTERNAL_IP=$(kubectl get svc e-code-loadbalancer -n e-code-platform -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
        [ -z "$EXTERNAL_IP" ] && sleep 10
    done
    
    echo ""
    echo -e "${GREEN}🎉 Deployment Complete!${NC}"
    echo "========================================"
    echo -e "${GREEN}External IP: ${EXTERNAL_IP}${NC}"
    echo -e "${GREEN}URL: http://${EXTERNAL_IP}${NC}"
    echo ""
    echo "Services deployed:"
    echo "  • TypeScript Core (Port 5000)"
    echo "  • Go Runtime (Port 8080)"
    echo "  • Python ML Service (Port 8081)"
    echo "  • MCP Server (Port 3200)"
    echo "  • PostgreSQL Database"
    echo "  • Redis Cache"
    echo ""
    echo "Next steps:"
    echo "  1. Configure DNS to point to ${EXTERNAL_IP}"
    echo "  2. Set up SSL certificates"
    echo "  3. Update environment variables in kubernetes/secrets.yaml"
    echo ""
    echo "Useful commands:"
    echo "  • View pods: kubectl get pods -n e-code-platform"
    echo "  • View logs: kubectl logs -n e-code-platform <pod-name>"
    echo "  • Scale deployment: kubectl scale deployment <name> --replicas=5 -n e-code-platform"
    echo "  • Port forward: kubectl port-forward -n e-code-platform svc/typescript-service 5000:5000"
}

# Main deployment flow
main() {
    echo -e "${GREEN}Starting E-Code Platform deployment to GKE${NC}"
    echo ""
    
    # Prompt for project ID if not set
    if [ "$PROJECT_ID" = "your-gcp-project-id" ]; then
        read -p "Enter your GCP Project ID: " PROJECT_ID
    fi
    
    check_requirements
    setup_gcp_project
    create_cluster
    build_and_push_images
    update_manifests
    deploy_to_kubernetes
    initialize_database
    get_deployment_info
}

# Run main function
main