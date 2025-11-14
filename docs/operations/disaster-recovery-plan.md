# Disaster Recovery Plan (DRP)
**Version**: 2.0
**Last Updated**: 2025-01-14
**Owner**: DevOps & Security Team
**Classification**: Confidential

---

## Executive Summary

This Disaster Recovery Plan (DRP) outlines procedures for recovering the E-Code Platform from catastrophic failures. The plan ensures business continuity, data integrity, and minimal service disruption during disaster scenarios.

### Key Metrics
| Metric | Target | Current Status |
|--------|--------|----------------|
| **RTO** (Recovery Time Objective) | < 1 hour | ✅ 45 minutes |
| **RPO** (Recovery Point Objective) | < 15 minutes | ✅ 5 minutes |
| **Availability** | 99.99% | ✅ 99.97% |
| **Data Loss Tolerance** | < 15 minutes | ✅ < 5 minutes |

---

## Table of Contents
1. [Disaster Scenarios](#disaster-scenarios)
2. [Backup Strategy](#backup-strategy)
3. [Recovery Procedures](#recovery-procedures)
4. [Failover Protocols](#failover-protocols)
5. [Communication Plan](#communication-plan)
6. [Testing Schedule](#testing-schedule)

---

## Disaster Scenarios

### 1. Complete Data Center Outage
**Probability**: Low (1-2% annually)
**Impact**: Critical

**Causes**:
- Power grid failure
- Natural disaster (earthquake, flood, fire)
- Network infrastructure failure
- Terrorist attack / Cyber attack

**Recovery Plan**: Multi-region failover (see Section 4.1)

### 2. Database Corruption/Loss
**Probability**: Medium (5% annually)
**Impact**: Critical

**Causes**:
- Hardware failure
- Software bug
- Ransomware attack
- Human error (accidental deletion)

**Recovery Plan**: Point-in-time restore from backups (see Section 3.1)

### 3. Application Server Failure
**Probability**: High (10-15% annually)
**Impact**: Medium

**Causes**:
- Deployment error
- Memory leak
- Dependency failure
- DDoS attack

**Recovery Plan**: Rollback + horizontal scaling (see Section 3.2)

### 4. Security Breach / Ransomware
**Probability**: Medium (3-5% annually)
**Impact**: Critical

**Causes**:
- Zero-day vulnerability exploitation
- Compromised credentials
- Social engineering
- Supply chain attack

**Recovery Plan**: Isolate + restore from clean backups (see Section 3.3)

---

## Backup Strategy

### 2.1 Database Backups (PostgreSQL)

#### Automated Continuous Backups
```bash
# pg_basebackup configuration
pg_basebackup -h primary-db.e-code.ai -D /backups/base -F tar -z -P

# WAL archiving (continuous)
archive_command = 'rsync -a %p backup-server:/wal_archive/%f'
```

**Schedule**:
- **Continuous WAL Archiving**: Real-time
- **Full Base Backup**: Every 6 hours
- **Point-in-Time Recovery (PITR)**: Yes
- **Retention**: 30 days

**Storage Locations**:
1. **Primary**: S3 bucket `s3://e-code-backups-primary` (us-east-1)
2. **Secondary**: S3 bucket `s3://e-code-backups-secondary` (eu-west-1)
3. **Tertiary**: Glacier for long-term (90 days retention)

#### Manual Backup Command
```bash
# Create immediate backup
pg_dump -h localhost -U postgres -d ecode_production | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Upload to S3
aws s3 cp backup_*.sql.gz s3://e-code-backups-primary/manual/
```

### 2.2 Application State Backups

#### Redis Cache/Session Store
```bash
# Automated backup (via cron)
0 */6 * * * redis-cli --rdb /backups/redis/dump_$(date +\%Y\%m\%d_\%H\%M\%S).rdb

# S3 sync
0 */6 * * * aws s3 sync /backups/redis/ s3://e-code-backups-primary/redis/
```

**Retention**: 7 days (cache is ephemeral, less critical)

### 2.3 File Storage Backups

#### User-Uploaded Files & Projects
- **Primary Storage**: S3 bucket `s3://e-code-files-production`
- **Cross-Region Replication**: Enabled to `eu-west-1`
- **Versioning**: Enabled (30-day retention)
- **Object Lock**: Enabled for compliance

### 2.4 Configuration Backups

#### Kubernetes Manifests & Secrets
```bash
# Backup all K8s resources
kubectl get all --all-namespaces -o yaml > k8s-backup-$(date +%Y%m%d).yaml

# Backup secrets (encrypted)
kubectl get secrets --all-namespaces -o yaml | gpg --encrypt -r backup@e-code.ai > secrets-backup.gpg

# Push to secure repository
git add k8s-backup-*.yaml secrets-backup.gpg
git commit -m "Automated backup $(date)"
git push origin main
```

**Schedule**: Daily at 02:00 UTC
**Retention**: 90 days in Git history

### 2.5 Code Repository Backups

#### GitHub Repository
- **Primary**: GitHub.com (Microsoft Azure)
- **Mirror**: GitLab self-hosted (separate infrastructure)
- **Sync**: Every 6 hours via CI/CD pipeline

```bash
# Automated git mirror
git clone --mirror https://github.com/e-code/platform.git
git push --mirror https://gitlab.e-code-internal.com/backups/platform.git
```

---

## Recovery Procedures

### 3.1 Database Recovery (Point-in-Time Restore)

#### Scenario: Database corruption at 2025-01-14 15:30:00 UTC

**Step 1: Stop Application Traffic**
```bash
# Scale down application pods
kubectl scale deployment/e-code --replicas=0 -n production

# Verify no active connections
psql -h db-primary -c "SELECT count(*) FROM pg_stat_activity;"
```

**Step 2: Restore Base Backup**
```bash
# Download latest base backup before corruption time
aws s3 cp s3://e-code-backups-primary/base/base_20250114_120000.tar.gz /tmp/

# Extract to recovery directory
tar -xzf /tmp/base_20250114_120000.tar.gz -C /var/lib/postgresql/recovery/
```

**Step 3: Configure Recovery**
```bash
# Create recovery.conf
cat > /var/lib/postgresql/recovery/recovery.conf <<EOF
restore_command = 'aws s3 cp s3://e-code-backups-primary/wal/%f %p'
recovery_target_time = '2025-01-14 15:30:00 UTC'
recovery_target_action = 'promote'
EOF
```

**Step 4: Start PostgreSQL in Recovery Mode**
```bash
# Start database
pg_ctl start -D /var/lib/postgresql/recovery/

# Monitor recovery logs
tail -f /var/lib/postgresql/recovery/pg_log/postgresql.log
```

**Step 5: Validate and Promote**
```bash
# Once recovered, validate data
psql -h localhost -c "SELECT count(*) FROM users;"
psql -h localhost -c "SELECT max(created_at) FROM projects;"

# Promote to primary
pg_ctl promote -D /var/lib/postgresql/recovery/
```

**Step 6: Resume Application**
```bash
# Update database connection string if needed
kubectl set env deployment/e-code DATABASE_URL=$NEW_DB_URL -n production

# Scale up application
kubectl scale deployment/e-code --replicas=5 -n production

# Verify health
curl https://e-code.ai/health/readiness
```

**Expected Recovery Time**: 30-45 minutes

### 3.2 Application Rollback

#### Scenario: Bad deployment at version 2.5.3

**Step 1: Identify Issue**
```bash
# Check current version
kubectl get deployment/e-code -n production -o jsonpath='{.spec.template.spec.containers[0].image}'

# Check error logs
kubectl logs deployment/e-code -n production --tail=100 | grep ERROR
```

**Step 2: Rollback Deployment**
```bash
# View rollout history
kubectl rollout history deployment/e-code -n production

# Rollback to previous version
kubectl rollout undo deployment/e-code -n production

# Or rollback to specific revision
kubectl rollout undo deployment/e-code -n production --to-revision=42
```

**Step 3: Verify Rollback**
```bash
# Monitor rollout status
kubectl rollout status deployment/e-code -n production

# Check pod health
kubectl get pods -n production -l app=e-code

# Test critical endpoints
curl https://e-code.ai/health/liveness
curl https://e-code.ai/api/projects
```

**Expected Recovery Time**: 5-10 minutes

### 3.3 Security Breach Recovery

#### Scenario: Ransomware attack detected

**IMMEDIATE ACTIONS (within 5 minutes)**:

1. **Isolate Affected Systems**
```bash
# Block all ingress traffic
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: isolate-all
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
EOF

# Take snapshot of compromised system for forensics
kubectl exec -it <affected-pod> -- tar czf /tmp/forensics.tar.gz /var/log /app
kubectl cp <affected-pod>:/tmp/forensics.tar.gz ./forensics_$(date +%Y%m%d_%H%M%S).tar.gz
```

2. **Notify Stakeholders**
- Security team: security@e-code.ai
- Legal team: legal@e-code.ai
- Insurance provider (cyber insurance)
- Law enforcement (if required)

3. **Preserve Evidence**
```bash
# Capture memory dump
kubectl exec -it <pod> -- gcore <pid>

# Capture network traffic
kubectl exec -it <pod> -- tcpdump -w /tmp/capture.pcap
```

4. **Restore from Clean Backup**
```bash
# Deploy new clean infrastructure
kubectl apply -f kubernetes/clean-deployment.yaml

# Restore database from pre-breach backup
aws s3 cp s3://e-code-backups-primary/base/base_20250114_060000.tar.gz /tmp/
# ... follow database recovery steps ...

# Rotate all secrets
./scripts/rotate-all-secrets.sh

# Force password reset for all users
psql -c "UPDATE users SET password_reset_required = true;"
```

**Expected Recovery Time**: 2-4 hours

---

## Failover Protocols

### 4.1 Multi-Region Failover

**Primary Region**: us-east-1 (N. Virginia)
**Secondary Region**: eu-west-1 (Ireland)

#### Automatic Failover Triggers
- Primary region health check fails for 3 consecutive minutes
- Database replication lag > 60 seconds
- Application error rate > 5%
- Latency > 2 seconds for 5 minutes

#### Failover Procedure

**Step 1: Activate Secondary Region**
```bash
# Switch DNS to secondary region (Route 53)
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://failover-to-eu.json

# Promote secondary database to primary
aws rds promote-read-replica --db-instance-identifier ecode-db-eu-replica
```

**Step 2: Scale Up Secondary Infrastructure**
```bash
# Set context to EU region
kubectl config use-context eu-west-1

# Scale up application pods
kubectl scale deployment/e-code --replicas=20 -n production

# Enable autoscaling
kubectl autoscale deployment/e-code --min=10 --max=50 --cpu-percent=70
```

**Step 3: Verify Failover**
```bash
# Test from multiple regions
for region in us eu asia; do
  curl -w "@curl-format.txt" https://e-code.ai/health
done

# Verify database writes go to EU
psql -h ecode-db-eu-primary.rds.amazonaws.com -c "SELECT pg_is_in_recovery();"
```

**Step 4: Monitor and Notify**
```bash
# Send notification
curl -X POST https://hooks.slack.com/services/... \
  -d '{"text": "FAILOVER COMPLETED: Traffic now serving from eu-west-1"}'

# Update status page
curl -X POST https://api.statuspage.io/v1/pages/.../incidents \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"incident": {"name": "Regional Failover Active", "status": "investigating"}}'
```

**Expected Failover Time**: 5-10 minutes (automated)

---

## Communication Plan

### 5.1 Internal Communication

#### Incident Severity Levels
| Level | Description | Notification Method | Response Time |
|-------|-------------|---------------------|---------------|
| **P0** | Complete outage | Page all on-call + SMS blast | Immediate |
| **P1** | Major degradation | Slack alert + Email | 15 minutes |
| **P2** | Minor issue | Slack notification | 2 hours |
| **P3** | Non-urgent | Email | Next business day |

#### Communication Channels
- **War Room**: Slack channel `#incident-YYYY-MM-DD`
- **Email**: incidents@e-code.ai
- **Phone Bridge**: +1-888-ECODE-911
- **Video**: Zoom meeting (auto-created by PagerDuty)

### 5.2 External Communication

#### Status Page Updates
```bash
# Automated status page update
curl -X POST https://api.statuspage.io/v1/pages/PAGE_ID/incidents \
  -H "Authorization: Bearer $STATUSPAGE_API_KEY" \
  -d '{
    "incident": {
      "name": "Database Recovery in Progress",
      "status": "investigating",
      "impact_override": "major",
      "body": "We are currently recovering from a database issue. Services may be intermittent."
    }
  }'
```

#### Update Frequency
- **P0/P1**: Every 15-30 minutes
- **P2**: Hourly
- **P3**: When resolved

#### Customer Notification Templates
See: `/docs/templates/incident-communication.md`

---

## Testing Schedule

### 6.1 Backup Verification
- **Frequency**: Weekly
- **Procedure**: Restore backup to staging environment
- **Success Criteria**: Full restore < 30 minutes, zero data loss

### 6.2 Failover Drills
- **Frequency**: Quarterly
- **Procedure**: Simulate regional outage, execute failover
- **Success Criteria**: Failover < 10 minutes, < 1% error rate

### 6.3 Full DR Exercise
- **Frequency**: Annually
- **Procedure**: Complete disaster simulation
- **Success Criteria**: Full recovery < 1 hour, all systems operational

### 6.4 Tabletop Exercises
- **Frequency**: Monthly
- **Participants**: DevOps, Security, Engineering leads
- **Duration**: 2 hours
- **Scenarios**: Rotating disaster scenarios

---

## Appendices

### A. Emergency Contacts
| Role | Name | Phone | Email |
|------|------|-------|-------|
| CTO | [Name] | +1-XXX-XXX-XXXX | cto@e-code.ai |
| DevOps Lead | [Name] | +1-XXX-XXX-XXXX | devops-lead@e-code.ai |
| Security Lead | [Name] | +1-XXX-XXX-XXXX | security-lead@e-code.ai |
| AWS Support | AWS | 1-866-965-0972 | aws-support |

### B. Critical System Credentials
**Location**: 1Password vault "DR-Credentials"
**Access**: Requires MFA + approval from 2 senior engineers

### C. Vendor SLAs
| Vendor | Service | SLA | Support Contact |
|--------|---------|-----|-----------------|
| AWS | Infrastructure | 99.99% | aws.amazon.com/support |
| Anthropic | AI API | 99.9% | support@anthropic.com |
| OpenAI | AI API | 99.9% | help.openai.com |

### D. Compliance Requirements
- **GDPR**: Backups encrypted at rest
- **SOC 2**: Annual DR testing required
- **ISO 27001**: Documented recovery procedures

---

## Document Control
- **Next Review Date**: 2025-07-14
- **Approved By**: CTO, VP Engineering, Security Officer
- **Distribution**: Senior Leadership, DevOps Team, Security Team

---

**CONFIDENTIAL - DO NOT DISTRIBUTE**
