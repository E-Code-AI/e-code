# Code Signing Setup for E-Code Desktop

Code signing is required to distribute E-Code Desktop without security warnings on macOS and Windows.

## macOS Code Signing

### Requirements
1. Apple Developer Program membership ($99/year)
2. Developer ID Application certificate
3. App-specific password for notarization

### Setup
1. Join Apple Developer Program at https://developer.apple.com
2. Create a Developer ID Application certificate in Xcode
3. Generate app-specific password at https://appleid.apple.com

### Environment Variables
```bash
export APPLE_ID="your@email.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="XXXXXXXXXX"
```

### package.json Configuration
```json
{
  "mac": {
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "entitlements": "resources/entitlements.mac.plist",
    "entitlementsInherit": "resources/entitlements.mac.plist",
    "notarize": {
      "teamId": "VOTRE_TEAM_ID"
    }
  }
}
```

## Windows Code Signing

### Requirements
1. EV (Extended Validation) Code Signing Certificate (~$400/year)
2. Certificate from: DigiCert, Sectigo, or GlobalSign

### Setup
1. Purchase EV certificate from a trusted CA
2. Store the .pfx file securely

### Environment Variables
```bash
export WIN_CSC_LINK="path/to/certificate.pfx"
export WIN_CSC_KEY_PASSWORD="your_password"
```

### package.json Configuration
```json
{
  "win": {
    "certificateFile": "./certs/windows-cert.pfx",
    "certificatePassword": "${WIN_CSC_KEY_PASSWORD}",
    "verifyUpdateCodeSignature": true
  }
}
```

## GitHub Releases Setup

1. Create repository: `gh repo create E-Code-AI/e-code-desktop --public`
2. Set GH_TOKEN: `export GH_TOKEN="your_github_token"`
3. Build and publish: `npm run build && npm run publish`

---

## Additional Information

### Why Code Signing?

Without code signing:
- **macOS**: Gatekeeper blocks the app, showing "unidentified developer" warnings
- **Windows**: SmartScreen warns users the app is untrusted and may block installation
- **Auto-updates**: Users cannot verify update authenticity

### Local Development (Unsigned)

For local testing without certificates:

```bash
cd desktop
npm install
npm run dev  # Connects to local dev server

# Build unsigned (development only)
CSC_IDENTITY_AUTO_DISCOVERY=false npm run build
```

### CI/CD Environment Variables

Set these in your build environment (GitHub Actions, GitLab CI, etc.):

#### macOS Signing
```bash
CSC_LINK=base64-encoded-p12-certificate
CSC_KEY_PASSWORD=certificate-password
APPLE_ID=your-apple-id@example.com
APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
APPLE_TEAM_ID=XXXXXXXXXX
```

#### Windows Signing
```bash
CSC_LINK=base64-encoded-pfx-certificate
CSC_KEY_PASSWORD=certificate-password
WIN_CSC_LINK=path-to-certificate.pfx
WIN_CSC_KEY_PASSWORD=certificate-password
```

### Verification Checklist

After configuring signing:

- [ ] macOS: App opens without Gatekeeper warning
- [ ] macOS: `codesign -dv --verbose=4 /Applications/E-Code.app` shows valid signature
- [ ] macOS: `spctl -a -v /Applications/E-Code.app` shows "accepted"
- [ ] Windows: Installer doesn't trigger SmartScreen warning
- [ ] Windows: Right-click → Properties → Digital Signatures shows valid certificate
- [ ] Auto-update works without certificate errors

### Troubleshooting

#### macOS: "App is damaged and can't be opened"
```bash
xattr -cr /Applications/E-Code.app
```

#### macOS: Notarization fails
- Ensure hardened runtime is enabled (already configured)
- Check entitlements file permissions
- Verify Apple ID credentials are correct

#### Windows: SmartScreen still shows warning
- EV certificates get immediate reputation
- Standard certificates need reputation building (downloads over time)
- Submit app to Microsoft for review: https://www.microsoft.com/en-us/wdsi/filesubmission

### Cost Summary

| Platform | Certificate Type | Annual Cost |
|----------|------------------|-------------|
| macOS | Apple Developer ID | $99 |
| Windows | Standard OV | $200-300 |
| Windows | Extended Validation (EV) | $400-500 |

**Recommendation**: Start with Standard OV for Windows, upgrade to EV if SmartScreen issues persist.

### Support

For code signing issues:
- Apple: https://developer.apple.com/support/
- DigiCert: https://www.digicert.com/support/
- electron-builder: https://www.electron.build/code-signing
