# E-Code Platform - Google Kubernetes Engine Deployment Guide

## 🚀 Complete Deployment Architecture

This guide provides step-by-step instructions to deploy the E-Code Platform on Google Kubernetes Engine (GKE) with a production-ready, Replit-like architecture.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Load Balancer                        │
│                  (External IP: X.X.X.X)                 │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┬──────────┬──────────┐
         ▼                       ▼          ▼          ▼
   ┌──────────┐            ┌──────────┐ ┌──────────┐ ┌──────────┐
   │TypeScript│            │Go Runtime│ │Python ML │ │MCP Server│
   │   Core   │            │  Service │ │ Service  │ │          │
   │(Port 5000)            │(Port 8080) │(Port 8081) │(Port 3200)
   └──────────┘            └──────────┘ └──────────┘ └──────────┘
         │                       │          │          │
         └───────────┬───────────┴──────────┴──────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
   ┌──────────┐            ┌──────────┐
   │PostgreSQL│            │  Redis   │
   │ Database │            │  Cache   │
   └──────────┘            └──────────┘
```

## Prerequisites

1. **Google Cloud Account**: Active GCP account with billing enabled
2. **CLI Tools**:
   ```bash
   # Install gcloud CLI
   curl https://sdk.cloud.google.com | bash
   
   # Install kubectl
   gcloud components install kubectl
   
   # Install Docker
   # Visit: https://docs.docker.com/get-docker/
   ```

3. **Required APIs**: These will be auto-enabled by the script:
   - Kubernetes Engine API
   - Container Registry API
   - Cloud Build API
   - Compute Engine API

## Quick Start Deployment

### Option 1: Automated Deployment (Recommended)

```bash
# Make the script executable
chmod +x deploy-to-gke.sh

# Run the deployment
./deploy-to-gke.sh
```

The script will:
- ✅ Create a GKE cluster with autoscaling
- ✅ Build and push all Docker images
- ✅ Deploy PostgreSQL and Redis
- ✅ Deploy all microservices (TypeScript, Go, Python, MCP)
- ✅ Set up load balancing and ingress
- ✅ Configure horizontal pod autoscaling
- ✅ Initialize the database

### Option 2: Manual Step-by-Step Deployment

#### Step 1: Set up GCP Project
```bash
# Set your project ID
export PROJECT_ID="votre-projet-ecode"  # Or your actual project ID
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable container.googleapis.com compute.googleapis.com containerregistry.googleapis.com
```

#### Step 2: Create GKE Cluster
```bash
# For Europe deployment
gcloud container clusters create e-code-cluster \
  --zone=europe-west1-b \
  --num-nodes=3 \
  --machine-type=e2-standard-4 \
  --enable-autoscaling \
  --min-nodes=3 \
  --max-nodes=10

# Get credentials
gcloud container clusters get-credentials e-code-cluster --zone=europe-west1-b
```

#### Step 3: Build and Push Docker Images
```bash
# Configure Docker for GCR
gcloud auth configure-docker

# Build and push TypeScript Core
docker build -t gcr.io/$PROJECT_ID/e-code-platform:latest .
docker push gcr.io/$PROJECT_ID/e-code-platform:latest

# Build and push Go Runtime
docker build -f Dockerfile.go-runtime -t gcr.io/$PROJECT_ID/e-code-go-runtime:latest .
docker push gcr.io/$PROJECT_ID/e-code-go-runtime:latest

# Build and push Python ML
docker build -f Dockerfile.python-ml -t gcr.io/$PROJECT_ID/e-code-python-ml:latest .
docker push gcr.io/$PROJECT_ID/e-code-python-ml:latest
```

#### Step 4: Update Kubernetes Manifests
```bash
# Replace PROJECT_ID in all yaml files
find kubernetes/ -name "*.yaml" -exec sed -i "s/PROJECT_ID/$PROJECT_ID/g" {} \;
```

#### Step 5: Deploy to Kubernetes
```bash
# Create namespace
kubectl apply -f kubernetes/namespace.yaml

# Deploy configurations
kubectl apply -f kubernetes/configmap.yaml
kubectl apply -f kubernetes/secrets.yaml

# Deploy databases
kubectl apply -f kubernetes/postgres-deployment.yaml
kubectl apply -f kubernetes/redis-deployment.yaml

