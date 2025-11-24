# E-Code Desktop Application

Application desktop native pour E-Code, construite avec Electron.

## 📋 Prérequis

- Node.js 20.x ou supérieur
- npm 10.x ou supérieur
- Client web buildé (voir instructions ci-dessous)

## 🚀 Installation

```bash
cd desktop
npm install
```

## 🎨 Génération des Icônes

Les icônes doivent être générées avant le build. Utilisez le script `generate-icons.sh` :

```bash
# Depuis la racine du projet
./scripts/generate-desktop-icons.sh
```

Ce script génère automatiquement :
- `resources/icon.png` (512x512) - Pour Linux
- `resources/icon.icns` - Pour macOS
- `resources/icon.ico` - Pour Windows

### Pré-requis pour la génération d'icônes :

**macOS:**
```bash
brew install imagemagick
brew install --cask icns
```

**Ubuntu/Debian:**
```bash
sudo apt-get install imagemagick icnsutils
```

**Windows:**
```bash
choco install imagemagick
```

## 🔨 Build du Client Web

Avant de lancer l'application desktop, vous devez build le client web :

```bash
# Depuis la racine du projet
cd client
npm install
npm run build

# Copier le build dans desktop/renderer
mkdir -p ../desktop/renderer
cp -r dist/* ../desktop/renderer/
```

## 🧑‍💻 Développement

### Mode Dev (avec serveur Vite)

```bash
# Terminal 1 : Lancer le serveur de dev du client
cd client
npm run dev

# Terminal 2 : Lancer Electron en mode dev
cd desktop
npm run dev
```

L'application se connecte au serveur Vite sur `http://localhost:5173`.

### Mode Production Local

```bash
# 1. Build le client
cd client
npm run build
cp -r dist/* ../desktop/renderer/

# 2. Lancer l'app desktop
cd ../desktop
npm start
```

## 📦 Build pour Distribution

### Build pour toutes les plateformes

```bash
npm run build
```

### Build pour une plateforme spécifique

```bash
# macOS (DMG + ZIP)
npm run build:mac

# Windows (NSIS installer + Portable)
npm run build:win

# Linux (AppImage + deb + rpm)
npm run build:linux
```

### Fichiers de sortie

Les builds sont dans `desktop/dist/` :

**macOS:**
- `E-Code-1.0.0.dmg` - Installeur DMG
- `E-Code-1.0.0-mac.zip` - Archive ZIP

**Windows:**
- `E-Code Setup 1.0.0.exe` - Installeur NSIS
- `E-Code 1.0.0.exe` - Version portable

**Linux:**
- `E-Code-1.0.0.AppImage` - AppImage
- `e-code_1.0.0_amd64.deb` - Package Debian
- `e-code-1.0.0.x86_64.rpm` - Package RPM

## 🔧 Configuration

### Variables d'Environnement

Créez un fichier `.env` dans `desktop/` :

```env
# Mode de développement
NODE_ENV=development

# URL du serveur backend (production)
WEB_URL=https://your-production-url.com
```

### Entitlements macOS

Pour macOS, les entitlements sont dans `resources/entitlements.mac.plist`.

## 🎛️ Fonctionnalités

- ✅ Menus natifs de l'application
- ✅ Raccourcis clavier (Cmd/Ctrl+N, Cmd/Ctrl+O, etc.)
- ✅ Auto-updates (via electron-updater)
- ✅ Persistance de l'état des fenêtres
- ✅ Gestion sécurisée des liens externes
- ✅ Support multi-plateformes (macOS, Windows, Linux)
- ✅ Communication IPC sécurisée (contextBridge)
- ✅ Mode sombre natif (macOS)

## 📱 Communication avec le Renderer

L'application utilise `contextBridge` pour exposer des APIs sécurisées au renderer :

```typescript
// Dans le renderer (React)
declare global {
  interface Window {
    electronAPI: {
      getAppVersion: () => Promise<string>;
      getPlatform: () => Promise<string>;
      showSaveDialog: (options: any) => Promise<any>;
      showOpenDialog: (options: any) => Promise<any>;
      onMenuNewProject: (callback: () => void) => void;
      onMenuOpenProject: (callback: () => void) => void;
      onMenuSave: (callback: () => void) => void;
      // ... etc
      isElectron: true;
    };
  }
}

// Utilisation
if (window.electronAPI?.isElectron) {
  const version = await window.electronAPI.getAppVersion();
  console.log('App version:', version);
}
```

## 🔐 Sécurité

- Context isolation activée
- Node integration désactivée
- Web security activée
- Sandbox mode activé
- Webviews désactivées

## 🐛 Debugging

Pour ouvrir les DevTools en production :

1. Lancer l'app avec `--dev`:
   ```bash
   npm start -- --dev
   ```

2. Ou utiliser le menu **Developer → Toggle DevTools** (disponible uniquement en dev mode)

## 📝 Scripts Disponibles

- `npm start` - Lancer l'application
- `npm run dev` - Lancer en mode développement
- `npm run build` - Build pour toutes les plateformes
- `npm run build:mac` - Build pour macOS uniquement
- `npm run build:win` - Build pour Windows uniquement
- `npm run build:linux` - Build pour Linux uniquement
- `npm run pack` - Créer un package non-signé (test)

## 🔄 Auto-Updates

L'application vérifie automatiquement les mises à jour au démarrage (production uniquement).

Pour publier une mise à jour :

1. Incrémenter la version dans `package.json`
2. Build l'application
3. Publier les fichiers sur votre serveur de mises à jour
4. Les utilisateurs seront notifiés automatiquement

## 🚨 Troubleshooting

### L'app ne démarre pas

- Vérifiez que le client web est buildé dans `renderer/`
- Vérifiez que `node_modules` est installé
- Essayez de supprimer `node_modules` et réinstaller

### Les icônes ne s'affichent pas

- Générez les icônes avec `./scripts/generate-desktop-icons.sh`
- Vérifiez que `resources/` contient les fichiers d'icônes

### L'app ne se connecte pas au backend

- Vérifiez que le serveur backend est lancé
- Vérifiez la variable `WEB_URL` dans `main.js`
- Vérifiez les paramètres CORS du backend

## 📚 Ressources

- [Electron Documentation](https://www.electronjs.org/docs)
- [electron-builder Documentation](https://www.electron.build/)
- [E-Code Platform Documentation](../docs/README.md)

## 📄 License

MIT License - Voir le fichier LICENSE à la racine du projet
