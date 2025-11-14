# Runbook: Incident Response

**Document Version**: 2.0
**Last Updated**: 2025-01-14
**Owner**: DevOps Team
**Severity Classification**: P0 (Critical) → P3 (Low)

---

## 🚨 Quick Reference

### Emergency Contacts
| Role | Contact | Availability |
|------|---------|--------------|
| **On-Call Engineer** | +1-888-ECODE-01 | 24/7 |
| **DevOps Lead** | devops-lead@e-code.ai | 24/7 |
| **CTO** | cto@e-code.ai | Emergency only |
| **Security Team** | security@e-code.ai | 24/7 |

### Critical Services Status
- **Status Page**: https://status.e-code.ai
- **Grafana Dashboards**: https://grafana.e-code.ai
- **PagerDuty**: https://e-code.pagerduty.com

---

## Incident Severity Levels

### P0 - Critical (Response Time: Immediate)
- **Complete service outage**
- **Data loss or corruption**
- **Security breach**
- **Payment system down**

**Actions**:
1. Page on-call engineer immediately
2. Create war room Slack channel: `#incident-YYYY-MM-DD`
3. Start incident commander protocol
4. Update status page every 15 minutes

### P1 - High (Response Time: 15 minutes)
- **Major feature broken**
- **50%+ users affected**
- **Performance degradation >3x normal**
- **Database connection issues**

**Actions**:
1. Alert on-call engineer
2. Investigate root cause
3. Implement temporary mitigation
4. Update status page hourly

### P2 - Medium (Response Time: 2 hours)
- **Minor feature broken**
- **<10% users affected**
- **Non-critical API errors**

### P3 - Low (Response Time: Next business day)
- **Cosmetic issues**
- **Documentation errors**

---

## 📖 Standard Operating Procedures

## 1. Service Outage

### Symptoms
```bash
# Check health endpoints
curl https://e-code.ai/health/liveness
curl https://e-code.ai/health/readiness

# Expected responses
# 200 OK - Service healthy
# 503 Service Unavailable - Service unhealthy
```

### Diagnosis Steps

#### Step 1: Check Kubernetes Pods
```bash
# Set context
export KUBECONFIG=~/.kube/config-production

# Check pod status
kubectl get pods -n production
kubectl describe pod <pod-name> -n production
kubectl logs <pod-name> -n production --tail=100
```

**Expected Output**:
```
NAME                     READY   STATUS    RESTARTS   AGE
e-code-7d4f6b8c9-abc12   1/1     Running   0          2d
```

**Problem Indicators**:
- `CrashLoopBackOff`: Application crashing on startup
- `ImagePullBackOff`: Cannot pull Docker image
- `Pending`: Insufficient resources
- `Error`: Container failed to start

#### Step 2: Check Application Logs
```bash
# Stream logs
kubectl logs -f deployment/e-code -n production

# Search for errors
kubectl logs deployment/e-code -n production | grep -i error | tail -50

# Check specific time range
kubectl logs deployment/e-code -n production --since=1h
```

**Look For**:
- `DATABASE_CONNECTION_ERROR`
- `REDIS_CONNECTION_ERROR`
- `MEMORY_LIMIT_EXCEEDED`
- `RATE_LIMIT_EXCEEDED`

#### Step 3: Check Database
```bash
# Connect to database
psql $DATABASE_URL

# Check connection count
SELECT count(*) FROM pg_stat_activity;

# Check long-running queries
SELECT pid, now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC
LIMIT 10;

# Kill problematic query if needed
SELECT pg_terminate_backend(pid);
```

#### Step 4: Check Redis
```bash
# Connect to Redis
redis-cli -h redis.e-code.ai -p 6379

# Check memory usage
INFO memory

# Check connected clients
CLIENT LIST | wc -l

# Clear cache if needed (CAREFUL!)
FLUSHALL
```

### Resolution Procedures

#### Quick Fix: Restart Service
```bash
# Rolling restart (zero downtime)
kubectl rollout restart deployment/e-code -n production

# Monitor rollout
kubectl rollout status deployment/e-code -n production
```

#### Rollback to Previous Version
```bash
# Check rollout history
kubectl rollout history deployment/e-code -n production

# Rollback to previous version
kubectl rollout undo deployment/e-code -n production

# Rollback to specific revision
kubectl rollout undo deployment/e-code -n production --to-revision=5
```

#### Scale Up Resources
```bash
# Horizontal scaling (more pods)
kubectl scale deployment/e-code --replicas=10 -n production

# Vertical scaling (more resources per pod)
# Edit deployment YAML and apply
kubectl edit deployment/e-code -n production
```

---

## 2. Database Performance Issues

### Symptoms
- API response time > 2 seconds
- Database CPU > 80%
- Long-running queries
- Connection pool exhausted

### Diagnosis
```sql
-- Find slow queries
SELECT
  pid,
  now() - query_start AS duration,
  query,
  state
FROM pg_stat_activity
WHERE state != 'idle'
  AND now() - query_start > interval '5 seconds'
ORDER BY duration DESC;

-- Check table bloat
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

-- Check missing indexes
SELECT
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100
  AND correlation < 0.5;
```

