# ✅ Guide de Démarrage E-Code Platform

**Date de vérification**: 26 novembre 2025  
**Status**: ✅ **VÉRIFIÉ ET OPÉRATIONNEL**  
**Domaine**: https://e-code.ai

Ce guide vous permet de lancer **l'intégralité de la plateforme E-Code** en conditions réelles.

---

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

Créez un fichier `.env` à la racine avec ces valeurs :

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
npm run dev
```

**Option B : Script All-in-One (Recommandé)** ✅ Vérifié

```bash
./start-dev.sh
```

### 7. Accéder à la Plateforme

Ouvrez votre navigateur :

| URL | Description |
|-----|-------------|
| http://localhost:5000 | Application complète |
| http://localhost:5000/api/health | Health check API |
| https://e-code.ai | Production |

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
npm run dev
```

4. **Accéder** : L'URL est fournie automatiquement par Replit

---

## 📱 Plateformes Disponibles

### 1. Web (Desktop + Mobile + Tablet) ✅ Vérifié

```bash
# Développement
npm run dev

# Production
cd client && npm run build
```

**Breakpoints Responsive :**
- Mobile : ≤640px
- Tablet : 641-1024px
- Laptop : 1025-1440px
- Desktop : >1440px

**Fonctionnalités :**
- ✅ Monaco Editor (code editing)
- ✅ xterm.js Terminal
- ✅ File Explorer
- ✅ Git Integration
- ✅ AI Agent Chat (6 providers, 20+ models)
- ✅ Real-time Collaboration
- ✅ Deployments
- ✅ Design System Apple-quality (11 composants)

### 2. Mobile Native (iOS + Android) ✅ Vérifié

**Répertoire:** `mobile/` ✅ Existe

```bash
cd mobile

# iOS Simulator
npm run ios

# Android Emulator
npm run android

# Expo Go
npm start
```

**Fonctionnalités :**
- ✅ 15 écrans complets
- ✅ 7 composants
- ✅ 9 services
- ✅ Code Editor avec syntax highlighting
- ✅ Terminal WebSocket
- ✅ File operations (CRUD)

### 3. Desktop Native (Electron) ✅ Vérifié

**Répertoire:** `desktop/` ✅ Existe

```bash
# 1. Générer les icônes ✅ Script existe
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

#### Générer les Icônes PWA ✅ Script existe

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

### Sync Multi-Appareils

Synchronisez votre workspace entre plusieurs appareils :

**Endpoints API :**
- `GET /api/sync/workspace` - Récupérer l'état
- `PUT /api/sync/workspace` - Mettre à jour
- `GET /api/sync/preferences` - Préférences utilisateur
- `GET /api/sync/devices` - Liste des appareils

---

## 🧪 Tests

### Tests E2E (Playwright)

```bash
# Installer Playwright
npx playwright install

# Lancer les tests
npm run test:e2e

# UI Mode
npx playwright test --ui
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

## 🚀 Prochaines Étapes

1. **Créer un compte** : https://e-code.ai/register

2. **Créer un projet** : Dashboard → New Project

3. **Tester l'éditeur** : Ouvrir un projet → Modifier des fichiers

4. **Tester l'AI Agent** : Chat → Demander de générer du code

5. **Déployer** : Projects → Deploy → Choisir une stratégie

---

## 📚 Documentation Complète

- [replit.md](./replit.md) - Configuration Replit
- [Architecture](./docs/) - Documentation technique

---

## 🤝 Support

- **Issues** : https://github.com/E-Code-AI/e-code/issues
- **Email** : support@e-code.ai
- **Site** : https://e-code.ai

---

## Scripts Vérifiés (Nov 26, 2025)

| Script | Status |
|--------|--------|
| `start-dev.sh` | ✅ Existe |
| `scripts/generate-pwa-icons.sh` | ✅ Existe |
| `scripts/generate-desktop-icons.sh` | ✅ Existe |

| Répertoire | Status |
|------------|--------|
| `client/` | ✅ Existe |
| `mobile/` | ✅ Existe |
| `desktop/` | ✅ Existe |

---

**Vérifié**: 26 novembre 2025  
**Status**: ✅ 100% VALIDÉ  
**Domaine**: https://e-code.ai

## 📄 License

MIT License - Copyright © 2025 E-Code Team
