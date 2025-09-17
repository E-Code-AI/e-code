# E-Code Platform Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the E-Code platform to staging and production environments with proper security and scalability configurations.

## Prerequisites

### System Requirements
- **CPU**: Minimum 4 cores (8+ recommended for production)
- **Memory**: Minimum 8GB RAM (16GB+ recommended for production)
- **Storage**: Minimum 100GB SSD (500GB+ recommended for production)
- **Network**: High-bandwidth connection for container image pulls

### Required Software
- Docker Engine 20.10+
- Docker Compose 2.0+
- Go 1.21+ (for executor service)
- Node.js 18+ (for main application)
- PostgreSQL 14+ (managed service recommended)
- Redis 6+ (managed service recommended)

### Cloud Services (Recommended)
- **Container Orchestration**: Kubernetes, Google Cloud Run, AWS ECS
- **Database**: Google Cloud SQL, AWS RDS, Azure Database
- **Storage**: Google Cloud Storage, AWS S3, Azure Blob
- **Monitoring**: Datadog, New Relic, Google Cloud Monitoring

## Environment Setup

### 1. Environment Configuration

Copy and customize the environment configuration:

```bash
cp .env.example .env.production
```

**Critical Variables to Configure:**

```bash
# Security (MUST CHANGE)
SESSION_SECRET=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)
EXECUTOR_API_KEY=$(openssl rand -hex 32)

# Database (Use managed service)
DATABASE_URL=postgresql://user:password@db-host:5432/ecode_prod

# Redis (Use managed service)
REDIS_URL=redis://user:password@redis-host:6379

# Storage (Use managed service)
S3_BUCKET=your-production-bucket
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key

# AI Services (Get production keys)
OPENAI_API_KEY=sk-your-production-openai-key
ANTHROPIC_API_KEY=your-production-anthropic-key

# Application
NODE_ENV=production
APP_URL=https://your-domain.com
DOMAIN=your-domain.com
```

### 2. Security Configuration

**SSL/TLS Setup:**
```bash
# Generate SSL certificates (use Let's Encrypt in production)
sudo certbot certonly --standalone -d your-domain.com
```

**Firewall Configuration:**
```bash
# Allow only necessary ports
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## Container Build and Deployment

### 1. Build Container Images

```bash
# Build main application
docker build -t ecode-app:${VERSION} .

# Build sandbox environment
docker build -f sandbox/Dockerfile -t ecode-sandbox:${VERSION} ./sandbox

# Build executor service
cd server/execution
docker build -t ecode-executor:${VERSION} .
```

### 2. Deploy with Docker Compose (Small Scale)

Create production compose file:

```yaml
# docker-compose.production.yml
version: '3.8'

services:
  app:
    image: ecode-app:${VERSION}
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    restart: unless-stopped
    depends_on:
      - postgres
      - redis
      - executor

  executor:
    image: ecode-executor:${VERSION}
    ports:
      - "8080:8080"
    environment:
      - SANDBOX_IMAGE=ecode-sandbox:${VERSION}
    env_file:
      - .env.production
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    restart: unless-stopped
    security_opt:
      - seccomp:./sandbox/seccomp.json

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - /etc/letsencrypt:/etc/letsencrypt
    restart: unless-stopped
    depends_on:
      - app

  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: ecode_prod
      POSTGRES_USER: ecode
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

Deploy:
```bash
VERSION=1.0.0 docker-compose -f docker-compose.production.yml up -d
```

### 3. Deploy with Kubernetes (Large Scale)

Create Kubernetes manifests:

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ecode-production

---
# k8s/app-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ecode-app
  namespace: ecode-production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ecode-app
  template:
    metadata:
      labels:
        app: ecode-app
    spec:
      containers:
      - name: app
        image: ecode-app:1.0.0
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        envFrom:
        - secretRef:
            name: ecode-secrets
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"

---
# k8s/executor-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ecode-executor
  namespace: ecode-production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ecode-executor
  template:
    metadata:
      labels:
        app: ecode-executor
    spec:
      containers:
      - name: executor
        image: ecode-executor:1.0.0
        ports:
        - containerPort: 8080
        envFrom:
        - secretRef:
            name: ecode-secrets
        volumeMounts:
        - name: docker-sock
          mountPath: /var/run/docker.sock
        securityContext:
          privileged: true  # Required for Docker-in-Docker
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
      volumes:
      - name: docker-sock
        hostPath:
          path: /var/run/docker.sock
```

Deploy to Kubernetes:
```bash
kubectl apply -f k8s/
```

## Database Setup

### 1. Database Migration

```bash
# Run database migrations
npm run db:push

# Seed initial data (if needed)
npm run db:seed
```

### 2. Database Backup Setup

```bash
# Create backup script
cat > backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > backups/db_backup_$DATE.sql
aws s3 cp backups/db_backup_$DATE.sql s3://your-backup-bucket/
EOF

# Set up cron job for daily backups
echo "0 2 * * * /path/to/backup-db.sh" | crontab -
```

## Monitoring and Logging

### 1. Health Checks

Create health check endpoints:

```bash
# Check application health
curl -f http://localhost:3000/health

# Check executor health
curl -f http://localhost:8080/health

