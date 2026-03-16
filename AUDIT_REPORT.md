# AUDIT COMPLET - Plateforme E-Code.ai
## Rapport d'audit de production par un Senior Engineer (40 ans d'exp.)

**Date**: 16 Mars 2026
**Plateforme**: E-Code.ai (Clone Replit)
**Stack**: Node.js/Express + React/Vite + PostgreSQL + WebSocket + Capacitor
**Fichiers analysés**: ~9 100 fichiers sources (573 backend, 896 frontend)
**Domaines**: https://e-code.ai / https://replit-clone-henri45.replit.app

---

# TABLE DES MATIÈRES

1. [PROBLÈMES CRITIQUES (Bloquants Production)](#1-problèmes-critiques-bloquants-production)
2. [BACKEND - Serveur & API](#2-backend---serveur--api)
3. [BASE DE DONNÉES & Migrations](#3-base-de-données--migrations)
4. [AUTHENTIFICATION & SÉCURITÉ](#4-authentification--sécurité)
5. [EXÉCUTION DE CODE & SANDBOX](#5-exécution-de-code--sandbox)
6. [TERMINAL & SHELL](#6-terminal--shell)
7. [DÉPLOIEMENT DES PROJETS UTILISATEURS](#7-déploiement-des-projets-utilisateurs)
8. [COLLABORATION TEMPS RÉEL](#8-collaboration-temps-réel)
9. [FRONTEND - UI/UX WEB](#9-frontend---uiux-web)
10. [RESPONSIVE & MOBILE](#10-responsive--mobile)
11. [APPLICATIONS NATIVES (iOS/Android)](#11-applications-natives-iosandroid)
12. [APPLICATION DESKTOP](#12-application-desktop)
13. [PAIEMENTS & BILLING (Stripe)](#13-paiements--billing-stripe)
14. [AI/LLM INTÉGRATION](#14-aillm-intégration)
15. [TESTS & QUALITÉ](#15-tests--qualité)
16. [INFRASTRUCTURE & DEVOPS](#16-infrastructure--devops)
17. [PERFORMANCE & OPTIMISATION](#17-performance--optimisation)
18. [FEATURES MANQUANTES vs REPLIT](#18-features-manquantes-vs-replit)

---

# 1. PROBLÈMES CRITIQUES (Bloquants Production)

## C-01. Deployment Manager utilise un stockage In-Memory
**Fichier**: `server/services/deployment-manager.ts:71`
**Problème**: `private deployments = new Map<string, DeploymentStatus>()` — Tous les états de déploiement sont stockés en mémoire. Au moindre redémarrage du serveur, TOUS les déploiements sont perdus. En production avec des utilisateurs, c'est catastrophique.
**Solution**: Persister les états de déploiement dans PostgreSQL. Utiliser la table `deployments` existante dans le schéma. Charger depuis la DB au démarrage, sauvegarder chaque changement d'état.

## C-02. Deployment Manager simule les opérations
**Fichier**: `server/services/deployment-manager.ts:214-215, 364, 525-536`
**Problème**: Le déploiement utilise `setTimeout` avec des délais artificiels pour "simuler" des opérations (SSL, build, deploy). La ligne 765 dit explicitement "simplified simulation" pour la validation de domaine. Ce n'est PAS un vrai système de déploiement — c'est un prototype.
**Solution**: Intégrer un vrai pipeline de déploiement:
- Pour le build: utiliser Docker multi-stage builds réels
- Pour le SSL: intégrer Let's Encrypt/ACME via `greenlock` ou `certbot`
- Pour le domaine: valider via DNS TXT records avec vérification réelle
- Pour le déploiement: utiliser Docker API via `dockerode` pour orchestrer les containers réels

## C-03. Shell non sandboxé — FAILLE CRITIQUE DE SÉCURITÉ
**Fichier**: `server/routes/shell.ts:170-183`
**Problème**: Le shell spawn un `bash --login` DIRECTEMENT sur le serveur hôte avec `process.env` hérité. Un utilisateur malveillant peut:
- Accéder au filesystem du serveur (parcourir `/etc/passwd`, lire des secrets)
- Lire les variables d'environnement (DATABASE_URL, API keys, JWT_SECRET)
- Exécuter des commandes arbitraires (`rm -rf /`, `curl` pour exfiltrer des données)
- Installer des packages malveillants
- Accéder au réseau interne
**Solution**:
- Exécuter chaque shell dans un container Docker isolé avec des limits CPU/RAM/réseau
- Monter uniquement le répertoire du projet en read-write, tout le reste en read-only
- Utiliser des namespaces Linux (user, PID, network) pour l'isolation
- Limiter les syscalls avec `seccomp`
- Bloquer l'accès réseau sauf les domaines autorisés
- NE JAMAIS passer `process.env` au shell utilisateur

## C-04. Sandbox JavaScript trop permissive
**Fichier**: `server/execution/sandbox.ts:83-100`
**Problème**: La sandbox JavaScript expose `require()` avec une whitelist, mais utilise `vm.runInContext()` de Node.js qui est notoirement insuffisant pour l'isolation de sécurité. La sandbox expose aussi `setTimeout`, `setInterval`, `Buffer`, et tous les constructeurs JavaScript standards, ce qui permet des échappements.
**Solution**:
- Utiliser `isolated-vm` au lieu de `vm` natif pour une vraie isolation V8
- Ou exécuter dans un container Docker dédié avec limits
- Supprimer l'accès à `require()` entièrement
- Ajouter des limites de mémoire (--max-old-space-size) et de temps d'exécution strictes
- Implémenter un worker thread avec `worker_threads` et des resourceLimits

## C-05. Seulement 8 fichiers de tests pour ~1500 fichiers source
**Fichier**: `test/`, `tests/`, `client/src/__tests__/`
**Problème**: Le projet a 8 fichiers de tests pour 1469 fichiers source (0.5% de couverture). Aucun test d'intégration sérieux, aucun test E2E fonctionnel, aucun test des routes API, aucun test du billing Stripe, aucun test de la collaboration temps réel.
**Solution**:
- Ajouter des tests unitaires pour chaque route API (minimum 80% couverture)
- Ajouter des tests d'intégration pour auth, billing, file operations
- Ajouter des tests E2E avec Playwright pour les parcours critiques (inscription, création projet, édition, déploiement)
- Configurer le CI pour bloquer les merges sous 70% de couverture
- Priorité: tester auth, payments, file operations, code execution

## C-06. vm2 dans devDependencies — VULNÉRABILITÉ CONNUE
**Fichier**: `package.json:326`
**Problème**: `"vm2": "^3.10.2"` est listé dans les dépendances. vm2 a été **abandonné** par son mainteneur en 2023 avec des CVE critiques (CVE-2023-37466, CVE-2023-37903) permettant des sandbox escapes. Même si c'est en devDependencies, c'est un risque.
**Solution**: Supprimer vm2 des dépendances. Utiliser `isolated-vm` comme alternative sécurisée, ou Docker pour l'exécution de code.

---

# 2. BACKEND - Serveur & API

## B-01. Fichier server/index.ts monolithique (~1000 lignes)
**Fichier**: `server/index.ts`
**Problème**: Le point d'entrée du serveur contient ~1000 lignes avec la configuration Express, WebSocket, middleware, rate limiting, Swagger, CORS, et toute l'initialisation. Difficile à maintenir et tester.
**Solution**: Extraire dans des modules séparés:
- `server/app.ts` — configuration Express et middleware
- `server/websocket.ts` — configuration WebSocket
- `server/swagger.ts` — configuration Swagger
- `server/index.ts` — point d'entrée minimal

## B-02. 100+ routes API mais aucune documentation OpenAPI complète
**Fichier**: `server/routes/` (100+ fichiers router)
**Problème**: Swagger est configuré mais la plupart des routes n'ont pas d'annotations JSDoc/OpenAPI. Les développeurs et utilisateurs de l'API SDK n'ont aucune documentation exploitable.
**Solution**: Ajouter des annotations Swagger pour chaque route. Commencer par les routes publiques de l'API SDK (`/api/projects`, `/api/files`, `/api/ai`).

## B-03. AdminDashboard — endpoint /api/admin/stats non implémenté
**Fichier**: `client/src/pages/AdminDashboard.tsx:102`
**Problème**: `enabled: false // Endpoint not implemented yet` — Le dashboard admin ne peut pas charger de statistiques.
**Solution**: Implémenter `GET /api/admin/stats` retournant: nombre d'utilisateurs, projets, déploiements actifs, revenus, usage CPU/RAM.

## B-04. Neon DB credential rotation non implémentée
**Fichier**: `server/services/providers/neon.provider.ts:215`
**Problème**: `logger.warn('Credential rotation not implemented for database ${databaseId}')` — La rotation des credentials de base de données n'est pas implémentée.
**Solution**: Intégrer l'API Neon pour la rotation automatique des credentials. Implémenter un job cron mensuel qui génère de nouveaux credentials et met à jour les connexions.

## B-05. Fichiers temporaires sed* et rm dans la racine du projet
**Fichier**: `sed0cbVbB`, `sedE52NgH`, `sedVkyNvv`, `sedomaJgw`, `rm`
**Problème**: Des fichiers temporaires de `sed` et un fichier `rm` traînent dans la racine du projet. Signe de commandes qui ont échoué ou été interrompues.
**Solution**: Supprimer ces fichiers. Ajouter `sed*` et `rm` au `.gitignore`.

## B-06. Deux fichiers .env.production.example
**Fichier**: `.env.production.example` et `✅_.env.production.example`
**Problème**: Duplication avec un fichier ayant un emoji dans le nom (problème d'encodage potentiel).
**Solution**: Supprimer `✅_.env.production.example` et garder uniquement `.env.production.example`.

## B-07. Double implémentation Shell (shell.ts et shell.router.ts)
**Fichier**: `server/routes/shell.ts` et `server/routes/shell.router.ts`
**Problème**: Deux fichiers de routes pour le shell. Confusion possible et code dupliqué.
**Solution**: Consolider en un seul fichier router. Vérifier lequel est effectivement utilisé dans `routes/index.ts` et supprimer l'autre.

## B-08. Stockage des sessions en mémoire (fallback MemoryStore)
**Fichier**: `server/index.ts` (configuration express-session)
**Problème**: Si Redis n'est pas configuré, les sessions utilisent `MemoryStore` qui ne scale pas et fuit de la mémoire. En production avec plusieurs instances, les sessions ne sont pas partagées.
**Solution**: Rendre Redis obligatoire en production. Si `REDIS_URL` n'est pas défini et `NODE_ENV=production`, refuser de démarrer. Utiliser `connect-redis` pour toutes les sessions.

---

# 3. BASE DE DONNÉES & Migrations

## DB-01. Schéma massif dans un seul fichier (~600+ lignes)
**Fichier**: `shared/schema.ts`
**Problème**: Toutes les tables (users, projects, files, billing, deployments, AI, newsletters, etc.) sont dans un seul fichier. Difficile à maintenir et prone aux conflits de merge.
**Solution**: Séparer en modules thématiques:
- `shared/schema/users.ts`
- `shared/schema/projects.ts`
- `shared/schema/billing.ts`
- `shared/schema/deployments.ts`
- `shared/schema/ai.ts`
- `shared/schema/index.ts` (re-exports)

## DB-02. Pas de partition ni de cleanup pour les tables de logs
**Fichier**: `shared/schema.ts` — tables `terminalLogs`, `securityLogs`, `apiUsage`
**Problème**: Les tables de logs vont grossir indéfiniment sans partition temporelle ni politique de rétention. En production avec des utilisateurs, elles vont dépasser des millions de lignes et ralentir les requêtes.
**Solution**:
- Implémenter une partition par mois pour `securityLogs`, `apiUsage`, `terminalLogs`
- Ajouter un job cron de cleanup qui supprime les données > 90 jours (configurable)
- Ou archiver vers S3/GCS avant suppression

## DB-03. Pas de migration de rollback
**Fichier**: `migrations/`
**Problème**: Les migrations Drizzle sont forward-only. Aucune migration de rollback n'est prévue en cas de déploiement problématique.
**Solution**: Pour chaque migration, écrire un script de rollback. Documenter la procédure de rollback dans DEPLOYMENT.md. Tester les rollbacks en staging.

## DB-04. Index manquants sur des colonnes fréquemment filtrées
**Fichier**: `shared/schema.ts`
**Problème**: Certaines tables manquent d'index sur des colonnes utilisées dans des WHERE/JOIN:
- `files.parentId` — pas d'index (tree traversal lent)
- `checkpoints.projectId` — vérifier la présence d'index
- `deployments.projectId` — vérifier la présence d'index
**Solution**: Ajouter les index manquants via une migration:
```sql
CREATE INDEX idx_files_parent_id ON files(parent_id);
CREATE INDEX idx_checkpoints_project_id ON checkpoints(project_id);
```

---

# 4. AUTHENTIFICATION & SÉCURITÉ

## S-01. JWT_SECRET et SESSION_SECRET potentiellement faibles
**Fichier**: `.env.production.example:47-48`
**Problème**: Les exemples montrent `your_32_char_random_string_here` et `your_jwt_secret_here`. Si quelqu'un copie ces valeurs telles quelles, toutes les sessions et tokens sont compromis.
**Solution**:
- Au démarrage, vérifier que SESSION_SECRET et JWT_SECRET ne sont pas des valeurs par défaut
- Exiger minimum 64 caractères aléatoires
- Fournir un script `scripts/generate-secrets.sh` qui génère les secrets: `openssl rand -hex 64`

## S-02. Test credentials exposés dans le code source
**Fichier**: `server/middleware/auth.ts:12`
**Problème**: Le commentaire mentionne `testuser@test.com / testpass123` comme credentials de test. Si ces utilisateurs existent en production, c'est une backdoor.
**Solution**: Supprimer les mentions de credentials de test dans les commentaires. S'assurer que le seed de développement ne crée PAS de comptes test en production. Ajouter une vérification au démarrage production.

## S-03. CSP utilise 'unsafe-inline' pour les styles
**Fichier**: `nginx.conf:75`
**Problème**: La Content Security Policy utilise `'unsafe-inline'` pour `style-src`, ce qui affaiblit la protection contre les attaques XSS.
**Solution**: Migrer vers des nonces CSP. Le pipeline de build Vite peut injecter des nonces dans les balises `<style>`. Configurer nginx pour les propager dans le header CSP.

## S-04. Rate limiting non uniforme entre les routes
**Fichier**: `server/routes/index.ts`
**Problème**: Certaines routes ont du rate limiting (`tierRateLimiters`), d'autres non. Les routes de santé (`/health`, `/api/prometheus`) sont exemptées ce qui est normal, mais des routes comme `/api/logs` sont aussi exemptées.
**Solution**: Auditer chaque route sans rate limiting et justifier l'exemption. Appliquer au minimum un rate limiter global de 1000 req/min en fallback.

## S-05. CORS configurable mais pas de validation stricte des origines
**Fichier**: `.env.production.example:53`
**Problème**: `ALLOWED_ORIGINS=https://e-code.ai` — une seule origine. Mais le système a des callbacks comme `REPLIT_DOMAINS` en fallback, ce qui pourrait ouvrir le CORS trop largement.
**Solution**: En production, NEVER utiliser de fallback wildcard. Lister explicitement toutes les origines autorisées. Logger un warning si `ALLOWED_ORIGINS` n'est pas défini.

## S-06. GitHub OAuth tokens stockés côté serveur sans rotation
**Fichier**: `shared/schema.ts:213-215`
**Problème**: Les tokens GitHub OAuth sont stockés chiffrés (AES-256-GCM) ce qui est bien, mais il n'y a pas de système de rotation automatique ni d'expiration des tokens.
**Solution**: Implémenter la rotation automatique des tokens GitHub. Utiliser les refresh tokens quand disponibles. Invalider les tokens après 30 jours d'inactivité.

## S-07. process.env exposé au shell utilisateur
**Fichier**: `server/routes/shell.ts:172`
**Problème**: `env: { ...process.env, ... }` — Le spread operator copie TOUTES les variables d'environnement du serveur (DATABASE_URL, JWT_SECRET, STRIPE_SECRET_KEY, etc.) dans l'environnement du shell utilisateur.
**Solution**: Créer un objet env minimal avec UNIQUEMENT les variables nécessaires:
```typescript
env: {
  HOME: shellCwd,
  USER: `user${userId}`,
  SHELL: '/bin/bash',
  TERM: 'xterm-256color',
  PATH: '/usr/local/bin:/usr/bin:/bin',
  LANG: 'en_US.UTF-8',
}
```

---

# 5. EXÉCUTION DE CODE & SANDBOX

## E-01. Mode d'exécution 'local' pas sécurisé
**Fichier**: `server/execution/executor.ts:31`
**Problème**: En mode `local` (défaut en développement), le code utilisateur est exécuté directement sur le serveur avec `spawn()`. Pas d'isolation, pas de limites de ressources, accès complet au filesystem.
**Solution**:
- En développement, utiliser des containers Docker légers
- En production, toujours forcer `EXECUTION_MODE=docker` ou `EXECUTION_MODE=remote`
- Ajouter une vérification qui refuse `EXECUTION_MODE=local` si `NODE_ENV=production`

## E-02. Sandbox ne supporte que JavaScript
**Fichier**: `server/execution/sandbox.ts:29-36`
**Problème**: La sandbox retourne "Language not supported in sandbox mode" pour tout sauf JavaScript/Node.js. Les autres 29 langages supportés n'ont PAS de sandbox.
**Solution**: Pour les langages non-JS, router systématiquement vers Docker ou le service Piston distant. Ne jamais exécuter localement.

## E-03. Pas de limite de taille pour le code soumis
**Fichier**: `server/execution/executor.ts`
**Problème**: Aucune validation de la taille du code soumis. Un utilisateur pourrait soumettre un fichier de 100MB qui saturerait la mémoire.
**Solution**: Ajouter une validation: `if (code.length > 1_000_000) throw new Error('Code too large (max 1MB)')`. Appliquer également côté route API.

## E-04. Timeout d'exécution trop élevé par défaut
**Fichier**: `server/execution/sandbox.ts:22`
**Problème**: `timeout = 5000` (5 secondes) est le défaut, mais le mode auto/remote n'a pas forcément les mêmes limites. Des boucles infinies peuvent bloquer le worker thread.
**Solution**:
- Sandbox: timeout max 10s
- Docker: timeout max 30s avec `--stop-timeout`
- Remote (Piston): timeout configurable mais max 60s
- Ajouter un watchdog qui kill les processus dépassant le timeout

---

# 6. TERMINAL & SHELL

## T-01. Sessions shell non limitées par utilisateur
**Fichier**: `server/routes/shell.ts:26`
**Problème**: `shellSessions = new Map()` sans limite du nombre de sessions par utilisateur. Un utilisateur pourrait ouvrir 1000 sessions et saturer les ressources du serveur.
**Solution**: Limiter à 3-5 sessions simultanées par utilisateur. Vérifier avant de créer une nouvelle session:
```typescript
const userSessionCount = [...shellSessions.values()].filter(s => s.userId === userId).length;
if (userSessionCount >= MAX_SESSIONS_PER_USER) { ws.close(1008, 'Too many sessions'); return; }
```

## T-02. Sessions shell persistent 24h sans activité
**Fichier**: `server/routes/shell.ts:38`
**Problème**: Le cleanup ne s'exécute que toutes les heures et ne supprime les sessions qu'après 24h. Des sessions inactives gardent des processus bash vivants pendant des heures.
**Solution**: Réduire le TTL à 30 minutes d'inactivité. Ajouter un heartbeat/ping qui reset le timer. Fermer le shell si pas de ping pendant 5 minutes.

## T-03. Fichiers du projet synchronisés dans /tmp
**Fichier**: `server/routes/shell.ts:137-167`
**Problème**: Les fichiers du projet sont copiés de la DB vers `/tmp/e-code-terminals/`. Cet espace est volatile, non monitoré, et peut être nettoyé par le système à tout moment. Les modifications faites dans le terminal ne sont PAS re-synchronisées vers la DB.
**Solution**:
- Implémenter une synchronisation bidirectionnelle (terminal ↔ DB)
- Utiliser `chokidar` pour watcher les changements dans le répertoire du projet
- Ou utiliser un volume Docker persistant par projet

## T-04. xterm.js n'utilise pas node-pty
**Fichier**: `server/routes/shell.ts:170`
**Problème**: Le shell utilise `spawn('bash')` au lieu de `node-pty` qui est pourtant installé dans les dépendances. Sans PTY, la gestion des signaux (Ctrl+C, Ctrl+D), le redimensionnement du terminal, et les programmes interactifs (vim, nano, top) ne fonctionnent pas correctement.
**Solution**: Remplacer `spawn` par `node-pty`:
```typescript
import * as pty from 'node-pty';
const shell = pty.spawn('bash', ['--login'], {
  name: 'xterm-256color',
  cols: 80, rows: 24,
  cwd: shellCwd,
  env: safeEnv,
});
```

---

# 7. DÉPLOIEMENT DES PROJETS UTILISATEURS

## D-01. Pas de vrai reverse proxy pour les déploiements
**Fichier**: `server/routes/containers.ts:51`
**Problème**: `url: 'https://${projectId}.e-code.ai'` — L'URL est générée mais il n'y a pas de reverse proxy configuré pour router le trafic vers les containers des projets déployés. Le sous-domaine n'est pas résolu.
**Solution**:
- Configurer un wildcard DNS `*.e-code.ai → serveur`
- Implémenter un reverse proxy dynamique (nginx + lua, ou Traefik, ou Caddy) qui route les sous-domaines vers les containers Docker correspondants
- Alternative: utiliser Cloudflare Tunnel pour chaque déploiement

## D-02. Custom domains sans vérification DNS réelle
**Fichier**: `server/services/deployment-manager.ts:765`
**Problème**: "Validate domain ownership (simplified simulation)" — La vérification de propriété du domaine custom est simulée.
**Solution**: Implémenter la vérification DNS:
1. Générer un token unique
2. Demander à l'utilisateur d'ajouter un enregistrement TXT `_ecode-verify.domain.com = <token>`
3. Vérifier via `dns.resolveTxt()` que le record existe
4. Si validé, configurer le certificat SSL via Let's Encrypt

## D-03. SSL simulé
**Fichier**: `server/services/deployment-manager.ts:214-215`
**Problème**: "Wait a bit to simulate cert generation" avec `setTimeout(resolve, 2000)`. Aucun certificat SSL n'est réellement généré.
**Solution**: Intégrer ACME/Let's Encrypt via `greenlock` ou le client `certbot` pour obtenir de vrais certificats. Stocker les certificats de manière sécurisée. Implémenter le renouvellement automatique.

## D-04. Pas de CI/CD pour les projets utilisateurs
**Fichier**: `server/services/deployment-manager.ts`
**Problème**: Le processus de build/deploy n'a pas de pipeline CI/CD. Pas de build reproductible, pas de rollback automatique, pas de health checks post-déploiement.
**Solution**: Implémenter un pipeline:
1. Build dans un container Docker isolé
2. Run des tests automatiques si configurés
3. Deploy le nouveau container
4. Health check (HTTP 200 sur `/`)
5. Si échec: rollback automatique vers la version précédente
6. Notification à l'utilisateur

---

# 8. COLLABORATION TEMPS RÉEL

## CO-01. Yjs configuré mais pas de serveur de persistence
**Fichier**: `server/routes/collaboration.ts`
**Problème**: Yjs est utilisé pour la collaboration en temps réel (édition simultanée), mais le serveur y-websocket n'a pas de persistence configurée. Si le serveur redémarre, tout l'historique des modifications collaborative est perdu.
**Solution**: Configurer la persistence Yjs avec LevelDB ou PostgreSQL. Sauvegarder l'état du document Y.Doc à intervalles réguliers et au moment de la déconnexion.

## CO-02. Pas de gestion des conflits pour les opérations fichier
**Fichier**: `server/routes/files.router.ts`
**Problème**: Les opérations de sauvegarde de fichier (PUT) n'ont pas de mécanisme d'optimistic locking. Si deux utilisateurs modifient le même fichier via l'API REST (pas Yjs), le dernier écrase le premier.
**Solution**: Ajouter un champ `version` ou `updatedAt` aux requêtes de mise à jour. Retourner 409 Conflict si la version ne correspond pas:
```typescript
if (file.updatedAt.getTime() !== expectedVersion) {
  return res.status(409).json({ error: 'File modified by another user', currentVersion: file.updatedAt });
}
```

## CO-03. Voice/Video — WebRTC non implémenté
**Fichier**: `server/routes/voice-video.router.ts`
**Problème**: Les routes voice/video existent mais le signaling WebRTC complet (ICE candidates, SDP offer/answer) n'est pas entièrement connecté à un serveur STUN/TURN.
**Solution**:
- Intégrer un serveur TURN (coturn) pour le NAT traversal
- Ou utiliser un service tiers (Twilio, Daily.co, LiveKit)
- Implémenter le signaling complet dans le WebSocket existant

---

# 9. FRONTEND - UI/UX WEB

## F-01. 150+ pages — beaucoup sont des placeholders
**Fichier**: `client/src/pages/FeaturePlaceholder.tsx`
**Problème**: De nombreuses fonctionnalités redirigent vers `FeaturePlaceholder` avec des statuts "coming_soon", "beta", ou "enterprise_only". Les dates estimées sont périmées (Q1-Q3 2025 alors qu'on est en Mars 2026).
**Features en placeholder**:
- Preview Environments → "coming_soon" (Q2 2025)
- Package Intelligence → "coming_soon" (Q2 2025)
- Extensions Marketplace → "coming_soon" (Q3 2025)
- Collaboration Threads → "coming_soon" (Q3 2025)
- Distributed KV Store → "coming_soon" (Q2 2025)
- Issue Intelligence → "coming_soon" (Q2 2025)
- Referral Hub → "coming_soon" (Q2 2025)
- VNC → "enterprise_only"
- Networking → "enterprise_only"
**Solution**:
1. Mettre à jour les dates estimées
2. Pour chaque feature "coming_soon": soit l'implémenter, soit la retirer du menu de navigation
3. Ne pas montrer de "coming_soon" aux utilisateurs en production — ça donne une impression d'inachevé

## F-02. Endpoint `/api/feature-interest` non implémenté
**Fichier**: `client/src/pages/FeaturePlaceholder.tsx:199`
**Problème**: Le formulaire "Notify me" fait un POST vers `/api/feature-interest` qui n'existe pas dans les routes backend. L'utilisateur reçoit une erreur 404.
**Solution**: Créer la route ou réutiliser la table `newsletterSubscribers` avec un champ `source` pour tracker l'intérêt par feature.

## F-03. IDE Page — Pas de gestion des panneaux persistante
**Fichier**: `client/src/pages/IDEPage.tsx`
**Problème**: La disposition des panneaux (éditeur, terminal, file explorer, preview) n'est pas persistée. Chaque visite repart du layout par défaut.
**Solution**: Sauvegarder la disposition dans `localStorage` ou dans le profil utilisateur côté serveur. Utiliser `react-resizable-panels` qui supporte le persistence.

## F-04. Pas de mode hors-ligne fonctionnel
**Fichier**: `client/src/utils/service-worker.ts`
**Problème**: Le service worker est enregistré mais la stratégie de cache et le mode offline ne sont pas complètement implémentés. L'application affiche juste un `OfflineFallback` statique.
**Solution**: Implémenter le caching des assets statiques avec Workbox. Permettre l'édition hors-ligne avec sync quand la connexion revient (utiliser IndexedDB pour stocker les changements).

## F-05. Loading states incohérents
**Fichier**: Multiples composants
**Problème**: Certains composants affichent `<ECodeLoading>`, d'autres `<PageSkeleton>`, d'autres rien du tout pendant le chargement. L'expérience est incohérente.
**Solution**: Standardiser les loading states:
- Pages: toujours `<PageSkeleton>`
- Composants inline: `<Skeleton>` de shadcn/ui
- Actions (boutons): spinner inline
- Créer un composant `<DataLoader>` wrapper réutilisable

## F-06. ErrorBoundary basique
**Fichier**: `client/src/components/ErrorBoundary.tsx`
**Problème**: L'ErrorBoundary existe mais n'est appliqué qu'au niveau de `AppContent`. Les erreurs dans les pages individuelles crashent toute l'application.
**Solution**: Ajouter des ErrorBoundary autour de chaque route/page. Implémenter un ErrorBoundary spécifique pour l'IDE qui ne crash pas le file explorer quand l'éditeur a une erreur.

## F-07. Pas de page 404 pour les sous-routes admin
**Fichier**: `client/src/routes/config.ts`
**Problème**: Si un utilisateur accède à `/admin/nonexistent`, il n'y a pas de 404 spécifique au contexte admin.
**Solution**: Ajouter une route catch-all dans le layout admin qui affiche un 404 contextuel.

## F-08. i18n configuré mais pas de traductions
**Fichier**: `package.json` — `i18next`, `react-i18next`, `i18next-browser-languagedetector`
**Problème**: Les packages i18n sont installés mais aucun fichier de traduction n'existe. Toutes les chaînes sont hardcodées en anglais.
**Solution**: Si l'internationalisation n'est pas prioritaire, supprimer les dépendances i18n pour réduire le bundle. Sinon, créer les fichiers de traduction (au minimum `en.json`, `fr.json`).

---

# 9B. COMPOSANTS UI — AUDIT DÉTAILLÉ (127 problèmes)

## FC-01. CodeEditor.tsx — Pas d'ErrorBoundary Monaco
**Fichier**: `client/src/components/CodeEditor.tsx`
**Problèmes**:
- Pas d'error boundary pour les échecs de montage de Monaco Editor
- `getLanguageFromFilename()` appelé à chaque render sans memoization
- Pas de breakpoints mobiles pour le mode plein écran
- Status bar (Line, Column, Tab Size) sans aria-labels
- Auto-save sans skeleton de chargement au premier save
**Solution**: Envelopper Monaco dans un ErrorBoundary dédié. Memoiser `getLanguageFromFilename` avec `useMemo`. Ajouter des media queries pour les petits écrans. Ajouter `aria-label` sur chaque indicateur de status bar.

## FC-02. FileExplorer.tsx — Pas de virtualisation pour les grandes arborescences
**Fichier**: `client/src/components/FileExplorer.tsx`
**Problèmes**:
- Pas de virtualisation — crash de performance avec 1000+ fichiers (CRITIQUE pour la production)
- Utilise `prompt()` natif pour la création de fichier au lieu d'un modal
- Pas de drag-and-drop pour déplacer les fichiers
- Pas de debounce sur la recherche de fichiers
- Utilise `window.location.reload()` au lieu de refetch des données
- Menu contextuel sans navigation clavier
**Solution**: Intégrer `@tanstack/react-virtual` (déjà installé) pour virtualiser l'arborescence. Remplacer `prompt()` par un Dialog Radix. Ajouter `react-dnd` (déjà installé) pour le drag-and-drop. Ajouter un debounce de 300ms sur la recherche.

## FC-03. DeploymentPanel.tsx — Données hardcodées en fallback
**Fichier**: `client/src/components/DeploymentPanel.tsx`
**Problèmes**:
- Données de déploiement hardcodées en fallback si l'API échoue (lignes 134-145) — montre "Production" même si rien n'est déployé
- Bouton "Debug with Agent" (ligne 258) sans onClick — pure UI
- Bouton "Run security scan" (ligne 287) sans intégration backend
- Status de déploiement sans WebSocket — refresh uniquement manuel
- Badges de status utilisent uniquement les couleurs (jaune/vert/rouge) sans texte
- Pas de bouton "Cancel deployment" pour les déploiements en cours
**Solution**: Supprimer les données hardcodées — afficher un empty state clair. Connecter les boutons au backend ou les retirer. Utiliser le WebSocket existant pour les mises à jour en temps réel. Ajouter du texte aux badges ("Active", "Building", "Failed").

## FC-04. CollaborationPanel.tsx — Tokens hardcodés & Video UI-only
**Fichier**: `client/src/components/CollaborationPanel.tsx`
**Problèmes**:
- **SÉCURITÉ**: Token de partage généré côté client avec `btoa()` (ligne 384) — non validé par le backend
- Tracking de curseur mock (lignes 127-128) — positions jamais mises à jour
- Contrôles d'appel vidéo (lignes 491-509) sans implémentation WebRTC
- Status de collaboration affiche "Connected" même si le WebSocket est fermé
- Liste des collaborateurs sans auto-refresh
- Pas de protection anti-spam sur le chat
**Solution**: Générer les tokens de partage côté serveur avec validation. Implémenter le cursor tracking via Yjs awareness protocol. Pour la vidéo: intégrer LiveKit ou Daily.co, ou retirer les contrôles vidéo. Écouter les événements WebSocket `close`/`error` pour mettre à jour le status.

## FC-05. Collaboration.tsx — WebSocket URL hardcodée & Pas de persistence
**Fichier**: `client/src/components/Collaboration.tsx`
**Problèmes**:
- URL WebSocket construite manuellement (ligne 73) — pas de configuration
- Après 5 échecs de reconnexion, affiche "Disconnected" sans option de retry
- Erreurs WebSocket loggées dans la console mais pas montrées à l'utilisateur
- Historique du chat perdu au refresh de la page
- Indicateur "typing..." bloqué si la connexion coupe pendant la saisie
**Solution**: Utiliser une URL WebSocket configurable via env variable. Ajouter un bouton "Reconnect" après les échecs. Persister l'historique du chat côté serveur. Ajouter un timeout de 5s sur l'indicateur de saisie.

## FC-06. AIAssistant.tsx — Pas de streaming & Pas de gestion de contexte
**Fichier**: `client/src/components/AIAssistant.tsx`
**Problèmes**:
- Pas de streaming des réponses — affiche un spinner puis le texte complet d'un coup
- Quick actions hardcodées (lignes 60-66) pas récupérées du backend
- Pas de rate limiting côté client — l'utilisateur peut spammer
- Historique du chat non nettoyé au logout — problème de confidentialité
- Échecs API causent un crash complet du composant (pas d'ErrorBoundary)
- Avatars de messages avec initiales seulement — pas de alt text
**Solution**: Implémenter le streaming SSE (Server-Sent Events) pour les réponses AI. Ajouter un cooldown de 2s entre les messages. Nettoyer le chat au logout. Ajouter un ErrorBoundary autour du composant AI.

## FC-07. BillingSystem.tsx — Plans de fallback trompeurs
**Fichier**: `client/src/components/BillingSystem.tsx`
**Problèmes**:
- FALLBACK_PLANS hardcodés (lignes 117-145) affichés quand Stripe échoue — trompeur pour l'utilisateur
- Limites d'usage affichent des exemples hardcodés (ligne 244) au lieu de données réelles
- Barres de progression d'usage montrent uniquement le % visuel — pas de texte "5/10 heures utilisées"
- Pas de confirmation après souscription réussie — redirect direct vers Stripe
- Erreur générique "Failed to create subscription" sans détail
**Solution**: Afficher un message d'erreur clair au lieu des plans hardcodés. Ajouter des labels textuels aux barres de progression. Ajouter un écran de confirmation post-paiement. Afficher les détails de l'erreur Stripe si disponibles.

## FC-08. EnvironmentVariables.tsx — Pas de validation des clés
**Fichier**: `client/src/components/EnvironmentVariables.tsx`
**Problèmes**:
- Pas de validation regex pour les noms de variables (doit commencer par lettre/underscore)
- Peut ajouter la même clé deux fois — pas de vérification de doublon
- Pas d'import/export de fichier .env
- Pas de bouton copy-to-clipboard pour les valeurs
**Solution**: Valider les clés avec `/^[A-Z_][A-Z0-9_]*$/i`. Vérifier les doublons avant ajout. Ajouter un bouton import `.env` et export. Ajouter un bouton copier.

## FC-09. CreateProjectModal.tsx — Templates hardcodés & Progress silencieux
**Fichier**: `client/src/components/CreateProjectModal.tsx`
**Problèmes**:
- DEFAULT_TEMPLATES (lignes 76-85) hardcodés — pas récupérés du backend au premier chargement
- FALLBACK_STARTER_FILES hardcodés (lignes 96-201) — bypass les données backend
- Création de projet longue non annulable
- Stream de progression EventSource peut timeout silencieusement (60s, ligne 338)
- URL GitHub sans validation ni preview en direct
- Navigation par onglets entre les modes de création cassée (pas de focus management)
**Solution**: Charger les templates depuis l'API au montage. Ajouter un bouton "Cancel" pendant la création. Gérer le timeout EventSource avec un message d'erreur. Valider les URLs GitHub avant soumission.

## FC-10. GitPanel.tsx — Pas de diff view ni résolution de conflits
**Fichier**: `client/src/components/GitPanel.tsx`
**Problèmes**:
- Pas de vue diff pour prévisualiser les changements avant commit
- Pas d'interface de résolution de conflits merge
- Pull/push affichent des messages d'erreur génériques sans la sortie git
- Toujours "origin" comme remote (ligne 867) — pas de support multi-remote
- Pas de stash/pop UI
- Badges de status fichier uniquement en couleur — pas de texte
**Solution**: Intégrer `@codemirror/merge` (déjà installé) pour la vue diff. Afficher la sortie git complète en cas d'erreur. Supporter les remotes multiples via un dropdown.

## FC-11. TabletIDEView.tsx — Seuils de responsive arbitraires
**Fichier**: `client/src/components/tablet/TabletIDEView.tsx`
**Problèmes**:
- Taille de police hardcodée `text-[11px]` (ligne 315) — trop petit pour tablettes 8"
- Seuil de vélocité de swipe arbitraire (0.3) sans base empirique
- Pas de support pinch-to-zoom sur le canvas éditeur
- Détection de taille d'écran par pixels sans prise en compte de la densité (dpi)
- Tailles de boutons incohérentes (h-10 vs h-12) dans le panel switcher
**Solution**: Utiliser des tailles de police relatives (`text-sm` au minimum). Tester les seuils de swipe sur des vrais appareils. Implémenter le pinch-to-zoom via `gesturechange` event.

---

# 10. RESPONSIVE & MOBILE

## R-01. Pas de responsive testing systématique
**Fichier**: Général
**Problème**: Il n'y a aucun test automatisé de responsive design. Des composants comme l'IDE, le terminal, et les panneaux de déploiement risquent de casser sur mobile.
**Solution**: Ajouter des tests Playwright avec des viewports mobile:
```typescript
test.use({ viewport: { width: 375, height: 812 } }); // iPhone 14
test.use({ viewport: { width: 768, height: 1024 } }); // iPad
```

## R-02. IDE non optimisé pour tablette/mobile
**Fichier**: `client/src/pages/IDEPage.tsx`
**Problème**: L'IDE avec ses panneaux redimensionnables (file explorer + éditeur + terminal + preview) ne s'adapte pas aux petits écrans. Les panneaux se superposent ou deviennent inutilisables.
**Solution**:
- Sur mobile (<768px): layout en onglets (fichiers | éditeur | terminal | preview) au lieu de panneaux côte à côte
- Sur tablette (768-1024px): 2 panneaux max avec menu hamburger pour le file explorer
- Implémenter le swipe entre les panneaux sur mobile

## R-03. MobileWorkspace existe mais est une page séparée
**Fichier**: `client/src/pages/MobileWorkspace.tsx`
**Problème**: Au lieu d'adapter l'IDE existant au mobile, une page séparée `MobileWorkspace` a été créée. Double maintenance, features divergentes.
**Solution**: Unifier en un seul composant IDE qui s'adapte via des media queries et des hooks `useMediaQuery`. Supprimer `MobileWorkspace` après migration.

## R-04. Terminal tactile — clavier virtuel problématique
**Fichier**: `client/src/components/Terminal.tsx`
**Problème**: Sur mobile, le clavier virtuel masque la moitié du terminal. Pas de barre d'outils avec les touches spéciales (Tab, Ctrl, Esc, flèches).
**Solution**:
- Ajouter une barre de touches spéciales au-dessus du clavier: `Tab | Ctrl | Alt | Esc | ↑ | ↓ | ← | →`
- Gérer le resize du viewport quand le clavier apparaît
- Capacitor: utiliser le plugin `@capacitor/keyboard` pour détecter et s'adapter

---

# 11. APPLICATIONS NATIVES (iOS/Android)

## N-01. Applications Capacitor avec code natif minimal
**Fichier**: `android/app/src/main/java/com/ecode/app/MainActivity.java` (5 lignes)
**Fichier**: `ios/App/App/AppDelegate.swift` (49 lignes — boilerplate Capacitor)
**Problème**: Les apps natives sont des wrappers Capacitor vides. Elles ne font que charger la WebView. Il n'y a aucune intégration native:
- Pas de push notifications configurées (FCM/APNs)
- Pas de deep links natifs fonctionnels
- Pas de partage natif
- Pas d'authentification biométrique (Face ID, Touch ID, Fingerprint)
- Pas de stockage sécurisé (Keychain/KeyStore)
**Solution**:
1. Push Notifications: configurer FCM (Android) et APNs (iOS), implémenter le handler dans `AppDelegate.swift`
2. Deep Links: configurer les Associated Domains (iOS) et App Links (Android)
3. Auth biométrique: utiliser le plugin `@capacitor-community/biometric-auth`
4. Stockage sécurisé: utiliser `@capacitor/preferences` avec `@capacitor-community/secure-storage`

## N-02. App pas prête pour les stores (App Store / Play Store)
**Fichier**: `app.json`, `capacitor.config.ts`
**Problème**:
- Pas d'icônes en toutes résolutions (1024x1024 pour App Store, xxxhdpi pour Play Store)
- Pas de splash screen adaptatif (Android 12+)
- Pas de Privacy Policy lien dans l'app
- Pas de consentement GDPR
- Pas de gestion du droit à l'oubli
- App Store exige la fonctionnalité "Sign in with Apple"
**Solution**:
1. Générer toutes les icônes avec `@capacitor/assets`
2. Configurer le splash screen adaptatif pour Android 12+
3. Ajouter "Sign in with Apple" (obligatoire pour App Store si OAuth est proposé)
4. Ajouter un écran de consentement GDPR au premier lancement
5. Implémenter le droit à l'oubli (suppression du compte)

## N-03. google-services.json pour debug
**Fichier**: `android/app/google-services.json`
**Problème**: Ce fichier contient potentiellement des credentials Firebase. S'assurer que c'est le fichier de production et pas de debug.
**Solution**: Vérifier que le `package_name` correspond à `com.ecode.app` et que le projet Firebase est celui de production. Ne JAMAIS committer des credentials de debug.

## N-04. capacitor.config.ts — hostname erroné
**Fichier**: `capacitor.config.ts:10`
**Problème**: `hostname: 'app.ecode.ai'` — Ce sous-domaine n'existe peut-être pas. Le domaine principal est `e-code.ai`, pas `ecode.ai`.
**Solution**: Changer en `hostname: 'e-code.ai'` ou configurer le sous-domaine `app.e-code.ai` dans le DNS.

---

# 12. APPLICATION DESKTOP

## DT-01. Pas d'application desktop
**Fichier**: Aucun — pas d'Electron/Tauri
**Problème**: Replit a une application desktop. E-Code n'en a pas. La page `/desktop` est une page marketing mais il n'y a aucun code Electron ou Tauri dans le projet.
**Solution**:
- Option rapide: utiliser Tauri (Rust) qui est plus léger qu'Electron
- Créer `desktop/` avec `tauri init`
- Pointer la WebView vers `https://e-code.ai` ou builder le frontend localement
- Ajouter le système de fichiers natif pour ouvrir des projets locaux
- Ajouter des raccourcis clavier natifs (Cmd+S, Cmd+P, etc.)

## DT-02. VS Code Extension incomplète
**Fichier**: `vscode-extension/`
**Problème**: L'extension VS Code existe mais vérifier si elle est publiée sur le marketplace et si elle fonctionne réellement. Une extension non fonctionnelle nuit à la crédibilité.
**Solution**: Tester l'extension, la publier sur le VS Code Marketplace, et maintenir la compatibilité avec les versions récentes de VS Code.

---

# 13. PAIEMENTS & BILLING (Stripe)

## P-01. Stripe webhook secret optionnel en production
**Fichier**: `server/routes/payments.router.ts:13-16`
**Problème**: Si `STRIPE_WEBHOOK_SECRET` n'est pas configuré, le serveur démarre quand même mais les webhooks sont désactivés. En production, cela signifie que les changements d'abonnement, paiements échoués, et remboursements ne sont PAS traités.
**Solution**: Rendre `STRIPE_WEBHOOK_SECRET` obligatoire en production. Refuser de démarrer si absent avec un message clair.

## P-02. Pas de gestion des erreurs de paiement pour l'utilisateur
**Fichier**: `client/src/components/PaymentFailureBanner.tsx`
**Problème**: Un banner existe mais vérifier que:
- L'utilisateur est notifié par email en cas d'échec de paiement
- Le downgrade automatique fonctionne après X jours d'échec
- L'utilisateur peut mettre à jour sa carte depuis le dashboard
**Solution**: Implémenter le flow complet de dunning:
1. Jour 0: Paiement échoué → email + banner
2. Jour 3: Retry automatique + email de rappel
3. Jour 7: 2ème retry + avertissement de downgrade
4. Jour 14: Downgrade vers le plan free + email

## P-03. Pay-as-you-go queue sans worker de traitement
**Fichier**: `shared/schema.ts:421-453`
**Problème**: La table `pay_as_you_go_queue` existe dans le schéma avec tous les champs nécessaires (status, attempts, lastError, etc.), mais vérifier que le worker qui traite cette queue tourne effectivement en production.
**Solution**: S'assurer qu'un job cron ou un worker process traite la queue toutes les minutes. Implémenter un dead letter queue après 5 échecs.

---

# 14. AI/LLM INTÉGRATION

## AI-01. 5 fournisseurs AI configurés — fallback chain non testée
**Fichier**: `server/ai/`
**Problème**: Le système supporte OpenAI, Anthropic, Google Gemini, xAI, et Moonshot. Mais le circuit breaker et la chaîne de fallback (provider racing) n'ont probablement jamais été testés en conditions réelles avec des vrais timeouts et erreurs.
**Solution**: Écrire des tests d'intégration qui simulent les pannes de chaque provider et vérifient que le fallback fonctionne. Monitorer les latences par provider en production.

## AI-02. AI Models enum dans la DB — mise à jour difficile
**Fichier**: `shared/schema.ts:74-113`
**Problème**: La liste des modèles AI est un enum PostgreSQL. Ajouter un nouveau modèle nécessite une migration DB. C'est rigide pour un domaine qui change toutes les semaines.
**Solution**: Remplacer l'enum par un `varchar` avec validation côté application. Ou créer une table `ai_models` avec les modèles supportés, mise à jour sans migration.

## AI-03. Clés API AI exposées si quelqu'un accède au dashboard admin
**Fichier**: Configuration serveur
**Problème**: Les clés API des providers AI (OpenAI, Anthropic, etc.) sont dans les variables d'environnement. Si un admin malveillant ou un bug expose ces variables, les clés sont compromises.
**Solution**:
- Utiliser un gestionnaire de secrets (AWS Secrets Manager, HashiCorp Vault, Replit Secrets)
- NE JAMAIS logger ou exposer les clés dans les réponses API
- Implémenter la rotation régulière des clés

---

# 15. TESTS & QUALITÉ

## Q-01. Tests existants utilisant `--passWithNoTests`
**Fichier**: `package.json:20-23`
**Problème**: Les commandes de test utilisent `--passWithNoTests` ce qui signifie qu'un build CI "réussit" même s'il n'y a AUCUN test. Les tests `|| echo 'Install dependencies'` masquent aussi les échecs.
**Solution**: Retirer `--passWithNoTests` et les `|| echo` fallbacks. Un test qui ne s'exécute pas doit être un échec CI.

## Q-02. Pas de lint dans le CI
**Fichier**: `package.json:11`
**Problème**: La commande `lint` existe mais n'est pas dans `test:ci`. Le code peut avoir des erreurs de lint qui passent inaperçues.
**Solution**: Ajouter `npm run lint` à `test:ci`.

## Q-03. TypeScript strict mode non activé
**Fichier**: `tsconfig.json`
**Problème**: Vérifier si `strict: true` est activé. Sans strict mode, TypeScript laisse passer des `any` implicites, des null checks manquants, etc.
**Solution**: Activer `strict: true` dans tsconfig.json. Corriger les erreurs résultantes progressivement.

## Q-04. Pas de tests E2E pour les parcours critiques
**Fichier**: `test/e2e/`
**Problème**: Les 3 fichiers E2E testent uniquement le rate limiting. Aucun test E2E pour:
- Inscription → vérification email → login
- Création de projet → édition de fichier → exécution
- Souscription Stripe → facturation
- Collaboration temps réel
**Solution**: Écrire des tests E2E Playwright pour chaque parcours utilisateur critique. Minimum 20 tests E2E.

---

# 16. INFRASTRUCTURE & DEVOPS

## I-01. Docker Compose — 4 fichiers de configuration
**Fichier**: `docker-compose.yml`, `docker-compose.prod.yml`, `docker-compose.production.yml`, `docker-compose.replit-vm.yml`
**Problème**: 4 fichiers Docker Compose dont 2 semblent être des duplications (`prod` vs `production`). Confusion possible sur lequel utiliser.
**Solution**: Consolider en 2 fichiers max:
- `docker-compose.yml` — développement
- `docker-compose.production.yml` — production (avec override pour Replit VM)

## I-02. Kubernetes manifests présents mais potentiellement non testés
**Fichier**: `kubernetes/`
**Problème**: Des manifests Kubernetes existent mais le mode par défaut est `DEPLOYMENT_MODE=single-vm`. Si quelqu'un active Kubernetes, il faut s'assurer que ça fonctionne.
**Solution**: Soit tester et documenter le déploiement Kubernetes, soit le retirer pour éviter la confusion. Mentionner clairement dans DEPLOYMENT.md que le mode K8s est expérimental.

## I-03. Pas de CI/CD GitHub Actions
**Fichier**: `.github/`
**Problème**: Vérifier si des workflows GitHub Actions existent et sont fonctionnels. Le projet a un répertoire `.github/` mais sans workflows CI/CD robustes, les déploiements sont manuels et risqués.
**Solution**: Créer `.github/workflows/ci.yml`:
```yaml
on: [push, pull_request]
jobs:
  test:
    steps:
      - npm ci
      - npm run lint
      - npm run typecheck
      - npm run test:unit
      - npm run build
```

## I-04. Logs non centralisés
**Fichier**: `server/utils/logger.ts` (Winston)
**Problème**: Les logs sont écrits localement avec Winston. En production multi-instance, les logs sont dispersés et impossibles à analyser.
**Solution**: Configurer Winston pour envoyer les logs vers un service centralisé:
- Option: Sentry (déjà configuré pour les erreurs)
- Option: ELK Stack (Elasticsearch + Logstash + Kibana)
- Option: Datadog, New Relic, ou CloudWatch

## I-05. Monitoring dashboard script bash
**Fichier**: `monitor-dashboard.sh`
**Problème**: Un script bash pour le monitoring n'est pas une solution de production.
**Solution**: Utiliser Prometheus + Grafana (déjà partiellement configuré dans `server/monitoring/prometheus.ts`). Créer des dashboards Grafana pour: CPU, RAM, requests/s, error rate, latence p95.

---

# 17. PERFORMANCE & OPTIMISATION

## PF-01. Bundle frontend potentiellement trop gros
**Fichier**: `vite.config.ts`
**Problème**: 333 dépendances installées dont beaucoup sont des composants UI lourds (Monaco Editor ~4MB, AG Grid, Recharts, etc.). Le bundle initial risque de dépasser 2MB.
**Solution**:
- Activer le code splitting agressif dans Vite
- Lazy-load Monaco Editor (déjà fait partiellement avec `instrumentedLazy`)
- Lazy-load AG Grid, Recharts, et autres composants lourds
- Mesurer la taille du bundle avec `rollup-plugin-visualizer` (déjà installé)
- Target: First Load < 200KB gzip

## PF-02. Pas de CDN configuré
**Fichier**: `vite.config.ts:32`
**Problème**: `base: process.env.CDN_BASE_URL || '/'` — Le CDN est supporté mais probablement pas configuré en production.
**Solution**: Configurer Cloudflare (ou CloudFront) comme CDN pour les assets statiques. Setter `CDN_BASE_URL` en production.

## PF-03. Pas de compression des images
**Fichier**: `public/`, `attached_assets/`
**Problème**: Les images ne sont probablement pas optimisées (WebP, AVIF). Sharp est installé mais utilisé uniquement pour le redimensionnement.
**Solution**: Ajouter un pipeline de build qui convertit les images en WebP/AVIF. Utiliser le tag `<picture>` avec des fallbacks.

## PF-04. Pas de cache HTTP pour les API
**Fichier**: `server/routes/`
**Problème**: Les réponses API n'ont pas de headers `Cache-Control`. Chaque requête refait un roundtrip complet vers le serveur.
**Solution**: Ajouter des headers de cache pour les routes appropriées:
- `GET /api/projects`: `Cache-Control: private, max-age=30`
- `GET /api/templates`: `Cache-Control: public, max-age=3600`
- Assets statiques: `Cache-Control: public, max-age=31536000, immutable`

---

# 18. FEATURES MANQUANTES vs REPLIT

| Feature Replit | Status E-Code | Priorité |
|---|---|---|
| IDE en ligne fonctionnel | ✅ Présent (CodeMirror + Monaco) | - |
| Terminal interactif | ⚠️ Partiel (pas de PTY, pas sandboxé) | P0 |
| Exécution de code multi-langages | ⚠️ Partiel (local non sécurisé) | P0 |
| Collaboration temps réel | ⚠️ Partiel (Yjs sans persistence) | P1 |
| Déploiement de projets | ❌ Simulé (in-memory, pas de vrai deploy) | P0 |
| Custom domains + SSL | ❌ Simulé | P1 |
| Multiplayer cursors | ⚠️ Partiellement implémenté | P2 |
| Git intégration | ✅ Implémenté | - |
| GitHub import | ✅ Implémenté | - |
| Templates/Marketplace | ✅ Implémenté | - |
| Database browser | ✅ Implémenté | - |
| Secrets management | ✅ Implémenté | - |
| AI Assistant (chat) | ✅ Implémenté (multi-provider) | - |
| AI Agent (autonomous) | ✅ Implémenté | - |
| Mobile app (iOS/Android) | ⚠️ Shell Capacitor vide | P1 |
| Desktop app | ❌ Inexistant | P2 |
| Nix packages | ❌ Pas implémenté | P3 |
| Container-level isolation | ❌ Pas implémenté | P0 |
| REPL history/snapshots | ⚠️ Checkpoints présents | P2 |
| Billing/Subscription | ⚠️ Stripe intégré, webhook optionnel | P1 |
| Preview environments | ❌ Placeholder | P2 |
| Extensions marketplace | ❌ Placeholder | P3 |
| Teams collaboration | ⚠️ Routes existent, UI partielle | P2 |
| Education tools | ⚠️ Partiellement implémenté | P3 |

---

# PLAN D'ACTION RECOMMANDÉ

## Phase 1 — Sécurité & Stabilité (Semaines 1-3) — OBLIGATOIRE avant production
1. **[C-03, S-07]** Sandboxer le shell avec Docker — URGENT
2. **[C-04]** Remplacer la sandbox vm par isolated-vm ou Docker
3. **[C-06]** Supprimer vm2 des dépendances
4. **[E-01]** Forcer EXECUTION_MODE=docker|remote en production
5. **[S-01, S-02]** Valider les secrets au démarrage
6. **[P-01]** Rendre STRIPE_WEBHOOK_SECRET obligatoire

## Phase 2 — Fonctionnalités Core (Semaines 4-8)
7. **[C-01, C-02]** Refaire le Deployment Manager avec vrai Docker
8. **[T-04]** Migrer le terminal vers node-pty
9. **[D-01]** Configurer le reverse proxy pour les déploiements
10. **[CO-01]** Ajouter la persistence Yjs
11. **[T-03]** Synchronisation bidirectionnelle terminal ↔ DB

## Phase 3 — Tests & Production Readiness (Semaines 9-12)
12. **[C-05, Q-01-Q-04]** Écrire les tests (minimum 80% couverture)
13. **[I-03]** Configurer CI/CD GitHub Actions
14. **[PF-01]** Optimiser le bundle frontend
15. **[PF-02]** Configurer le CDN

## Phase 4 — Mobile & Cross-Platform (Semaines 13-16)
16. **[N-01, N-02]** Compléter les apps Capacitor
17. **[R-02, R-03]** Rendre l'IDE responsive
18. **[DT-01]** Créer l'application desktop (Tauri)

## Phase 5 — Polish & Features (Semaines 17+)
19. **[F-01]** Implémenter ou retirer les features placeholder
20. **[AI-02]** Rendre les modèles AI configurables sans migration
21. **[DB-02]** Implémenter le cleanup des logs
22. **[CO-03]** Intégrer WebRTC pour la voix/vidéo

---

**Résumé**: Le projet a une base impressionnante avec une couverture fonctionnelle large (150+ pages, 100+ routes API, multi-AI providers, collaboration, billing). Mais les 6 problèmes critiques (C-01 à C-06) doivent être résolus AVANT tout lancement public. La sécurité du shell et de l'exécution de code est le point le plus urgent — un seul utilisateur malveillant pourrait compromettre tout le serveur.
