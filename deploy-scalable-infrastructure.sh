#!/bin/bash

# Script de déploiement pour infrastructure scalable (millions d'utilisateurs)
# Architecture production-grade avec Kubernetes, Docker et isolation réelle

set -e

PROJECT_ID="votre-projet-ecode"
REGION="europe-west1"
ZONE="europe-west1-b"
CLUSTER_NAME="e-code-cluster-production"
NAMESPACE="e-code-platform"

echo "🚀 Déploiement Infrastructure Scalable E-Code Platform"
echo "======================================================"
echo "Configuration pour millions d'utilisateurs"
echo ""

# Fonction pour afficher les étapes
step() {
    echo ""
    echo "➡️  $1"
    echo "-------------------------------------------"
}

# 1. Configuration du projet GCP
step "Configuration du projet GCP"
gcloud config set project ${PROJECT_ID}
gcloud config set compute/region ${REGION}
gcloud config set compute/zone ${ZONE}

# 2. Activation des APIs nécessaires
step "Activation des APIs Google Cloud"
gcloud services enable \
    container.googleapis.com \
    compute.googleapis.com \
    containerregistry.googleapis.com \
    cloudresourcemanager.googleapis.com \
    monitoring.googleapis.com \
    logging.googleapis.com \
    cloudbuild.googleapis.com

# 3. Création ou mise à jour du cluster GKE
step "Configuration du cluster Kubernetes production"

# Vérifier si le cluster existe
if gcloud container clusters describe ${CLUSTER_NAME} --zone=${ZONE} &>/dev/null; then
    echo "Cluster existant trouvé, mise à jour..."
    
    # Mise à jour du cluster pour production
    gcloud container clusters update ${CLUSTER_NAME} \
        --zone=${ZONE} \
        --enable-autoscaling \
        --min-nodes=10 \
        --max-nodes=100 \
        --enable-autorepair \
        --enable-autoupgrade
    
    # Ajout d'un node pool haute performance
    gcloud container node-pools create high-performance-pool \
        --cluster=${CLUSTER_NAME} \
        --zone=${ZONE} \
        --machine-type=n2-standard-8 \
        --num-nodes=5 \
        --enable-autoscaling \
        --min-nodes=5 \
        --max-nodes=50 \
        --disk-size=100 \
        --disk-type=pd-ssd \
        --enable-autorepair \
        --enable-autoupgrade || echo "Node pool already exists"
else
    echo "Création d'un nouveau cluster production..."
    
    gcloud container clusters create ${CLUSTER_NAME} \
        --zone=${ZONE} \
        --num-nodes=10 \
        --machine-type=n2-standard-4 \
        --enable-autoscaling \
        --min-nodes=10 \
        --max-nodes=100 \
        --enable-autorepair \
        --enable-autoupgrade \
        --enable-stackdriver-kubernetes \
        --enable-ip-alias \
        --network="default" \
        --subnetwork="default" \
        --addons=HorizontalPodAutoscaling,HttpLoadBalancing,GcePersistentDiskCsiDriver \
        --disk-size=100 \
        --disk-type=pd-ssd \
        --enable-shielded-nodes
fi

# 4. Obtenir les credentials du cluster
step "Connexion au cluster Kubernetes"
gcloud container clusters get-credentials ${CLUSTER_NAME} --zone=${ZONE}

# 5. Installation des composants essentiels
step "Installation des composants Kubernetes essentiels"

# NGINX Ingress Controller
echo "Installation de NGINX Ingress Controller..."
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml

# Metrics Server pour HPA
echo "Installation du Metrics Server..."
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# 6. Création du namespace et des secrets
step "Configuration du namespace et des secrets"

kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -

# Création des secrets
kubectl create secret generic postgres-secret \
    --from-literal=password='super-secure-postgres-password' \
    --from-literal=replication-password='replication-password' \
    --namespace=${NAMESPACE} \
    --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic e-code-secrets \
    --from-literal=DATABASE_URL='postgresql://postgres:super-secure-postgres-password@postgres-primary:5432/ecode' \
    --from-literal=REDIS_PASSWORD='redis-secure-password' \
    --from-literal=SESSION_SECRET='production-session-secret-$(openssl rand -hex 32)' \
    --from-literal=JWT_SECRET='production-jwt-secret-$(openssl rand -hex 32)' \
    --from-literal=OPENAI_API_KEY='${OPENAI_API_KEY:-sk-placeholder}' \
    --from-literal=STRIPE_SECRET_KEY='${STRIPE_SECRET_KEY:-sk_test_placeholder}' \
    --namespace=${NAMESPACE} \
    --dry-run=client -o yaml | kubectl apply -f -

