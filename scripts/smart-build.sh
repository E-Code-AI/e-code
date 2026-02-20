#!/bin/bash
set -e

echo "🔍 Smart Build - Production optimization..."

if [ ! -f "dist/index.js" ] || [ ! -f "dist/public/index.html" ]; then
  echo "❌ ERROR: dist/ not found. Run build in development first."
  exit 1
fi

echo "✅ Pre-built dist found"

echo "🧹 AGGRESSIVE node_modules cleanup - whitelist approach..."

KEEP_PACKAGES=(
  "node-pty"
  "nan"
  "bcrypt"
  "node-addon-api"
  "node-gyp-build"
  "ssh2"
  "asn1"
  "bcrypt-pbkdf"
  "dockerode"
  "docker-modem"
  "tar-fs"
  "tar-stream"
  "uuid"
  "split-ca"
  "readable-stream"
  "safe-buffer"
  "string_decoder"
  "inherits"
  "bl"
  "end-of-stream"
  "once"
  "wrappy"
  "pump"
  "b4a"
  "streamx"
  "fast-fifo"
  "queue-tick"
  "text-decoder-utf8"
  "bare-events"
  "@balena"
  "@grpc"
  "protobufjs"
  "sharp"
  "@img"
  "detect-libc"
  "semver"
  "lightningcss"
  "jsdom"
  "cssstyle"
  "data-urls"
  "decimal.js"
  "html-encoding-sniffer"
  "http-proxy-agent"
  "https-proxy-agent"
  "agent-base"
  "is-potential-custom-element-name"
  "nwsapi"
  "parse5"
  "rrweb-cssom"
  "saxes"
  "symbol-tree"
  "tough-cookie"
  "w3c-xmlserializer"
  "webidl-conversions"
  "whatwg-encoding"
  "whatwg-mimetype"
  "whatwg-url"
  "ws"
  "xml-name-validator"
  "xmlchars"
  "tr46"
  "iconv-lite"
  "safer-buffer"
  "psl"
  "punycode"
  "universalify"
  "entities"
  "isomorphic-dompurify"
  "dompurify"
  "@babel"
  "convert-source-map"
  "debug"
  "ms"
  "gensync"
  "json5"
  "globals"
  "@jridgewell"
  "@ampproject"
  "lru-cache"
  "yallist"
  "browserslist"
  "caniuse-lite"
  "electron-to-chromium"
  "node-releases"
  "update-browserslist-db"
  "escalade"
  "picocolors"
  "js-tokens"
  "tweetnacl"
)

mkdir -p /tmp/node_modules_keep

echo "  Moving required packages..."
for pkg in "${KEEP_PACKAGES[@]}"; do
  if [ -d "node_modules/$pkg" ]; then
    mkdir -p "/tmp/node_modules_keep/$pkg"
    cp -a "node_modules/$pkg/." "/tmp/node_modules_keep/$pkg/"
  fi
done

for dir in node_modules/.package-lock.json node_modules/.package-lock node_modules/.modules.yaml; do
  if [ -e "$dir" ]; then
    cp -a "$dir" "/tmp/node_modules_keep/" 2>/dev/null || true
  fi
done

echo "  Replacing node_modules with minimal set..."
rm -rf node_modules
mv /tmp/node_modules_keep node_modules

echo "✅ Production node_modules cleaned"
echo "📦 Final sizes:"
du -sh dist/ 2>/dev/null || true
du -sh node_modules/ 2>/dev/null || true
echo "📏 Total deployment payload:"
du -shc dist/ node_modules/ 2>/dev/null | tail -1

echo "🔬 Verifying critical modules exist..."
MISSING=0
for pkg in node-pty bcrypt jsdom isomorphic-dompurify ws; do
  if [ ! -d "node_modules/$pkg" ]; then
    echo "  ❌ MISSING: $pkg"
    MISSING=1
  fi
done
if [ "$MISSING" = "1" ]; then
  echo "❌ Critical modules missing! Build failed."
  exit 1
fi
echo "  ✅ All critical modules present"

echo "✅ Build complete!"
