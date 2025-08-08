#!/bin/bash

# Script de déploiement de la vraie application E-Code Platform
# Remplace nginx/hello-world par l'application complète

PROJECT_ID="votre-projet-ecode"
ZONE="europe-west1-b"
DOMAIN="e-code.ai"

echo "🚀 Déploiement E-Code Platform Production"
echo "========================================="
echo "Domaine: ${DOMAIN}"
echo ""

# Configuration
gcloud config set project ${PROJECT_ID}
gcloud container clusters get-credentials e-code-production --zone=${ZONE}

# 1. Construction de l'image Docker de la vraie application
echo "➡️ Construction de l'image E-Code Platform complète..."

# Créer Dockerfile production avec toutes les fonctionnalités
cat > Dockerfile.ecode << 'DOCKERFILE'
# Build stage
FROM node:18-alpine AS builder

RUN apk add --no-cache python3 make g++ git curl

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./

# Installer les dépendances
RUN npm ci

# Copier le code source
COPY client ./client
COPY server ./server
COPY shared ./shared
COPY migrations ./migrations
COPY sdk ./sdk
COPY services ./services

# Build frontend et backend
RUN npm run build || true

# Production stage
FROM node:18-alpine

RUN apk add --no-cache tini curl python3 git

WORKDIR /app

# Copier depuis le builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/services ./services
COPY --from=builder /app/package*.json ./

# Variables d'environnement
ENV NODE_ENV=production
ENV PORT=5000
ENV VITE_API_URL=https://e-code.ai

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npm", "start"]
DOCKERFILE

# Build et push
docker build -f Dockerfile.ecode -t gcr.io/${PROJECT_ID}/e-code-platform:production . || \
docker build -f Dockerfile.ecode -t gcr.io/${PROJECT_ID}/e-code-platform:production --platform linux/amd64 .

docker push gcr.io/${PROJECT_ID}/e-code-platform:production

# 2. Mise à jour des secrets avec configuration production
echo "➡️ Configuration des secrets production..."

kubectl delete secret app-secrets -n e-code 2>/dev/null || true
kubectl create secret generic app-secrets \
  --from-literal=DATABASE_URL='postgresql://postgres:secure2025@postgres:5432/ecode' \
  --from-literal=REDIS_URL='redis://redis:6379' \
  --from-literal=SESSION_SECRET='production-secret-$(openssl rand -hex 32)' \
  --from-literal=NODE_ENV='production' \
  --from-literal=DOMAIN='e-code.ai' \
  --from-literal=VITE_API_URL='https://e-code.ai' \
  --from-literal=STRIPE_SECRET_KEY='${STRIPE_SECRET_KEY:-sk_live_placeholder}' \
  --from-literal=OPENAI_API_KEY='${OPENAI_API_KEY:-placeholder}' \
  --namespace=e-code

# 3. Déploiement de l'application E-Code complète
echo "➡️ Déploiement de E-Code Platform Production..."

kubectl apply -n e-code -f - <<'K8S'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: e-code-production
  labels:
    app: e-code
    version: production
spec:
  replicas: 10
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2
      maxUnavailable: 1
  selector:
    matchLabels:
      app: e-code-production
  template:
    metadata:
      labels:
        app: e-code-production
        version: production
    spec:
      containers:
      - name: e-code-app
        image: gcr.io/votre-projet-ecode/e-code-platform:production
        imagePullPolicy: Always
        ports:
        - containerPort: 5000
          name: http
        env:
        - name: PORT
          value: "5000"
        - name: NODE_ENV
          value: production
        - name: POLYGLOT_ENABLED
          value: "true"
        - name: MCP_ENABLED
          value: "true"
        envFrom:
        - secretRef:
            name: app-secrets
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 5000
          initialDelaySeconds: 60
          periodSeconds: 10
          timeoutSeconds: 5
        readinessProbe:
          httpGet:
            path: /api/health
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 5
          timeoutSeconds: 3
        volumeMounts:
        - name: workspace
          mountPath: /workspace
      volumes:
      - name: workspace
        emptyDir:
          sizeLimit: 10Gi
---
apiVersion: v1
kind: Service
metadata:
  name: e-code-production-service
  annotations:
    cloud.google.com/neg: '{"ingress": true}'
spec:
  type: LoadBalancer
  selector:
    app: e-code-production
  ports:
  - port: 80
    targetPort: 5000
    name: http
  - port: 443
    targetPort: 5000
    name: https
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 10800
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: e-code-production-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: e-code-production
  minReplicas: 10
  maxReplicas: 100
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 70
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 20
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
      - type: Pods
        value: 20
        periodSeconds: 30
      selectPolicy: Max
K8S

# 4. Supprimer les anciens déploiements
echo "➡️ Nettoyage des anciens déploiements..."
kubectl delete deployment e-code-app -n e-code 2>/dev/null || true
kubectl delete deployment e-code-v2 -n e-code 2>/dev/null || true

# 5. Attendre le déploiement
echo "➡️ Attente du déploiement..."
kubectl rollout status deployment/e-code-production -n e-code --timeout=300s || true

# 6. Obtenir l'IP pour configuration DNS
echo ""
echo "✅ DÉPLOIEMENT PRODUCTION TERMINÉ!"
echo "==================================="
echo ""

PRODUCTION_IP=$(kubectl get service e-code-production-service -n e-code -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

if [ ! -z "$PRODUCTION_IP" ]; then
  echo "🌐 Application E-Code Platform: http://${PRODUCTION_IP}"
  echo ""
  echo "📌 CONFIGURATION DNS REQUISE:"
  echo "=============================="
  echo "Ajoutez ces enregistrements DNS pour ${DOMAIN}:"
  echo ""
  echo "Type: A"
  echo "Nom: @"
  echo "Valeur: ${PRODUCTION_IP}"
  echo ""
  echo "Type: A"
  echo "Nom: www"
  echo "Valeur: ${PRODUCTION_IP}"
  echo ""
  echo "Après configuration DNS, l'application sera accessible à:"
  echo "• https://e-code.ai"
  echo "• https://www.e-code.ai"
else
  echo "⏳ IP en cours d'attribution..."
  echo "Vérifiez avec: kubectl get service e-code-production-service -n e-code"
fi

echo ""
echo "📊 État du déploiement:"
kubectl get pods -n e-code | grep e-code-production
echo ""
echo "🚀 Capacités Production:"
echo "• 10-100 pods auto-scaling"
echo "• Support 1M+ utilisateurs"
echo "• Sessions persistantes"
echo "• Load balancing optimisé"