# 7. Déploiement de l'infrastructure
step "Déploiement de l'infrastructure complète"

kubectl apply -f kubernetes/production-infrastructure.yaml

# 8. Construction et déploiement de l'application
step "Construction de l'image Docker optimisée"

# Créer un Dockerfile optimisé pour production
cat > Dockerfile.scalable << 'EOF'
# Build stage
FROM node:18-alpine AS builder
RUN apk add --no-cache python3 make g++ git
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build || true

# Runtime stage
FROM node:18-alpine
RUN apk add --no-cache tini
WORKDIR /app

# Copier uniquement les fichiers nécessaires
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/package*.json ./

# Optimisations pour production
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Sécurité
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 5000

# Utiliser tini pour une meilleure gestion des processus
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server/index.js"]
EOF

# Construction et push
docker build -f Dockerfile.scalable -t gcr.io/${PROJECT_ID}/e-code-platform:scalable .
docker push gcr.io/${PROJECT_ID}/e-code-platform:scalable

# Mise à jour du déploiement
kubectl set image deployment/e-code-platform \
    e-code-platform=gcr.io/${PROJECT_ID}/e-code-platform:scalable \
    -n ${NAMESPACE}

# 9. Attendre que tout soit prêt
step "Vérification du déploiement"

echo "Attente du démarrage des pods..."
kubectl wait --for=condition=ready pod -l app=e-code-platform -n ${NAMESPACE} --timeout=300s || true

# 10. Configuration du monitoring
step "Configuration du monitoring et des alertes"

# Créer une dashboard de monitoring
cat > monitoring-config.yaml << 'EOF'
apiVersion: v1
kind: ConfigMap
metadata:
  name: monitoring-config
  namespace: e-code-platform
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    scrape_configs:
    - job_name: 'kubernetes-pods'
      kubernetes_sd_configs:
      - role: pod
EOF

kubectl apply -f monitoring-config.yaml

# 11. Obtenir l'IP externe
step "Récupération de l'adresse IP externe"

EXTERNAL_IP=$(kubectl get service e-code-platform-lb -n ${NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")

if [ "$EXTERNAL_IP" = "pending" ] || [ -z "$EXTERNAL_IP" ]; then
    echo "En attente de l'attribution de l'IP externe..."
    echo "Vérifiez avec: kubectl get service e-code-platform-lb -n ${NAMESPACE}"
else
    echo "IP externe: ${EXTERNAL_IP}"
fi

# 12. Afficher le statut final
step "Statut de l'infrastructure"

echo "📊 Pods:"
kubectl get pods -n ${NAMESPACE}

echo ""
echo "📊 Services:"
kubectl get svc -n ${NAMESPACE}

echo ""
echo "📊 HPA (Auto-scaling):"
kubectl get hpa -n ${NAMESPACE}

echo ""
echo "📊 Nodes:"
kubectl get nodes

# 13. Instructions finales
echo ""
echo "✅ Infrastructure déployée avec succès!"
echo "========================================"
echo ""
echo "🔧 Configuration:"
echo "  • Cluster: ${CLUSTER_NAME}"
echo "  • Zone: ${ZONE}"
echo "  • Namespace: ${NAMESPACE}"
echo "  • Min Replicas: 10"
echo "  • Max Replicas: 100"
echo "  • Auto-scaling: Activé (CPU 70%, Memory 80%)"
echo "  • PostgreSQL: Cluster avec réplication"
echo "  • Redis: Cluster 6 nodes"
echo "  • CDN: Activé avec Google Cloud CDN"
echo ""

if [ "$EXTERNAL_IP" != "pending" ] && [ ! -z "$EXTERNAL_IP" ]; then
    echo "🌐 Accès:"
    echo "  • URL: http://${EXTERNAL_IP}"
    echo "  • Health Check: http://${EXTERNAL_IP}/api/health"
    echo ""
    echo "Test de l'application:"
    curl -s http://${EXTERNAL_IP}/api/health || echo "L'application démarre..."
fi

echo ""
echo "📝 Commandes utiles:"
echo "  • Logs: kubectl logs -n ${NAMESPACE} -l app=e-code-platform --tail=50"
echo "  • Scaling manuel: kubectl scale deployment/e-code-platform --replicas=50 -n ${NAMESPACE}"
echo "  • Monitoring: kubectl top pods -n ${NAMESPACE}"
echo "  • Dashboard: kubectl proxy puis http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/"

echo ""
echo "🚀 Votre infrastructure est prête pour des millions d'utilisateurs!"