#!/bin/bash
set -e

echo "=== E-Code Mobile Setup ==="
echo ""

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
  echo "ERROR: Capacitor CLI requires Node.js >= 22.0.0"
  echo "Current version: $(node -v)"
  echo "Please install Node.js 22+ before running this script."
  exit 1
fi

# Build the web layer
echo "1. Building web layer..."
npm run build

# Add Android platform
if [ ! -d "android" ]; then
  echo "2. Adding Android platform..."
  npx cap add android
else
  echo "2. Android platform already exists, skipping..."
fi

# Add iOS platform
if [ ! -d "ios" ]; then
  echo "3. Adding iOS platform..."
  npx cap add ios
else
  echo "3. iOS platform already exists, skipping..."
fi

# Sync web assets to native projects
echo "4. Syncing web assets..."
npx cap sync

# Copy Android resources
echo "5. Copying Android resources..."
if [ -d "android/app/src/main/res" ]; then
  for density in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
    mkdir -p "android/app/src/main/res/mipmap-${density}"
    cp "resources/android/mipmap-${density}/"*.png "android/app/src/main/res/mipmap-${density}/"
  done
  cp resources/android/google-services.json android/app/google-services.json
  echo "   Android icons and google-services.json copied"
fi

# Copy Android manifest and ensure color resources exist
if [ -f "android/app/src/main/AndroidManifest.xml" ]; then
  cp resources/android/AndroidManifest.xml android/app/src/main/AndroidManifest.xml
  echo "   AndroidManifest.xml updated"
fi
if [ ! -f "android/app/src/main/res/values/colors.xml" ]; then
  cp resources/android/colors.xml android/app/src/main/res/values/colors.xml 2>/dev/null || true
  echo "   colors.xml added"
fi

# Copy iOS resources
echo "6. Copying iOS resources..."
if [ -d "ios/App/App/Assets.xcassets/AppIcon.appiconset" ]; then
  cp resources/ios/AppIcon.appiconset/*.png ios/App/App/Assets.xcassets/AppIcon.appiconset/
  cp resources/ios/AppIcon.appiconset/Contents.json ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json
  echo "   iOS app icons copied"
fi
if [ -d "ios/App/App" ]; then
  cp resources/ios/GoogleService-Info.plist ios/App/App/GoogleService-Info.plist
  echo "   GoogleService-Info.plist copied"
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  Android: npx cap open android  (requires Android Studio)"
echo "  iOS:     npx cap open ios       (requires Xcode on macOS)"
echo ""
echo "IMPORTANT: Replace the placeholder values in:"
echo "  - android/app/google-services.json (with your Firebase config)"
echo "  - ios/App/App/GoogleService-Info.plist (with your Firebase config)"
echo "  - ios/App/App/Info.plist (add keys from resources/ios/Info.plist.patch)"
