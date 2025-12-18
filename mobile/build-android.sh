#!/bin/bash
# Script pour build Android EAS depuis un dossier isolé

set -e

echo "📦 Preparing isolated build folder..."

# Créer un dossier temporaire
BUILD_DIR="/tmp/ecode-mobile-build"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Copier uniquement les fichiers nécessaires (PAS android/ - EAS le génère)
echo "📋 Copying mobile files..."
cp -r ./src "$BUILD_DIR/" 2>/dev/null || true
cp -r ./services "$BUILD_DIR/" 2>/dev/null || true
cp ./App.tsx "$BUILD_DIR/"
cp ./app.config.js "$BUILD_DIR/"
cp ./babel.config.js "$BUILD_DIR/"
cp ./tsconfig.json "$BUILD_DIR/"
cp ./package.json "$BUILD_DIR/"
cp ./package-lock.json "$BUILD_DIR/" 2>/dev/null || true
cp ./eas.json "$BUILD_DIR/"
cp ./credentials.json "$BUILD_DIR/"
cp ./.easignore "$BUILD_DIR/" 2>/dev/null || true

# Copier le keystore séparément
mkdir -p "$BUILD_DIR/android/keystores"
cp ./android/keystores/release.keystore "$BUILD_DIR/android/keystores/" 2>/dev/null || true

# Aller dans le dossier de build
cd "$BUILD_DIR"

# Initialiser Git (requis par EAS)
echo "🔧 Initializing git repository..."
git init
git config user.email "build@e-code.ai"
git config user.name "E-Code Build"
git add -A
git commit -m "Initial build commit"

echo "📥 Installing dependencies..."
npm install --legacy-peer-deps

echo "🔨 Starting EAS Build..."
npx eas-cli build --profile preview --platform android --non-interactive

echo "✅ Build complete!"
