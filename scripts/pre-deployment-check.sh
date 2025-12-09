
#!/bin/bash

# Script de diagnostic pré-déploiement
echo "🔍 Vérification pré-déploiement..."
echo "=================================="
echo ""

# Vérifier l'espace disque
echo "📊 Espace disque disponible:"
df -h | grep -E '^Filesystem|/dev/'
echo ""

# Vérifier la mémoire
echo "💾 Mémoire disponible:"
free -h
echo ""

# Vérifier Node.js et npm
echo "📦 Versions des outils:"
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo ""

# Vérifier les fichiers critiques
echo "📂 Fichiers critiques:"
if [ -f "package.json" ]; then
  echo "✅ package.json existe"
else
  echo "❌ package.json manquant!"
  exit 1
fi

if [ -f "build-prod.js" ]; then
  echo "✅ build-prod.js existe"
else
  echo "❌ build-prod.js manquant!"
  exit 1
fi

if [ -f "start.js" ]; then
  echo "✅ start.js existe"
else
  echo "❌ start.js manquant!"
  exit 1
fi
echo ""

# Vérifier les variables d'environnement critiques
echo "🔐 Variables d'environnement:"
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  DATABASE_URL non définie"
else
  echo "✅ DATABASE_URL définie"
fi

if [ -z "$SESSION_SECRET" ]; then
  echo "⚠️  SESSION_SECRET non définie"
else
  echo "✅ SESSION_SECRET définie"
fi
echo ""

# Nettoyer les anciens builds
echo "🧹 Nettoyage des anciens builds..."
if [ -d "dist" ]; then
  echo "Suppression du dossier dist existant..."
  rm -rf dist
  echo "✅ Dossier dist nettoyé"
fi

if [ -d "node_modules/.cache" ]; then
  echo "Suppression du cache node_modules..."
  rm -rf node_modules/.cache
  echo "✅ Cache nettoyé"
fi
echo ""

echo "✅ Vérification pré-déploiement terminée avec succès!"
echo ""