# Check database connectivity
curl -f http://localhost:3000/api/health/db
```

### 2. Log Aggregation

Configure centralized logging:

```yaml
# docker-compose.production.yml (add to services)
  logging:
    driver: "json-file"
    options:
      max-size: "100m"
      max-file: "3"
```

### 3. Monitoring Setup

```bash
# Install monitoring agents
# For Datadog
DD_API_KEY=your-key bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script.sh)"

# For New Relic
echo 'license_key: your-key' | sudo tee -a /etc/newrelic-infra.yml
```

## Security Hardening

### 1. Container Security

```dockerfile
# Use non-root user in all containers
USER 1000:1000

# Use read-only filesystem where possible
--read-only --tmpfs /tmp

# Drop all capabilities
--cap-drop=ALL

# Use seccomp profile
--security-opt seccomp=./sandbox/seccomp.json
```

### 2. Network Security

```bash
# Configure WAF rules (example for nginx)
# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

# Block common attack patterns
location ~ \.(env|git|svn) {
    deny all;
    return 404;
}
```

### 3. Secret Management

```bash
# Use external secret management
# For Kubernetes
kubectl create secret generic ecode-secrets \
  --from-literal=database-url="postgresql://..." \
  --from-literal=jwt-secret="..." \
  --from-literal=api-key="..."

# For Docker Swarm
echo "your-secret" | docker secret create db_password -
```

## Disaster Recovery

### 1. Backup Strategy

**Daily Backups:**
- Database snapshots
- File storage backups
- Container image registry backups

**Recovery Testing:**
- Monthly restore tests
- Documented recovery procedures
- RTO/RPO targets defined

### 2. High Availability

**Multi-Region Deployment:**
```bash
# Deploy to multiple regions
regions=("us-east-1" "us-west-2" "eu-west-1")
for region in "${regions[@]}"; do
  deploy-to-region.sh $region
done
```

**Load Balancing:**
```nginx
upstream ecode_backend {
    server app1.internal:3000;
    server app2.internal:3000;
    server app3.internal:3000;
}
```

## Deployment Commands

### Staging Deployment

```bash
#!/bin/bash
# deploy-staging.sh

set -e

echo "Deploying to staging..."

# Build and tag images
VERSION=$(git rev-parse --short HEAD)
docker build -t ecode-app:$VERSION .
docker build -f sandbox/Dockerfile -t ecode-sandbox:$VERSION ./sandbox

# Push to registry
docker tag ecode-app:$VERSION registry.yourdomain.com/ecode-app:$VERSION
docker push registry.yourdomain.com/ecode-app:$VERSION

# Deploy to staging
kubectl set image deployment/ecode-app app=registry.yourdomain.com/ecode-app:$VERSION -n ecode-staging

# Wait for rollout
kubectl rollout status deployment/ecode-app -n ecode-staging

# Run smoke tests
./tests/smoke/run_executor_smoke_test.sh

echo "Staging deployment complete!"
```

### Production Deployment

```bash
#!/bin/bash
# deploy-production.sh

set -e

echo "Deploying to production..."

# Verify staging deployment
echo "Verifying staging tests..."
./tests/smoke/run_executor_smoke_test.sh staging

# Create production release
VERSION=$1
if [ -z "$VERSION" ]; then
  echo "Usage: $0 <version>"
  exit 1
fi

# Tag and push production images
docker tag ecode-app:staging ecode-app:$VERSION
docker push registry.yourdomain.com/ecode-app:$VERSION

# Blue-green deployment
kubectl patch service ecode-app -p '{"spec":{"selector":{"version":"'$VERSION'"}}}'

# Monitor deployment
kubectl rollout status deployment/ecode-app -n ecode-production

# Run production smoke tests
./tests/smoke/run_executor_smoke_test.sh production

echo "Production deployment complete!"
```

## Troubleshooting

### Common Issues

**Container Won't Start:**
```bash
# Check logs
docker logs container-name

# Check resource constraints
docker stats

# Verify environment variables
docker exec container-name env
```

**Database Connection Issues:**
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check connection pool
# Monitor active connections in app metrics
```

**Executor Service Issues:**
```bash
# Check Docker daemon
systemctl status docker

# Verify seccomp profile
docker run --security-opt seccomp=./sandbox/seccomp.json ecode-sandbox:latest echo "test"

# Check resource limits
docker run --memory=512m --cpus=1 ecode-sandbox:latest echo "test"
```

### Emergency Procedures

**Service Down:**
1. Check monitoring dashboards
2. Review error logs
3. Execute rollback if needed
4. Escalate to on-call engineer

**Security Incident:**
1. Isolate affected systems
2. Collect forensic data
3. Apply security patches
4. Notify stakeholders

## Maintenance

### Regular Tasks
- **Weekly**: Security updates, log review
- **Monthly**: Backup testing, performance review
- **Quarterly**: Security audit, disaster recovery testing

### Update Procedures
1. Test updates in staging
2. Schedule maintenance window
3. Apply updates incrementally
4. Monitor for issues
5. Document changes

## Support Contacts

- **DevOps Team**: devops@yourdomain.com
- **Security Team**: security@yourdomain.com
- **On-Call Engineer**: +1-555-0123
- **Escalation Manager**: manager@yourdomain.com