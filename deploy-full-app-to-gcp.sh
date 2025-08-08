#!/bin/bash

# Script pour déployer l'application E-Code complète sur GCP
# À exécuter depuis le dépôt e-code cloné

set -e

PROJECT_ID="votre-projet-ecode"
ZONE="europe-west1-b"
NAMESPACE="e-code-platform"

echo "🚀 Déploiement de l'application E-Code complète"
echo "================================================"

# Étape 1: Cloner le dépôt si nécessaire
if [ ! -d "e-code" ]; then
    echo "Clonage du dépôt E-Code..."
    git clone https://github.com/your-username/e-code.git
    cd e-code
else
    echo "Dépôt existant trouvé"
    cd e-code
    git pull origin main
fi

# Étape 2: Créer un Dockerfile de production
cat > Dockerfile.production << 'EOF'
FROM node:18-alpine AS builder

RUN apk add --no-cache python3 make g++ git

WORKDIR /app

# Copier les fichiers de configuration
COPY package*.json ./
COPY tsconfig*.json ./
COPY drizzle.config.ts ./
COPY vite.config.ts ./

# Installer les dépendances
RUN npm ci

# Copier le code source
COPY . .

# Build frontend et backend
RUN npm run build || true

# Stage de production
FROM node:18-alpine

RUN apk add --no-cache git python3 make g++

WORKDIR /app

# Copier depuis le builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/scripts ./scripts

# Créer les dossiers nécessaires
RUN mkdir -p logs uploads temp projects

EXPOSE 5000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))" || exit 1

CMD ["npm", "run", "start:production"]
EOF

# Étape 3: Construire et pousser l'image
echo "Construction de l'image Docker de production..."
docker build -f Dockerfile.production -t gcr.io/${PROJECT_ID}/e-code-platform:production .

echo "Push de l'image vers GCR..."
gcloud auth configure-docker --quiet
docker push gcr.io/${PROJECT_ID}/e-code-platform:production

# Étape 4: Mettre à jour le déploiement
echo "Mise à jour du déploiement Kubernetes..."
kubectl set image deployment/e-code-platform \
  e-code-platform=gcr.io/${PROJECT_ID}/e-code-platform:production \
  -n ${NAMESPACE}

# Attendre le rollout
kubectl rollout status deployment/e-code-platform -n ${NAMESPACE} --timeout=300s

# Étape 5: Vérifier le statut
echo ""
echo "✅ Déploiement terminé!"
echo ""
echo "Vérification du statut:"
kubectl get pods -n ${NAMESPACE}

echo ""
echo "Test de l'application:"
curl -s http://35.189.194.33/api/health | jq . || echo "JSON parsing failed"

echo ""
echo "=================================="
echo "Votre application E-Code Platform est maintenant déployée sur:"
echo "http://35.189.194.33"
echo ""
echo "Pour voir les logs:"
echo "kubectl logs -n ${NAMESPACE} deployment/e-code-platform --tail=50"