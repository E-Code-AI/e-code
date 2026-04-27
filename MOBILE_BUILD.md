# E-Code Mobile Build Guide

Complete guide for building, testing, and submitting E-Code as native iOS and Android apps using Capacitor.

## Prerequisites

### General Requirements
- **Node.js >= 22.0.0** (Capacitor CLI requirement)
- **npm** (included with Node.js)
- All project dependencies installed (`npm install`)

### Android Requirements
- **Android Studio** (latest stable, Arctic Fox or newer)
- **Android SDK** (API level 23+ / Android 6.0+)
- **Java JDK 17** (bundled with Android Studio)
- **Gradle** (bundled with Android Studio)

### iOS Requirements (macOS only)
- **macOS** (Monterey 12+ recommended)
- **Xcode 15+** with command line tools
- **CocoaPods** (`sudo gem install cocoapods`)
- **Apple Developer Account** (for device testing and App Store submission)

---

## Initial Setup

### 1. Build the Web Layer

```bash
npm run build
```

This creates the production web build in `dist/public/`, which is the directory Capacitor packages into the native apps.

### 2. Add Native Platforms

```bash
# Add Android
npx cap add android

# Add iOS (macOS only)
npx cap add ios
```

### 3. Run the Setup Script

```bash
bash scripts/mobile-setup.sh
```

This script:
- Builds the web layer
- Adds both platforms (if not already added)
- Syncs web assets
- Copies app icons for both platforms
- Copies FCM placeholder configs

### 4. Configure Firebase (Push Notifications)

Replace placeholder values in:

**Android:** `android/app/google-services.json`
- Download your real `google-services.json` from [Firebase Console](https://console.firebase.google.com/) > Project Settings > Android app

**iOS:** `ios/App/App/GoogleService-Info.plist`
- Download your real `GoogleService-Info.plist` from Firebase Console > Project Settings > iOS app

### 5. iOS: Verify Info.plist

The following keys are already configured in `ios/App/App/Info.plist`. If you regenerate the iOS project (`npx cap add ios`), ensure these keys are present:

```xml
<key>NSCameraUsageDescription</key>
<string>E-Code needs camera access to scan QR codes and capture images for your projects.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>E-Code needs photo library access to upload images to your projects.</string>

<key>NSMicrophoneUsageDescription</key>
<string>E-Code needs microphone access for voice input and audio recording features.</string>

<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>ecode</string>
        </array>
        <key>CFBundleURLName</key>
        <string>com.ecode.app</string>
    </dict>
</array>

<key>UIBackgroundModes</key>
<array>
    <string>remote-notification</string>
</array>
```

See `resources/ios/Info.plist.patch` for the full snippet.

---

## Development Workflow

### Sync After Web Changes

After making changes to the web app, rebuild and sync:

```bash
bash scripts/mobile-build.sh
```

Or manually:

```bash
npm run build
npx cap sync
```

### Live Reload (Development)

For faster iteration during development, use live reload:

```bash
npx cap run android --livereload --external
npx cap run ios --livereload --external
```

This serves the app from your dev server instead of bundled assets.

---

## Android Debug Build

### Using Android Studio

1. Open the project:
   ```bash
   npx cap open android
   ```

2. In Android Studio:
   - Wait for Gradle sync to complete
   - Select your device/emulator from the toolbar
   - Click **Run** (green play button) or press `Shift+F10`

### Using Command Line

```bash
cd android
./gradlew assembleDebug
```

The debug APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

### Install on Connected Device

```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

## iOS Debug Build (macOS Only)

### Using Xcode

1. Open the project:
   ```bash
   npx cap open ios
   ```

2. In Xcode:
   - Select your target device or simulator from the toolbar
   - Set the development team in **Signing & Capabilities**
   - Click **Run** (play button) or press `Cmd+R`

### Using Command Line

```bash
cd /Users/hb/dev/e-code
npm run mobile:build
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 15' build
```

If `xcodebuild` reports that the active developer directory is
`/Library/Developer/CommandLineTools`, full Xcode is not installed/selected yet.
Install Xcode from the Mac App Store, open it once to finish component
installation, then run:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
xcodebuild -version
```

---

## Signed Release Build (Android)

### 1. Create a Keystore

```bash
cd /Users/hb/dev/e-code
keytool -genkeypair -v \
  -keystore android/app/ecode-upload-keystore.jks \
  -storetype JKS \
  -keyalg RSA \
  -keysize 4096 \
  -validity 10000 \
  -alias ecode_upload
```

### 2. Configure Signing

`android/app/build.gradle` already reads signing config from
`android/keystore.properties` or from environment variables.

Create `android/keystore.properties` locally:

```properties
storeFile=app/ecode-upload-keystore.jks
storePassword=YOUR_STORE_PASSWORD
keyAlias=ecode_upload
keyPassword=YOUR_KEY_PASSWORD
```

Both `*.jks` and `keystore.properties` are gitignored.

### 3. Build the Release APK/AAB

```bash
cd /Users/hb/dev/e-code
npm run mobile:build
cd android

# APK (for direct distribution)
./gradlew assembleRelease

# AAB (required for Google Play Store)
./gradlew bundleRelease
```

Output locations:
- APK: `android/app/build/outputs/apk/release/app-release.apk`
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`

Verify the APK signature:

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
/opt/homebrew/share/android-commandlinetools/build-tools/36.0.0/apksigner verify --verbose --print-certs android/app/build/outputs/apk/release/app-release.apk
```

### 4. Submit to Google Play Store

1. Go to [Google Play Console](https://play.google.com/console)
2. Create a new app or select existing
3. Go to **Release** > **Production** > **Create new release**
4. Upload the `.aab` file
5. Fill in listing details, screenshots, and content rating
6. Submit for review

---

## iOS Archive for App Store (macOS Only)

The project is a Capacitor iOS app, not an Expo app. `app.json` contains only an
empty Expo stub and there is no `eas.json`; use Xcode/Capacitor for iOS archive.

### 1. Configure Signing

In Xcode:
1. Select the **App** target
2. Go to **Signing & Capabilities**
3. Select your **Team** (requires Apple Developer Program membership)
4. Ensure **Automatically manage signing** is checked

### 2. Create an Archive

Command line:

```bash
cd /Users/hb/dev/e-code
npm run mobile:build
xcodebuild -project ios/App/App.xcodeproj \
  -scheme App \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath build/ios/E-Code.xcarchive \
  archive
```

Xcode UI:
1. Select **Any iOS Device** as the build destination
2. Go to **Product** > **Archive**
3. Wait for the archive to complete

### 3. Upload to App Store Connect

1. In the Organizer window (Xcode > Window > Organizer)
2. Select the archive
3. Click **Distribute App**
4. Choose **App Store Connect**
5. Follow the prompts to upload

### 4. Submit for Review

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Select your app
3. Create a new version
4. Fill in app information, screenshots, and metadata
5. Select the uploaded build
6. Submit for review

---

## App Configuration

### App ID and Bundle Identifier

- **Android Package:** `com.ecode.app` (set in `capacitor.config.ts`)
- **iOS Bundle ID:** `com.ecode.app` (set in `capacitor.config.ts`)

### Deep Linking

The app is configured to handle the `ecode://` URL scheme. Links like `ecode://project/123` will open in the native app.

### Push Notifications

Push notifications use Firebase Cloud Messaging (FCM) and are configured via:
- `@capacitor/push-notifications` plugin
- Server-side FCM integration (already implemented)

Ensure you replace the placeholder Firebase config files with your actual project configuration.

---

## Project Structure

```
capacitor.config.ts          # Capacitor configuration
resources/
├── android/
│   ├── google-services.json # FCM placeholder (replace with real config)
│   ├── AndroidManifest.xml  # Permissions and intent filters template
│   └── mipmap-*/            # App icons for all densities
├── ios/
│   ├── AppIcon.appiconset/  # iOS app icons with Contents.json
│   ├── GoogleService-Info.plist  # FCM placeholder (replace with real config)
│   └── Info.plist.patch     # Keys to add to Info.plist
└── splash/
    └── splash-*.png         # Splash screen assets
scripts/
├── mobile-setup.sh          # Initial platform setup
└── mobile-build.sh          # Build web + sync to native
android/                     # Generated by `npx cap add android`
ios/                         # Generated by `npx cap add ios`
```

---

## Troubleshooting

### Capacitor CLI requires Node.js >= 22
Upgrade Node.js to version 22 or later. Use `nvm install 22` if using nvm.

### Android build fails with SDK errors
Ensure Android SDK 33+ is installed via Android Studio SDK Manager.

### iOS build fails with signing errors
Ensure you have a valid Apple Developer certificate and provisioning profile configured in Xcode.

### Web assets out of date
Run `npx cap sync` after any web build to copy latest assets to native projects.

### Push notifications not working
1. Verify Firebase config files are real (not placeholders)
2. Check that the app has notification permissions
3. Verify server-side FCM credentials match the Firebase project
