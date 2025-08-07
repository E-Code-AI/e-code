# Google Cloud Deployment Guide - Unlock All Limits

## Overview
Deploy E-Code Platform to Google Cloud to remove all Replit limitations and get:
- ✅ Real Docker containers per project
- ✅ Kubernetes orchestration
- ✅ True network isolation
- ✅ Separate databases per project
- ✅ Enforced resource limits
- ✅ Auto-scaling
- ✅ Root access

## Prerequisites

### 1. Google Cloud Account
- Sign up at: https://cloud.google.com
- New users get $300 free credits (valid for 90 days)
- Credit card required (not charged during free trial)

### 2. Install Google Cloud SDK
```bash
# macOS
brew install google-cloud-sdk

# Linux/WSL
curl https://sdk.cloud.google.com | bash

# Windows
# Download installer from: https://cloud.google.com/sdk/docs/install
```

### 3. Authentication
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

## Step-by-Step Deployment

### Step 1: Create Google Cloud Project
```bash
# Create new project
gcloud projects create ecode-platform-prod --name="E-Code Platform"

# Set as current project
gcloud config set project ecode-platform-prod

# Enable billing (required)
# Go to: https://console.cloud.google.com/billing
```

### Step 2: Enable Required APIs
```bash
gcloud services enable \
  compute.googleapis.com \
  container.googleapis.com \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  sqladmin.googleapis.com \
  cloudresourcemanager.googleapis.com \
  artifactregistry.googleapis.com
```

### Step 3: Create GKE Cluster (Unlocks Container Isolation)
```bash
# Create cluster with auto-scaling
gcloud container clusters create ecode-cluster \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type n2-standard-4 \
  --enable-autoscaling \
  --min-nodes 2 \
  --max-nodes 10 \
  --enable-autorepair \
  --disk-size 100 \
  --enable-stackdriver-kubernetes

# Get credentials
gcloud container clusters get-credentials ecode-cluster --zone us-central1-a
```

### Step 4: Set Up Cloud SQL (Per-Project Databases)
```bash
# Create PostgreSQL instance
gcloud sql instances create ecode-db \
  --database-version=POSTGRES_14 \
  --tier=db-standard-2 \
  --region=us-central1 \
  --network=default \
  --availability-type=regional \
  --backup-start-time=02:00 \
  --database-flags=max_connections=500

# Create databases
gcloud sql databases create main --instance=ecode-db
gcloud sql databases create projects --instance=ecode-db

# Create user
gcloud sql users create ecode-admin \
  --instance=ecode-db \
  --password=Gazprom5454@
```

### Step 5: Build and Deploy Platform

#### First, Set Up GitHub Authentication (Required for Private Repo)

**Option 1: Personal Access Token (Recommended for Google Cloud Shell)**
1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Click "Generate new token (classic)"
3. Give it a name: "GCP Deployment"
4. Select scope: `repo` (full control of private repositories)
5. Generate and copy the token

```bash
# Clone your PRIVATE repository using token
git clone https://YOUR_GITHUB_TOKEN@github.com/openaxcloud/e-code.git
cd e-code
```

**Option 2: SSH Key (For permanent setups)**
```bash
# Generate SSH key in Google Cloud Shell
ssh-keygen -t ed25519 -C "your-email@example.com"
cat ~/.ssh/id_ed25519.pub
# Add this public key to GitHub → Settings → SSH and GPG keys

# Then clone using SSH
git clone git@github.com:openaxcloud/e-code.git
cd e-code
```

#### Build and Deploy
```bash
# Build Docker image
docker build -t gcr.io/ecode-platform-prod/main:latest .

# Push to Google Container Registry
docker push gcr.io/ecode-platform-prod/main:latest

# Deploy to Kubernetes
kubectl apply -f k8s/
```

### Step 6: Configure Isolation System
Create `k8s/isolation-system.yaml`:
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: project-isolation
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: project-quota
  namespace: project-isolation
spec:
  hard:
    requests.cpu: "100"
    requests.memory: 200Gi
    persistentvolumeclaims: "100"
    pods: "200"
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: project-isolation
  namespace: project-isolation
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: project-isolation
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: project-isolation
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 443
    - protocol: TCP
      port: 80
```

Apply configuration:
```bash
kubectl apply -f k8s/isolation-system.yaml
```

### Step 7: Set Up Load Balancer & SSL
```bash
# Reserve static IP
gcloud compute addresses create ecode-ip --global

# Get the IP address
gcloud compute addresses describe ecode-ip --global

# Create managed SSL certificate
kubectl apply -f - <<EOF
apiVersion: networking.gke.io/v1
kind: ManagedCertificate
metadata:
  name: ecode-ssl
spec:
  domains:
    - your-domain.com
    - www.your-domain.com
EOF
```

### Step 8: Configure Auto-scaling
```bash
kubectl autoscale deployment ecode-platform \
  --cpu-percent=70 \
  --min=2 \
  --max=20
