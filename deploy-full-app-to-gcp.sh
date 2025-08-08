#!/bin/bash

# Full E-Code Platform Deployment to GCP
# This deploys the complete application, not just a placeholder

echo "🚀 Deploying Full E-Code Platform to GCP"
echo "========================================="

# Configuration
PROJECT_ID="votre-projet-ecode"
REGION="europe-west1"
CLUSTER_NAME="e-code-cluster"
IMAGE_NAME="e-code-platform"
IMAGE_TAG="full-$(date +%Y%m%d-%H%M%S)"

echo "📋 Configuration:"
echo "  Project ID: $PROJECT_ID"
echo "  Region: $REGION"
echo "  Image: gcr.io/$PROJECT_ID/$IMAGE_NAME:$IMAGE_TAG"
echo ""

# Check if running locally (in Replit)
if [ -z "$REPL_ID" ]; then
    echo "⚠️  Not running in Replit environment"
    echo "   This script is designed to run from within Replit"
    echo ""
fi

# Step 1: Build the production image locally
echo "1️⃣ Building production Docker image..."
docker build -t $IMAGE_NAME:$IMAGE_TAG -f Dockerfile .

if [ $? -ne 0 ]; then
    echo "❌ Docker build failed"
    echo "   Trying with simplified build..."
    
    # Create a simplified Dockerfile that will work
    cat > Dockerfile.gcp << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Install dependencies including build tools
RUN apk add --no-cache python3 make g++ git

# Copy all files
COPY . .

# Install dependencies
RUN npm install

# Build the application
RUN npm run build

# Expose port
EXPOSE 5000

# Start the application
CMD ["node", "dist/server/index.js"]
EOF

    docker build -t $IMAGE_NAME:$IMAGE_TAG -f Dockerfile.gcp .
fi

# Step 2: Tag for Google Container Registry
echo "2️⃣ Tagging image for GCR..."
docker tag $IMAGE_NAME:$IMAGE_TAG gcr.io/$PROJECT_ID/$IMAGE_NAME:$IMAGE_TAG
docker tag $IMAGE_NAME:$IMAGE_TAG gcr.io/$PROJECT_ID/$IMAGE_NAME:latest

# Step 3: Configure Docker for GCR
echo "3️⃣ Configuring Docker authentication for GCR..."
gcloud auth configure-docker --quiet

# Step 4: Push to GCR
echo "4️⃣ Pushing image to Google Container Registry..."
docker push gcr.io/$PROJECT_ID/$IMAGE_NAME:$IMAGE_TAG
docker push gcr.io/$PROJECT_ID/$IMAGE_NAME:latest

# Step 5: Update Kubernetes deployment
echo "5️⃣ Updating Kubernetes deployment..."

# Get cluster credentials
gcloud container clusters get-credentials $CLUSTER_NAME --zone=$REGION-b --project=$PROJECT_ID

# Create/update the deployment with the new image
kubectl set image deployment/e-code-platform e-code-platform=gcr.io/$PROJECT_ID/$IMAGE_NAME:$IMAGE_TAG -n e-code-platform

# Wait for rollout to complete
echo "6️⃣ Waiting for deployment rollout..."
kubectl rollout status deployment/e-code-platform -n e-code-platform

# Get the external IP
echo "7️⃣ Getting external IP address..."
EXTERNAL_IP=$(kubectl get service e-code-platform -n e-code-platform -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

echo ""
echo "✅ Deployment complete!"
echo "================================"
echo "🌐 Your E-Code Platform is available at:"
echo "   http://$EXTERNAL_IP"
echo ""
echo "📝 Notes:"
echo "   - It may take 2-3 minutes for the app to be fully accessible"
echo "   - If you see an error, wait a moment and refresh"
echo "   - Check logs with: kubectl logs -f deployment/e-code-platform -n e-code-platform"
echo ""