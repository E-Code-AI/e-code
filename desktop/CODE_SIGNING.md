# E-Code Desktop - Code Signing Guide

This guide explains how to configure code signing for E-Code Desktop to eliminate security warnings on Windows and macOS.

## Why Code Signing?

Without code signing:
- **macOS**: Gatekeeper blocks the app, showing "unidentified developer" warnings
- **Windows**: SmartScreen warns users the app is untrusted and may block installation
- **Auto-updates**: Users cannot verify update authenticity

## Required Certificates

### macOS (Apple Developer ID)

**Cost**: $99/year (Apple Developer Program)

1. **Enroll in Apple Developer Program**: https://developer.apple.com/programs/
2. **Create a Developer ID Application certificate** in the Apple Developer portal
3. **Download and install** the certificate in your Keychain

### Windows (Code Signing Certificate)

**Cost**: $200-500/year from trusted CAs

Recommended Certificate Authorities:
- DigiCert
- Sectigo (formerly Comodo)
- GlobalSign
- SSL.com

**Note**: EV (Extended Validation) certificates provide additional SmartScreen reputation.

## Environment Variables for CI/CD

Set these in your build environment (GitHub Actions, GitLab CI, etc.):

### macOS Signing

```bash
# Required for signing
CSC_LINK=base64-encoded-p12-certificate
CSC_KEY_PASSWORD=certificate-password

# Required for notarization
APPLE_ID=your-apple-id@example.com
APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
APPLE_TEAM_ID=XXXXXXXXXX
```

**How to get Apple App-Specific Password**:
1. Go to https://appleid.apple.com/
2. Sign in → Security → App-Specific Passwords → Generate

### Windows Signing

```bash
# Option 1: Certificate file
CSC_LINK=base64-encoded-pfx-certificate
CSC_KEY_PASSWORD=certificate-password

# Option 2: Windows Certificate Store (for EV certificates with USB tokens)
WIN_CSC_LINK=path-to-certificate.pfx
WIN_CSC_KEY_PASSWORD=certificate-password

# For Azure SignTool (cloud-based EV signing)
AZURE_KEY_VAULT_URI=https://your-vault.vault.azure.net/
AZURE_KEY_VAULT_CLIENT_ID=your-client-id
AZURE_KEY_VAULT_CLIENT_SECRET=your-client-secret
AZURE_KEY_VAULT_CERTIFICATE=certificate-name
AZURE_KEY_VAULT_TENANT_ID=your-tenant-id
```

### Production URL

```bash
PRODUCTION_URL=https://e-code.ai
```

## GitHub Actions Workflow Example

Create `.github/workflows/build-desktop.yml`:

```yaml
name: Build Desktop Apps

on:
  push:
    tags:
      - 'v*'

jobs:
  build-mac:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        working-directory: desktop
        run: npm ci
        
      - name: Build macOS
        working-directory: desktop
        env:
          CSC_LINK: ${{ secrets.MAC_CSC_LINK }}
          CSC_KEY_PASSWORD: ${{ secrets.MAC_CSC_KEY_PASSWORD }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
          PRODUCTION_URL: https://e-code.ai
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npm run build:mac
        
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: mac-builds
          path: desktop/dist/*.dmg

  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        working-directory: desktop
        run: npm ci
        
      - name: Build Windows
        working-directory: desktop
        env:
          CSC_LINK: ${{ secrets.WIN_CSC_LINK }}
          CSC_KEY_PASSWORD: ${{ secrets.WIN_CSC_KEY_PASSWORD }}
          PRODUCTION_URL: https://e-code.ai
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npm run build:win
        
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: windows-builds
          path: |
            desktop/dist/*.exe
            desktop/dist/*.msi

  build-linux:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        working-directory: desktop
        run: npm ci
        
      - name: Build Linux
        working-directory: desktop
        env:
          PRODUCTION_URL: https://e-code.ai
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npm run build:linux
        
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: linux-builds
          path: |
            desktop/dist/*.AppImage
            desktop/dist/*.deb
            desktop/dist/*.rpm
```

## Local Development (Unsigned)

For local testing without certificates:

```bash
cd desktop
npm install
npm run dev  # Connects to local dev server

# Build unsigned (development only)
CSC_IDENTITY_AUTO_DISCOVERY=false npm run build
```

## Verification Checklist

After configuring signing:

- [ ] macOS: App opens without Gatekeeper warning
- [ ] macOS: `codesign -dv --verbose=4 /Applications/E-Code.app` shows valid signature
- [ ] macOS: `spctl -a -v /Applications/E-Code.app` shows "accepted"
- [ ] Windows: Installer doesn't trigger SmartScreen warning
- [ ] Windows: Right-click → Properties → Digital Signatures shows valid certificate
- [ ] Auto-update works without certificate errors

## Troubleshooting

### macOS: "App is damaged and can't be opened"
```bash
xattr -cr /Applications/E-Code.app
```

### macOS: Notarization fails
- Ensure hardened runtime is enabled (already configured)
- Check entitlements file permissions
- Verify Apple ID credentials are correct

### Windows: SmartScreen still shows warning
- EV certificates get immediate reputation
- Standard certificates need reputation building (downloads over time)
- Submit app to Microsoft for review: https://www.microsoft.com/en-us/wdsi/filesubmission

### Certificate expired
- Update CSC_LINK with new certificate
- Re-run build pipeline
- Publish new signed release

## Cost Summary

| Platform | Certificate Type | Annual Cost |
|----------|------------------|-------------|
| macOS | Apple Developer ID | $99 |
| Windows | Standard OV | $200-300 |
| Windows | Extended Validation (EV) | $400-500 |

**Recommendation**: Start with Standard OV for Windows, upgrade to EV if SmartScreen issues persist.

## Support

For code signing issues:
- Apple: https://developer.apple.com/support/
- DigiCert: https://www.digicert.com/support/
- electron-builder: https://www.electron.build/code-signing
