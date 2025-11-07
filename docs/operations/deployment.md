# E-Code Platform Deployment Guide

> **Enterprise Deployment Documentation**  
> Version 2.0.0 | Last Updated: November 2024

## Table of Contents

1. [Overview](#overview)
2. [Deployment Architecture](#deployment-architecture)
3. [Prerequisites](#prerequisites)
4. [Deployment Strategies](#deployment-strategies)
5. [Replit Reserved VM Deployment](#replit-reserved-vm-deployment)
6. [Docker Deployment](#docker-deployment)
7. [Kubernetes Deployment](#kubernetes-deployment)
8. [Configuration Management](#configuration-management)
9. [Monitoring & Observability](#monitoring--observability)
10. [Troubleshooting](#troubleshooting)

## Overview

The E-Code Platform is designed for enterprise-grade deployment with support for multiple deployment targets including Replit Reserved VM, Docker containers, and Kubernetes clusters.

### Key Features

- **Multi-service Architecture**: TypeScript core, Go runtime, Python ML, and MCP services
- **Auto-scaling**: Automatic horizontal scaling based on load
- **Zero-downtime Deployments**: Blue-green deployment strategy
- **High Availability**: 99.99% uptime SLA with proper configuration

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Load Balancer                        │
│                    (Port 80/443)                        │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┬──────────────┐
        │                         │              │
┌───────▼────────┐    ┌──────────▼────────┐    │
│  TypeScript    │    │   MCP Server      │    │
│  Core Service  │    │   (Port 3200)     │    │
│  (Port 5000)   │    └───────────────────┘    │
└────────────────┘                              │
                                                │
┌────────────────────────────────────────────────┐
│            Polyglot Services                    │
├──────────────────┬─────────────────────────────┤
│   Go Runtime     │    Python ML Service        │
│   (Port 8080)    │    (Port 8081)             │
└──────────────────┴─────────────────────────────┘
                     │
        ┌────────────▼────────────┐
        │     PostgreSQL          │
        │     Database            │
        └─────────────────────────┘
```

## Prerequisites

### System Requirements

| Component | Minimum | Recommended | Production |
|-----------|---------|-------------|------------|
| **CPU** | 2 cores | 4 cores | 8+ cores |
| **RAM** | 4 GB | 8 GB | 16+ GB |
| **Storage** | 20 GB | 50 GB | 100+ GB |
| **Node.js** | 18.x | 20.x | 20.x LTS |
| **PostgreSQL** | 14.x | 15.x | 16.x |
| **Docker** | 20.10 | 24.0 | Latest stable |

### Required Environment Variables

```bash
# Core Configuration
NODE_ENV=production
APP_URL=https://your-domain.com

# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Authentication
SESSION_SECRET=<64-character-random-string>
JWT_SECRET=<32-character-random-string>
JWT_REFRESH_SECRET=<32-character-random-string>

# AI Services (Optional but Recommended)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GENERATIVE_AI_API_KEY=...

# Monitoring (Optional)
SENTRY_DSN=https://...@sentry.io/...

# Feature Flags (Optional)
DISABLE_MONITORING=false
DISABLE_POLYGLOT=false
DISABLE_PREVIEW=false
```

## Deployment Strategies

### 1. Blue-Green Deployment

Recommended for zero-downtime deployments:

```bash
# Deploy to green environment
npm run deploy:green

# Test green environment
npm run test:integration -- --env=green

# Switch traffic to green
npm run switch:green

# Keep blue as rollback option
```

### 2. Canary Deployment

For gradual rollouts:

```bash
# Deploy canary version (5% traffic)
npm run deploy:canary --weight=5

# Monitor metrics
npm run monitor:canary

# Gradually increase traffic
npm run deploy:canary --weight=25
npm run deploy:canary --weight=50
npm run deploy:canary --weight=100
```

## Replit Reserved VM Deployment

### Step 1: Configure .replit File

```toml
modules = ["nodejs-20", "postgresql-16"]
run = "npm run start"

[deployment]
deploymentTarget = "autoscale"
build = ["npm", "install"]
run = ["sh", "-c", "npm run start"]

[[ports]]
localPort = 5000
externalPort = 80
```

### Step 2: Set Environment Secrets

In Replit Secrets panel, add:

```
DATABASE_URL=your_postgresql_url
SESSION_SECRET=your_session_secret
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
```

### Step 3: Build and Deploy

```bash
# Build the application
npm run build

# The start.js script auto-builds if needed
node start.js
```

### Step 4: Verify Deployment

```bash
# Check service health
curl https://your-app.repl.co/api/health

# Check all services
curl https://your-app.repl.co/api/status
```

## Docker Deployment

### Single Container Deployment

```bash
# Build Docker image
docker build -t e-code-platform:latest .

# Run container
docker run -d \
  --name e-code \
  -p 5000:5000 \
  -e DATABASE_URL=$DATABASE_URL \
  -e SESSION_SECRET=$SESSION_SECRET \
  -e JWT_SECRET=$JWT_SECRET \
  -e NODE_ENV=production \
  e-code-platform:latest
```

### Docker Compose Deployment

```yaml
# docker-compose.production.yml
version: '3.8'

services:
  app:
    image: e-code-platform:latest
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - SESSION_SECRET=${SESSION_SECRET}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=ecode
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

volumes:
  postgres_data:
```

Deploy with:

```bash
docker-compose -f docker-compose.production.yml up -d
```

## Kubernetes Deployment

### Helm Chart Installation

```bash
# Add E-Code helm repository
helm repo add e-code https://charts.e-code.ai
helm repo update

# Install with custom values
helm install e-code e-code/platform \
  --namespace production \
  --create-namespace \
  --values values.production.yaml
```

### Sample values.yaml

```yaml
replicaCount: 3

image:
  repository: e-code/platform
  tag: "2.0.0"
  pullPolicy: IfNotPresent

service:
  type: LoadBalancer
  port: 80

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: platform.e-code.ai
      paths:
        - path: /
          pathType: Prefix

resources:
  limits:
    cpu: 2000m
    memory: 4Gi
  requests:
    cpu: 500m
    memory: 1Gi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

postgresql:
  enabled: true
  auth:
    postgresPassword: secretpassword
    database: ecode
  primary:
    persistence:
      size: 50Gi
```

## Configuration Management

### Environment-Specific Configuration

```javascript
// config/environments.js
const configs = {
  development: {
    database: { pool: { max: 5, min: 2 } },
    monitoring: { enabled: false },
    ai: { defaultProvider: 'mock' }
  },
  staging: {
    database: { pool: { max: 10, min: 5 } },
    monitoring: { enabled: true, sampleRate: 0.1 },
    ai: { defaultProvider: 'openai' }
  },
  production: {
    database: { pool: { max: 20, min: 10 } },
    monitoring: { enabled: true, sampleRate: 1.0 },
    ai: { defaultProvider: 'anthropic' }
  }
};
```

### Feature Flags

```javascript
// config/features.js
export const features = {
  aiAgent: process.env.FEATURE_AI_AGENT !== 'false',
  collaboration: process.env.FEATURE_COLLABORATION !== 'false',
  monitoring: process.env.DISABLE_MONITORING !== 'true',
  polyglot: process.env.DISABLE_POLYGLOT !== 'true',
  preview: process.env.DISABLE_PREVIEW !== 'true'
};
```

## Monitoring & Observability

### Health Checks

```javascript
// GET /api/health
{
  "status": "healthy",
  "timestamp": "2024-11-03T12:00:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "mcp": "running",
    "polyglot": {
      "go": "running",
      "python": "running"
    }
  },
  "metrics": {
    "memory": "1.2GB / 4GB",
    "cpu": "23%",
    "connections": 142,
    "uptime": "14d 3h 42m"
  }
}
```

### Monitoring Setup

1. **Application Monitoring** (Sentry)
```javascript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});
```

2. **Infrastructure Monitoring** (Prometheus)
```yaml
# prometheus.yml
global:
  scrape_interval: 15s
scrape_configs:
  - job_name: 'e-code'
    static_configs:
      - targets: ['localhost:5000']
    metrics_path: '/metrics'
```

3. **Log Aggregation** (ELK Stack)
```javascript
// winston configuration
const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.Elasticsearch({
      node: process.env.ELASTICSEARCH_NODE,
      index: 'e-code-logs'
    })
  ]
});
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Database Connection Issues

**Problem**: `ECONNREFUSED` connecting to PostgreSQL

**Solution**:
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Check connection string
psql $DATABASE_URL -c "SELECT 1"

# Verify firewall rules
sudo ufw status
```

#### 2. Memory Issues

**Problem**: High memory usage or OOM errors

**Solution**:
```bash
# Optimize Node.js memory
NODE_OPTIONS="--max-old-space-size=4096" npm start

# Reduce database pool size
DATABASE_POOL_MAX=5 npm start

# Disable optional services
DISABLE_MONITORING=true DISABLE_POLYGLOT=true npm start
```

#### 3. Port Conflicts

**Problem**: Port already in use

**Solution**:
```bash
# Find process using port
lsof -i :5000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3000 npm start
```

#### 4. Build Failures

**Problem**: Build fails with module errors

**Solution**:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Build with verbose logging
npm run build -- --verbose
```

### Performance Optimization

#### Database Optimization

```sql
-- Create indexes for common queries
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_files_project ON files(project_id);
CREATE INDEX idx_users_email ON users(email);

-- Analyze tables for query optimization
ANALYZE projects;
ANALYZE files;
ANALYZE users;
```

#### Caching Strategy

```javascript
// Redis caching configuration
const cacheConfig = {
  ttl: 3600, // 1 hour default
  max: 1000, // Maximum cache entries
  strategy: 'LRU', // Least Recently Used
  compression: true
};
```

#### CDN Configuration

```nginx
# nginx.conf for static assets
location /assets {
  expires 1y;
  add_header Cache-Control "public, immutable";
  gzip_static on;
}
```

## Security Best Practices

1. **Use HTTPS everywhere** - Enforce SSL/TLS
2. **Rotate secrets regularly** - Every 90 days
3. **Implement rate limiting** - Prevent abuse
4. **Enable audit logging** - Track all actions
5. **Regular security updates** - Patch dependencies
6. **Backup data regularly** - Daily automated backups
7. **Monitor for anomalies** - Alert on suspicious activity

## Support

For deployment assistance:

- **Enterprise Support**: enterprise@e-code.ai
- **Technical Issues**: [GitHub Issues](https://github.com/e-code/platform/issues)
- **Security Concerns**: security@e-code.ai
- **Documentation**: [docs.e-code.ai](https://docs.e-code.ai)

---

**Copyright © 2024 E-Code Platform. All rights reserved.**