# Deploy application
kubectl apply -f kubernetes/app-deployment.yaml
kubectl apply -f kubernetes/services.yaml
kubectl apply -f kubernetes/ingress.yaml
kubectl apply -f kubernetes/autoscaling.yaml
```

#### Step 6: Get External IP
```bash
kubectl get svc e-code-loadbalancer -n e-code-platform
```

## Configuration

### Environment Variables

Edit `kubernetes/secrets.yaml` before deployment:

```yaml
stringData:
  # Database
  POSTGRES_PASSWORD: "your-strong-password"
  
  # API Keys
  OPENAI_API_KEY: "sk-your-actual-key"
  STRIPE_SECRET_KEY: "sk_live_your-actual-key"
  
  # Session Secret
  SESSION_SECRET: "your-secret-key"
```

### Scaling Configuration

Edit `kubernetes/autoscaling.yaml`:

```yaml
spec:
  minReplicas: 3    # Minimum pods
  maxReplicas: 20   # Maximum pods
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        averageUtilization: 70  # Scale at 70% CPU
```

## Monitoring & Management

### View Cluster Status
```bash
# Get all pods
kubectl get pods -n e-code-platform

# Get services
kubectl get svc -n e-code-platform

# View logs
kubectl logs -n e-code-platform <pod-name>

# Get deployment status
kubectl get deployments -n e-code-platform
```

### Scaling Operations
```bash
# Manual scaling
kubectl scale deployment e-code-typescript --replicas=5 -n e-code-platform

# Edit autoscaling
kubectl edit hpa typescript-hpa -n e-code-platform
```

### Database Access
```bash
# Connect to PostgreSQL
kubectl exec -it -n e-code-platform $(kubectl get pods -n e-code-platform -l app=postgres -o jsonpath="{.items[0].metadata.name}") -- psql -U ecode_admin -d ecode_production
```

## Production Checklist

- [ ] **SSL/TLS**: Set up Let's Encrypt certificates
- [ ] **DNS**: Configure domain to point to LoadBalancer IP
- [ ] **Secrets**: Use Google Secret Manager for sensitive data
- [ ] **Monitoring**: Enable GKE monitoring and logging
- [ ] **Backups**: Set up automated PostgreSQL backups
- [ ] **Firewall**: Configure GCP firewall rules
- [ ] **IAM**: Set up proper service accounts and permissions

## Troubleshooting

### Pods Not Starting
```bash
# Check pod events
kubectl describe pod <pod-name> -n e-code-platform

# Check logs
kubectl logs <pod-name> -n e-code-platform --previous
```

### Database Connection Issues
```bash
# Test database connectivity
kubectl run -it --rm debug --image=postgres:15 --restart=Never -n e-code-platform -- psql -h postgres-service -U ecode_admin -d ecode_production
```

### LoadBalancer Not Getting IP
```bash
# Check service status
kubectl describe svc e-code-loadbalancer -n e-code-platform

# Check firewall rules
gcloud compute firewall-rules list
```

## Cost Optimization

### Estimated Monthly Costs (3-node cluster)
- **GKE Cluster Management**: $0 (first cluster free)
- **Compute (3x e2-standard-4)**: ~$300
- **Load Balancer**: ~$25
- **Storage**: ~$20
- **Network Egress**: Variable based on traffic

**Total**: ~$350-500/month for production deployment

### Cost Saving Tips
1. Use preemptible nodes for non-critical workloads
2. Enable cluster autoscaling to scale down during low traffic
3. Use committed use discounts for predictable workloads
4. Implement proper caching to reduce database queries

## Security Best Practices

1. **Network Security**:
   - Use Private GKE clusters
   - Implement Network Policies
   - Use Cloud Armor for DDoS protection

2. **Access Control**:
   - Enable Workload Identity
   - Use RBAC for Kubernetes access
   - Implement Pod Security Policies

3. **Data Protection**:
   - Encrypt data at rest
   - Use Google Secret Manager
   - Regular security scanning

## Support & Resources

- **GKE Documentation**: https://cloud.google.com/kubernetes-engine/docs
- **Kubernetes Dashboard**: `kubectl proxy` then visit http://localhost:8001/ui
- **GCP Console**: https://console.cloud.google.com
- **E-Code Platform Issues**: Create an issue in the repository

## Next Steps

1. **Custom Domain**: Set up your domain with Cloud DNS
2. **CI/CD Pipeline**: Implement Cloud Build for automated deployments
3. **Monitoring**: Set up Prometheus and Grafana
4. **Backup Strategy**: Implement automated backup solutions
5. **Multi-Region**: Expand to multiple regions for global availability

---

**🎉 Congratulations!** Your E-Code Platform is now running on Google Kubernetes Engine with a production-ready, scalable architecture similar to Replit!