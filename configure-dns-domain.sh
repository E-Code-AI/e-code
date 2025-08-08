#!/bin/bash

# Script de configuration DNS pour e-code.ai

PROJECT_ID="votre-projet-ecode"
ZONE="europe-west1-b"
DOMAIN="e-code.ai"

echo "🌐 Configuration DNS pour ${DOMAIN}"
echo "===================================="
echo ""

# Configuration
gcloud config set project ${PROJECT_ID}
gcloud container clusters get-credentials e-code-production --zone=${ZONE}

# Obtenir toutes les IPs
echo "➡️ Récupération des IPs externes..."
echo ""

# IP Application principale
APP_IP=$(kubectl get service e-code-production-service -n e-code -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null)
if [ -z "$APP_IP" ]; then
  APP_IP=$(kubectl get service e-code-lb -n e-code -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null)
fi
if [ -z "$APP_IP" ]; then
  APP_IP=$(kubectl get service e-code-v2-lb -n e-code -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null)
fi

# IP Monitoring
GRAFANA_IP=$(kubectl get service grafana -n monitoring -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null)
PROMETHEUS_IP=$(kubectl get service prometheus -n monitoring -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null)

echo "📌 CONFIGURATION DNS REQUISE"
echo "============================"
echo ""
echo "Connectez-vous à votre fournisseur DNS pour ${DOMAIN} et ajoutez ces enregistrements:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1️⃣  DOMAINE PRINCIPAL (e-code.ai)"
echo "   ─────────────────────────────"
if [ ! -z "$APP_IP" ]; then
  echo "   Type: A"
  echo "   Nom: @"
  echo "   Valeur: ${APP_IP}"
  echo "   TTL: 300"
  echo ""
  echo "   Type: A"
  echo "   Nom: www"
  echo "   Valeur: ${APP_IP}"
  echo "   TTL: 300"
else
  echo "   ⚠️  IP application non disponible. Déployez d'abord avec ./deploy-real-app.sh"
fi
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "2️⃣  SOUS-DOMAINES API"
echo "   ─────────────────"
if [ ! -z "$APP_IP" ]; then
  echo "   Type: A"
  echo "   Nom: api"
  echo "   Valeur: ${APP_IP}"
  echo "   TTL: 300"
  echo ""
  echo "   Type: A"
  echo "   Nom: app"
  echo "   Valeur: ${APP_IP}"
  echo "   TTL: 300"
fi
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "3️⃣  MONITORING (optionnel)"
echo "   ──────────────────────"
if [ ! -z "$GRAFANA_IP" ]; then
  echo "   Type: A"
  echo "   Nom: monitoring"
  echo "   Valeur: ${GRAFANA_IP}"
  echo "   TTL: 300"
  echo ""
  echo "   Type: A"
  echo "   Nom: grafana"
  echo "   Valeur: ${GRAFANA_IP}"
  echo "   TTL: 300"
fi
if [ ! -z "$PROMETHEUS_IP" ]; then
  echo ""
  echo "   Type: A"
  echo "   Nom: metrics"
  echo "   Valeur: ${PROMETHEUS_IP}"
  echo "   TTL: 300"
fi
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "4️⃣  ENREGISTREMENTS EMAIL (recommandé)"
echo "   ────────────────────────────────"
echo "   Type: MX"
echo "   Nom: @"
echo "   Valeur: 10 mail.${DOMAIN}"
echo "   TTL: 3600"
echo ""
echo "   Type: TXT"
echo "   Nom: @"
echo "   Valeur: \"v=spf1 include:_spf.google.com ~all\""
echo "   TTL: 3600"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "5️⃣  CERTIFICAT SSL/HTTPS"
echo "   ────────────────────"
echo "   Votre fournisseur de domaine devrait fournir HTTPS automatiquement."
echo "   Sinon, utilisez Let's Encrypt avec cert-manager:"
echo ""
echo "   kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ APRÈS CONFIGURATION DNS"
echo "=========================="
echo ""
echo "Les sites seront accessibles à:"
if [ ! -z "$APP_IP" ]; then
  echo "• https://e-code.ai (application principale)"
  echo "• https://www.e-code.ai"
  echo "• https://api.e-code.ai (API)"
  echo "• https://app.e-code.ai (application)"
fi
if [ ! -z "$GRAFANA_IP" ]; then
  echo "• https://monitoring.e-code.ai (Grafana)"
  echo "  User: admin / Pass: e-code-admin-2025"
fi
if [ ! -z "$PROMETHEUS_IP" ]; then
  echo "• https://metrics.e-code.ai (Prometheus)"
fi
echo ""
echo "⏱️  Propagation DNS: 5 minutes à 48 heures"
echo ""
echo "📝 Test de propagation DNS:"
echo "   nslookup e-code.ai"
echo "   dig e-code.ai"
echo "   curl -I https://e-code.ai"