```

## Cost Estimates (Monthly)

### Small Setup (Development)
- GKE cluster (3 nodes, n1-standard-2): ~$150
- Cloud SQL (db-g1-small): ~$50
- Load Balancer: ~$20
- Storage: ~$10
- **Total: ~$230/month**

### Medium Setup (Production)
- GKE cluster (5 nodes, n2-standard-4): ~$400
- Cloud SQL (db-standard-2, HA): ~$200
- Load Balancer: ~$20
- Storage: ~$50
- **Total: ~$670/month**

### Enterprise Setup
- GKE cluster (10+ nodes, auto-scaling): ~$1,500
- Cloud SQL (db-highmem-4, HA): ~$800
- Load Balancer with CDN: ~$100
- Storage & Backups: ~$200
- **Total: ~$2,600/month**

## Environment Variables
Create `.env.production`:
```env
NODE_ENV=production
DATABASE_URL=postgresql://ecode-admin:PASSWORD@CLOUD_SQL_IP/main

# Enable all features
ENABLE_DOCKER=true
ENABLE_KUBERNETES=true
ENABLE_ISOLATION=true
ENABLE_PER_PROJECT_DB=true

# Google Cloud
GCP_PROJECT_ID=ecode-platform-prod
GCP_REGION=us-central1
GKE_CLUSTER=ecode-cluster

# Secrets (store in Secret Manager)
STRIPE_SECRET_KEY=sk_live_...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

## Monitoring & Logging

### Enable Monitoring
```bash
# Install monitoring agents
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# View metrics
kubectl top nodes
kubectl top pods
```

### Set Up Logging
```bash
# Enable Cloud Logging
gcloud logging sinks create ecode-logs \
  storage.googleapis.com/ecode-logs \
  --log-filter='resource.type="k8s_cluster"'
```

## Quick Deploy Script
Run the provided script:
```bash
chmod +x deploy-to-google.sh
./deploy-to-google.sh YOUR_PROJECT_ID
```

## Quick Start for openaxcloud/e-code Repository

### Complete Command Sequence for Google Cloud Shell
```bash
# 1. Set up GitHub token (get from GitHub settings first)
export GITHUB_TOKEN="your_personal_access_token_here"

# 2. Clone private repository
git clone https://${GITHUB_TOKEN}@github.com/openaxcloud/e-code.git
cd e-code

# 3. Create GCP project (or use existing)
gcloud projects create ecode-platform --name="E-Code Platform"
gcloud config set project ecode-platform

# 4. Enable required services
gcloud services enable compute.googleapis.com container.googleapis.com \
  cloudbuild.googleapis.com run.googleapis.com sqladmin.googleapis.com

# 5. Create Kubernetes cluster
gcloud container clusters create ecode-cluster \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type n2-standard-4 \
  --enable-autoscaling \
  --min-nodes 2 \
  --max-nodes 10

# 6. Get cluster credentials (after cluster is created)
gcloud container clusters get-credentials ecode-cluster --zone us-central1-a

# 7. Deploy
chmod +x deploy-to-google.sh
./deploy-to-google.sh ecode-platform
```

## Verification

### Check Deployment Status
```bash
# Check pods
kubectl get pods --all-namespaces

# Check services
kubectl get services

# Check isolation namespaces
kubectl get namespaces

# Test container creation
curl -X POST https://your-domain.com/api/projects/1/environment
```

### Monitor Resources
```bash
# Watch resource usage
watch kubectl top pods

# Check logs
kubectl logs -f deployment/ecode-platform
```

## Troubleshooting

### Issue: Pods not starting
```bash
kubectl describe pod POD_NAME
kubectl logs POD_NAME
```

### Issue: Database connection failed
```bash
# Check Cloud SQL proxy
kubectl logs deployment/cloudsql-proxy

# Test connection
gcloud sql connect ecode-db --user=ecode-admin
```

### Issue: No external IP
```bash
# Check service
kubectl get service ecode-platform -o yaml

# Recreate if needed
kubectl delete service ecode-platform
kubectl expose deployment ecode-platform --type=LoadBalancer --port=80
```

## Next Steps After Deployment

1. **Configure DNS**: Point your domain to the Load Balancer IP
2. **Set up CI/CD**: Use Cloud Build for automated deployments
3. **Enable CDN**: Add Cloud CDN for global performance
4. **Configure Backups**: Set up automated database backups
5. **Add Monitoring**: Configure alerts in Cloud Monitoring
6. **Security Hardening**: Enable Cloud Armor for DDoS protection

## Support Resources

- Google Cloud Console: https://console.cloud.google.com
- GKE Documentation: https://cloud.google.com/kubernetes-engine/docs
- Cloud SQL Docs: https://cloud.google.com/sql/docs
- Billing Calculator: https://cloud.google.com/products/calculator
- Support: https://cloud.google.com/support

## Migration from Replit

1. Export your database:
```bash
pg_dump $DATABASE_URL > backup.sql
```

2. Import to Cloud SQL:
```bash
gcloud sql import sql ecode-db gs://your-bucket/backup.sql
```

3. Copy files to Cloud Storage:
```bash
gsutil -m cp -r . gs://your-bucket/code/
```

---

**Note**: This deployment unlocks ALL limitations from Replit:
- ✅ Real Docker containers (not simulated)
- ✅ True Kubernetes orchestration
- ✅ Actual network isolation
- ✅ Separate PostgreSQL databases per project
- ✅ Enforced CPU/memory limits via cgroups
- ✅ Horizontal auto-scaling
- ✅ Root access for system-level operations

For questions or issues, consult Google Cloud support or community forums.