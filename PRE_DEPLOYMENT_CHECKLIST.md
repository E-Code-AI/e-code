# 🚀 E-Code Platform - Pre-Deployment Checklist

**Date:** November 16, 2025  
**Target:** Fortune 500 Production Deployment  
**Image Size Goal:** < 2 GiB  

---

## ⚠️ **DEPLOYMENT METHOD CONTEXT**

> **This checklist is for DOCKER deployment (not currently used).**
> 
> **Current Deployment:** Replit "Publish" button ✅
> - No checklist needed - just click "Publish" in Replit
> - Replit handles everything automatically
> 
> **This Checklist Is For:**
> - Future Docker deployment (K8s, AWS, GCP, Azure)
> - External infrastructure migration
> - CI/CD pipeline setup outside Replit
> 
> **For Current Replit Deployment:**
> 1. Click "Publish" button
> 2. Select "Autoscale"
> 3. Configure environment secrets
> 4. Done! ✅
> 
> **Use This Checklist When:** Deploying via Docker to external infrastructure.

---

## ✅ Critical Actions Required BEFORE Docker Build

### 1. Generate package-lock.json (REQUIRED)

**Status:** ❌ **MISSING - MUST FIX FIRST**

**Why:** Without `package-lock.json`, your builds are NOT reproducible. Different developers/CI builds may get different dependency versions, causing production bugs.

**Action:**
```bash
# Generate lockfile from package.json
npm install --package-lock-only

# Verify it was created
ls -lh package-lock.json
# Should show ~600-800KB file

# Commit to git
git add package-lock.json
git commit -m "chore: add package-lock.json for reproducible Docker builds"
```

**Validation:**
```bash
# Check lockfile is valid
npm ci --dry-run
# Should say "npm ci will delete node_modules and install..."
```

---

### 2. Verify .dockerignore Excludes Dev Directories

**Status:** ✅ COMPLETE (5 directories excluded)

**Validation:**
```bash
grep -E "dokploy|sdk|cli|vscode-extension|github-copilot-extension" .dockerignore
# Should show 5 matches
```

**Impact:** Saves ~2-3 GB from Docker image size

---

### 3. Verify NODE_OPTIONS in Dockerfile

**Status:** ✅ COMPLETE (4 occurrences)

**Validation:**
```bash
grep "NODE_OPTIONS" Dockerfile
# Should show 4 lines (ARG + ENV in builder, ARG + ENV in runtime)
```

**Impact:** Prevents JavaScript heap out of memory errors during build

---

### 4. Verify Multi-Stage Build Structure

**Status:** ✅ COMPLETE

**Validation:**
```bash
grep "FROM node:18-alpine" Dockerfile | wc -l
# Should show 2 (builder stage + runtime stage)

grep "npm ci" Dockerfile | wc -l
# Should show 2 (install all deps in builder, prod only in runtime)
```

**Impact:** Separates build dependencies from runtime, reducing final image size

---

## 🧪 Testing Checklist

### Step 1: Local Docker Build Test

```bash
# Clean build
docker build --no-cache -t e-code-platform:test .

# Expected: Build completes in 8-12 minutes without errors
```

**Success Criteria:**
- [ ] Build completes without errors
- [ ] No "heap out of memory" errors
- [ ] No "module not found" errors
- [ ] Build time < 15 minutes

---

### Step 2: Verify Image Size

```bash
docker images e-code-platform:test
```

**Success Criteria:**
- [ ] Image size < 2 GiB
- [ ] Ideal: 1.5-1.8 GiB
- [ ] ❌ Fail if > 2 GiB

**If Too Large (>2 GiB):**
1. Check `.dockerignore` includes dev directories
2. Run: `docker history e-code-platform:test` to find large layers
3. Verify multi-stage build copied only `dist/` not source

---

### Step 3: Test Container Locally

```bash
# Start container
docker run -d \
  --name e-code-test \
  -p 5000:5000 \
  -e DATABASE_URL="postgresql://localhost:5432/ecode" \
  -e OPENAI_API_KEY="$OPENAI_API_KEY" \
  -e GEMINI_API_KEY="$GEMINI_API_KEY" \
  -e MOONSHOT_API_KEY="$MOONSHOT_API_KEY" \
  e-code-platform:test

# Wait for startup (max 40 seconds)
sleep 40

# Test health endpoints
curl -f http://localhost:5000/health/liveness || echo "❌ FAIL: Liveness"
curl -f http://localhost:5000/health/readiness || echo "❌ FAIL: Readiness"
curl -f http://localhost:5000/health/startup || echo "❌ FAIL: Startup"

# Check logs for errors
docker logs e-code-test | grep -i error

# Cleanup
docker stop e-code-test && docker rm e-code-test
```

**Success Criteria:**
- [ ] All health checks return HTTP 200
- [ ] No error logs in container output
- [ ] Startup time < 40 seconds
- [ ] Memory usage < 2 GB

---

### Step 4: Performance Validation

```bash
# Monitor resource usage
docker stats e-code-test

# Load test (optional - requires ApacheBench or similar)
ab -n 1000 -c 10 http://localhost:5000/health/liveness
```

**Success Criteria:**
- [ ] Memory stays < 2 GB under load
- [ ] CPU < 100% average
- [ ] No memory leaks (stable over 5 minutes)
- [ ] Response time < 100ms (health endpoint)

