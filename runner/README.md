# E-Code Runner Service

> **Service séparé** de la plateforme principale E-Code.  
> Le Runner gère les workspaces d'exécution isolés pour les utilisateurs.

---

## Rôle dans l'architecture

```
┌──────────────────────────────────────────┐
│           E-Code Platform (port 5000)     │
│                                           │
│  ┌─────────────┐    ┌──────────────────┐  │
│  │  Frontend   │    │  Backend Express  │  │
│  │  React/Vite │◄──►│  + AI + DB + Auth │  │
│  └─────────────┘    └────────┬──────────┘  │
│                              │ JWT-signed   │
└──────────────────────────────│─────────────┘
                               │ HTTP calls
                               ▼
┌──────────────────────────────────────────┐
│           E-Code Runner (port 8080)       │
│                                           │
│  POST /workspaces        → crée workspace │
│  GET  /workspaces/:id    → status         │
│  DELETE /workspaces/:id  → arrête         │
│  WS   /workspaces/:id/terminal → shell   │
│  GET  /workspaces/:id/preview/* → proxy  │
│  GET/PUT /workspaces/:id/files/** → FS   │
└──────────────────────────────────────────┘
```

---

## Fichiers

| Fichier | Rôle |
|---|---|
| `runner/index.ts` | Point d'entrée — serveur Express + WebSocket |
| `runner/auth.ts` | Middleware JWT (valide les tokens de la plateforme) |
| `runner/workspace-manager.ts` | Cycle de vie des workspaces (create/stop/idle cleanup) |
| `runner/terminal-service.ts` | Terminal interactif via node-pty + WebSocket |
| `runner/file-service.ts` | API REST lecture/écriture de fichiers (anti path traversal) |
| `runner/preview-proxy.ts` | Proxy HTTP vers l'app de l'utilisateur |
| `runner/logger.ts` | Logger minimaliste (même interface que le serveur principal) |

---

## Variables d'environnement

| Variable | Obligatoire | Description |
|---|---|---|
| `RUNNER_JWT_SECRET` | **OUI** | Clé secrète partagée avec la plateforme principale. Doit être identique des deux côtés. |
| `RUNNER_PORT` | Non | Port d'écoute (défaut : `8080`) |
| `RUNNER_PUBLIC_URL` | Non | URL publique du Runner (ex: `https://runner.e-code.ai`). Utilisée pour construire les URLs de preview et terminal. |
| `RUNNER_WORKSPACES_DIR` | Non | Répertoire des workspaces (défaut : `/tmp/runner-workspaces`) |
| `RUNNER_ALLOWED_ORIGINS` | Non | CORS origins autorisées, séparées par virgule (défaut : `*`) |
| `RUNNER_DEBUG` | Non | Mettre à `true` pour les logs verbeux |

---

## Démarrage local (développement)

```bash
# Dans le panneau Replit, lancer le workflow "Start Runner"
# OU en ligne de commande :
RUNNER_JWT_SECRET=mon-secret npx tsx runner/index.ts
```

Le Runner démarrera sur http://localhost:8080.

### Vérifier qu'il tourne

```bash
curl http://localhost:8080/health
# {"status":"ok","service":"e-code-runner","workspaces":0,"timestamp":"..."}
```

---

## Connexion avec la plateforme principale

Dans les secrets Replit de la plateforme principale, définir :

```
RUNNER_BASE_URL   = http://localhost:8080   (dev) ou https://runner.e-code.ai (prod)
RUNNER_JWT_SECRET = même valeur que le Runner
```

Le bouton **"VM"** apparaîtra automatiquement dans la barre de l'IDE.

---

## API Reference

### Authentification

Toutes les routes (sauf `/health`) nécessitent :
```
Authorization: Bearer <JWT signé avec RUNNER_JWT_SECRET>
```

### Workspaces

```
POST   /workspaces
  Body: { projectId: string, projectName?: string }
  Resp: { workspaceId, status, previewUrl, wsTerminalUrl, createdAt }

GET    /workspaces/:id
  Resp: { workspaceId, projectId, status, previewPort, createdAt, lastActiveAt }

DELETE /workspaces/:id
  Resp: { stopped: true }

GET    /workspaces
  Resp: { workspaces: [...], total: number }
```

### Terminal (WebSocket)

```
WS  /workspaces/:id/terminal?token=<JWT>

Client → Server:
  { type: "input", data: string }      ← frappe clavier
  { type: "resize", cols: n, rows: n } ← resize terminal

Server → Client:
  string                               ← output brut PTY
  { type: "exit", code: number }       ← session terminée
```

### Fichiers

```
GET    /workspaces/:id/files/<path>
  Resp: { type: "file"|"directory", content?, entries? }

PUT    /workspaces/:id/files/<path>
  Body: { content: string }
  Resp: { saved: true, path }

DELETE /workspaces/:id/files/<path>
  Resp: { deleted: true, path }
```

### Preview (app de l'utilisateur)

```
POST   /workspaces/:id/preview/start
  Body: { command: string, port: number }
  Resp: { started: true, port, previewPath }

POST   /workspaces/:id/preview/stop
  Resp: { stopped: true }

GET    /workspaces/:id/preview/*      ← proxy vers l'app
```

### Exec

```
POST   /workspaces/:id/exec
  Body: { command: string }
  Resp: { output: string, error?: string, exitCode: number }
```

---

## Sécurité

- **Isolation filesystem** : chaque workspace est dans son propre répertoire temporaire. Les paths sont validés (anti path traversal).
- **Isolation processus** : les processus preview sont suivis et tués quand le workspace s'arrête.
- **Isolation environnement** : seules des variables d'environnement sûres (PATH, LANG, etc.) sont passées aux processus de l'utilisateur. Aucune clé API ou secret de la plateforme n'est transmis.
- **Expiration automatique** : les workspaces inactifs depuis plus de 2 heures sont arrêtés automatiquement.
- **JWT obligatoire** : toutes les routes API et WebSocket nécessitent un token signé.

---

## Déploiement en production

Pour utiliser le Runner en production, deux options :

### Option A : Même VM que la plateforme principale

```bash
# Ajouter dans le processus de déploiement :
RUNNER_JWT_SECRET=$RUNNER_JWT_SECRET \
RUNNER_PORT=8080 \
RUNNER_PUBLIC_URL=https://runner.e-code.ai \
npx tsx runner/index.ts &
```

### Option B : VM séparée (recommandé pour scalabilité)

Déployer `runner/` sur une VM dédiée (Hetzner, DigitalOcean, Fly.io, etc.) avec Docker installé pour une isolation renforcée. Puis configurer `RUNNER_BASE_URL` dans les secrets de la plateforme principale.

---

## Différences avec la plateforme principale

| Fonctionnalité | Plateforme (port 5000) | Runner (port 8080) |
|---|---|---|
| Authentification | Sessions Passport.js | JWT simple |
| Base de données | PostgreSQL (Drizzle) | Aucune (état en mémoire) |
| Fichiers projets | PostgreSQL | Filesystem temporaire |
| Terminal | node-pty (limité en prod) | node-pty (toujours actif) |
| Preview | Processus enfant + proxy | Processus enfant + proxy |
| Exécution code | Piston API (prod) | Shell direct (isolé) |
