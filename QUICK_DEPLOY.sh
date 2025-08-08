#!/bin/bash

# Script rapide pour déployer E-Code Platform
# Version simplifiée - Copier-coller dans Cloud Shell

echo "🚀 Déploiement rapide E-Code Platform"
echo ""

# Variables
PROJECT_ID="votre-projet-ecode"
ZONE="europe-west1-b"

# Configuration
gcloud config set project ${PROJECT_ID}

# Créer le cluster (si n'existe pas)
gcloud container clusters create e-code-production \
  --zone=${ZONE} \
  --num-nodes=3 \
  --enable-autoscaling \
  --min-nodes=3 \
  --max-nodes=20 \
  --machine-type=n2-standard-2 || echo "Cluster exists"

# Connexion
gcloud container clusters get-credentials e-code-production --zone=${ZONE}

# Namespace
kubectl create namespace e-code || true

# Déploiement rapide avec image simple
kubectl apply -f - <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: e-code-app
  namespace: e-code
spec:
  replicas: 3
  selector:
    matchLabels:
      app: e-code
  template:
    metadata:
      labels:
        app: e-code
    spec:
      containers:
      - name: app
        image: nginx:alpine
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: e-code-service
  namespace: e-code
spec:
  type: LoadBalancer
  selector:
    app: e-code
  ports:
  - port: 80
    targetPort: 80
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: e-code-hpa
  namespace: e-code
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: e-code-app
  minReplicas: 3
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
EOF

# Attendre l'IP
echo "Attente de l'IP externe..."
sleep 30
IP=$(kubectl get service e-code-service -n e-code -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "✅ Application accessible à: http://${IP}"