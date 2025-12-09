
#!/bin/bash
set -e

echo "🌟 Démarrage de l'application en production..."
echo "==============================================="

# Vérifier que le build existe
if [ ! -f "dist/index.js" ]; then
    echo "❌ ERREUR: Build manquant! Exécutez d'abord le build."
    exit 1
fi

# Afficher les variables d'environnement (sans les valeurs sensibles)
echo ""
echo "📋 Configuration de l'environnement:"
echo "   NODE_ENV=$NODE_ENV"
echo "   PORT=${PORT:-5000}"
echo "   DATABASE_URL=***masqué***"
echo ""

# Démarrer l'application
echo "🚀 Démarrage du serveur..."
NODE_ENV=production node dist/index.js
