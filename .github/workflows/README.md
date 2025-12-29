# GitHub Actions Build Workflows

## Overview

This repository includes automated build workflows for:
- **Desktop Apps**: Windows (.exe), macOS (.dmg), Linux (.AppImage)
- **Mobile Apps**: Android (APK), iOS (IPA)

## Workflows

### 1. Desktop Builds (`build-desktop.yml`)

Builds Electron desktop applications for all platforms.

**Triggers:**
- Push to `main` branch (when `desktop/` files change)
- Pull requests to `main` (when `desktop/` files change)
- Manual dispatch (workflow_dispatch)

**Platforms:**
- Linux: AppImage + tar.gz
- Windows: NSIS installer (.exe)
- macOS: DMG + ZIP

### 2. Mobile Builds (`build-mobile.yml`)

Builds React Native/Expo mobile applications via EAS.

**Triggers:**
- Push to `main` branch (when `mobile/` files change)
- Pull requests to `main` (when `mobile/` files change)
- Manual dispatch with profile selection

**Platforms:**
- Android: APK via EAS Build
- iOS: IPA via EAS Build (requires Apple Developer account)

## Required Secrets

Configure these secrets in your GitHub repository settings:

### Desktop Builds

| Secret | Description | Required |
|--------|-------------|----------|
| `GITHUB_TOKEN` | Auto-provided by GitHub | Yes |
| `MACOS_CERTIFICATE` | Base64-encoded .p12 certificate | For signed macOS builds |
| `MACOS_CERTIFICATE_PASSWORD` | Certificate password | For signed macOS builds |
| `APPLE_ID` | Apple Developer email | For notarization |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password | For notarization |
| `APPLE_TEAM_ID` | Apple Developer Team ID | For notarization |

### Mobile Builds

| Secret | Description | Required |
|--------|-------------|----------|
| `EXPO_TOKEN` | Expo access token | Yes |
| `APPLE_ID` | Apple Developer email | For iOS builds |
| `APPLE_TEAM_ID` | Apple Developer Team ID | For iOS builds |

### Repository Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `API_BASE_URL` | Production API URL | `https://e-code.ai/api` |

## Setup Instructions

### 1. Desktop Builds (Unsigned)

Unsigned builds work immediately with no configuration:

```bash
gh workflow run build-desktop.yml -f platforms=all
```

### 2. Desktop Builds (Signed - macOS)

1. **Export your Developer ID certificate:**
   ```bash
   # Export from Keychain Access as .p12 file
   # Base64 encode it:
   base64 -i certificate.p12 -o certificate.txt
   ```

2. **Add secrets:**
   - `MACOS_CERTIFICATE`: Content of certificate.txt
   - `MACOS_CERTIFICATE_PASSWORD`: Your .p12 password

3. **Create app-specific password:**
   - Go to appleid.apple.com → Security → App-Specific Passwords
   - Generate new password for "E-Code Notarization"
   - Add as `APPLE_APP_SPECIFIC_PASSWORD`

### 3. Mobile Builds

1. **Create Expo account** at expo.dev

2. **Generate access token:**
   - Go to expo.dev → Account Settings → Access Tokens
   - Create new token with "Read and write" permissions
   - Add as `EXPO_TOKEN` secret

3. **Run builds:**
   ```bash
   # Android only
   gh workflow run build-mobile.yml -f platform=android -f profile=preview

   # iOS only (requires Apple Developer)
   gh workflow run build-mobile.yml -f platform=ios -f profile=preview

   # Both platforms
   gh workflow run build-mobile.yml -f platform=all -f profile=production
   ```

### 4. iOS Builds (Additional Setup)

1. **Apple Developer Program** ($99/year) required
2. **Configure in Expo:**
   - Add Apple credentials via `eas credentials`
   - Or configure in EAS dashboard

## Build Profiles

### Desktop
- Uses electron-builder configuration from `desktop/package.json`

### Mobile
| Profile | Use Case | Output |
|---------|----------|--------|
| `development` | Testing with dev client | Debug APK (internal) |
| `preview` | Internal testing | Unsigned APK |
| `production` | App Store release | Signed AAB/IPA |

## Artifacts

Build artifacts are available for 30 days:
- GitHub Actions → Select workflow run → Artifacts section

## Troubleshooting

### macOS Notarization Fails
- Ensure app-specific password is correct
- Check Team ID matches your Developer account
- Verify certificate is not expired

### EAS Build Fails
- Check Expo dashboard for detailed logs
- Verify EXPO_TOKEN has correct permissions
- For iOS: ensure Apple credentials are configured

### Windows Code Signing
For signed Windows builds, add:
- `WINDOWS_CERTIFICATE`: Base64 .pfx certificate
- `WINDOWS_CERTIFICATE_PASSWORD`: Certificate password

## Manual Trigger

Use GitHub CLI or web interface:

```bash
# Desktop - all platforms
gh workflow run build-desktop.yml -f platforms=all

# Desktop - specific platform
gh workflow run build-desktop.yml -f platforms=macos

# Mobile - production build
gh workflow run build-mobile.yml -f platform=all -f profile=production
```
