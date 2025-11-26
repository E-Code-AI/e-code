# ✅ E-CODE PLATFORM - GUIDE DE TEST COMPLET

**Date**: 25 Novembre 2025  
**Vérification**: 26 Novembre 2025  
**Version**: 1.0.0  
**Domaine**: https://e-code.ai  
**Status**: ✅ VÉRIFIÉ - Apps mobile (7,186 lignes) et desktop existent

---

## 📊 Structure Vérifiée

| App | Répertoire | Technologie | Status |
|-----|------------|-------------|--------|
| Mobile | `mobile/` | React Native + Expo | ✅ 7,186 lignes |
| Desktop | `desktop/` | Electron | ✅ Implémenté |
| Web Mobile | `client/src/components/mobile/` | React + PWA | ✅ 30 composants |

---

## 📋 TABLE DES MATIÈRES

1. [Prérequis](#prérequis)
2. [Installation Mobile](#installation-mobile)
3. [Installation Desktop](#installation-desktop)
4. [Tests Mobile - Checklist Complète](#tests-mobile)
5. [Tests Desktop - Checklist](#tests-desktop)
6. [Tests d'Intégration](#tests-intégration)
7. [Troubleshooting](#troubleshooting)

---

## 🔧 PRÉREQUIS

### Environnement de développement

```bash
# Node.js version
node --version  # >= 18.0.0

# npm version
npm --version   # >= 9.0.0

# Expo CLI
npm install -g expo-cli

# Simulateurs (optionnel)
# iOS: Xcode + iOS Simulator (macOS uniquement)
# Android: Android Studio + AVD Manager
```

### Comptes nécessaires

- ✅ Compte utilisateur E-Code (pour tester l'authentification)
- ✅ Expo account (pour Expo Go sur mobile physique)

---

## 📱 INSTALLATION MOBILE

### Étape 1: Installation des dépendances

```bash
cd /home/user/e-code/mobile
npm install
```

**Vérifications après installation:**
```bash
# Vérifier que toutes les dépendances critiques sont installées
npm list @react-native-community/netinfo     # ✅ Doit afficher ^11.3.0
npm list socket.io-client                     # ✅ Doit afficher ^4.5.0
npm list @react-navigation/native             # ✅ Doit afficher ^6.1.7
npm list expo                                 # ✅ Doit afficher ~49.0.15
```

### Étape 2: Configuration de l'environnement

**Fichier: mobile/src/services/config.ts**

```typescript
// IMPORTANT: Configurer l'URL du backend
// Pour tests locaux:
export const API_BASE_URL = 'http://localhost:5000';
export const WS_URL = 'ws://localhost:5000';

// Pour tests avec device physique, remplacer localhost par IP locale:
// export const API_BASE_URL = 'http://192.168.1.X:5000';
// export const WS_URL = 'ws://192.168.1.X:5000';
```

### Étape 3: Lancer le serveur backend

```bash
# Dans un terminal séparé
cd /home/user/e-code
npm run dev
# Vérifier que le serveur démarre sur http://localhost:5000
```

### Étape 4: Lancer l'app Mobile

```bash
cd /home/user/e-code/mobile
npm start
```

**Options de test:**

1. **Expo Go (recommandé pour test rapide)**
   - Installer "Expo Go" depuis App Store (iOS) ou Google Play (Android)
   - Scanner le QR code affiché dans le terminal
   - L'app se lance automatiquement

2. **iOS Simulator (macOS uniquement)**
   ```bash
   npm run ios
   ```

3. **Android Emulator**
   ```bash
   npm run android
   ```

4. **Web (test basique de rendu)**
   ```bash
   npm run web
   ```

---

## ✅ TESTS MOBILE - CHECKLIST COMPLÈTE

### 1️⃣ AUTHENTICATION & SESSION

#### LoginScreen.tsx
```
[  ] Écran s'affiche avec logo et formulaire
[  ] Champs username et password sont éditables
[  ] Bouton "Sign In" est cliquable
[  ] Erreur affichée si identifiants invalides
[  ] Succès: Redirection vers HomeScreen
[  ] Token sauvegardé dans AsyncStorage
[  ] Fermer l'app et réouvrir → Session persistée
```

**Test manuel:**
1. Lancer l'app
2. Entrer identifiants valides (utiliser compte test)
3. Cliquer "Sign In"
4. Vérifier redirection vers liste de projets
5. Fermer complètement l'app (swipe up)
6. Réouvrir l'app
7. ✅ Doit afficher directement HomeScreen sans login

---

### 2️⃣ NAVIGATION PRINCIPALE

#### Bottom Tabs (4 onglets)
```
[  ] Tab "Projects" (Home) - Icône 📁
[  ] Tab "Search" (Search) - Icône 🔍
[  ] Tab "Alerts" (Notifications) - Icône 🔔
[  ] Tab "Settings" (Settings) - Icône ⚙️
[  ] Tabs changent de couleur quand sélectionnés
[  ] Navigation entre tabs est fluide
```

**Test manuel:**
1. Depuis HomeScreen, cliquer sur chaque tab
2. Vérifier que l'écran correspondant s'affiche
3. Vérifier que l'icône s'illumine en bleu (#3b82f6)

---

### 3️⃣ HOME SCREEN

#### HomeScreen.tsx (Liste des projets)
```
[  ] Liste des projets s'affiche
[  ] Chaque ProjectCard montre: nom, description, date
[  ] Bouton "+" en haut à droite pour créer projet
[  ] Pull-to-refresh fonctionne
[  ] Scroll est fluide
[  ] Clic sur projet → Navigation vers ProjectScreen
[  ] Menu hamburger affiche: Profile, Deployments, Templates, Help, Logout
```

**Test manuel:**
1. Vérifier que projets existants s'affichent
2. Tirer vers le bas pour rafraîchir (pull-to-refresh)
3. Cliquer sur un projet
4. Vérifier navigation vers ProjectScreen avec nom du projet en titre
5. Retour arrière fonctionne
6. Ouvrir menu hamburger (3 lignes en haut à gauche)
7. Tester chaque lien du menu

---

### 4️⃣ PROJECT SCREEN

#### ProjectScreen.tsx (Workspace du projet)
```
[  ] Nom du projet affiché en titre
[  ] StatusBar montre connexion (Connecté/Déconnecté)
[  ] 6 boutons d'action sont visibles:
    [  ] 📁 Files → Navigation vers FileManagerScreen
    [  ] 📝 Editor → Navigation vers EditorScreen
    [  ] 💻 Terminal → Navigation vers TerminalScreen
    [  ] 🚀 Deploy → Navigation vers DeploymentsScreen
    [  ] 👥 Team → Navigation vers CollaborationScreen
    [  ] 🤖 AI Agent → Navigation vers AgentScreen
[  ] Section "Recent Activity" affiche activités
[  ] Chaque action navigue correctement
```

**Test manuel:**
1. Depuis HomeScreen, cliquer sur un projet
2. Vérifier que les 6 boutons s'affichent
3. Cliquer sur chaque bouton et vérifier la navigation
4. Utiliser le bouton "Back" pour revenir à ProjectScreen
5. Vérifier StatusBar (coin supérieur droit)

---

### 5️⃣ FILE MANAGER

#### FileManagerScreen.tsx
```
[  ] Breadcrumb path affiché en haut (ex: /home/user/project)
[  ] Arborescence de fichiers visible
[  ] Icônes différenciés par type (📁 dossier, 📄 fichier, etc.)
[  ] Clic sur dossier → Expand/collapse
[  ] Clic sur fichier → Options (Open, Rename, Delete)
[  ] Navigation dans les sous-dossiers fonctionne
[  ] Breadcrumb cliquable pour remonter
```

**Test manuel:**
1. Depuis ProjectScreen, cliquer "Files"
2. Vérifier l'arborescence
3. Cliquer sur un dossier pour l'ouvrir
4. Vérifier que les sous-fichiers s'affichent
5. Cliquer sur un fichier
6. Vérifier les options (Open, Rename, Delete)

---

### 6️⃣ CODE EDITOR

#### EditorScreen.tsx
```
[  ] WebView charge le CodeEditor
[  ] Éditeur affiche du code avec syntax highlighting
[  ] Scroll vertical fonctionne
[  ] Numéros de ligne visibles
[  ] Thème dark appliqué
```

**Test manuel:**
1. Depuis ProjectScreen, cliquer "Editor"
2. Vérifier que l'éditeur se charge
3. Tester le scroll
4. Vérifier les couleurs de syntaxe

---

### 7️⃣ TERMINAL

#### TerminalScreen.tsx
```
[  ] WebView charge le Terminal
[  ] Prompt visible ($ ou >)
[  ] Peut taper des commandes (si backend connecté)
[  ] Output s'affiche en temps réel
[  ] Scroll fonctionne
```

**Test manuel:**
1. Depuis ProjectScreen, cliquer "Terminal"
2. Vérifier que le terminal se charge
3. Si backend connecté via WebSocket, taper: ls
4. Vérifier que la commande s'exécute

---

### 8️⃣ AI AGENT

#### AgentScreen.tsx
```
[  ] Interface de chat visible
[  ] Zone de texte pour taper message
[  ] Bouton "Send" cliquable
[  ] Messages user et agent différenciés
[  ] Scroll automatique vers bas
[  ] Loading indicator quand agent répond
[  ] Bouton "Clear Chat" fonctionne
```

**Test manuel:**
1. Depuis ProjectScreen, cliquer "AI Agent"
2. Taper un message test: "Hello"
3. Cliquer "Send"
4. Vérifier que le message s'affiche
5. Si backend connecté, vérifier réponse de l'agent

---

### 9️⃣ SEARCH

#### SearchScreen.tsx
```
[  ] Barre de recherche en haut
[  ] Taper texte → Recherche démarre (300ms debounce)
[  ] Résultats affichés par catégories:
    [  ] Projects
    [  ] Files
    [  ] Users
[  ] Recent searches affichées si aucune query
[  ] Empty state si aucun résultat
[  ] Clic sur résultat → Navigation appropriée
```

**Test manuel:**
1. Cliquer sur tab "Search"
2. Taper "test" dans la barre
3. Vérifier que résultats s'affichent
4. Vérifier le délai de 300ms avant recherche
5. Cliquer sur un résultat

---

### 🔟 NOTIFICATIONS

#### NotificationsScreen.tsx
```
[  ] Liste de notifications visible
[  ] 4 types différenciés (success, info, warning, error)
[  ] Badge "Unread" sur notifications non lues
[  ] Clic sur notification → Marque comme lue
[  ] Badge count sur tab "Alerts" si non lues
[  ] Bouton "Mark all as read" fonctionne
[  ] Empty state si aucune notification
```

**Test manuel:**
1. Cliquer sur tab "Alerts"
2. Vérifier liste de notifications
3. Cliquer sur une notification non lue
4. Vérifier qu'elle passe en "read"
5. Cliquer "Mark all as read"

---

### 1️⃣1️⃣ SETTINGS

#### SettingsScreen.tsx
```
[  ] 18+ options de paramètres visibles
[  ] Section "App Settings":
    [  ] Push Notifications (switch)
    [  ] Auto-save (switch)
    [  ] Dark Mode (switch)
    [  ] Offline Mode (switch)
[  ] Section "Security":
    [  ] Biometric Auth (switch)
[  ] Section "Privacy":
    [  ] Analytics (switch)
[  ] Section "Storage":
    [  ] Barre de progression du cache
    [  ] Bouton "Clear cache" (confirmation)
[  ] Section "About":
    [  ] Version: 1.0.0
    [  ] Terms & Privacy links
[  ] Section "Danger Zone":
    [  ] Bouton "Delete Account" (rouge)
```

**Test manuel:**
1. Cliquer sur tab "Settings"
2. Tester chaque switch (ON/OFF)
3. Vérifier que "Dark Mode" change le thème
4. Cliquer "Clear cache"
5. Vérifier confirmation dialog

---

### 1️⃣2️⃣ PROFILE

#### ProfileScreen.tsx
```
[  ] Avatar utilisateur affiché
[  ] Username, email visibles
[  ] Bouton "Edit" en haut à droite
[  ] Mode édition:
    [  ] Tous les champs éditables
    [  ] Bouton "Save" remplace "Edit"
    [  ] Sauvegarde fonctionne
[  ] Stats cards:
    [  ] Projects count
    [  ] Deployments count
    [  ] Collaborations count
[  ] Bouton "Change Password"
```

**Test manuel:**
1. Depuis menu hamburger, cliquer "Profile"
2. Cliquer "Edit"
3. Modifier "Display Name"
4. Cliquer "Save"
5. Vérifier message de succès

---

### 1️⃣3️⃣ DEPLOYMENTS

#### DeploymentsScreen.tsx
```
[  ] Liste des déploiements
[  ] Chaque déploiement montre:
    [  ] Date/heure
    [  ] Status (success/failed/pending)
    [  ] Badge de couleur appropriée
    [  ] Durée du déploiement
[  ] Pull-to-refresh fonctionne
[  ] Clic sur déploiement → Détails
```

---

### 1️⃣4️⃣ COLLABORATION

#### CollaborationScreen.tsx
```
[  ] Liste des membres de l'équipe
[  ] 4 rôles affichés (Owner, Admin, Member, Viewer)
[  ] Badge de couleur par rôle
[  ] Bouton "Invite Member" visible
[  ] Pour chaque membre:
    [  ] Avatar
    [  ] Nom et email
    [  ] Badge de rôle
    [  ] Bouton "..." pour options
[  ] Menu contextuel: Change Role, Remove
```

---

### 1️⃣5️⃣ TEMPLATES

#### TemplatesScreen.tsx
```
[  ] Galerie de templates visible
[  ] 5 catégories:
    [  ] All
    [  ] Web
    [  ] Mobile
    [  ] API
    [  ] Data Science
[  ] Filtrage par catégorie fonctionne
[  ] Chaque template card montre:
    [  ] Nom
    [  ] Description
    [  ] Badge de catégorie
    [  ] Bouton "Use Template"
[  ] Clic sur "Use Template" → Confirmation
```

---

### 1️⃣6️⃣ HELP & SUPPORT

#### HelpScreen.tsx
```
[  ] Section FAQ avec 5+ questions
[  ] Questions sont expandable (accordion)
[  ] Section "Quick Links":
    [  ] Documentation
    [  ] Video Tutorials
    [  ] Community Forum
    [  ] Report Bug
[  ] Section "Contact Support"
[  ] Section "App Information":
    [  ] Version
    [  ] Build number
    [  ] License info
```

---

## 🔌 TESTS D'INTÉGRATION

### WebSocket (Temps réel)

```bash
# Terminal 1: Backend
cd /home/user/e-code
npm run dev

# Terminal 2: Mobile
cd /home/user/e-code/mobile
npm start
```

**Checklist WebSocket:**
```
[  ] StatusBar affiche "Connected" quand backend actif
[  ] StatusBar affiche "Disconnected" quand backend arrêté
[  ] Terminal reçoit output en temps réel
[  ] File changes se synchronisent
[  ] Agent messages arrivent en temps réel
```

**Test manuel:**
1. Lancer backend et mobile
2. Ouvrir ProjectScreen
3. Vérifier StatusBar = "Connected" (vert)
4. Arrêter backend (Ctrl+C)
5. Vérifier StatusBar = "Disconnected" (rouge)
6. Relancer backend
7. Vérifier reconnexion automatique

---

### Offline Mode (Sync Service)

**Test de persistance offline:**
```
[  ] Activer "Offline Mode" dans Settings
[  ] Créer un projet (sera mis en queue)
[  ] Vérifier que projet apparaît localement
[  ] Désactiver "Offline Mode"
[  ] Vérifier synchronisation automatique
[  ] Projet créé sur le serveur
```

---

## 🖥️ INSTALLATION DESKTOP

### Étape 1: Installation

```bash
cd /home/user/e-code/desktop
npm install
```

### Étape 2: Lancer en mode dev

```bash
npm run dev
```

**Vérifications:**
```
[  ] Fenêtre Electron s'ouvre
[  ] Webapp E-Code charge dans la fenêtre
[  ] Login fonctionne
[  ] Navigation fonctionne
[  ] DevTools accessibles (Ctrl+Shift+I)
```

### Étape 3: Build de production (optionnel)

```bash
npm run build:linux    # Linux
npm run build:mac      # macOS
npm run build:win      # Windows
```

---

## 🐛 TROUBLESHOOTING

### Problème: "Unable to resolve module"

**Solution:**
```bash
cd mobile
rm -rf node_modules package-lock.json
npm install
npm start -- --reset-cache
```

---

### Problème: "Network request failed" lors du login

**Causes possibles:**

1. **Backend pas lancé**
   ```bash
   cd /home/user/e-code
   npm run dev
   # Vérifier: http://localhost:5000/health
   ```

2. **Mauvaise URL dans config.ts**
   - Si test sur device physique, utiliser IP locale (pas localhost)
   ```typescript
   // mobile/src/services/config.ts
   export const API_BASE_URL = 'http://192.168.1.X:5000';
   ```

3. **Firewall bloque le port 5000**
   ```bash
   # Linux
   sudo ufw allow 5000
   ```

---

### Problème: "Expo Go ne se connecte pas"

**Solutions:**

1. **Vérifier que mobile et PC sont sur le même réseau WiFi**
2. **Désactiver VPN**
3. **Utiliser tunnel Expo:**
   ```bash
   npm start -- --tunnel
   ```

---

### Problème: WebSocket ne se connecte pas

**Vérifications:**

1. **Backend WebSocket actif:**
   ```bash
   # Dans logs backend, chercher:
   # "WebSocket server listening"
   ```

2. **URL WebSocket correcte:**
   ```typescript
   // mobile/src/services/config.ts
   export const WS_URL = 'ws://192.168.1.X:5000'; // Pas wss:// en local
   ```

3. **Tester WebSocket avec curl:**
   ```bash
   curl -i -N -H "Connection: Upgrade" \
        -H "Upgrade: websocket" \
        http://localhost:5000
   ```

---

### Problème: "Unable to find @react-native-community/netinfo"

**Solution:**
```bash
cd mobile
npm install @react-native-community/netinfo
```

---

## 📊 RAPPORT DE TEST

### Template de rapport

Créer un fichier `TEST_RESULTS.md` avec ce format:

```markdown
# TEST RESULTS - E-CODE MOBILE

**Date**: [DATE]
**Testeur**: [NOM]
**Device**: [iPhone 14 / Pixel 7 / Simulator]
**OS**: [iOS 17 / Android 13]
**Expo Go Version**: [X.Y.Z]

## Authentication
- [ ] Login: [PASS/FAIL] - [Notes]
- [ ] Session persistence: [PASS/FAIL]
- [ ] Logout: [PASS/FAIL]

## Navigation
- [ ] Bottom Tabs: [PASS/FAIL]
- [ ] Stack Navigation: [PASS/FAIL]
- [ ] Back button: [PASS/FAIL]

## Screens (15 total)
- [ ] HomeScreen: [PASS/FAIL]
- [ ] ProjectScreen: [PASS/FAIL]
- [ ] AgentScreen: [PASS/FAIL]
- [ ] FileManagerScreen: [PASS/FAIL]
- [ ] EditorScreen: [PASS/FAIL]
- [ ] TerminalScreen: [PASS/FAIL]
- [ ] SearchScreen: [PASS/FAIL]
- [ ] NotificationsScreen: [PASS/FAIL]
- [ ] SettingsScreen: [PASS/FAIL]
- [ ] ProfileScreen: [PASS/FAIL]
- [ ] DeploymentsScreen: [PASS/FAIL]
- [ ] CollaborationScreen: [PASS/FAIL]
- [ ] TemplatesScreen: [PASS/FAIL]
- [ ] HelpScreen: [PASS/FAIL]

## WebSocket
- [ ] Connection: [PASS/FAIL]
- [ ] Reconnection: [PASS/FAIL]
- [ ] Real-time updates: [PASS/FAIL]

## Offline Mode
- [ ] Operation queuing: [PASS/FAIL]
- [ ] Auto-sync: [PASS/FAIL]

## Performance
- [ ] App startup: [< 3s / > 3s]
- [ ] Navigation latency: [< 300ms / > 300ms]
- [ ] Memory usage: [Stable / Leaks detected]

## Bugs trouvés
1. [Description du bug]
2. [Description du bug]

## Notes additionnelles
[Commentaires]
```

---

## ✅ VALIDATION FINALE

### Critères de succès (100% opérationnel)

**Mobile:**
```
[  ] Toutes les 15 screens sont accessibles
[  ] Navigation fonctionne sans crash
[  ] Authentication fonctionne (login + session)
[  ] WebSocket se connecte au backend
[  ] Offline mode fonctionne
[  ] Aucune erreur dans console
[  ] Performance acceptable (< 3s startup)
```

**Desktop:**
```
[  ] App Electron démarre
[  ] Webapp charge correctement
[  ] Features web fonctionnent
[  ] Build de production réussit
```

**Backend:**
```
[  ] Démarre sans erreur
[  ] API répond sur /health
[  ] WebSocket accepte connexions
[  ] Database connectée
```

---

## 🚀 COMMANDES RAPIDES

```bash
# Lancer TOUT en une fois (3 terminaux)

# Terminal 1: Backend
cd /home/user/e-code && npm run dev

# Terminal 2: Mobile
cd /home/user/e-code/mobile && npm start

# Terminal 3: Desktop
cd /home/user/e-code/desktop && npm run dev
```

---

## 📞 SUPPORT

**Si problèmes persistent:**

1. Vérifier logs dans terminal
2. Vérifier React Native Debugger
3. Checker Expo console pour warnings
4. Consulter documentation:
   - React Navigation: https://reactnavigation.org/
   - Expo: https://docs.expo.dev/
   - Socket.io: https://socket.io/docs/v4/

---

**🎯 OBJECTIF: Valider que TOUTES les fonctionnalités marchent en conditions réelles**

**Bon tests! 🚀**
