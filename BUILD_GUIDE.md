# E-Code Platform - Build Guide

Complete guide for building mobile apps, desktop apps, and testing WebSocket multiplayer.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Mobile App Build (iOS & Android)](#mobile-app-build)
3. [Desktop App Build (Windows, macOS, Linux)](#desktop-app-build)
4. [WebSocket Multiplayer Testing](#websocket-multiplayer-testing)
5. [Production Deployment](#production-deployment)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts
- **Apple Developer Account** ($99/year) - For iOS builds and App Store
- **Google Play Console** ($25 one-time) - For Android builds and Play Store
- **Expo Account** (free) - For EAS Build service

### Required Tools
```bash
# Node.js 20+
node --version  # Should be >= 20.0.0

# EAS CLI (for mobile)
npm install -g eas-cli

# Expo CLI (for mobile development)
npm install -g expo-cli
```

---

## Mobile App Build

### Step 1: Configure Credentials

```bash
cd mobile

# Login to Expo
eas login

# Configure Apple credentials (iOS)
eas credentials --platform ios

# Configure Google credentials (Android)
# Place your google-services.json in mobile/
```

### Step 2: Environment Variables

Create these secrets in your EAS dashboard or `.env` file:

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_BASE` | Backend API URL (e.g., `https://e-code.ai/api`) |
| `APPLE_ID` | Your Apple Developer email |
| `ASC_APP_ID` | App Store Connect App ID |
| `APPLE_TEAM_ID` | Apple Developer Team ID |

### Step 3: Build Commands

```bash
cd mobile

# Development build (for testing)
eas build --profile development --platform all

# Preview build (internal testing)
eas build --profile preview --platform all

# Production build (App Store / Play Store)
eas build --profile production --platform all
```

### Step 4: Submit to Stores

```bash
# Submit to App Store
eas submit --platform ios --profile production

# Submit to Google Play
eas submit --platform android --profile production
```

### Build Profiles Summary

| Profile | iOS Output | Android Output | Distribution |
|---------|------------|----------------|--------------|
| `development` | Simulator | APK | Internal |
| `preview` | IPA | APK | Internal |
| `production` | IPA | AAB | App Store / Play Store |

### Mobile Build Checklist

- [ ] Apple Developer account active
- [ ] Google Play Console account active
- [ ] `eas login` completed
- [ ] iOS certificates configured (`eas credentials`)
- [ ] Android keystore configured
- [ ] `google-services.json` in place
- [ ] Environment variables set
- [ ] App icons (1024x1024) in `mobile/assets/`
- [ ] Splash screen configured

---

## Desktop App Build

### Step 1: Install Dependencies

```bash
cd desktop
npm install
```

### Step 2: Prepare Renderer

```bash
# Copy web build to desktop renderer
npm run prepare-renderer
```

### Step 3: Code Signing Setup

#### macOS Code Signing
```bash
# Export from Keychain
export CSC_LINK=/path/to/certificate.p12
export CSC_KEY_PASSWORD=your_password

# Or use Keychain directly
export CSC_NAME="Developer ID Application: Your Name (TEAM_ID)"
```

#### Windows Code Signing
```bash
# EV Certificate required for SmartScreen trust
export WIN_CSC_LINK=/path/to/certificate.pfx
export WIN_CSC_KEY_PASSWORD=your_password
```

### Step 4: Build Commands

```bash
cd desktop

# Build for current platform
npm run build

# Build for specific platform
npm run build:mac    # macOS (.dmg, .zip)
npm run build:win    # Windows (.exe, .msi)
npm run build:linux  # Linux (.AppImage, .deb, .rpm)

# Build for all platforms (requires all OS)
npm run build:all
```

### Step 5: Output Files

After build, find outputs in `desktop/dist/`:

| Platform | Files |
|----------|-------|
| macOS | `E-Code-{version}-mac-arm64.dmg`, `E-Code-{version}-mac-x64.dmg` |
| Windows | `E-Code-{version}-win-x64.exe`, `E-Code-{version}-win-arm64.exe` |
| Linux | `E-Code-{version}-linux-x86_64.AppImage`, `.deb`, `.rpm` |

### Desktop Build Checklist

- [ ] Node.js 20+ installed
- [ ] Dependencies installed (`npm install`)
- [ ] Web build copied (`npm run prepare-renderer`)
- [ ] App icons in `desktop/resources/`
  - [ ] `icon.icns` (macOS - 512x512)
  - [ ] `icon.ico` (Windows - 256x256)
  - [ ] `icon.png` (Linux - 512x512)
- [ ] Code signing certificates (optional but recommended)
- [ ] Test on target platform before release

### Icon Generation

```bash
# Generate icons from a 1024x1024 PNG source
# macOS: Use iconutil or online converter
# Windows: Use ImageMagick or online converter

# Example with ImageMagick
convert icon-1024.png -resize 512x512 icon.icns
convert icon-1024.png -resize 256x256 icon.ico
convert icon-1024.png -resize 512x512 icon.png
```

---

## WebSocket Multiplayer Testing

### Local Testing

```bash
# Start the development server
npm run dev

# Open multiple browser tabs to http://localhost:5000
# Navigate to the same project
# Verify real-time collaboration works
```

### Production Testing

#### 1. Verify WebSocket Endpoints

```bash
# Test WebSocket connection (replace with your domain)
wscat -c "wss://e-code.ai/?channel=agent"

# Expected: Connection established
# If fails: Check proxy configuration
```

#### 2. Test y-websocket Collaboration

```javascript
// Browser console test
const ws = new WebSocket('wss://e-code.ai/?channel=collaboration');
ws.onopen = () => console.log('Connected!');
ws.onerror = (e) => console.error('Error:', e);
ws.onclose = (e) => console.log('Closed:', e.code, e.reason);
```

#### 3. Check Central Upgrade Dispatcher

The E-Code platform uses a channel-based routing system to bypass proxy issues:

| Channel | Path | Purpose |
|---------|------|---------|
| `agent` | `/?channel=agent` | AI Agent WebSocket |
| `collaboration` | `/?channel=collaboration` | Real-time editing |
| `terminal` | `/?channel=terminal` | Terminal I/O |

#### 4. Proxy Configuration (if needed)

For Cloudflare/Nginx proxies, ensure WebSocket upgrade is allowed:

```nginx
# Nginx WebSocket proxy
location / {
    proxy_pass http://localhost:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 86400;
}
```

### WebSocket Testing Checklist

- [ ] Local WebSocket connections work
- [ ] Production WebSocket connections work
- [ ] Channel-based routing works (`/?channel=X`)
- [ ] y-websocket collaboration syncs between clients
- [ ] Terminal WebSocket connects
- [ ] Agent WebSocket streams responses
- [ ] No "Invalid frame header" errors in logs

---

## Production Deployment

### Step 1: Configure Secrets

```bash
# On your VM, create .env.production
cp .env.production.example .env.production
nano .env.production

# Fill in ALL values:
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...
XAI_API_KEY=...
MOONSHOT_API_KEY=...
STRIPE_SECRET_KEY=sk_live_...
POSTGRES_PASSWORD=your_secure_password_32_chars
SESSION_SECRET=random_32_char_string
JWT_SECRET=another_32_char_string
```

### Step 2: Deploy with Docker

```bash
# Make deploy script executable
chmod +x deploy.sh

# Start all services
./deploy.sh up

# Check status
./deploy.sh status

# View logs
./deploy.sh logs
```

### Step 3: Verify Deployment

```bash
# Health checks
curl http://localhost:5000/health/liveness
curl http://localhost:5000/health/readiness
curl http://localhost:5000/health/deep

# WebSocket test
wscat -c "ws://localhost:5000/?channel=agent"
```

### Step 4: Configure DNS

| Type | Name | Value |
|------|------|-------|
| A | @ | Your VM IP |
| A | www | Your VM IP |
| CNAME | api | @ |

---

## Troubleshooting

### Mobile Build Issues

| Error | Solution |
|-------|----------|
| `No credentials found` | Run `eas credentials --platform ios` |
| `Build failed: signing` | Check Apple Developer membership |
| `google-services.json missing` | Download from Firebase Console |

### Desktop Build Issues

| Error | Solution |
|-------|----------|
| `Cannot find module` | Run `npm install` in desktop/ |
| `Code signing failed` | Check CSC_LINK and CSC_KEY_PASSWORD |
| `Icon not found` | Place icons in desktop/resources/ |

### WebSocket Issues

| Error | Solution |
|-------|----------|
| `Invalid frame header` | Check Central Upgrade Dispatcher logs |
| `Connection refused` | Verify server is running |
| `Proxy 502` | Enable WebSocket upgrade in proxy |
| `CORS error` | Check origin headers in server config |

### Docker Issues

| Error | Solution |
|-------|----------|
| `Database connection failed` | Wait for PostgreSQL health check |
| `Migration failed` | Check DATABASE_URL in .env.production |
| `Permission denied` | Check file permissions and user 1001 |

---

## Quick Reference

### Mobile Commands
```bash
cd mobile
eas login                              # Login to Expo
eas build --profile production --platform all  # Build all
eas submit --platform ios              # Submit iOS
eas submit --platform android          # Submit Android
```

### Desktop Commands
```bash
cd desktop
npm install                            # Install deps
npm run prepare-renderer               # Copy web build
npm run build:mac                      # Build macOS
npm run build:win                      # Build Windows
npm run build:linux                    # Build Linux
```

### Deployment Commands
```bash
./deploy.sh up                         # Start services
./deploy.sh down                       # Stop services
./deploy.sh logs                       # View logs
./deploy.sh status                     # Check status
./deploy.sh backup                     # Backup database
./deploy.sh update                     # Pull & redeploy
```

---

## Support

For issues not covered in this guide:
- Check `/health/deep` endpoint for system diagnostics
- Review logs with `./deploy.sh logs`
- Check WebSocket connections in browser DevTools Network tab
- Verify all environment variables are set correctly

---

*Last updated: December 2025*