---

## 📋 Production Deployment Checklist

### Before Pushing to Registry

- [ ] All local tests passed (above)
- [ ] Code reviewed and approved
- [ ] Database migrations tested (if any)
- [ ] Environment secrets verified in K8s
- [ ] Rollback plan documented

### Registry Push

```bash
# Tag with semantic version
docker tag e-code-platform:test your-registry.io/e-code:v1.0.0

# Push to registry
docker push your-registry.io/e-code:v1.0.0

# Tag as latest (only after successful deployment)
docker tag e-code-platform:test your-registry.io/e-code:latest
docker push your-registry.io/e-code:latest
```

### Kubernetes Deployment

- [ ] Secrets created in K8s namespace
- [ ] Resource limits set (memory: 4Gi, cpu: 2000m)
- [ ] Health probes configured (see DEPLOYMENT.md)
- [ ] Horizontal Pod Autoscaler configured (if needed)
- [ ] Monitoring/alerting enabled

```bash
# Apply deployment
kubectl apply -f k8s/deployment.yaml

# Watch rollout
kubectl rollout status deployment/e-code-platform -n production

# Verify pods healthy
kubectl get pods -n production
```

**Success Criteria:**
- [ ] All pods in "Running" state
- [ ] All pods pass readiness probe
- [ ] Load balancer IP assigned
- [ ] External endpoint responding

---

## 🔍 Post-Deployment Validation

### First 5 Minutes

```bash
# Check pod logs
kubectl logs -f deployment/e-code-platform -n production

# Check events
kubectl get events -n production --sort-by='.lastTimestamp' | tail -20

# Test external endpoint
curl -f https://your-domain.com/health/liveness
curl -f https://your-domain.com/health/readiness
```

**Success Criteria:**
- [ ] No error logs
- [ ] No pod restarts
- [ ] All health checks return 200
- [ ] Response time < 500ms

### First Hour

- [ ] Monitor memory usage (should be < 2 GB)
- [ ] Monitor CPU usage (should be < 50% average)
- [ ] Check AI provider status (all healthy)
- [ ] Verify database connections stable
- [ ] Check Slack alerts (should be silent unless issues)

### First 24 Hours

- [ ] No memory leaks (stable memory usage)
- [ ] No pod crashes/restarts
- [ ] All AI providers responding
- [ ] User reports normal (no major bugs)
- [ ] Performance metrics within SLA

---

## 🚨 Rollback Triggers

**Immediate Rollback If:**
- Memory usage > 3.5 GB sustained
- Pod crash loop (3+ restarts in 5 minutes)
- Health checks failing > 50% of requests
- Critical errors in logs
- AI providers all failing
- Database connection pool exhausted

**Rollback Command:**
```bash
kubectl rollout undo deployment/e-code-platform -n production
```

---

## 📊 Key Metrics to Monitor

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Memory Usage | < 2 GB | > 3 GB |
| CPU Usage | < 50% avg | > 80% sustained |
| Response Time (p95) | < 500ms | > 1000ms |
| Error Rate | < 0.1% | > 1% |
| Pod Restarts | 0 | > 2 in 1 hour |
| AI Provider Latency | < 2s | > 5s |
| Database Query Time | < 100ms | > 500ms |

---

## 📞 Escalation Path

**Level 1 - DevOps Engineer:**
- Check logs: `kubectl logs -f <pod>`
- Check metrics: `kubectl top pods`
- Review DEPLOYMENT.md troubleshooting

**Level 2 - Senior Engineer:**
- Review architecture decisions
- Analyze performance bottlenecks
- Coordinate with AI provider support

**Level 3 - Emergency:**
- Rollback to last stable version
- Contact Replit support for infrastructure
- Emergency database restore if needed

---

## ✅ Sign-Off

**Before Production Deployment, Confirm:**

- [ ] **package-lock.json generated and committed** (CRITICAL)
- [ ] **Local Docker build passed** (size < 2 GiB)
- [ ] **Local container tests passed** (all health checks 200)
- [ ] **Code reviewed** by senior engineer
- [ ] **Database migrations tested** (if any)
- [ ] **Secrets configured** in production K8s
- [ ] **Monitoring/alerting** enabled
- [ ] **Rollback plan** documented in DEPLOYMENT.md
- [ ] **On-call engineer** notified of deployment

**Deployment Approved By:**

- [ ] Tech Lead: _________________ Date: _______
- [ ] Senior Engineer (40 years): _________________ Date: _______
- [ ] DevOps Lead: _________________ Date: _______

---

**Next Steps:**
1. ✅ Generate package-lock.json (see Step 1 above)
2. ✅ Run local Docker build test
3. ✅ Verify image size < 2 GiB
4. ✅ Run local container tests
5. ✅ Get sign-off from senior engineer
6. ✅ Deploy to staging first (recommended)
7. ✅ Deploy to production
8. ✅ Monitor for 24 hours

**Reference Documents:**
- **DEPLOYMENT.md** - Full deployment runbook (579 lines)
- **replit.md** - System architecture and documentation
- **Dockerfile** - Optimized multi-stage build
- **.dockerignore** - Excluded files/directories

---

**Document Version:** 1.0.0  
**Created:** November 16, 2025  
**Last Updated:** November 16, 2025  
**Owner:** DevOps Team
