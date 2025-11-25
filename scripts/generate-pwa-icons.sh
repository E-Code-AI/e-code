#!/bin/bash

# Script de génération des icônes PWA à partir du logo.svg
# Nécessite : ImageMagick ou Inkscape

set -e

LOGO_SVG="client/public/assets/logo.svg"
OUTPUT_DIR="client/public/icons"

echo "🎨 Génération des icônes PWA..."

# Créer le dossier de sortie
mkdir -p "$OUTPUT_DIR"

# Fonction pour générer une icône
generate_icon() {
  local size=$1
  local output="$OUTPUT_DIR/icon-${size}x${size}.png"

  echo "   📦 Génération de l'icône ${size}x${size}..."

  # Essayer avec Inkscape (meilleure qualité pour SVG)
  if command -v inkscape &> /dev/null; then
    inkscape "$LOGO_SVG" \
      --export-type=png \
      --export-filename="$output" \
      --export-width="$size" \
      --export-height="$size" \
      --export-background="#F26207" \
      --export-background-opacity=1

  # Sinon essayer avec ImageMagick
  elif command -v convert &> /dev/null; then
    convert -background "#F26207" \
      -density 300 \
      "$LOGO_SVG" \
      -resize "${size}x${size}" \
      "$output"

  # Sinon essayer avec rsvg-convert
  elif command -v rsvg-convert &> /dev/null; then
    rsvg-convert -w "$size" -h "$size" \
      -b "#F26207" \
      -o "$output" \
      "$LOGO_SVG"

  else
    echo "   ❌ Aucun outil de conversion trouvé (inkscape, imagemagick, librsvg)"
    echo "   💡 Installation : "
    echo "      macOS:   brew install imagemagick"
    echo "      Ubuntu:  sudo apt-get install imagemagick"
    echo "      Windows: choco install imagemagick"
    exit 1
  fi

  echo "   ✅ Icône ${size}x${size} créée"
}

# Générer les icônes PWA standard
generate_icon 192
generate_icon 512

# Générer l'icône Apple Touch
echo "   📱 Génération de l'icône Apple Touch (180x180)..."
if command -v inkscape &> /dev/null; then
  inkscape "$LOGO_SVG" \
    --export-type=png \
    --export-filename="client/public/apple-touch-icon.png" \
    --export-width=180 \
    --export-height=180 \
    --export-background="#F26207" \
    --export-background-opacity=1
elif command -v convert &> /dev/null; then
  convert -background "#F26207" \
    -density 300 \
    "$LOGO_SVG" \
    -resize "180x180" \
    "client/public/apple-touch-icon.png"
elif command -v rsvg-convert &> /dev/null; then
  rsvg-convert -w 180 -h 180 \
    -b "#F26207" \
    -o "client/public/apple-touch-icon.png" \
    "$LOGO_SVG"
fi
echo "   ✅ Apple Touch Icon créée"

# Générer le favicon PNG
echo "   🔖 Génération du favicon.ico (32x32)..."
if command -v inkscape &> /dev/null; then
  inkscape "$LOGO_SVG" \
    --export-type=png \
    --export-filename="$OUTPUT_DIR/favicon-32x32.png" \
    --export-width=32 \
    --export-height=32 \
    --export-background="#F26207" \
    --export-background-opacity=1
elif command -v convert &> /dev/null; then
  convert -background "#F26207" \
    -density 300 \
    "$LOGO_SVG" \
    -resize "32x32" \
    "$OUTPUT_DIR/favicon-32x32.png"

  # Convertir en .ico
  convert "$OUTPUT_DIR/favicon-32x32.png" \
    "client/public/favicon.ico"
elif command -v rsvg-convert &> /dev/null; then
  rsvg-convert -w 32 -h 32 \
    -b "#F26207" \
    -o "$OUTPUT_DIR/favicon-32x32.png" \
    "$LOGO_SVG"
fi
echo "   ✅ Favicon créé"

echo ""
echo "✨ Icônes PWA générées avec succès !"
echo ""
echo "📂 Fichiers créés :"
echo "   - client/public/icons/icon-192x192.png"
echo "   - client/public/icons/icon-512x512.png"
echo "   - client/public/apple-touch-icon.png"
echo "   - client/public/favicon.ico"
echo ""
echo "📝 Prochaine étape : Mettre à jour client/public/manifest.json"
