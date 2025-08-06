#!/bin/bash
# Deployment script for MCP server to Cloud Run with HTTPS
# This enables Claude.ai to connect to your MCP server

# Configuration
PROJECT_ID="your-gcp-project-id"
REGION="us-central1"
SERVICE_NAME="ecode-mcp-server"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"
DOMAIN="mcp.your-domain.com"  # Replace with your domain

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Deploying MCP Server to Cloud Run for Claude.ai Integration${NC}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI is not installed. Please install it first.${NC}"
    echo "Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Set the project
echo -e "${YELLOW}📦 Setting GCP project to ${PROJECT_ID}...${NC}"
gcloud config set project ${PROJECT_ID}

# Enable required APIs
echo -e "${YELLOW}🔧 Enabling required GCP APIs...${NC}"
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    containerregistry.googleapis.com \
    secretmanager.googleapis.com

# Create secrets in Secret Manager
echo -e "${YELLOW}🔐 Creating secrets in Secret Manager...${NC}"

# Function to create or update a secret
create_secret() {
    SECRET_NAME=$1
    SECRET_VALUE=$2
    
    if gcloud secrets describe ${SECRET_NAME} &> /dev/null; then
        echo "Updating secret ${SECRET_NAME}..."
        echo -n "${SECRET_VALUE}" | gcloud secrets versions add ${SECRET_NAME} --data-file=-
    else
        echo "Creating secret ${SECRET_NAME}..."
        echo -n "${SECRET_VALUE}" | gcloud secrets create ${SECRET_NAME} --data-file=-
    fi
}

# Generate secure random values for secrets
MCP_API_KEY="mcp_key_$(openssl rand -hex 32)"
MCP_JWT_SECRET=$(openssl rand -hex 64)
MCP_OAUTH_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)

echo -e "${GREEN}Generated MCP API Key: ${MCP_API_KEY}${NC}"
echo -e "${YELLOW}⚠️  Save this API key! You'll need it to connect Claude.ai${NC}"
echo ""

# Create secrets
create_secret "mcp-api-key" "${MCP_API_KEY}"
create_secret "mcp-jwt-secret" "${MCP_JWT_SECRET}"
create_secret "mcp-oauth-secret" "${MCP_OAUTH_SECRET}"
create_secret "session-secret" "${SESSION_SECRET}"

# Build and deploy using Cloud Build
echo -e "${YELLOW}🏗️  Building and deploying to Cloud Run...${NC}"
gcloud builds submit \
    --config=cloudbuild.yaml \
    --substitutions=\
_MCP_API_KEY="${MCP_API_KEY}",\
_MCP_JWT_SECRET="${MCP_JWT_SECRET}",\
_MCP_OAUTH_CLIENT_SECRET="${MCP_OAUTH_SECRET}",\
_DATABASE_URL="${DATABASE_URL}",\
_SESSION_SECRET="${SESSION_SECRET}",\
_ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}"

# Get the service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
    --region=${REGION} \
    --format='value(status.url)')

echo ""
echo -e "${GREEN}✅ MCP Server deployed successfully!${NC}"
echo ""
echo -e "${GREEN}📍 Service URL: ${SERVICE_URL}${NC}"
echo ""
echo -e "${YELLOW}🔗 To connect Claude.ai to your MCP server:${NC}"
echo "1. Go to https://claude.ai"
echo "2. Navigate to Settings → Connectors"
echo "3. Click 'Add custom connector'"
echo "4. Enter your MCP server URL: ${SERVICE_URL}/mcp/connect"
echo "5. Use your API key: ${MCP_API_KEY}"
echo ""
echo -e "${YELLOW}📚 MCP Server Endpoints:${NC}"
echo "- Auth Info: ${SERVICE_URL}/mcp/auth/info"
echo "- Health Check: ${SERVICE_URL}/mcp/health"
echo "- OAuth Authorize: ${SERVICE_URL}/mcp/oauth/authorize"
echo "- Connect: ${SERVICE_URL}/mcp/connect (requires authentication)"
echo "- Tools: ${SERVICE_URL}/mcp/tools (requires authentication)"
echo ""
echo -e "${GREEN}🎉 Your MCP server is ready for Claude.ai integration!${NC}"

# Optional: Set up custom domain
read -p "Do you want to set up a custom domain? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}📝 Setting up custom domain ${DOMAIN}...${NC}"
    gcloud beta run domain-mappings create \
        --service=${SERVICE_NAME} \
        --domain=${DOMAIN} \
        --region=${REGION}
    
    echo -e "${GREEN}✅ Custom domain configured!${NC}"
    echo "Update your DNS records as shown above."
    echo "Your MCP server will be available at: https://${DOMAIN}"
fi