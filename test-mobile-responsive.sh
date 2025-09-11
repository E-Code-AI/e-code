#!/bin/bash

# E-Code Mobile Responsiveness Test Script
# This script tests the mobile-first responsive design implementation

echo "🚀 E-Code Mobile Responsiveness Test"
echo "======================================"

# Check if required files exist
echo "📁 Checking required files..."

files=(
    "client/public/manifest.json"
    "client/public/sw.js"
    "client/public/offline.html"
    "client/src/components/layout/ResponsiveLayout.tsx"
    "client/src/components/layout/EnhancedMobileNavigation.tsx"
    "client/src/components/ui/touch-optimized.tsx"
    "client/src/components/MobileCodeEditor.tsx"
    "client/src/hooks/use-responsive.ts"
    "client/src/styles/mobile-optimizations.css"
    "MOBILE_RESPONSIVE_DESIGN.md"
)

missing_files=()

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file"
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -eq 0 ]; then
    echo "✅ All required files present!"
else
    echo "❌ Missing files: ${missing_files[*]}"
    exit 1
fi

echo ""
echo "🎨 Checking Tailwind configuration..."

# Check if Tailwind config has mobile-first breakpoints
if grep -q "mobile.*max.*767px" tailwind.config.ts; then
    echo "✅ Mobile breakpoints configured"
else
    echo "❌ Mobile breakpoints missing"
fi

if grep -q "touch.*hover.*none" tailwind.config.ts; then
    echo "✅ Touch device detection configured"
else
    echo "❌ Touch device detection missing"
fi

if grep -q "safe-area-inset" tailwind.config.ts; then
    echo "✅ Safe area insets configured"
else
    echo "❌ Safe area insets missing"
fi

echo ""
echo "📱 Checking PWA configuration..."

# Check manifest.json
if grep -q "standalone" client/public/manifest.json; then
    echo "✅ PWA display mode configured"
else
    echo "❌ PWA display mode missing"
fi

if grep -q "theme_color" client/public/manifest.json; then
    echo "✅ PWA theme color configured"
else
    echo "❌ PWA theme color missing"
fi

# Check service worker
if grep -q "cache" client/public/sw.js; then
    echo "✅ Service worker caching implemented"
else
    echo "❌ Service worker caching missing"
fi

echo ""
echo "🔧 Checking component imports..."

# Check if App.tsx uses ResponsiveLayout
if grep -q "ResponsiveLayout" client/src/App.tsx; then
    echo "✅ ResponsiveLayout imported in App.tsx"
else
    echo "❌ ResponsiveLayout not imported in App.tsx"
fi

# Check if mobile optimizations CSS is imported
if grep -q "mobile-optimizations.css" client/src/index.css; then
    echo "✅ Mobile optimizations CSS imported"
else
    echo "❌ Mobile optimizations CSS not imported"
fi

echo ""
echo "📊 Test Summary"
echo "==============="

# Count successful checks
total_checks=8
successful_checks=0

# Re-run checks and count successes
[ -f "client/public/manifest.json" ] && ((successful_checks++))
[ -f "client/src/components/layout/ResponsiveLayout.tsx" ] && ((successful_checks++))
[ -f "client/src/hooks/use-responsive.ts" ] && ((successful_checks++))
grep -q "mobile.*max.*767px" tailwind.config.ts && ((successful_checks++))
grep -q "standalone" client/public/manifest.json && ((successful_checks++))
grep -q "cache" client/public/sw.js && ((successful_checks++))
grep -q "ResponsiveLayout" client/src/App.tsx && ((successful_checks++))
grep -q "mobile-optimizations.css" client/src/index.css && ((successful_checks++))

percentage=$((successful_checks * 100 / total_checks))

echo "✅ Successful checks: $successful_checks/$total_checks ($percentage%)"

if [ $percentage -ge 80 ]; then
    echo "🎉 Mobile responsiveness implementation is working well!"
    echo ""
    echo "🚀 Next steps:"
    echo "1. Run 'npm run dev' to start the development server"
    echo "2. Open Chrome DevTools and enable device emulation"
    echo "3. Test the responsive layout on different screen sizes"
    echo "4. Try the PWA installation prompt"
    echo "5. Test offline functionality"
    echo ""
    echo "📱 Demo page available at: /mobile-demo"
elif [ $percentage -ge 60 ]; then
    echo "⚠️  Mobile responsiveness partially implemented"
    echo "Some components may need additional work"
else
    echo "❌ Mobile responsiveness implementation needs attention"
    echo "Please review the missing components and configurations"
fi

echo ""
echo "📚 Documentation: See MOBILE_RESPONSIVE_DESIGN.md for detailed usage"

# Optional: Open the demo page if in development
if [ "$1" = "--demo" ]; then
    echo ""
    echo "🌐 Opening mobile demo page..."
    if command -v open >/dev/null 2>&1; then
        open http://localhost:5000/mobile-demo
    elif command -v xdg-open >/dev/null 2>&1; then
        xdg-open http://localhost:5000/mobile-demo
    else
        echo "Please open http://localhost:5000/mobile-demo in your browser"
    fi
fi