### Resolution
```sql
-- Kill slow queries
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE ...;

-- Create missing indexes
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);

-- VACUUM tables
VACUUM ANALYZE users;

-- Update statistics
ANALYZE;
```

---

## 3. High Memory Usage

### Diagnosis
```bash
# Check pod memory
kubectl top pods -n production

# Check node memory
kubectl top nodes

# Detailed memory breakdown
kubectl exec -it <pod-name> -n production -- /bin/sh
ps aux --sort=-%mem | head -10
```

### Resolution
```bash
# Increase memory limits
kubectl set resources deployment/e-code --limits=memory=4Gi -n production

# Add horizontal pod autoscaler
kubectl autoscale deployment/e-code --min=3 --max=20 --cpu-percent=70 -n production

# Clear application caches
curl -X POST https://e-code.ai/api/admin/cache/clear \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## 4. AI Service Failures

### Symptoms
- 503 errors from /api/agent/*
- OpenAI/Anthropic API errors
- Circuit breaker OPEN state

### Diagnosis
```bash
# Check circuit breaker status
curl https://e-code.ai/api/admin/circuit-breakers

# Check AI service health
curl https://e-code.ai/api/admin/ai-services/health

# Review logs for API errors
kubectl logs deployment/e-code -n production | grep "AI_SERVICE_ERROR"
```

### Resolution
```bash
# Reset circuit breakers
curl -X POST https://e-code.ai/api/admin/circuit-breakers/reset \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Switch to fallback provider
curl -X POST https://e-code.ai/api/admin/ai-services/failover \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"provider": "anthropic"}'

# Check API key validity
echo $OPENAI_API_KEY | cut -c1-7  # Should start with sk-
echo $ANTHROPIC_API_KEY | cut -c1-10  # Should start with sk-ant-
```

---

## 5. Security Incident

### Immediate Actions ⚠️
1. **DO NOT PANIC** - Follow procedure
2. **ISOLATE**: Block suspicious IPs immediately
3. **PRESERVE**: Do not delete logs or evidence
4. **NOTIFY**: Alert security team within 5 minutes
5. **DOCUMENT**: Record all actions in incident log

### Block Suspicious IP
```bash
# Add to firewall rules
kubectl exec -it nginx-ingress-controller -- /bin/sh
iptables -A INPUT -s <suspicious-ip> -j DROP

# Or via Kubernetes NetworkPolicy
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: block-suspicious-ip
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  ingress:
  - from:
    - ipBlock:
        cidr: 0.0.0.0/0
        except:
        - <suspicious-ip>/32
EOF
```

### Check for Compromise
```sql
-- Audit recent admin actions
SELECT * FROM security_logs
WHERE action LIKE '%admin%'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Check for unusual user creation
SELECT * FROM users
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND is_admin = true;

-- Check for password resets
SELECT * FROM password_reset_tokens
WHERE created_at > NOW() - INTERVAL '1 hour';
```

### Rotate Secrets (If Compromised)
```bash
# Generate new JWT secrets
NEW_JWT_SECRET=$(openssl rand -hex 32)
NEW_JWT_REFRESH_SECRET=$(openssl rand -hex 32)

# Update Kubernetes secrets
kubectl create secret generic app-secrets \
  --from-literal=JWT_SECRET=$NEW_JWT_SECRET \
  --from-literal=JWT_REFRESH_SECRET=$NEW_JWT_REFRESH_SECRET \
  --dry-run=client -o yaml | kubectl apply -f -

# Rolling restart to pick up new secrets
kubectl rollout restart deployment/e-code -n production

# Invalidate all existing sessions
redis-cli FLUSHDB
```

---

## Post-Incident Review

### Required Within 24 Hours
1. **Incident Timeline**: Document what happened when
2. **Root Cause Analysis**: Why did it happen?
3. **Resolution Steps**: What fixed it?
4. **Preventive Measures**: How to prevent recurrence?
5. **Action Items**: Assign owners and deadlines

### Template
```markdown
# Post-Incident Review: [INCIDENT-ID]

## Incident Summary
- **Date**: 2025-01-14
- **Duration**: 45 minutes
- **Severity**: P1
- **Impact**: 15,000 users affected

## Timeline
- 14:23 UTC: Alert triggered
- 14:25 UTC: On-call engineer paged
- 14:30 UTC: Root cause identified
- 14:45 UTC: Issue resolved
- 15:00 UTC: Service fully restored

## Root Cause
Database connection pool exhausted due to...

## Resolution
Increased connection pool size from 20 to 50

## Action Items
1. [ ] Implement connection pool monitoring (Owner: DevOps, Due: 2025-01-20)
2. [ ] Add alerting for pool > 80% (Owner: DevOps, Due: 2025-01-18)
3. [ ] Document connection pool tuning (Owner: Tech Writer, Due: 2025-01-25)
```

---

## Additional Resources
- [Health Check Endpoints](health-checks.md)
- [Database Maintenance](database-maintenance.md)
- [Security Procedures](security-procedures.md)
- [Disaster Recovery](disaster-recovery.md)
