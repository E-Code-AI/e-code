# 📋 PLAN D'ACTION - 7 ÉTAPES POUR REPLIT

Lis d'abord ce document, puis fais CHAQUE étape dans l'ordre.

---

## ÉTAPE 1: GÉNÉRER LES SECRETS (2 min)

Ouvre ton terminal et tape:
```bash
openssl rand -hex 32
```

Copie la réponse quelque part (exemple):
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

Tape la commande **2 fois** pour avoir 2 secrets différents.

**Resultat**: 2 valeurs random

---

## ÉTAPE 2: AJOUTER LES SECRETS À REPLIT (3 min)

1. Va sur **replit.com**
2. Ouvre ton projet
3. Clique sur l'icône clé 🔑 (Secrets)
4. Clique "+ Add Secret"
5. Ajoute ceci (**l'ordre n'importe pas**):

```
Nom: DATABASE_URL
Valeur: postgresql://postgres:password@pg.replit.com:5432/ecode_prod

Nom: JWT_SECRET
Valeur: [première réponse openssl]

Nom: SESSION_SECRET
Valeur: [deuxième réponse openssl]
```

**Resultat**: 3 secrets dans Replit

---

## ÉTAPE 3: VÉRIFIER LOCALEMENT (20 min)

Ouvre ton terminal **en local** (pas Replit):

```bash
# Aller dans le dossier du projet
cd /chemin/vers/e-code

# Installer les dépendances
npm install
# (Attends 2 min)

# Vérifier que TypeScript compile
npm run typecheck
# (Doit dire "✅ pas d'erreurs")

# Construire le projet
npm run build
# (Doit créer dist/)

# Lancer en production
npm run start
# (Doit afficher "Server running on port 3000")
```

**Si une étape échoue** → Arrête et cherche "ERROR" ou "FAIL" dans la sortie.

**Resultat**: Pas d'erreur, tout marche localement

---

## ÉTAPE 4: CONFIGURER LA BASE DE DONNÉES (5 min)

Ouvre **la console Replit Shell** (onglet "Shell" en haut).

Tape les commandes suivantes **une par une**:

```bash
# 1. Créer la base de données
createdb ecode_prod

# 2. Exécuter les migrations
npm run db:push

# 3. Vérifier que les tables existent
psql ecode_prod -c "\dt"
```

Chaque commande doit réussir sans erreur.

**Resultat**: Base de données prête avec toutes les tables

---

## ÉTAPE 5: ARRÊTE LE SERVEUR LOCAL (1 min)

Si tu as toujours `npm run start` qui tourne, **tue-le**:
- Si sur Mac/Linux: `Ctrl+C`
- Si sur Windows: `Ctrl+C` ou ferme la fenêtre

Vérification:
```bash
curl http://localhost:3000/health
# Doit dire "Connection refused" (c'est bon)
```

**Resultat**: Plus rien n'écoute sur le port 3000

---

## ÉTAPE 6: LANCER SUR REPLIT (2 min)

1. Va sur **replit.com**
2. Ouvre ton projet
3. Clique sur le grand bouton **"▶ Run"** au milieu

Replit va:
- Installer les dépendances (`npm install`)
- Construire le projet (`npm run build`)
- Lancer le serveur (`npm run start`)

**Attends 2-3 minutes**.

Tu dois voir:
```
✅ npm install successful
✅ npm build successful
✅ Server running on port 3000
```

**Resultat**: Serveur tournant sur Replit!

---

## ÉTAPE 7: VÉRIFIER QUE ÇA MARCHE (3 min)

### Option A: Via le Webview Replit
Un panneau s'ouvre à droite (Webview).
- La page doit charger
- Pas de "Cannot connect"

### Option B: Via la Console
Ouvre **le Shell** et tape:
```bash
curl http://localhost:3000/health
```

Doit répondre:
```json
{"status":"ok","message":"Server is running"}
```

### Option C: Depuis Ton Navigateur
Replit t'a donné une URL comme: `https://[user]-[projet].replit.dev`

Ouvre ça dans ton navigateur (depuis un autre ordinateur si possible).

**Resultat**: Le serveur répond, c'est LIVE!

---

## 🎉 BRAVO!

Si tu es là, c'est que tout marche. Ton appli est sur **Replit** et accessible online.

---

## 🆘 SI ÇA ÉCHOUE À UNE ÉTAPE

### Erreur: "module not found"
```
→ Fais: npm install
```

### Erreur: "DATABASE_URL undefined"
```
→ Va en Replit > Secrets et vérifie DATABASE_URL est là
→ Redémarre le serveur (clique "Run" à nouveau)
```

### Erreur: "database does not exist"
```
→ Ouvre le Shell Replit et tape: createdb ecode_prod
```

### Erreur: "connection refused to localhost:5432"
```
→ Tu dois utiliser PostgreSQL Replit, pas local
→ DATABASE_URL doit être: postgresql://postgres:password@pg.replit.com:5432/...
```

### Erreur: "EADDRINUSE: address already in use :::3000"
```
→ Le port 3000 est déjà pris
→ Tue le processus: killall node
```

### Erreur: "Cannot GET /health"
```
→ Le serveur n'a pas démarré correctement
→ Regarde les logs de Replit pour les vrais erreurs
```

---

## PROCHAINES ÉTAPES (OPTIONNEL)

Une fois en prod:

1. **Ajoute tes clés API** (si tu as):
   - OpenAI, Anthropic, Groq, Google
   - Ajoute en Replit > Secrets

2. **Configure CORS** si du frontend se plaint:
   - Ouvre `server/middleware/cors-config.ts`
   - Ajoute ton URL Replit dans `corsOrigins`

3. **Ajoute un domaine custom** (optionnel):
   - Replit > Settings > Domains

4. **Configure le monitoring** (optionnel):
   - Sentry, Datadog, etc.

---

## ✅ CHECKLIST FINALE

Avant de cliquer "Run":

```
□ npm install réussit (en local)
□ npm run typecheck pas d'erreurs (en local)
□ npm run build crée dist/ (en local)
□ npm run start démarre (en local)
□ curl http://localhost:3000/health répond (en local)
□ Secrets ajoutés en Replit (DATABASE_URL, JWT_SECRET, SESSION_SECRET)
□ PostgreSQL créé (createdb ecode_prod en Shell Replit)
□ Migrations exécutées (npm run db:push en Shell Replit)
```

Tous les ✅? Clique "Run"! 🚀

---

**Questions? Voir:**
- `QUICK_START_REPLIT.md` pour plus de détails
- `REPLIT_DEPLOYMENT_CHECKLIST.md` pour l'audit complet
- `POINTS_MANQUANTS.md` pour ce qui faut faire
