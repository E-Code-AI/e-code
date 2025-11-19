# 🚀 DÉMARRAGE RAPIDE - REPLIT

**Temps estimé**: 45 minutes jusqu'au lancement

---

## 📋 PRÉREQUIS - À FAIRE D'ABORD

### Étape 1️⃣ : Générer les Secrets (5 min)

```bash
# Générer 2 secrets aléatoires
openssl rand -hex 32
openssl rand -hex 32

# Exemple de résultat:
# a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

### Étape 2️⃣ : Ajouter les Secrets à Replit

1. Ouvre **Replit > Secrets** (icône clé 🔑)
2. Ajoute ces secrets:

```
DATABASE_URL = postgresql://postgres:password@pg.replit.com:5432/ecode_prod
JWT_SECRET = [première valeur openssl]
SESSION_SECRET = [deuxième valeur openssl]
```

**Si tu as des clés API** (optionnel):
```
OPENAI_API_KEY = sk-...
ANTHROPIC_API_KEY = sk-ant-...
GROQ_API_KEY = gsk-...
GOOGLE_GENERATIVE_AI_KEY = ...
```

### Étape 3️⃣ : Vérifier Localement (15 min)

```bash
# 1. Installer les dépendances
npm install

# 2. Vérifier que TypeScript compile
npm run typecheck

# 3. Tester le build complet
npm run build

# 4. Tester en production local
npm run start

# Doit afficher: "Server running on port 3000"
```

Si une étape échoue → consult la section "PIÈGES" du document complet.

---

## 🔧 CONFIGURATION REPLIT

### Étape 4️⃣ : Préparer PostgreSQL

**Dans la console Replit Shell:**
```bash
# 1. Créer la base de données
createdb ecode_prod

# 2. Exécuter les migrations
npm run db:push

# 3. Vérifier que les tables existent
psql ecode_prod -c "\dt"
```

### Étape 5️⃣ : Vérifier `.replit` ✅

Le fichier `.replit` est déjà bien configuré. Juste vérifier:

```toml
modules = ["nodejs-20", "web", "postgresql-16"]  ✅
run = "npm run dev"  ✅
PORT = 5000  ✅
```

---

## 🚀 LANCER

### Étape 6️⃣ : Cliquer sur "Run"

1. Ouvre **Replit**
2. Clique sur le bouton **"Run"** (▶️)
3. Attends ~2 min que les dépendances s'installent
4. Dois voir:
   ```
   ✅ npm install successful
   ✅ npm build successful
   ✅ Server running on port 3000
   ```

### Étape 7️⃣ : Vérifier que ça Marche

```bash
# Dans l'onglet "Shell" de Replit
curl http://localhost:3000/health

# Doit retourner:
# {"status":"ok","message":"Server is running"}
```

---

## ✅ CHECKLIST MINIMAL

Avant de cliquer "Run":

```
□ Secrets ajoutés (DATABASE_URL, JWT_SECRET, SESSION_SECRET)
□ npm install réussit localement
□ npm run typecheck sans erreurs
□ npm run build sans erreurs
□ npm run start démarre sans erreurs
□ curl http://localhost:3000/health répond
□ PostgreSQL créé (createdb ecode_prod)
□ Migrations exécutées (npm run db:push)
□ .replit configuré (par défaut: OK)
```

---

## 🐛 PIÈGES COURANTS

### ❌ "ERROR: database 'ecode_prod' does not exist"
```
Solution: createdb ecode_prod
```

### ❌ "Cannot find module 'dotenv'"
```
Solution: npm install
```

### ❌ "ECONNREFUSED: Cannot connect to database"
```
Solution: Vérifier DATABASE_URL dans Replit Secrets
```

### ❌ "Unexpected token 'export' in server/index.ts"
```
Solution: npm run typecheck pour voir l'erreur complète
```

### ❌ "Port 3000 already in use"
```
Solution: Tuer le processus: killall node
```

---

## 📱 TESTER APRÈS LANCEMENT

### Dans le Webview de Replit

```javascript
// Ouvre la console (F12) et teste:

// 1. Connexion API
fetch('/api/auth/status').then(r => r.json()).then(console.log)

// 2. WebSocket
const ws = new WebSocket('ws://localhost:3000/socket.io/?transport=websocket')
ws.onopen = () => console.log('WS Connected')
```

---

## 📚 DOCUMENTATION COMPLÈTE

Pour plus de détails → voir **REPLIT_DEPLOYMENT_CHECKLIST.md**

Points couverts:
- ✅ Architecture complète
- ✅ Toutes les variables d'environnement
- ✅ Configuration détaillée de chaque composant
- ✅ Debugging avancé
- ✅ Troubleshooting complet

---

**C'est prêt? Clique sur "Run"! 🚀**
