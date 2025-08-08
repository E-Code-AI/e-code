#!/bin/bash

# Script de déploiement Prometheus + Grafana pour E-Code Platform

PROJECT_ID="votre-projet-ecode"
ZONE="europe-west1-b"

echo "📊 Déploiement Monitoring Prometheus + Grafana"
echo "=============================================="
echo ""

# Configuration
gcloud config set project ${PROJECT_ID}
gcloud container clusters get-credentials e-code-production --zone=${ZONE}

# 1. Créer namespace monitoring
echo "➡️ Création du namespace monitoring..."
kubectl create namespace monitoring 2>/dev/null || true

# 2. Déployer Prometheus
echo "➡️ Déploiement de Prometheus..."

kubectl apply -n monitoring -f - <<'PROMETHEUS'
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
data:
  prometheus.yml: |
    global:
      scrape_interval: 30s
      evaluation_interval: 30s
    scrape_configs:
    - job_name: 'kubernetes-pods'
      kubernetes_sd_configs:
      - role: pod
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__
    - job_name: 'e-code-platform'
      static_configs:
      - targets: ['e-code-production-service.e-code:80']
    - job_name: 'kubernetes-nodes'
      kubernetes_sd_configs:
      - role: node
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
spec:
  replicas: 1
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
    spec:
      serviceAccountName: prometheus
      containers:
      - name: prometheus
        image: prom/prometheus:latest
        args:
        - '--config.file=/etc/prometheus/prometheus.yml'
        - '--storage.tsdb.path=/prometheus'
        - '--web.enable-lifecycle'
        - '--web.enable-admin-api'
        ports:
        - containerPort: 9090
          name: web
        volumeMounts:
        - name: config
          mountPath: /etc/prometheus
        - name: storage
          mountPath: /prometheus
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1"
      volumes:
      - name: config
        configMap:
          name: prometheus-config
      - name: storage
        emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: prometheus
spec:
  type: LoadBalancer
  selector:
    app: prometheus
  ports:
  - port: 9090
    targetPort: 9090
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: prometheus
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: prometheus
rules:
- apiGroups: [""]
  resources:
  - nodes
  - nodes/proxy
  - services
  - endpoints
  - pods
  verbs: ["get", "list", "watch"]
- apiGroups: ["extensions"]
  resources:
  - ingresses
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: prometheus
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: prometheus
subjects:
- kind: ServiceAccount
  name: prometheus
  namespace: monitoring
PROMETHEUS

# 3. Déployer Grafana
echo "➡️ Déploiement de Grafana..."

kubectl apply -n monitoring -f - <<'GRAFANA'
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasources
data:
  prometheus.yaml: |
    apiVersion: 1
    datasources:
    - name: Prometheus
      type: prometheus
      access: proxy
      url: http://prometheus:9090
      isDefault: true
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
spec:
  replicas: 1
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      containers:
      - name: grafana
        image: grafana/grafana:latest
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: GF_SECURITY_ADMIN_USER
          value: admin
        - name: GF_SECURITY_ADMIN_PASSWORD
          value: e-code-admin-2025
        - name: GF_SERVER_ROOT_URL
          value: https://monitoring.e-code.ai
        - name: GF_INSTALL_PLUGINS
          value: grafana-piechart-panel,grafana-worldmap-panel
        volumeMounts:
        - name: datasources
          mountPath: /etc/grafana/provisioning/datasources
        - name: storage
          mountPath: /var/lib/grafana
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
      volumes:
      - name: datasources
        configMap:
          name: grafana-datasources
      - name: storage
        emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: grafana
spec:
  type: LoadBalancer
  selector:
    app: grafana
  ports:
  - port: 80
    targetPort: 3000
    name: http
GRAFANA

# 4. Déployer les dashboards E-Code
echo "➡️ Configuration des dashboards E-Code..."

kubectl apply -n monitoring -f - <<'DASHBOARD'
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboards
data:
  e-code-dashboard.json: |
    {
      "dashboard": {
        "title": "E-Code Platform Monitoring",
        "panels": [
          {
            "title": "Active Users",
            "type": "graph",
            "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0},
            "targets": [
              {
                "expr": "sum(rate(http_requests_total[5m]))",
                "legendFormat": "Requests/sec"
              }
            ]
          },
          {
            "title": "Pod CPU Usage",
            "type": "graph",
            "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0},
            "targets": [
              {
                "expr": "sum(rate(container_cpu_usage_seconds_total{namespace=\"e-code\"}[5m])) by (pod)",
                "legendFormat": "{{pod}}"
              }
            ]
          },
          {
            "title": "Memory Usage",
            "type": "graph",
            "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8},
            "targets": [
              {
                "expr": "sum(container_memory_usage_bytes{namespace=\"e-code\"}) by (pod)",
                "legendFormat": "{{pod}}"
              }
            ]
          },
          {
            "title": "Response Time",
            "type": "graph",
            "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8},
            "targets": [
              {
                "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
                "legendFormat": "95th percentile"
              }
            ]
          }
        ],
        "refresh": "30s",
        "time": {"from": "now-1h", "to": "now"}
      }
    }
DASHBOARD

# 5. Déployer l'exporteur de métriques pour E-Code
echo "➡️ Configuration de l'exporteur de métriques..."

kubectl apply -n e-code -f - <<'EXPORTER'
apiVersion: v1
kind: ConfigMap
metadata:
  name: metrics-config
data:
  metrics.js: |
    const prometheus = require('prom-client');
    const register = new prometheus.Registry();
    
    // Métriques personnalisées E-Code
    const httpRequestDuration = new prometheus.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5]
    });
    
    const activeUsers = new prometheus.Gauge({
      name: 'e_code_active_users',
      help: 'Number of active users'
    });
    
    const projectsCreated = new prometheus.Counter({
      name: 'e_code_projects_created_total',
      help: 'Total number of projects created'
    });
    
    const aiRequests = new prometheus.Counter({
      name: 'e_code_ai_requests_total',
      help: 'Total number of AI requests',
      labelNames: ['model', 'status']
    });
    
    register.registerMetric(httpRequestDuration);
    register.registerMetric(activeUsers);
    register.registerMetric(projectsCreated);
    register.registerMetric(aiRequests);
    
    module.exports = { register, httpRequestDuration, activeUsers, projectsCreated, aiRequests };
EXPORTER

# 6. Attendre le déploiement
echo "➡️ Attente du déploiement monitoring..."
sleep 30

# 7. Obtenir les IPs
echo ""
echo "✅ MONITORING DÉPLOYÉ!"
echo "====================="
echo ""

PROMETHEUS_IP=$(kubectl get service prometheus -n monitoring -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
GRAFANA_IP=$(kubectl get service grafana -n monitoring -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

if [ ! -z "$PROMETHEUS_IP" ]; then
  echo "📊 Prometheus: http://${PROMETHEUS_IP}:9090"
fi

if [ ! -z "$GRAFANA_IP" ]; then
  echo "📈 Grafana: http://${GRAFANA_IP}"
  echo "   Utilisateur: admin"
  echo "   Mot de passe: e-code-admin-2025"
fi

echo ""
echo "📌 Configuration DNS recommandée:"
echo "================================"
echo "Pour monitoring.e-code.ai:"
echo "Type: A"
echo "Nom: monitoring"
echo "Valeur: ${GRAFANA_IP}"
echo ""
echo "📊 Dashboards disponibles:"
echo "• E-Code Platform Monitoring"
echo "• Kubernetes Cluster"
echo "• Pod Performance"
echo "• User Analytics"
echo ""
echo "État du monitoring:"
kubectl get all -n monitoring