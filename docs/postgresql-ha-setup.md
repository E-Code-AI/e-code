# PostgreSQL High Availability Setup for Kubernetes

This guide provides comprehensive instructions for deploying PostgreSQL in a highly available configuration on Kubernetes for the E-Code platform.

## Table of Contents

1. [Overview](#overview)
2. [CloudNativePG Operator Setup](#cloudnativepg-operator-setup)
3. [Zalando Postgres Operator Alternative](#zalando-postgres-operator-alternative)
4. [PodDisruptionBudget Configuration](#poddisruptionbudget-configuration)
5. [Backup Configuration](#backup-configuration)
6. [Connection String for E-Code](#connection-string-for-e-code)
7. [Monitoring](#monitoring)

---

## Overview

### Why High Availability is Critical for Production

PostgreSQL High Availability (HA) is essential for production environments because:

- **Zero Downtime**: Automatic failover ensures your application remains available during node failures, maintenance, or upgrades
- **Data Durability**: Synchronous replication prevents data loss even during catastrophic failures
- **Scalability**: Read replicas distribute query load across multiple instances
- **Disaster Recovery**: Geographic distribution protects against data center outages
- **SLA Compliance**: Enterprise applications require 99.9%+ uptime guarantees

### HA Architecture Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        Kubernetes Cluster                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   PostgreSQL HA Cluster                  │    │
│  │  ┌───────────┐    ┌───────────┐    ┌───────────┐       │    │
│  │  │  Primary  │───▶│  Replica  │───▶│  Replica  │       │    │
│  │  │  (Write)  │    │  (Read)   │    │  (Read)   │       │    │
│  │  └───────────┘    └───────────┘    └───────────┘       │    │
│  │        │                                                 │    │
│  │        ▼                                                 │    │
│  │  ┌───────────────────────────────────────────────────┐  │    │
│  │  │              PgBouncer Connection Pool             │  │    │
│  │  └───────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌───────────────────────────┴───────────────────────────────┐  │
│  │                     E-Code Application                     │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## CloudNativePG Operator Setup

CloudNativePG is the recommended Kubernetes operator for PostgreSQL. It provides native Kubernetes integration, automatic failover, and comprehensive backup capabilities.

### Prerequisites

- Kubernetes cluster v1.25+
- Helm v3.x installed
- kubectl configured with cluster access
- Storage class with `volumeBindingMode: WaitForFirstConsumer`

### Step 1: Install CloudNativePG Operator

```bash
# Add the CloudNativePG Helm repository
helm repo add cnpg https://cloudnative-pg.github.io/charts

# Update Helm repositories
helm repo update

# Install the operator in its own namespace
kubectl create namespace cnpg-system

helm install cnpg cnpg/cloudnative-pg \
  --namespace cnpg-system \
  --set monitoring.podMonitorEnabled=true \
  --set monitoring.grafanaDashboard.create=true
```

Verify the installation:

```bash
kubectl get pods -n cnpg-system
kubectl get crds | grep cnpg
```

### Step 2: Create PostgreSQL Cluster with 3 Replicas

Create a file named `postgresql-cluster.yaml`:

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: e-code-postgres
  namespace: e-code-platform
spec:
  description: "E-Code Platform PostgreSQL HA Cluster"
  imageName: ghcr.io/cloudnative-pg/postgresql:16.1
  instances: 3
  
  # Primary update strategy for zero-downtime updates
  primaryUpdateStrategy: unsupervised
  primaryUpdateMethod: switchover
  
  # PostgreSQL configuration
  postgresql:
    parameters:
      max_connections: "200"
      shared_buffers: "256MB"
      effective_cache_size: "768MB"
      maintenance_work_mem: "128MB"
      checkpoint_completion_target: "0.9"
      wal_buffers: "16MB"
      default_statistics_target: "100"
      random_page_cost: "1.1"
      effective_io_concurrency: "200"
      work_mem: "4MB"
      min_wal_size: "1GB"
      max_wal_size: "4GB"
      max_worker_processes: "4"
      max_parallel_workers_per_gather: "2"
      max_parallel_workers: "4"
      max_parallel_maintenance_workers: "2"
      # Replication settings
      wal_level: "replica"
      hot_standby: "on"
      max_wal_senders: "10"
      max_replication_slots: "10"
      hot_standby_feedback: "on"
    pg_hba:
      - host all all 10.0.0.0/8 scram-sha-256
      - host all all 172.16.0.0/12 scram-sha-256
      - host all all 192.168.0.0/16 scram-sha-256
  
  # Bootstrap configuration
  bootstrap:
    initdb:
      database: ecode
      owner: ecode_user
      secret:
        name: e-code-postgres-credentials
      postInitSQL:
        - CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
        - CREATE EXTENSION IF NOT EXISTS pgcrypto;
  
  # Storage configuration
  storage:
    size: 50Gi
    storageClass: standard-rwo  # Use your cluster's storage class
    pvcTemplate:
      accessModes:
        - ReadWriteOnce
      resources:
        requests:
          storage: 50Gi
  
  # Resource limits
  resources:
    requests:
      memory: "1Gi"
      cpu: "500m"
    limits:
      memory: "2Gi"
      cpu: "2000m"
  
  # Affinity rules for pod distribution
  affinity:
    enablePodAntiAffinity: true
    topologyKey: kubernetes.io/hostname
    podAntiAffinityType: required
  
  # Monitoring
  monitoring:
    enablePodMonitor: true
    customQueriesConfigMap:
      - name: e-code-postgres-queries
        key: custom-queries
  
  # Backup configuration (see Backup section)
  backup:
    barmanObjectStore:
      destinationPath: "s3://e-code-backups/postgres/"
      s3Credentials:
        accessKeyId:
          name: e-code-backup-credentials
          key: ACCESS_KEY_ID
        secretAccessKey:
          name: e-code-backup-credentials
          key: SECRET_ACCESS_KEY
      wal:
        compression: gzip
        maxParallel: 4
      data:
        compression: gzip
    retentionPolicy: "30d"

---
# Database credentials secret
apiVersion: v1
kind: Secret
metadata:
  name: e-code-postgres-credentials
  namespace: e-code-platform
type: kubernetes.io/basic-auth
stringData:
  username: ecode_user
  password: ${POSTGRES_PASSWORD}  # Replace with secure password
```

Apply the cluster:

```bash
kubectl apply -f postgresql-cluster.yaml
```

### Step 3: Automatic Failover Configuration

CloudNativePG handles automatic failover natively. The operator:

1. **Monitors** all PostgreSQL instances continuously
2. **Detects** primary failure within seconds
3. **Promotes** the most up-to-date replica to primary
4. **Reconfigures** remaining replicas to follow the new primary
5. **Updates** the service endpoints automatically

Failover settings in the cluster spec:

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: e-code-postgres
  namespace: e-code-platform
spec:
  # ... other settings ...
  
  # Failover configuration
  failoverDelay: 0
  switchoverDelay: 40000000  # 40 seconds in microseconds
  
  # Health check settings
  startDelay: 30
  stopDelay: 30
  
  # Replication settings for failover
  minSyncReplicas: 1
  maxSyncReplicas: 2
  
  # Probes for failure detection
  livenessProbeTimeout: 30
  readinessProbeTimeout: 30
```

Verify failover readiness:

```bash
# Check cluster status
kubectl get cluster e-code-postgres -n e-code-platform

# View detailed cluster info
kubectl cnpg status e-code-postgres -n e-code-platform

# Test failover (only in non-production)
kubectl cnpg promote e-code-postgres-2 -n e-code-platform
```

### Step 4: Connection Pooling with PgBouncer

Create a pooler for connection management:

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Pooler
metadata:
  name: e-code-postgres-pooler-rw
  namespace: e-code-platform
spec:
  cluster:
    name: e-code-postgres
  instances: 3
  type: rw  # Read-write pooler for primary
  pgbouncer:
    poolMode: transaction
    parameters:
      max_client_conn: "1000"
      default_pool_size: "25"
      min_pool_size: "5"
      reserve_pool_size: "5"
      reserve_pool_timeout: "5"
      max_db_connections: "100"
      max_user_connections: "100"
      server_reset_query: "DISCARD ALL"
      server_check_query: "SELECT 1"
      server_check_delay: "30"
      query_timeout: "120"
      query_wait_timeout: "60"
      client_idle_timeout: "300"
      server_idle_timeout: "600"
      server_lifetime: "3600"
      log_connections: "1"
      log_disconnections: "1"
      stats_period: "60"
  template:
    metadata:
      labels:
        app: e-code-postgres-pooler
    spec:
      containers:
        - name: pgbouncer
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "500m"

---
# Read-only pooler for replicas
apiVersion: postgresql.cnpg.io/v1
kind: Pooler
metadata:
  name: e-code-postgres-pooler-ro
  namespace: e-code-platform
spec:
  cluster:
    name: e-code-postgres
  instances: 2
  type: ro  # Read-only pooler for replicas
  pgbouncer:
    poolMode: transaction
    parameters:
      max_client_conn: "2000"
      default_pool_size: "50"
      min_pool_size: "10"
  template:
    metadata:
      labels:
        app: e-code-postgres-pooler-ro
```

Apply the pooler configuration:

```bash
kubectl apply -f pgbouncer-pooler.yaml

# Verify poolers are running
kubectl get pooler -n e-code-platform
```

---

## Zalando Postgres Operator Alternative

The Zalando Postgres Operator is another production-ready option with different features and tradeoffs.

### Step 1: Install Zalando Operator

```bash
# Clone the operator repository
git clone https://github.com/zalando/postgres-operator.git
cd postgres-operator

# Install via Helm
helm repo add postgres-operator-charts https://opensource.zalando.com/postgres-operator/charts/postgres-operator

helm install postgres-operator postgres-operator-charts/postgres-operator \
  --namespace postgres-operator \
  --create-namespace \
  --set configKubernetes.enable_pod_disruption_budget=true \
  --set configKubernetes.pod_environment_configmap="postgres-operator/pod-env-vars"
```

### Step 2: Zalando Cluster Definition

```yaml
apiVersion: "acid.zalan.do/v1"
kind: postgresql
metadata:
  name: e-code-postgres-zalando
  namespace: e-code-platform
spec:
  teamId: "e-code"
  volume:
    size: 50Gi
    storageClass: standard-rwo
  numberOfInstances: 3
  
  users:
    ecode_user:
      - superuser
      - createdb
    ecode_readonly:
      - login
  
  databases:
    ecode: ecode_user
  
  postgresql:
    version: "16"
    parameters:
      max_connections: "200"
      shared_buffers: "256MB"
      effective_cache_size: "768MB"
      work_mem: "4MB"
      maintenance_work_mem: "128MB"
      checkpoint_completion_target: "0.9"
      wal_buffers: "16MB"
      random_page_cost: "1.1"
      effective_io_concurrency: "200"
      log_statement: "mod"
      log_duration: "on"
  
  patroni:
    failsafe_mode: true
    ttl: 30
    loop_wait: 10
    retry_timeout: 10
    maximum_lag_on_failover: 33554432  # 32MB
    synchronous_mode: true
    synchronous_mode_strict: false
    synchronous_node_count: 1
    pg_hba:
      - host all all 0.0.0.0/0 md5
      - host replication standby all md5
  
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2000m
      memory: 2Gi
  
  enableConnectionPooler: true
  connectionPooler:
    numberOfInstances: 2
    mode: "transaction"
    schema: "pooler"
    user: "pooler"
    resources:
      requests:
        cpu: "100m"
        memory: "100Mi"
      limits:
        cpu: "500m"
        memory: "256Mi"
  
  enableLogicalBackup: true
  logicalBackupSchedule: "30 00 * * *"
  
  podAnnotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "9187"
  
  tolerations:
    - key: "database"
      operator: "Equal"
      value: "postgres"
      effect: "NoSchedule"
  
  nodeAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      nodeSelectorTerms:
        - matchExpressions:
            - key: node-type
              operator: In
              values:
                - database
```

Apply the Zalando cluster:

```bash
kubectl apply -f zalando-postgres-cluster.yaml

# Check status
kubectl get postgresql -n e-code-platform
```

---

## PodDisruptionBudget Configuration

PodDisruptionBudgets (PDBs) are critical for maintaining database availability during voluntary disruptions like node upgrades, scaling operations, or maintenance.

### Why PDBs are Critical

1. **Prevents simultaneous pod evictions**: Ensures at least N pods remain available
2. **Protects against quorum loss**: Maintains cluster consensus during operations
3. **Enables safe node drains**: Allows infrastructure maintenance without downtime
4. **Required for production SLAs**: Essential for 99.9%+ uptime guarantees

### PDB Configuration for PostgreSQL

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: e-code-postgres-pdb
  namespace: e-code-platform
  labels:
    app: e-code-postgres
    component: database
spec:
  # Minimum number of pods that must remain available
  minAvailable: 2
  selector:
    matchLabels:
      cnpg.io/cluster: e-code-postgres

---
# PDB for PgBouncer poolers
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: e-code-postgres-pooler-pdb
  namespace: e-code-platform
  labels:
    app: e-code-postgres-pooler
    component: connection-pooler
spec:
  minAvailable: 1
  selector:
    matchLabels:
      cnpg.io/poolerName: e-code-postgres-pooler-rw

---
# Alternative: Use maxUnavailable instead
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: e-code-postgres-pdb-alt
  namespace: e-code-platform
spec:
  # Maximum number of pods that can be unavailable
  maxUnavailable: 1
  selector:
    matchLabels:
      cnpg.io/cluster: e-code-postgres
```

### PDB Best Practices

| Cluster Size | minAvailable | maxUnavailable | Quorum Maintained |
|-------------|--------------|----------------|-------------------|
| 3 instances | 2            | 1              | Yes (2/3)         |
| 5 instances | 3            | 2              | Yes (3/5)         |
| 7 instances | 4            | 3              | Yes (4/7)         |

Apply PDB configuration:

```bash
kubectl apply -f postgres-pdb.yaml

# Verify PDB
kubectl get pdb -n e-code-platform

# Test PDB (dry-run eviction)
kubectl drain <node-name> --dry-run=server --ignore-daemonsets
```

---

## Backup Configuration

### S3 Backup Configuration

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: e-code-s3-backup-credentials
  namespace: e-code-platform
type: Opaque
stringData:
  ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}
  SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}

---
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: e-code-postgres
  namespace: e-code-platform
spec:
  # ... other cluster settings ...
  
  backup:
    barmanObjectStore:
      destinationPath: "s3://e-code-database-backups/postgres/"
      endpointURL: "https://s3.us-west-2.amazonaws.com"
      s3Credentials:
        accessKeyId:
          name: e-code-s3-backup-credentials
          key: ACCESS_KEY_ID
        secretAccessKey:
          name: e-code-s3-backup-credentials
          key: SECRET_ACCESS_KEY
      wal:
        compression: gzip
        encryption: AES256
        maxParallel: 4
      data:
        compression: gzip
        encryption: AES256
        immediateCheckpoint: true
        jobs: 4
    retentionPolicy: "30d"

---
# Scheduled backup
apiVersion: postgresql.cnpg.io/v1
kind: ScheduledBackup
metadata:
  name: e-code-postgres-daily-backup
  namespace: e-code-platform
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM UTC
  backupOwnerReference: cluster
  cluster:
    name: e-code-postgres
  immediate: false
  suspend: false
```

### GCS Backup Configuration

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: e-code-gcs-backup-credentials
  namespace: e-code-platform
type: Opaque
stringData:
  gcs-credentials.json: |
    {
      "type": "service_account",
      "project_id": "${GCP_PROJECT_ID}",
      "private_key_id": "${GCS_PRIVATE_KEY_ID}",
      "private_key": "${GCS_PRIVATE_KEY}",
      "client_email": "${GCS_CLIENT_EMAIL}",
      "client_id": "${GCS_CLIENT_ID}",
      "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      "token_uri": "https://oauth2.googleapis.com/token"
    }

---
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: e-code-postgres
  namespace: e-code-platform
spec:
  backup:
    barmanObjectStore:
      destinationPath: "gs://e-code-database-backups/postgres/"
      googleCredentials:
        applicationCredentials:
          name: e-code-gcs-backup-credentials
          key: gcs-credentials.json
      wal:
        compression: gzip
        maxParallel: 4
      data:
        compression: gzip
        jobs: 4
    retentionPolicy: "30d"
```

### Point-in-Time Recovery (PITR)

PITR allows recovery to any point within the backup retention window:

```yaml
# Recover to a specific point in time
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: e-code-postgres-recovered
  namespace: e-code-platform
spec:
  instances: 3
  
  bootstrap:
    recovery:
      source: e-code-postgres
      # Recover to a specific timestamp
      recoveryTarget:
        targetTime: "2024-12-15T10:30:00Z"
      # OR recover to a specific transaction ID
      # recoveryTarget:
      #   targetXID: "12345678"
      # OR recover to a named restore point
      # recoveryTarget:
      #   targetName: "before_migration"
  
  externalClusters:
    - name: e-code-postgres
      barmanObjectStore:
        destinationPath: "s3://e-code-database-backups/postgres/"
        s3Credentials:
          accessKeyId:
            name: e-code-s3-backup-credentials
            key: ACCESS_KEY_ID
          secretAccessKey:
            name: e-code-s3-backup-credentials
            key: SECRET_ACCESS_KEY
        wal:
          maxParallel: 4
  
  storage:
    size: 50Gi
    storageClass: standard-rwo
```

Trigger a backup manually:

```bash
# Create an on-demand backup
kubectl cnpg backup e-code-postgres -n e-code-platform

# List backups
kubectl get backup -n e-code-platform

# Check backup status
kubectl describe backup e-code-postgres-backup -n e-code-platform
```

---

## Connection String for E-Code

### DATABASE_URL Configuration

CloudNativePG creates Kubernetes services for connecting to the database:

```bash
# List created services
kubectl get svc -n e-code-platform -l cnpg.io/cluster=e-code-postgres
```

Services created:
- `e-code-postgres-rw`: Read-write (primary only)
- `e-code-postgres-ro`: Read-only (replicas)
- `e-code-postgres-r`: All instances

### Connection Strings

```yaml
# ConfigMap for application connection
apiVersion: v1
kind: ConfigMap
metadata:
  name: e-code-database-config
  namespace: e-code-platform
data:
  # Primary connection (read-write)
  DATABASE_URL: "postgresql://ecode_user:${POSTGRES_PASSWORD}@e-code-postgres-rw:5432/ecode?sslmode=require"
  
  # Read replica connection (read-only queries)
  DATABASE_READ_URL: "postgresql://ecode_user:${POSTGRES_PASSWORD}@e-code-postgres-ro:5432/ecode?sslmode=require"
  
  # Via PgBouncer pooler (recommended for production)
  DATABASE_URL_POOLED: "postgresql://ecode_user:${POSTGRES_PASSWORD}@e-code-postgres-pooler-rw:5432/ecode?sslmode=require"
  DATABASE_READ_URL_POOLED: "postgresql://ecode_user:${POSTGRES_PASSWORD}@e-code-postgres-pooler-ro:5432/ecode?sslmode=require"

---
# Secret for database credentials
apiVersion: v1
kind: Secret
metadata:
  name: e-code-database-credentials
  namespace: e-code-platform
type: Opaque
stringData:
  # Full connection URL with password
  DATABASE_URL: "postgresql://ecode_user:${POSTGRES_PASSWORD}@e-code-postgres-pooler-rw:5432/ecode?sslmode=require&connect_timeout=10&application_name=e-code-app"
```

### Read/Write Splitting Example

Configure the E-Code application for read/write splitting:

```typescript
// server/config/database.ts
import { Pool } from 'pg';

// Primary pool for write operations
export const primaryPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Read replica pool for read operations
export const replicaPool = new Pool({
  connectionString: process.env.DATABASE_READ_URL || process.env.DATABASE_URL,
  max: 50,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Smart query router
export async function query(sql: string, params?: any[], options?: { readonly?: boolean }) {
  const pool = options?.readonly ? replicaPool : primaryPool;
  return pool.query(sql, params);
}

// Transaction wrapper (always uses primary)
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await primaryPool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

### Deployment Configuration

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: e-code-app
  namespace: e-code-platform
spec:
  template:
    spec:
      containers:
        - name: app
          env:
            # Read-write connection via pooler
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: e-code-postgres-app
                  key: uri
            # Read-only connection via pooler
            - name: DATABASE_READ_URL
              value: "postgresql://ecode_user@e-code-postgres-pooler-ro:5432/ecode?sslmode=require"
            # Individual connection settings
            - name: PGHOST
              value: "e-code-postgres-pooler-rw"
            - name: PGPORT
              value: "5432"
            - name: PGDATABASE
              value: "ecode"
            - name: PGUSER
              valueFrom:
                secretKeyRef:
                  name: e-code-postgres-app
                  key: username
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: e-code-postgres-app
                  key: password
```

---

## Monitoring

### Prometheus Metrics

CloudNativePG exports Prometheus metrics automatically. Create a PodMonitor:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: e-code-postgres-monitor
  namespace: e-code-platform
  labels:
    app: e-code-postgres
spec:
  selector:
    matchLabels:
      cnpg.io/cluster: e-code-postgres
  podMetricsEndpoints:
    - port: metrics
      interval: 30s
      scrapeTimeout: 10s
      path: /metrics
```

### Custom Metrics ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: e-code-postgres-queries
  namespace: e-code-platform
data:
  custom-queries: |
    pg_replication_lag:
      query: |
        SELECT
          CASE
            WHEN pg_is_in_recovery() THEN
              EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))
            ELSE 0
          END AS lag_seconds
      metrics:
        - lag_seconds:
            usage: "GAUGE"
            description: "Replication lag in seconds"
    
    pg_database_size:
      query: |
        SELECT pg_database_size(current_database()) as size_bytes
      metrics:
        - size_bytes:
            usage: "GAUGE"
            description: "Database size in bytes"
    
    pg_connections:
      query: |
        SELECT
          count(*) FILTER (WHERE state = 'active') as active,
          count(*) FILTER (WHERE state = 'idle') as idle,
          count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
          count(*) as total
        FROM pg_stat_activity
        WHERE datname = current_database()
      metrics:
        - active:
            usage: "GAUGE"
            description: "Active connections"
        - idle:
            usage: "GAUGE"
            description: "Idle connections"
        - idle_in_transaction:
            usage: "GAUGE"
            description: "Idle in transaction connections"
        - total:
            usage: "GAUGE"
            description: "Total connections"
    
    pg_slow_queries:
      query: |
        SELECT count(*) as count
        FROM pg_stat_activity
        WHERE state = 'active'
          AND now() - query_start > interval '30 seconds'
      metrics:
        - count:
            usage: "GAUGE"
            description: "Number of queries running longer than 30 seconds"
```

### Alert Rules for Replication Lag

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: e-code-postgres-alerts
  namespace: e-code-platform
  labels:
    app: e-code-postgres
    prometheus: kube-prometheus
spec:
  groups:
    - name: postgres.rules
      rules:
        # Replication lag alerts
        - alert: PostgresReplicationLagHigh
          expr: |
            cnpg_pg_replication_lag_seconds > 30
          for: 5m
          labels:
            severity: warning
            team: platform
          annotations:
            summary: "PostgreSQL replication lag is high"
            description: "Replication lag on {{ $labels.pod }} is {{ $value }} seconds"
            runbook_url: "https://docs.e-code.io/runbooks/postgres-replication-lag"
        
        - alert: PostgresReplicationLagCritical
          expr: |
            cnpg_pg_replication_lag_seconds > 120
          for: 2m
          labels:
            severity: critical
            team: platform
          annotations:
            summary: "PostgreSQL replication lag is critical"
            description: "Replication lag on {{ $labels.pod }} is {{ $value }} seconds - risk of data loss during failover"
        
        # Cluster health alerts
        - alert: PostgresClusterUnhealthy
          expr: |
            cnpg_pg_cluster_status{status!="Cluster in healthy state"} == 1
          for: 5m
          labels:
            severity: critical
            team: platform
          annotations:
            summary: "PostgreSQL cluster is unhealthy"
            description: "Cluster {{ $labels.cluster }} status: {{ $labels.status }}"
        
        - alert: PostgresInstanceDown
          expr: |
            up{job="cnpg-postgresql"} == 0
          for: 1m
          labels:
            severity: critical
            team: platform
          annotations:
            summary: "PostgreSQL instance is down"
            description: "Instance {{ $labels.pod }} is not responding"
        
        - alert: PostgresInstancesLow
          expr: |
            count by (cluster) (cnpg_pg_cluster_instances{role="replica"}) < 2
          for: 5m
          labels:
            severity: warning
            team: platform
          annotations:
            summary: "PostgreSQL cluster has fewer than expected replicas"
            description: "Cluster {{ $labels.cluster }} has only {{ $value }} replicas"
        
        # Connection alerts
        - alert: PostgresConnectionsHigh
          expr: |
            (cnpg_pg_stat_activity_connections / cnpg_pg_settings_max_connections) > 0.8
          for: 10m
          labels:
            severity: warning
            team: platform
          annotations:
            summary: "PostgreSQL connections are high"
            description: "Connection usage is {{ $value | humanizePercentage }} on {{ $labels.pod }}"
        
        - alert: PostgresConnectionsExhausted
          expr: |
            (cnpg_pg_stat_activity_connections / cnpg_pg_settings_max_connections) > 0.95
          for: 2m
          labels:
            severity: critical
            team: platform
          annotations:
            summary: "PostgreSQL connections nearly exhausted"
            description: "Connection usage is {{ $value | humanizePercentage }} on {{ $labels.pod }}"
        
        # Storage alerts
        - alert: PostgresStorageLow
          expr: |
            (1 - (cnpg_pg_database_size_bytes / cnpg_pg_settings_data_directory_size)) < 0.2
          for: 30m
          labels:
            severity: warning
            team: platform
          annotations:
            summary: "PostgreSQL storage is running low"
            description: "Less than 20% storage remaining on {{ $labels.pod }}"
        
        - alert: PostgresWALAccumulationHigh
          expr: |
            cnpg_pg_wal_files_count > 100
          for: 15m
          labels:
            severity: warning
            team: platform
          annotations:
            summary: "PostgreSQL WAL file accumulation is high"
            description: "{{ $value }} WAL files accumulated on {{ $labels.pod }}"
        
        # Backup alerts
        - alert: PostgresBackupFailed
          expr: |
            cnpg_collector_last_backup_timestamp < (time() - 86400)
          for: 10m
          labels:
            severity: critical
            team: platform
          annotations:
            summary: "PostgreSQL backup is stale"
            description: "Last successful backup for {{ $labels.cluster }} was more than 24 hours ago"
        
        # Long-running queries
        - alert: PostgresLongRunningQueries
          expr: |
            max by (pod) (cnpg_pg_stat_activity_max_tx_age_seconds) > 3600
          for: 5m
          labels:
            severity: warning
            team: platform
          annotations:
            summary: "Long-running transaction detected"
            description: "Transaction running for {{ $value | humanizeDuration }} on {{ $labels.pod }}"
```

### Grafana Dashboard

Import the CloudNativePG dashboard or use this dashboard JSON:

```json
{
  "dashboard": {
    "title": "E-Code PostgreSQL HA",
    "panels": [
      {
        "title": "Cluster Status",
        "type": "stat",
        "targets": [
          {
            "expr": "cnpg_pg_cluster_status{cluster='e-code-postgres'}"
          }
        ]
      },
      {
        "title": "Replication Lag",
        "type": "graph",
        "targets": [
          {
            "expr": "cnpg_pg_replication_lag_seconds{cluster='e-code-postgres'}",
            "legendFormat": "{{ pod }}"
          }
        ]
      },
      {
        "title": "Active Connections",
        "type": "graph",
        "targets": [
          {
            "expr": "cnpg_pg_stat_activity_connections{cluster='e-code-postgres'}",
            "legendFormat": "{{ pod }}"
          }
        ]
      },
      {
        "title": "Database Size",
        "type": "stat",
        "targets": [
          {
            "expr": "max(cnpg_pg_database_size_bytes{cluster='e-code-postgres'})"
          }
        ]
      }
    ]
  }
}
```

---

## Quick Reference

### Common Commands

```bash
# Check cluster status
kubectl cnpg status e-code-postgres -n e-code-platform

# Connect to primary
kubectl cnpg psql e-code-postgres -n e-code-platform -- -c "SELECT version();"

# Trigger manual backup
kubectl cnpg backup e-code-postgres -n e-code-platform

# List backups
kubectl get backup -n e-code-platform

# Promote a replica (for testing failover)
kubectl cnpg promote e-code-postgres-2 -n e-code-platform

# View cluster logs
kubectl logs -l cnpg.io/cluster=e-code-postgres -n e-code-platform --tail=100

# Check replication status
kubectl cnpg psql e-code-postgres -n e-code-platform -- -c "SELECT * FROM pg_stat_replication;"
```

### Troubleshooting

| Issue | Diagnostic Command | Resolution |
|-------|-------------------|------------|
| Cluster not healthy | `kubectl cnpg status <cluster>` | Check pod events and logs |
| High replication lag | `kubectl cnpg psql <cluster> -- -c "SELECT * FROM pg_stat_replication;"` | Check network, increase WAL senders |
| Connection failures | `kubectl get svc -l cnpg.io/cluster=<cluster>` | Verify service endpoints |
| Backup failures | `kubectl describe backup <backup-name>` | Check S3/GCS credentials |
| Failover not working | `kubectl get pdb` | Ensure PDB allows at least 1 eviction |

---

## Additional Resources

- [CloudNativePG Documentation](https://cloudnative-pg.io/documentation/)
- [Zalando Postgres Operator Documentation](https://postgres-operator.readthedocs.io/)
- [PostgreSQL High Availability Best Practices](https://www.postgresql.org/docs/current/high-availability.html)
- [Kubernetes PodDisruptionBudget Documentation](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/)
