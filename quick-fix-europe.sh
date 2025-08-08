#!/bin/bash

# Quick fix script for European deployment
# Addresses the DATABASE_URL error from yesterday

set -e

# European zone configuration
PROJECT_ID="votre-projet-ecode"
ZONE="europe-west1-b"
NAMESPACE="e-code-platform"
EXTERNAL_IP="35.189.194.33"

echo "🔧 Quick Fix for E-Code Platform (Europe)"
echo "=========================================="
echo "Project: $PROJECT_ID"
echo "Zone: $ZONE (Europe)"
echo "External IP: $EXTERNAL_IP"
echo ""

# Connect to cluster
echo "Connecting to European cluster..."
gcloud config set project $PROJECT_ID
gcloud container clusters get-credentials e-code-cluster --zone=$ZONE

# Quick fix: Add DATABASE_URL and other critical environment variables
echo "Setting environment variables..."
kubectl set env deployment/e-code-platform \
  DATABASE_URL="postgresql://postgres:postgres@postgres-service:5432/ecode" \
  NODE_ENV="production" \
  PORT="5000" \
  SESSION_SECRET="production-secret-$(date +%s)" \
  POSTGRES_HOST="postgres-service" \
  POSTGRES_PORT="5432" \
  POSTGRES_DB="ecode" \
  POSTGRES_USER="postgres" \
  POSTGRES_PASSWORD="postgres" \
  PGDATABASE="ecode" \
  PGHOST="postgres-service" \
  PGPASSWORD="postgres" \
  PGPORT="5432" \
  PGUSER="postgres" \
  -n $NAMESPACE

# Restart deployment
echo "Restarting deployment..."
kubectl rollout restart deployment/e-code-platform -n $NAMESPACE

# Wait for rollout
echo "Waiting for deployment to be ready..."
kubectl rollout status deployment/e-code-platform -n $NAMESPACE --timeout=120s

# Check status
echo ""
echo "✅ Deployment updated!"
echo ""
echo "Checking pod status:"
kubectl get pods -n $NAMESPACE

echo ""
echo "Testing health endpoint:"
curl -s http://$EXTERNAL_IP/api/health || echo "Health check failed - may need a moment to start"

echo ""
echo "Recent logs:"
kubectl logs -n $NAMESPACE deployment/e-code-platform --tail=10

echo ""
echo "Your app should be accessible at: http://$EXTERNAL_IP"
echo ""
echo "If still having issues, check full logs with:"
echo "  kubectl logs -n $NAMESPACE deployment/e-code-platform --tail=50"