# Replit Production Deployment Guide
**E-Code Platform - Fortune 500 Standards**

**Version**: 2.0
**Last Updated**: 2025-01-14
**Target**: Replit Reserved VM + Cloud Run
**Classification**: Internal Documentation

---

## Table of Contents

1. [Overview](#overview)
2. [Replit Architecture](#replit-architecture)
3. [Pre-Deployment Checklist](#pre-deployment-checklist)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [Deployment Process](#deployment-process)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Monitoring & Observability](#monitoring--observability)
9. [Scaling Configuration](#scaling-configuration)
10. [Troubleshooting](#troubleshooting)
11. [Rollback Procedures](#rollback-procedures)

---

## Overview

### Replit Deployment Strategy

E-Code Platform deploys to **Replit Cloud Run** with the following architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    Replit Cloud Run                         │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Auto-scaling Instances (0-10)                     │    │
│  │  ├── Node.js 20 Runtime                            │    │
│  │  ├── PostgreSQL 16 (Replit Managed)                │    │
│  │  ├── Redis (optional, via external service)        │    │
│  │  └── Object Storage (Replit Object Storage)        │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  Health Checks: /health/liveness, /health/readiness        │
│  Metrics: /api/metrics (JSON), /api/health/detailed        │
│  Logs: stdout/stderr → Replit Logs                         │
└─────────────────────────────────────────────────────────────┘
```

### Key Metrics

| Metric | Target | Replit Capability |
|--------|--------|-------------------|
| **Cold Start** | < 5 seconds | ✅ 2-4 seconds |
| **Auto-scaling** | 0-10 instances | ✅ Automatic |
| **Availability** | 99.9% | ✅ 99.95% SLA |
| **Max Request Timeout** | 60 seconds | ✅ Configurable |
| **Memory per Instance** | 8 GB | ✅ Configurable |
| **CPU per Instance** | 4 vCPU | ✅ Configurable |

---

## Replit Architecture

### Reserved VM Benefits

1. **Persistent Storage**: Files persist across deployments
2. **Always-on Database**: PostgreSQL 16 managed by Replit
3. **Object Storage**: Built-in S3-compatible storage
4. **Automatic SSL**: HTTPS enabled by default
5. **Zero-downtime Deployments**: Rolling updates
6. **Integrated Secrets**: Environment variables managed securely

### Resource Allocation

```toml
# .replit configuration
[deployment]
deploymentTarget = "cloudrun"
ignorePorts = false

# Resource limits (configure in Replit Dashboard)
# - Memory: 4-8 GB (recommended: 8 GB for production)
# - CPU: 2-4 vCPU (recommended: 4 vCPU)
# - Instances: 1-10 (auto-scales based on traffic)
# - Concurrency: 80-100 requests per instance
```

---

## Pre-Deployment Checklist

### 1. Code Quality Gates

- [ ] All tests passing (`npm run test:ci`)
- [ ] Test coverage ≥ 80% (`npm run test:coverage`)
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] ESLint passing (`npm run lint`)
- [ ] Security audit clean (`npm audit --audit-level=high`)

### 2. Configuration Validation

- [ ] Environment variables configured in Replit Secrets
- [ ] Database migrations tested
- [ ] Health check endpoints responding
- [ ] Metrics endpoint accessible (`/api/metrics`)
- [ ] API documentation updated (`/api/docs`)

### 3. Security Checklist

- [ ] Secrets rotated in last 90 days
- [ ] Rate limiting configured
- [ ] CORS policies defined
- [ ] CSP headers configured
- [ ] Input validation enabled
- [ ] SQL injection protection active
- [ ] XSS protection enabled

### 4. Performance Validation

- [ ] Build size < 5 MB
- [ ] Database indexes created
- [ ] Redis caching enabled (if applicable)
- [ ] CDN configured for static assets
- [ ] Image optimization enabled
- [ ] Lazy loading implemented

---

## Environment Configuration

### Replit Secrets (Production)

Configure in: **Replit Dashboard → Secrets**

#### Required Secrets

```bash
# Application
NODE_ENV=production
PORT=5000
LOG_LEVEL=info

# Database (Replit Managed PostgreSQL)
DATABASE_URL=postgresql://user:pass@db.replit.internal:5432/ecode_production
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_IDLE_TIMEOUT=30000

# AI Services
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...
GROQ_API_KEY=gsk_...

# Session & Security
SESSION_SECRET=<64-char-random-string>
JWT_SECRET=<64-char-random-string>
ENCRYPTION_KEY=<32-char-random-string>

# Object Storage (Replit Object Storage)
REPLIT_OBJECT_STORAGE_BUCKET_ID=<your-bucket-id>

# External Services (Optional)
REDIS_URL=redis://redis.upstash.io:6379
SENTRY_DSN=https://...@sentry.io/...

# Monitoring
OTEL_EXPORTER_OTLP_ENDPOINT=https://otel-collector.example.com
PROMETHEUS_ENABLED=true
METRICS_PORT=9464

# Feature Flags
ENABLE_AI_AGENTS=true
ENABLE_REAL_TIME_COLLAB=true
MAX_PROJECTS_PER_USER=50
```

#### Generate Strong Secrets

```bash
# Session secret (64 chars)
openssl rand -hex 32

# JWT secret (64 chars)
openssl rand -hex 32

# Encryption key (32 chars)
openssl rand -hex 16
```

---

## Database Setup

### PostgreSQL 16 (Replit Managed)

Replit provides managed PostgreSQL 16. No manual setup required.

#### 1. Initialize Database Schema

```bash
# Run migrations
npm run db:migrate

# Seed initial data (if needed)
npm run db:seed
```

#### 2. Verify Database Connection

```bash
# Test database connectivity
npm run db:test

# Check database status
psql $DATABASE_URL -c "SELECT version();"
```

#### 3. Database Performance Tuning

```sql
-- Create indexes for performance
CREATE INDEX CONCURRENTLY idx_projects_user_id ON projects(user_id);
CREATE INDEX CONCURRENTLY idx_files_project_id ON files(project_id);
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);

-- Analyze tables for query optimization
ANALYZE projects;
ANALYZE files;
ANALYZE users;

-- Vacuum to reclaim space
VACUUM ANALYZE;
```

#### 4. Backup Configuration

```bash
# Replit automatically backs up PostgreSQL
# Manual backup (if needed):
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore from backup:
psql $DATABASE_URL < backup_20250114.sql
```

---

## Deployment Process

### Method 1: Automatic Deployment (Recommended)

Replit automatically deploys when you push to the `main` or `production` branch.

#### Step 1: Merge to Production Branch

```bash
# Ensure you're on main
git checkout main
git pull origin main

# Merge feature branch
git merge feature/your-feature

# Push to trigger deployment
git push origin main
```

#### Step 2: Monitor Deployment

```bash
# Replit automatically:
# 1. Runs build command: npm install && npm run build && npm run test:ci
# 2. Runs health checks: /health/liveness
# 3. Routes traffic to new instances
# 4. Terminates old instances

# Monitor in Replit Dashboard → Deployments
```

### Method 2: Manual Deployment

#### Step 1: Build Locally

```bash
# Install dependencies
npm ci --legacy-peer-deps

# Run tests
npm run test:ci

# Build production bundle
npm run build

# Verify build
test -f dist/public/index.html || echo "Build failed"
```

#### Step 2: Deploy via Replit Dashboard

1. Go to **Replit Dashboard** → **Deployments**
2. Click **Deploy Now**
3. Select branch: `main` or `production`
4. Wait for build to complete (1-3 minutes)
5. Verify deployment status

---

## Post-Deployment Verification

### 1. Health Check Validation

```bash
# Liveness check (basic server health)
curl -f https://e-code.replit.app/health/liveness

# Expected response:
# {"status":"ok","timestamp":"2025-01-14T12:00:00.000Z"}

# Readiness check (all dependencies healthy)
curl -f https://e-code.replit.app/health/readiness

# Expected response:
# {
#   "status": "ok",
#   "checks": {
#     "database": "ok",
#     "ai_services": "ok",
#     "cache": "ok"
#   }
# }
```

### 2. Smoke Tests

```bash
# Test critical paths
./scripts/smoke-tests.sh

# Or manual tests:
# 1. User authentication
curl -X POST https://e-code.replit.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'

# 2. Create project
curl -X POST https://e-code.replit.app/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Project"}'

# 3. AI agent request
curl -X POST https://e-code.replit.app/api/agent/plan \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Create a React component"}'
```

### 3. Performance Validation

```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s https://e-code.replit.app/

# Expected:
# - time_total < 1.0s
# - time_starttransfer < 0.5s

# Run load test (optional)
k6 run test/load/api-comprehensive-load.test.js \
  --env BASE_URL=https://e-code.replit.app
```

### 4. Security Validation

```bash
# Check security headers
curl -I https://e-code.replit.app/

# Should include:
# - Strict-Transport-Security
# - X-Content-Type-Options: nosniff
# - X-Frame-Options: DENY
# - Content-Security-Policy
# - X-XSS-Protection

# Test rate limiting
for i in {1..100}; do
  curl https://e-code.replit.app/api/health
done

# Should see 429 Too Many Requests after limit exceeded
```

---

## Monitoring & Observability

### 1. Replit Built-in Monitoring

#### Access Logs

1. Go to **Replit Dashboard** → **Logs**
2. Filter by:
   - **Error level**: `ERROR`, `WARN`
   - **Time range**: Last 24 hours
   - **Search**: Specific error messages

#### Metrics Dashboard

1. Go to **Replit Dashboard** → **Metrics**
2. View:
   - **Request rate**: Requests per second
   - **Error rate**: Percentage of 5xx errors
   - **Response time**: p50, p95, p99
   - **Instance count**: Auto-scaling metrics

### 2. Platform Metrics

E-Code exposes metrics through the `/api/` prefixed endpoints (required for Vite/SPA compatibility):

**Production Endpoints** (port 5000 only):
- `/api/health` - Basic health status (JSON)
- `/api/metrics` - System metrics: CPU, memory, request stats (JSON)
- `/api/health/detailed` - Full diagnostics with DB status, security info (JSON)
- `/api/health/providers` - AI provider health status
- `/health/liveness` - Kubernetes liveness probe
- `/health/readiness` - Kubernetes readiness probe

**IMPORTANT**: Use `/api/` prefix for all monitoring endpoints. Non-prefixed routes like `/metrics` are intercepted by Vite in development and return HTML instead of JSON.

```bash
# Access health status
curl https://e-code.replit.app/api/health

# Access system metrics  
curl https://e-code.replit.app/api/metrics

# Access detailed diagnostics
curl https://e-code.replit.app/api/health/detailed

# Sample metrics response (JSON):
{
  "timestamp": 1732611120531,
  "uptime": 45.626,
  "memory": {
    "rss": 474644480,
    "heapTotal": 293699584,
    "heapUsed": 280773400
  },
  "cpu": {
    "user": 20910269,
    "system": 2508781
  },
  "requests": {
    "total": 1523,
    "errors": 2,
    "avgResponseTime": 45
  }
}
```

#### Admin Monitoring Dashboard

Access the integrated monitoring dashboard at:
- **Development**: http://localhost:5000/admin/monitoring
- **Production**: https://e-code.replit.app/admin/monitoring

The dashboard provides:
- Real-time health status overview
- System metrics (CPU, Memory, Uptime)
- Database connection status
- Direct links to all monitoring endpoints

### 3. Error Tracking with Sentry

```typescript
// Already configured in server/middleware/error-handler.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

**View Errors**: https://sentry.io/organizations/e-code/projects/

### 4. Structured Logging

```typescript
// server/utils/logger.ts
import logger from './utils/logger';

logger.info('Deployment successful', {
  version: '2.0.0',
  timestamp: new Date().toISOString()
});

logger.error('AI request failed', {
  provider: 'anthropic',
  error: error.message,
  correlationId: req.id
});
```

**Log Retention**: 30 days (Replit default)

---

## Scaling Configuration

### Auto-scaling Parameters

Configured in **Replit Dashboard** → **Deployments** → **Scaling**

#### Recommended Settings

| Parameter | Development | Production |
|-----------|------------|------------|
| **Min Instances** | 0 | 2 |
| **Max Instances** | 2 | 10 |
| **Target CPU** | 70% | 60% |
| **Target Memory** | 80% | 70% |
| **Concurrency** | 80 | 100 |
| **Request Timeout** | 60s | 60s |

#### Scaling Triggers

```yaml
# Auto-scale UP when:
- CPU usage > 60% for 2 minutes
- Memory usage > 70% for 2 minutes
- Request queue > 100 for 1 minute
- Response time p95 > 2 seconds

# Auto-scale DOWN when:
- CPU usage < 30% for 10 minutes
- Memory usage < 40% for 10 minutes
- Request rate < 10 req/s for 5 minutes
```

### Manual Scaling

```bash
# Scale via Replit Dashboard:
# 1. Go to Deployments → Active Deployment
# 2. Click "Scale"
# 3. Set instance count (1-10)
# 4. Click "Apply"

# Instances will scale within 30-60 seconds
```

---

## Troubleshooting

### Common Issues

#### 1. Deployment Fails

**Symptoms**: Build fails, deployment stuck

**Diagnosis**:
```bash
# Check build logs
# Replit Dashboard → Deployments → Build Logs

# Common causes:
# - npm install fails (dependency conflict)
# - Tests fail (test:ci script)
# - TypeScript errors
# - Build timeout (>10 minutes)
```

**Resolution**:
```bash
# Fix dependencies
npm ci --legacy-peer-deps

# Fix TypeScript errors
npx tsc --noEmit

# Skip tests (emergency only)
# Edit .replit:
# build = ["sh", "-c", "npm install && npm run build"]
```

#### 2. 502 Bad Gateway

**Symptoms**: All requests return 502

**Diagnosis**:
```bash
# Check health endpoints
curl https://e-code.replit.app/health/liveness

# Check logs for startup errors
# Replit Dashboard → Logs → Filter: ERROR
```

**Resolution**:
```bash
# Common causes:
# 1. Database connection fails → Check DATABASE_URL
# 2. Port mismatch → Ensure PORT=5000
# 3. Server crash on startup → Check logs

# Restart deployment
# Replit Dashboard → Deployments → Restart
```

#### 3. High Memory Usage

**Symptoms**: Instances restarting, slow responses

**Diagnosis**:
```bash
# Check metrics
curl https://e-code.replit.app/api/metrics | jq '.memory'

# Check Node.js memory
process.memoryUsage()
```

**Resolution**:
```bash
# Increase instance memory
# Replit Dashboard → Deployments → Configure → Memory: 8 GB

# Enable memory limits
# package.json:
# "start:prod": "node --max-old-space-size=4096 dist/index.js"
```

#### 4. Database Connection Pool Exhausted

**Symptoms**: `remaining connection slots reserved` error

**Diagnosis**:
```bash
# Check active connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Check pool configuration
echo $DB_POOL_MAX
```

**Resolution**:
```typescript
// server/db/config.ts
export const dbConfig = {
  max: 10,  // Increase from 10 to 20
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};
```

#### 5. AI API Rate Limits

**Symptoms**: 429 errors from AI providers

**Diagnosis**:
```bash
# Check error logs
# Replit Dashboard → Logs → Search: "rate limit"
```

**Resolution**:
```typescript
// server/resilience/circuit-breaker.ts
// Circuit breaker already handles this

// Alternative: Implement exponential backoff
const retryWithBackoff = async (fn, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429 && i < retries - 1) {
        await sleep(Math.pow(2, i) * 1000);  // 1s, 2s, 4s
        continue;
      }
      throw error;
    }
  }
};
```

---

## Rollback Procedures

### Automatic Rollback

Replit Cloud Run automatically rolls back if health checks fail.

```yaml
# Health check failure triggers rollback:
- Liveness check fails 3 times (30 seconds)
- Readiness check fails 2 times (10 seconds)
- Error rate > 50% for 1 minute
```

### Manual Rollback

#### Method 1: Via Replit Dashboard

1. Go to **Replit Dashboard** → **Deployments**
2. Find previous successful deployment
3. Click **Rollback to this version**
4. Confirm rollback
5. Wait 1-2 minutes for rollback to complete

#### Method 2: Via Git

```bash
# Revert to previous commit
git log --oneline  # Find previous good commit
git revert <commit-hash>
git push origin main

# Replit will auto-deploy reverted version
```

#### Method 3: Emergency Branch Deploy

```bash
# Create emergency branch from last known good commit
git checkout -b emergency-rollback <good-commit-hash>
git push origin emergency-rollback

# In Replit Dashboard:
# 1. Go to Deployments → Deploy
# 2. Select branch: emergency-rollback
# 3. Click Deploy
```

### Rollback Verification

```bash
# 1. Verify version
curl https://e-code.replit.app/api/health | jq '.version'

# 2. Run smoke tests
./scripts/smoke-tests.sh

# 3. Check error rate
curl https://e-code.replit.app/api/metrics | jq '.requests'

# 4. Monitor for 15 minutes
watch -n 10 "curl -s https://e-code.replit.app/health/readiness"
```

---

## Production Deployment Checklist

### Pre-Deployment (1 hour before)

- [ ] Code freeze announced to team
- [ ] All tests passing in CI/CD
- [ ] Staging deployment successful
- [ ] Database migrations tested
- [ ] Secrets rotated (if needed)
- [ ] Backup created
- [ ] Rollback plan documented

### During Deployment (15 minutes)

- [ ] Deployment triggered
- [ ] Build logs monitored
- [ ] Health checks passing
- [ ] Metrics stable
- [ ] Error rate < 1%
- [ ] Response time < 500ms p95

### Post-Deployment (30 minutes)

- [ ] Smoke tests passing
- [ ] Critical paths verified
- [ ] Performance metrics acceptable
- [ ] Error tracking configured
- [ ] Monitoring dashboards updated
- [ ] Team notified of deployment
- [ ] Documentation updated

---

## Support & Escalation

### Deployment Issues

| Severity | Response Time | Escalation Path |
|----------|--------------|-----------------|
| **P0** (Complete outage) | Immediate | CTO → DevOps Lead → Replit Support |
| **P1** (Major degradation) | 15 minutes | DevOps Lead → Engineering Lead |
| **P2** (Minor issue) | 2 hours | On-call engineer |
| **P3** (Non-urgent) | Next business day | Create ticket |

### Contact Information

- **Replit Support**: https://replit.com/support
- **DevOps Team**: devops@e-code.ai
- **On-call**: +1-XXX-XXX-XXXX (PagerDuty)

---

## Additional Resources

- [Replit Deployments Documentation](https://docs.replit.com/hosting/deployments/about-deployments)
- [Health Checks Implementation](../server/health/health-checks.ts)
- [Disaster Recovery Plan](./operations/disaster-recovery-plan.md)
- [Incident Response Runbook](./runbooks/incident-response.md)

---

**Document Version**: 2.0
**Last Review**: 2025-01-14
**Next Review**: 2025-07-14
**Owner**: DevOps Team
