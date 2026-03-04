#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# E-Code Runner — Script de déploiement VPS
# Usage : bash deploy-vps.sh
# Exécuter sur le VPS après avoir copié le dossier runner/
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

RUNNER_DIR="$(cd "$(dirname "$0")" && pwd)"
SECRET_FILE="$RUNNER_DIR/.runner-secret"

echo "=== E-Code Runner — Déploiement VPS ==="

# 1) Générer le secret si absent
if [ ! -f "$SECRET_FILE" ]; then
  echo "[1/6] Génération du secret JWT..."
  SECRET=$(openssl rand -hex 32)
  echo "$SECRET" > "$SECRET_FILE"
  chmod 600 "$SECRET_FILE"
  echo "      Secret généré → $SECRET_FILE"
  echo "      Copier cette valeur dans Replit Secrets : RUNNER_JWT_SECRET"
  echo "      Valeur : $SECRET"
else
  SECRET=$(cat "$SECRET_FILE")
  echo "[1/6] Secret existant chargé."
fi

# 2) Réseau sandbox Docker
echo "[2/6] Création du réseau sandbox_net (--internal)..."
docker network create --internal sandbox_net 2>/dev/null || echo "      Réseau sandbox_net déjà existant."

# 3) Builder l'image workspace
echo "[3/6] Build de l'image workspace (vibe-workspace:latest)..."
docker build -f "$RUNNER_DIR/workspace.Dockerfile" -t vibe-workspace:latest "$RUNNER_DIR"
echo "      Image workspace construite."

# 4) Injecter le secret dans docker-compose.prod.yml
echo "[4/6] Configuration du secret dans docker-compose.prod.yml..."
COMPOSE_FILE="$RUNNER_DIR/docker-compose.prod.yml"
sed -i "s/CHANGE_ME_LONG_RANDOM/$SECRET/g" "$COMPOSE_FILE"

# 5) Lancer les services
echo "[5/6] Lancement des services (runner + caddy)..."
docker compose -f "$COMPOSE_FILE" up -d --build

# 6) Vérification
echo "[6/6] Vérification du health check..."
sleep 5
if curl -sf http://localhost:8081/health > /dev/null; then
  echo ""
  echo "✅ Runner opérationnel sur https://runner.e-code.ai"
  echo ""
  echo "Prochaine étape — Ajouter dans Replit Secrets :"
  echo "  RUNNER_BASE_URL = https://runner.e-code.ai"
  echo "  RUNNER_JWT_SECRET = $SECRET"
else
  echo "❌ Le Runner ne répond pas. Vérifier les logs :"
  echo "   docker compose -f docker-compose.prod.yml logs runner"
  exit 1
fi
