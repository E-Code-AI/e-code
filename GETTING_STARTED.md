# 🚀 Guide de Démarrage E-Code Platform - 100% Fonctionnel

Ce guide vous permet de lancer **l'intégralité de la plateforme E-Code** en conditions réelles.

## 📋 Prérequis

### Logiciels Requis

- **Node.js** 20.x ou supérieur ([Download](https://nodejs.org/))
- **npm** 10.x ou supérieur (inclus avec Node.js)
- **PostgreSQL** 16.x ([Download](https://www.postgresql.org/download/))
- **Git** ([Download](https://git-scm.com/downloads))

### Optionnels (pour fonctionnalités avancées)

- **Docker** 24.x - Pour les runtimes containerisés
- **ImageMagick** - Pour la génération d'icônes PWA/Desktop
- **Expo CLI** - Pour le développement mobile : `npm install -g expo-cli`

---

## 🎯 Installation Rapide (5 minutes)

### 1. Cloner le Projet

```bash
git clone https://github.com/E-Code-AI/e-code.git
cd e-code
```

### 2. Installer les Dépendances

```bash
# Root
npm install

# Client (frontend web)
cd client && npm install && cd ..

# Mobile (optionnel)
cd mobile && npm install && cd ..

# Desktop (optionnel)
cd desktop && npm install && cd ..
```

### 3. Configuration de la Base de Données

```bash
# Créer la base de données PostgreSQL
createdb ecode_dev

# Ou avec psql :
psql -U postgres -c "CREATE DATABASE ecode_dev;"
```

### 4. Configuration des Variables d'Environnement

Copiez le fichier `.env.example` et modifiez-le :

```bash
cp .env.example .env
```

Éditez `.env` avec vos valeurs :

```env
# Base de données
DATABASE_URL=postgresql://postgres:password@localhost:5432/ecode_dev

# Secrets (générez avec: openssl rand -hex 32)
SESSION_SECRET=your-session-secret-here
JWT_SECRET=your-jwt-secret-here
JWT_REFRESH_SECRET=your-jwt-refresh-secret-here

# AI API Keys (au moins une requise)
ANTHROPIC_API_KEY=sk-ant-your-key-here
OPENAI_API_KEY=sk-your-key-here
GOOGLE_AI_API_KEY=your-google-key-here

# URLs (développement local)
APP_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5000
```

### 5. Initialiser la Base de Données

```bash
npm run db:push
```

### 6. Lancer la Plateforme

**Option A : Mode Développement (Hot Reload)**

```bash
# Terminal 1 : Backend
npm run dev

# Terminal 2 : Frontend (dans un nouveau terminal)
cd client && npm run dev
```

**Option B : Script All-in-One (Recommandé)**

```bash
./start-dev.sh
```

### 7. Accéder à la Plateforme

Ouvrez votre navigateur :

- **Frontend** : http://localhost:5173
- **Backend API** : http://localhost:5000/api/health
- **Docs API** : http://localhost:5000/api-docs (si activé)

---

## 🌐 Déploiement sur Replit

### Configuration Replit

1. **Fork le projet** sur Replit

2. **Configurer les Secrets** (Tools → Secrets) :

```env
DATABASE_URL=postgresql://...
SESSION_SECRET=...
JWT_SECRET=...
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

3. **Lancer** :

```bash
npm run start
```

4. **Accéder** : `https://your-repl-slug.your-username.repl.co`

---

## 📱 Plateformes Disponibles

### 1. Web (Desktop + Mobile + Tablet)

```bash
# Développement
cd client && npm run dev

# Production
cd client && npm run build
```

**URLs :**
- Desktop : http://localhost:5173
- Mobile : http://localhost:5173 (responsive automatique)
- Tablet : http://localhost:5173 (layout adaptatif)

**Fonctionnalités :**
- ✅ Monaco Editor (code editing)
- ✅ xterm.js Terminal
- ✅ File Explorer
- ✅ Git Integration
- ✅ AI Agent Chat
- ✅ Real-time Collaboration
- ✅ Deployments
- ✅ PWA Support (offline mode)

### 2. Mobile Native (iOS + Android)

```bash
cd mobile

# iOS Simulator
npm run ios

# Android Emulator
npm run android

# Expo Go
npm start
```

**Scan le QR code** avec Expo Go (iOS/Android)

**Fonctionnalités :**
- ✅ Code Editor avec syntax highlighting
- ✅ Terminal WebSocket
- ✅ File operations (CRUD)
- ✅ Deployments
- ✅ Agent Chat
- ⚠️ Push notifications (configuration requise)

### 3. Desktop Native (Electron)

```bash
# 1. Générer les icônes
./scripts/generate-desktop-icons.sh

# 2. Build le client web
cd client && npm run build
mkdir -p ../desktop/renderer
cp -r dist/* ../desktop/renderer/
cd ..

# 3. Lancer l'app desktop
cd desktop

# Mode Dev
npm run dev

# Mode Production
npm start
```

**Build pour distribution :**

```bash
cd desktop

# Toutes plateformes
npm run build

# Plateforme spécifique
npm run build:mac     # macOS
npm run build:win     # Windows
npm run build:linux   # Linux
```

---

## 🔧 Fonctionnalités Avancées

### PWA (Progressive Web App)

#### Générer les Icônes PWA

```bash
./scripts/generate-pwa-icons.sh
```

Cela crée :
- `/client/public/icons/icon-192x192.png`
- `/client/public/icons/icon-512x512.png`
- `/client/public/apple-touch-icon.png`

#### Test PWA en Local

1. Build en production : `cd client && npm run build`
2. Servir avec HTTPS (requis) : `npx serve -s dist -l 3000`
3. Ouvrir dans Chrome : `https://localhost:3000`
4. Installer l'app via le bouton "Install"

### Édition Offline

L'édition offline avec IndexedDB est activée automatiquement :

- Les fichiers sont sauvegardés localement
- Le sync automatique se déclenche quand en ligne
- Interface de résolution de conflits

**Tester :**
1. Ouvrir l'app
2. Activer "Offline" dans Chrome DevTools (Network tab)
3. Modifier des fichiers → Sauvegardés dans IndexedDB
4. Désactiver "Offline" → Sync automatique

### Sync Multi-Appareils

Synchronisez votre workspace entre plusieurs appareils :

**Endpoints API :**
- `GET /api/sync/workspace` - Récupérer l'état
- `PUT /api/sync/workspace` - Mettre à jour
- `GET /api/sync/preferences` - Préférences utilisateur
- `GET /api/sync/devices` - Liste des appareils

**Que est synchronisé ?**
- Fichiers ouverts + position curseur
- Breakpoints debugger
- Layout de l'éditeur (panels, splits)
- État du terminal (tabs, historique, cwd)
- Préférences utilisateur (thème, fontSize, etc.)

### Push Notifications

#### Configuration Firebase

1. Créer un projet Firebase : https://console.firebase.google.com

2. Télécharger `firebase-service-account.json`

3. Ajouter dans `.env` :

```env
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

4. Dans l'app mobile, ajouter Firebase SDK :

```bash
cd mobile
npm install @react-native-firebase/app @react-native-firebase/messaging
```

5. Tester :

```bash
curl -X POST http://localhost:5000/api/notifications \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"title":"Test","body":"Hello from E-Code"}'
```

---

## 🧪 Tests

### Tests Unitaires

```bash
npm run test:unit
```

### Tests d'Intégration

```bash
npm run test:integration
```

### Tests E2E (Playwright)

```bash
# Installer Playwright
npx playwright install

# Lancer les tests
npm run test:e2e

# UI Mode
npx playwright test --ui
```

### Test Complet

```bash
npm run test:full
```

---

## 🐛 Troubleshooting

### Erreur : "Cannot find module '@types/node'"

```bash
npm install --save-dev @types/node
```

### Erreur : "Database connection failed"

Vérifiez que PostgreSQL est lancé :

```bash
# macOS
brew services start postgresql@16

# Ubuntu
sudo systemctl start postgresql

# Vérifier
psql -U postgres -c "SELECT version();"
```

### Erreur : "Port 5000 already in use"

Changez le port dans `.env` :

```env
PORT=5001
```

### Frontend ne se connecte pas au Backend

Vérifiez les CORS dans `.env` :

```env
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5000
FRONTEND_URL=http://localhost:5173
```

### Mobile App : "Network request failed"

Vérifiez l'URL API dans `mobile/.env` :

```env
# Pour iOS Simulator
EXPO_PUBLIC_API_URL=http://localhost:5000

# Pour Android Emulator
EXPO_PUBLIC_API_URL=http://10.0.2.2:5000

# Pour appareil physique (remplacez par votre IP)
EXPO_PUBLIC_API_URL=http://192.168.1.10:5000
```

---

## 📊 Vérification de l'Installation

Utilisez le script de vérification :

```bash
./scripts/verify-installation.sh
```

Cela vérifie :
- ✅ Node.js version
- ✅ PostgreSQL connection
- ✅ Dépendances installées
- ✅ Variables d'environnement
- ✅ Backend démarrable
- ✅ Frontend buildable

---

## 🚀 Prochaines Étapes

1. **Créer un compte** : http://localhost:5173/register

2. **Créer un projet** : Dashboard → New Project

3. **Tester l'éditeur** : Ouvrir un projet → Modifier des fichiers

4. **Tester l'AI Agent** : Chat → Demander de générer du code

5. **Déployer** : Projects → Deploy → Choisir une stratégie

---

## 📚 Documentation Complète

- [Architecture](./docs/ARCHITECTURE.md)
- [API Reference](./docs/API.md)
- [Contributing](./CONTRIBUTING.md)
- [Security](./SECURITY.md)

---

## 🤝 Support

- **Issues** : https://github.com/E-Code-AI/e-code/issues
- **Discussions** : https://github.com/E-Code-AI/e-code/discussions
- **Email** : support@e-code.ai

---

## 📄 License

MIT License - Copyright © 2025 E-Code Team
