#!/bin/bash

# Script de génération des icônes Desktop Electron
# Génère les icônes pour macOS (.icns), Windows (.ico), et Linux (.png)

set -e

LOGO_SVG="client/public/assets/logo.svg"
RESOURCES_DIR="desktop/resources"
TEMP_DIR="/tmp/e-code-icons"

echo "🖼️  Génération des icônes Desktop Electron..."

# Créer les dossiers
mkdir -p "$RESOURCES_DIR"
mkdir -p "$TEMP_DIR"

# Vérifier que le logo existe
if [ ! -f "$LOGO_SVG" ]; then
  echo "❌ Erreur : Logo SVG introuvable à $LOGO_SVG"
  exit 1
fi

# ============================================================
# LINUX - PNG 512x512
# ============================================================

echo "🐧 Génération de l'icône Linux (PNG 512x512)..."

if command -v inkscape &> /dev/null; then
  inkscape "$LOGO_SVG" \
    --export-type=png \
    --export-filename="$RESOURCES_DIR/icon.png" \
    --export-width=512 \
    --export-height=512 \
    --export-background="#F26207" \
    --export-background-opacity=1

elif command -v convert &> /dev/null; then
  convert -background "#F26207" \
    -density 300 \
    "$LOGO_SVG" \
    -resize "512x512" \
    "$RESOURCES_DIR/icon.png"

elif command -v rsvg-convert &> /dev/null; then
  rsvg-convert -w 512 -h 512 \
    -b "#F26207" \
    -o "$RESOURCES_DIR/icon.png" \
    "$LOGO_SVG"

else
  echo "❌ Aucun outil de conversion trouvé (inkscape, imagemagick, librsvg)"
  echo "💡 Installation : "
  echo "   macOS:   brew install imagemagick"
  echo "   Ubuntu:  sudo apt-get install imagemagick"
  echo "   Windows: choco install imagemagick"
  exit 1
fi

echo "✅ Icône Linux créée : $RESOURCES_DIR/icon.png"

# ============================================================
# WINDOWS - ICO (multi-size: 16, 32, 48, 64, 128, 256)
# ============================================================

echo "🪟 Génération de l'icône Windows (.ico)..."

if command -v convert &> /dev/null; then
  # Générer les différentes tailles
  sizes=(16 32 48 64 128 256)
  temp_pngs=()

  for size in "${sizes[@]}"; do
    temp_png="$TEMP_DIR/icon-${size}.png"

    if command -v inkscape &> /dev/null; then
      inkscape "$LOGO_SVG" \
        --export-type=png \
        --export-filename="$temp_png" \
        --export-width="$size" \
        --export-height="$size" \
        --export-background="#F26207" \
        --export-background-opacity=1
    else
      convert -background "#F26207" \
        -density 300 \
        "$LOGO_SVG" \
        -resize "${size}x${size}" \
        "$temp_png"
    fi

    temp_pngs+=("$temp_png")
  done

  # Combiner en ICO
  convert "${temp_pngs[@]}" "$RESOURCES_DIR/icon.ico"

  echo "✅ Icône Windows créée : $RESOURCES_DIR/icon.ico"
else
  echo "⚠️  ImageMagick non trouvé, impossible de créer icon.ico"
  echo "   Installation : brew install imagemagick (macOS)"
fi

# ============================================================
# MACOS - ICNS (multi-size iconset)
# ============================================================

echo "🍎 Génération de l'icône macOS (.icns)..."

if command -v iconutil &> /dev/null || command -v png2icns &> /dev/null; then
  ICONSET_DIR="$TEMP_DIR/icon.iconset"
  mkdir -p "$ICONSET_DIR"

  # Tailles nécessaires pour macOS iconset
  # Format: icon_SIZExSIZE.png et icon_SIZExSIZE@2x.png
  declare -A iconset_sizes=(
    ["icon_16x16.png"]=16
    ["icon_16x16@2x.png"]=32
    ["icon_32x32.png"]=32
    ["icon_32x32@2x.png"]=64
    ["icon_128x128.png"]=128
    ["icon_128x128@2x.png"]=256
    ["icon_256x256.png"]=256
    ["icon_256x256@2x.png"]=512
    ["icon_512x512.png"]=512
    ["icon_512x512@2x.png"]=1024
  )

  for filename in "${!iconset_sizes[@]}"; do
    size="${iconset_sizes[$filename]}"

    if command -v inkscape &> /dev/null; then
      inkscape "$LOGO_SVG" \
        --export-type=png \
        --export-filename="$ICONSET_DIR/$filename" \
        --export-width="$size" \
        --export-height="$size" \
        --export-background="#F26207" \
        --export-background-opacity=1
    elif command -v convert &> /dev/null; then
      convert -background "#F26207" \
        -density 300 \
        "$LOGO_SVG" \
        -resize "${size}x${size}" \
        "$ICONSET_DIR/$filename"
    else
      rsvg-convert -w "$size" -h "$size" \
        -b "#F26207" \
        -o "$ICONSET_DIR/$filename" \
        "$LOGO_SVG"
    fi
  done

  # Convertir iconset en icns
  if command -v iconutil &> /dev/null; then
    iconutil -c icns "$ICONSET_DIR" -o "$RESOURCES_DIR/icon.icns"
    echo "✅ Icône macOS créée : $RESOURCES_DIR/icon.icns"
  elif command -v png2icns &> /dev/null; then
    png2icns "$RESOURCES_DIR/icon.icns" "$ICONSET_DIR"/*.png
    echo "✅ Icône macOS créée : $RESOURCES_DIR/icon.icns"
  fi
else
  echo "⚠️  iconutil ou png2icns non trouvé, impossible de créer icon.icns"
  echo "   iconutil est disponible uniquement sur macOS"
  echo "   Ou installez libicns : brew install libicns"
fi

# Nettoyage
rm -rf "$TEMP_DIR"

echo ""
echo "✨ Icônes Desktop générées avec succès !"
echo ""
echo "📂 Fichiers créés dans $RESOURCES_DIR/ :"
ls -lh "$RESOURCES_DIR"
echo ""
echo "📝 Prochaine étape : Build le client et copier dans desktop/renderer/"
echo "   cd client && npm run build"
echo "   mkdir -p ../desktop/renderer"
echo "   cp -r dist/* ../desktop/renderer/"
