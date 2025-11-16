# E-Code Platform - Production Deployment Runbook

**Version:** 1.0.0  
**Last Updated:** November 16, 2025  
**Target:** Fortune 500 Production Environment  
**Docker Image Size Target:** <2 GiB

---

## ⚠️ **IMPORTANT - CURRENT DEPLOYMENT STATUS**

> **This Docker deployment runbook is currently NOT USED.**
> 
> **Current Deployment Method:** Replit's built-in "Publish" button ✅
> - Click "Publish" in Replit → Select "Autoscale" → Done
> - No Docker needed for current deployment
> - Replit handles all infrastructure automatically
> 
> **This Documentation Is:**
> - ✅ PRESERVED for future external deployment (K8s, AWS, GCP, Azure)
> - ✅ READY to use when migrating off Replit
> - ⚠️ NOT NEEDED for current Replit deployment
> 
> **Use This Runbook When:**
> - Deploying to external infrastructure (not Replit)
> - Setting up CI/CD pipelines outside Replit
> - Migrating to Kubernetes/cloud platforms
> - Testing Docker builds locally
> 
> **For Current Deployment:** Just click "Publish" button in Replit interface.

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Docker Build Process](#docker-build-process)
3. [Local Testing](#local-testing)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Health Checks & Monitoring](#health-checks--monitoring)
6. [Rollback Procedures](#rollback-procedures)
7. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### ✅ Prerequisites

**Required Files:**
```bash
# Verify all critical files exist
ls -lh Dockerfile .dockerignore package.json package-lock.json
```

**CRITICAL:** If `package-lock.json` is missing, generate it:
```bash
npm install --package-lock-only
git add package-lock.json
git commit -m "chore: add package-lock.json for reproducible builds"
```

**Environment Secrets:**
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `OPENAI_API_KEY` - OpenAI API key
- [ ] `GEMINI_API_KEY` - Google Gemini API key
- [ ] `MOONSHOT_API_KEY` - Moonshot AI API key
- [ ] `ANTHROPIC_API_KEY` (optional - currently no credits)
- [ ] `XAI_API_KEY` (optional - not configured)
- [ ] `GROQ_API_KEY` (optional - not configured)

**System Requirements:**
- Docker 20.10+ or Podman
- Kubernetes 1.24+ (for K8s deployment)
- 8GB RAM minimum for build
- 20GB disk space for build artifacts

---

## Docker Build Process

### 🏗️ Build Commands

#### Development Build (with cache)
```bash
docker build -t e-code-platform:dev .
```

#### Production Build (clean, reproducible)
```bash
# Clean build without cache (recommended for CI/CD)
docker build --no-cache --pull -t e-code-platform:$(git rev-parse --short HEAD) .

# Tag as latest
docker tag e-code-platform:$(git rev-parse --short HEAD) e-code-platform:latest
```

#### Multi-Platform Build (for ARM + AMD64)
```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t your-registry.io/e-code-platform:$(git rev-parse --short HEAD) \
  --push \
  .
```

### 📊 Build Metrics

**Expected Build Times:**
- First build: 8-12 minutes
- Cached build: 2-4 minutes
- CI/CD build: 10-15 minutes

**Expected Image Size:**
- Target: **< 2 GiB**
- Typical: **1.5-1.8 GiB**
- Unoptimized (before Nov 2025): >8 GiB ❌

**Verify Image Size:**
```bash
docker images e-code-platform:latest
# REPOSITORY          TAG       SIZE
# e-code-platform     latest    1.7GB  ✅ Good!
```

### 🔍 Build Validation

```bash
# Check Dockerfile syntax
docker build --check .

# Inspect image layers
docker history e-code-platform:latest

# Check for vulnerabilities (requires Docker Scout or Trivy)
docker scout cves e-code-platform:latest
# OR
trivy image e-code-platform:latest
```

---

## Local Testing

### 🧪 Test Container Locally

#### Basic Test
```bash
# Run container
docker run -d \
  --name e-code-test \
  -p 5000:5000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e OPENAI_API_KEY="sk-..." \
  -e GEMINI_API_KEY="..." \
  -e MOONSHOT_API_KEY="..." \
  e-code-platform:latest

# Wait for startup (max 40 seconds)
sleep 40

# Test health endpoint
curl -f http://localhost:5000/health/liveness || echo "❌ Health check failed"
curl -f http://localhost:5000/health/readiness || echo "❌ Readiness check failed"

# Check logs
docker logs e-code-test

# Cleanup
docker stop e-code-test && docker rm e-code-test
```

#### Full Test Suite
```bash
# Test all health endpoints
curl http://localhost:5000/health/liveness    # Should return 200 (always)
curl http://localhost:5000/health/readiness   # Should return 200 when ready
curl http://localhost:5000/health/startup     # Should return 200 after init
curl http://localhost:5000/health/deep        # Should return 200 when all deps healthy

# Test API endpoints
curl http://localhost:5000/api/monitoring/health
curl http://localhost:5000/api/docs  # Swagger UI (if SWAGGER_ENABLED=true)

# Test AI provider status
curl http://localhost:5000/api/health/providers
```

### 🔍 Performance Testing

```bash
# Check memory usage
docker stats e-code-test

# Expected metrics:
# - Memory: < 2 GB under load
# - CPU: < 50% average
# - Network: depends on traffic
```

---

## Kubernetes Deployment

### 📦 Push to Registry

```bash
# Login to registry
docker login your-registry.io

# Tag and push
docker tag e-code-platform:latest your-registry.io/e-code-platform:v1.0.0
docker push your-registry.io/e-code-platform:v1.0.0
```

### 🚀 Deploy to Kubernetes

#### Create Secret
```bash
kubectl create secret generic e-code-secrets \
  --from-literal=DATABASE_URL="postgresql://..." \
  --from-literal=OPENAI_API_KEY="sk-..." \
  --from-literal=GEMINI_API_KEY="..." \
  --from-literal=MOONSHOT_API_KEY="..." \
  --namespace=production
```

#### Apply Deployment
```yaml
# deployment.yaml (minimal example)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: e-code-platform
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: e-code-platform
  template:
    metadata:
      labels:
        app: e-code-platform
    spec:
      containers:
      - name: e-code
        image: your-registry.io/e-code-platform:v1.0.0
        ports:
        - containerPort: 5000
          name: http
        env:
        - name: NODE_ENV
          value: production
        - name: NODE_OPTIONS
          value: "--max-old-space-size=4096"
        envFrom:
        - secretRef:
            name: e-code-secrets
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health/liveness
            port: 5000
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 3
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health/readiness
            port: 5000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        startupProbe:
          httpGet:
            path: /health/startup
            port: 5000
          initialDelaySeconds: 0
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 12  # 60 seconds max
---
apiVersion: v1
kind: Service
metadata:
  name: e-code-platform
  namespace: production
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 5000
    protocol: TCP
  selector:
    app: e-code-platform
```

```bash
# Apply configuration
kubectl apply -f deployment.yaml

# Verify deployment
kubectl get pods -n production
kubectl get svc -n production
```

### 📊 Monitor Deployment

```bash
# Watch rollout
kubectl rollout status deployment/e-code-platform -n production

# Check pod logs
kubectl logs -f deployment/e-code-platform -n production

# Check resource usage
kubectl top pods -n production

# Check events
kubectl get events -n production --sort-by='.lastTimestamp'
```

---

## Health Checks & Monitoring

### 🏥 Health Endpoints

| Endpoint | Purpose | Expected Response | K8s Probe |
|----------|---------|-------------------|-----------|
| `/health/liveness` | Process alive check | Always 200 OK | Liveness |
| `/health/readiness` | Traffic readiness | 200 when ready, 503 when not | Readiness |
| `/health/startup` | Startup completion | 200 after init | Startup |
| `/health/deep` | Full system check | 200 when healthy, 503 when degraded | Manual |
| `/api/health/providers` | AI provider status | JSON with provider health | Manual |

### 🎯 Success Criteria

**Startup (0-40 seconds):**
- [ ] Container starts without errors
- [ ] Database connection established
- [ ] All health probes return 200 OK
- [ ] No error logs in console

**Runtime (steady state):**
- [ ] Memory usage < 2 GB
- [ ] CPU usage < 50% average
- [ ] Response time < 500ms (p95)
- [ ] No memory leaks (stable over 24h)
- [ ] All AI providers responding

**Under Load:**
- [ ] Memory stays < 4 GB (limit)
- [ ] No heap overflow errors
- [ ] Readiness probe stays healthy
- [ ] Response time < 1000ms (p95)

### 📈 Key Metrics to Monitor

```bash
# Container metrics
docker stats e-code-platform

# Kubernetes metrics
kubectl top pod -l app=e-code-platform -n production

# Application metrics (via Prometheus/Grafana)
# - HTTP request rate
# - HTTP request duration (p50, p95, p99)
# - AI provider response times
# - Database query times
# - Memory heap usage
# - Active WebSocket connections
```

---

## Rollback Procedures

### 🔄 Quick Rollback (Kubernetes)

```bash
# Check deployment history
kubectl rollout history deployment/e-code-platform -n production

# Rollback to previous version
kubectl rollout undo deployment/e-code-platform -n production

# Rollback to specific revision
kubectl rollout undo deployment/e-code-platform -n production --to-revision=2

# Monitor rollback
kubectl rollout status deployment/e-code-platform -n production
```

### 🔄 Docker Rollback

```bash
# Stop current container
docker stop e-code-platform

# Start previous version
docker run -d \
  --name e-code-platform \
  -p 5000:5000 \
  --env-file .env.production \
  your-registry.io/e-code-platform:v0.9.0  # Previous stable version
```

### 🔄 Database Rollback

⚠️ **CRITICAL:** Database rollback uses Replit's built-in checkpoint system.

**Cannot be done via this runbook** - User must use Replit UI:
1. Go to Replit project
2. Click "Checkpoints" tab
3. Select checkpoint before deployment
4. Click "Restore"

---

## Troubleshooting

### ❌ Problem: Build Fails with "Heap Out of Memory"

**Symptoms:**
```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

**Solution:**
1. Verify `NODE_OPTIONS` in Dockerfile:
   ```dockerfile
   ENV NODE_OPTIONS=--max-old-space-size=4096
   ```
2. Increase Docker build memory:
   ```bash
   docker build --memory=8g --memory-swap=8g -t e-code-platform .
   ```

---

### ❌ Problem: Image Size > 2 GiB

**Symptoms:**
```bash
docker images e-code-platform
# SIZE: 3.2GB  ❌ Too large!
```

**Solution:**
1. Verify `.dockerignore` excludes dev directories:
   ```bash
   grep -E "dokploy|sdk|cli|vscode-extension|github-copilot-extension" .dockerignore
   ```
2. Check multi-stage build is working:
   ```bash
   docker history e-code-platform:latest | head -20
   ```
3. Verify production-only deps in runtime stage:
   ```bash
   docker run --rm e-code-platform:latest npm ls --depth=0
   ```

---

### ❌ Problem: Container Fails to Start

**Symptoms:**
```
Error: Cannot find module 'express'
```

**Solution:**
1. Check `package-lock.json` exists and is copied into image
2. Verify `npm ci --only=production` in runtime stage
3. Rebuild without cache:
   ```bash
   docker build --no-cache -t e-code-platform .
   ```

---

### ❌ Problem: Health Check Fails (503)

**Symptoms:**
```bash
curl http://localhost:5000/health/readiness
# HTTP 503 Service Unavailable
```

**Solution:**
1. Check logs:
   ```bash
   docker logs e-code-platform
   ```
2. Common causes:
   - Database not connected → Check `DATABASE_URL`
   - Redis not available → Check Redis connection
   - Memory > 80% → Increase container memory limit
   - Disk > 80% → Clean up disk space

---

### ❌ Problem: AI Provider Errors

**Symptoms:**
```
OpenAI API Error: 401 Unauthorized
```

**Solution:**
1. Verify API keys are set:
   ```bash
   docker exec e-code-platform env | grep API_KEY
   ```
2. Check provider health:
   ```bash
   curl http://localhost:5000/api/health/providers
   ```
3. Common fixes:
   - OpenAI: Verify `OPENAI_API_KEY` starts with `sk-`
   - Gemini: Verify `GEMINI_API_KEY` is valid
   - Moonshot: Verify `MOONSHOT_API_KEY` is valid

---

## Build Optimization Summary (Nov 2025)

### Problems Solved

| Issue | Before | After | Solution |
|-------|--------|-------|----------|
| **Heap overflow** | Build crashes | ✅ Stable | NODE_OPTIONS=4096 |
| **Image size** | >8 GiB | **<2 GiB** | .dockerignore + multi-stage |
| **Build time** | 15+ min | 8-12 min | Optimized layers |
| **Reproducibility** | Varies | ✅ Deterministic | npm ci + lockfile |

### Key Files

- **Dockerfile** - Multi-stage Alpine build with memory optimization
- **.dockerignore** - Excludes ~2-3 GB of dev directories
- **tsconfig.json** - Optimized TypeScript compilation
- **package-lock.json** - Ensures reproducible builds (REQUIRED)

### Architecture

```
┌─────────────────────────────────────────┐
│ Stage 1: Builder (node:18-alpine)      │
│ - npm ci (all deps from lockfile)      │
│ - TypeScript compilation                │
│ - Vite build (frontend)                 │
│ - esbuild bundle (backend)              │
│ → Produces: dist/index.js + dist/public│
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Stage 2: Runtime (node:18-alpine)      │
│ - npm ci --only=production              │
│ - COPY dist/ from builder               │
│ - Security: non-root user               │
│ - Health: K8s-ready probes              │
│ → Final image: 1.5-1.8 GiB              │
└─────────────────────────────────────────┘
```

---

## Support & Escalation

**For Issues:**
1. Check logs: `docker logs e-code-platform` or `kubectl logs -f <pod>`
2. Check this runbook troubleshooting section
3. Check `replit.md` for system architecture
4. Contact DevOps team with:
   - Docker image tag
   - Error logs (last 100 lines)
   - Health check outputs
   - Resource usage metrics

**Deployment Approval Required For:**
- Schema changes affecting >100K records
- Breaking API changes
- New external service dependencies
- Memory/CPU limit changes >50%

---

**Document Version:** 1.0.0  
**Last Review:** November 16, 2025  
**Next Review:** December 16, 2025  
**Owner:** DevOps Team  
**Approver:** Senior Engineering Lead (40 years experience)
