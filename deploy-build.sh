
#!/bin/bash
set -e  # Arrête si une commande échoue

echo "🚀 Début du build de déploiement..."
echo "======================================"

# Étape 1 : Installation des dépendances
echo ""
echo "📦 Installation des dépendances de production..."
npm ci --omit=dev --verbose 2>&1 | tee -a build.log
echo "✅ Dépendances installées"

# Étape 2 : Build de l'application
echo ""
echo "🔨 Build de l'application..."
npm run build --verbose 2>&1 | tee -a build.log
echo "✅ Build terminé"

# Étape 3 : Vérification des fichiers critiques
echo ""
echo "🔍 Vérification des fichiers de build..."
if [ ! -f "dist/index.js" ]; then
    echo "❌ ERREUR: dist/index.js n'existe pas!"
    exit 1
fi
if [ ! -d "dist/public" ]; then
    echo "❌ ERREUR: dist/public n'existe pas!"
    exit 1
fi
echo "✅ Fichiers de build vérifiés"

echo ""
echo "======================================"
echo "✅ Build de déploiement terminé avec succès!"
echo ""
