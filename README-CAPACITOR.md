# E-Code - Configuration Capacitor pour iOS et Android

Ce document décrit comment configurer et déployer l'application E-Code en tant qu'application native iOS et Android en utilisant Capacitor.

## Prérequis

### Général
- Node.js 18+ et npm
- Le projet E-Code doit être buildé (`npm run build`)

### Pour iOS
- macOS avec Xcode 14+ installé
- CocoaPods (`sudo gem install cocoapods`)
- Un compte Apple Developer (pour le déploiement)

### Pour Android
- Android Studio avec SDK Android 33+
- Java JDK 17+
- Variables d'environnement ANDROID_HOME et JAVA_HOME configurées

## Installation de Capacitor

### 1. Installer les dépendances Capacitor

```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android
```

### 2. Plugins optionnels recommandés

```bash
npm install @capacitor/keyboard @capacitor/status-bar @capacitor/splash-screen
npm install @capacitor/app @capacitor/haptics @capacitor/preferences
```

## Initialisation des plateformes

### 1. Build du projet web

```bash
npm run build
```

### 2. Ajouter les plateformes

```bash
# Ajouter iOS (macOS uniquement)
npx cap add ios

# Ajouter Android
npx cap add android
```

### 3. Synchroniser le projet

```bash
npx cap sync
```

## Développement

### Ouvrir dans l'IDE natif

```bash
# Ouvrir dans Xcode (iOS)
npx cap open ios

# Ouvrir dans Android Studio (Android)
npx cap open android
```

### Synchroniser après modifications

Après chaque modification du code web :

```bash
npm run build
npx cap sync
```

Ou pour une synchronisation rapide (sans mise à jour des plugins) :

```bash
npm run build
npx cap copy
```

## Scripts recommandés pour package.json

Vous pouvez ajouter ces scripts à votre package.json :

```json
{
  "scripts": {
    "cap:build": "npm run build && npx cap sync",
    "cap:ios": "npm run build && npx cap sync ios && npx cap open ios",
    "cap:android": "npm run build && npx cap sync android && npx cap open android",
    "cap:sync": "npx cap sync",
    "cap:copy": "npx cap copy"
  }
}
```

## Configuration iOS

### 1. Configurer les permissions

Éditer `ios/App/App/Info.plist` pour ajouter les permissions nécessaires :

```xml
<key>NSCameraUsageDescription</key>
<string>Cette app utilise la caméra pour scanner du code</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Cette app accède à vos photos pour l'import de fichiers</string>
```

### 2. Configurer le Splash Screen

Remplacer les images dans `ios/App/App/Assets.xcassets/Splash.imageset/`

### 3. Configurer l'icône de l'app

Remplacer les images dans `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

## Configuration Android

### 1. Configurer les permissions

Éditer `android/app/src/main/AndroidManifest.xml` :

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

### 2. Configurer le Splash Screen

Éditer `android/app/src/main/res/drawable/splash.png`

### 3. Configurer l'icône de l'app

Utiliser Android Studio > Resource Manager > Image Asset

### 4. Configurer les couleurs

Éditer `android/app/src/main/res/values/styles.xml` :

```xml
<style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
    <item name="android:background">@drawable/splash</item>
    <item name="windowSplashScreenBackground">#0a0a0a</item>
</style>
```

## Build de production

### iOS

1. Ouvrir Xcode : `npx cap open ios`
2. Sélectionner "Any iOS Device" comme destination
3. Product > Archive
4. Distribuer via App Store Connect

### Android

1. Ouvrir Android Studio : `npx cap open android`
2. Build > Generate Signed Bundle / APK
3. Choisir Android App Bundle (AAB) pour le Play Store
4. Signer avec votre keystore

#### Générer un keystore (première fois)

```bash
keytool -genkey -v -keystore ecode-release.keystore -alias ecode -keyalg RSA -keysize 2048 -validity 10000
```

## Live Reload (développement)

Pour activer le live reload pendant le développement :

1. Modifier temporairement `capacitor.config.ts` :

```typescript
const config: CapacitorConfig = {
  // ... autres configs
  server: {
    url: 'http://VOTRE_IP_LOCALE:5000',
    cleartext: true
  }
};
```

2. Lancer le serveur de développement : `npm run dev`
3. Synchroniser : `npx cap sync`
4. Lancer l'app sur l'émulateur/device

> **Note**: Retirer cette configuration avant le build de production !

## Dépannage

### L'app ne se lance pas

```bash
npx cap doctor
```

### Erreurs de synchronisation

```bash
npx cap sync --force
```

### Problèmes de cache

```bash
# iOS
rm -rf ios/App/Pods ios/App/Podfile.lock
cd ios/App && pod install && cd ../..

# Android
cd android && ./gradlew clean && cd ..
```

## Structure des fichiers Capacitor

```
project/
├── capacitor.config.ts     # Configuration principale
├── ios/                    # Projet Xcode
│   ├── App/
│   │   ├── App/
│   │   │   ├── Info.plist
│   │   │   └── Assets.xcassets/
│   │   └── Podfile
│   └── ...
├── android/                # Projet Android Studio
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml
│   │   │   └── res/
│   │   └── build.gradle
│   └── ...
└── dist/public/           # Build web (webDir)
```

## Ressources

- [Documentation Capacitor](https://capacitorjs.com/docs)
- [Capacitor iOS](https://capacitorjs.com/docs/ios)
- [Capacitor Android](https://capacitorjs.com/docs/android)
- [Plugins officiels](https://capacitorjs.com/docs/apis)
