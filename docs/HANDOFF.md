# Handoff Henri

## Variables d’environnement à configurer

Minimum production:

- `DATABASE_URL`
- `SESSION_SECRET` (32 caractères minimum)
- `JWT_SECRET` (32 caractères minimum)
- `JWT_REFRESH_SECRET` (32 caractères minimum)
- `ENCRYPTION_KEY` (32 caractères minimum)
- `APP_URL` (`https://...` obligatoire en production)
- `ALLOWED_ORIGINS`
- `RUNNER_JWT_SECRET`
- `STORAGE_BACKEND=gcs`
- `GCP_PROJECT_ID`
- `GCS_BUCKET`
- `CLOUD_SQL_INSTANCE_CONNECTION_NAME` (`project:region:instance`)

Selon les providers utilisés:

- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `XAI_API_KEY`
- `MOONSHOT_API_KEY`

Observabilité:

- `SENTRY_DSN`
- `VITE_SENTRY_DSN`

Services annexes si activés:

- `SENDGRID_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `REDIS_URL`

## Contrat infrastructure production

- Plateforme: Google Cloud Platform.
- Stockage: Google Cloud Storage via `@google-cloud/storage`; jamais S3, jamais MinIO, jamais S3-compatible en production.
- Compute: Cloud Run pour services stateless; Cloud Run Jobs pour workers.
- Exécution code utilisateur: Cloud Run avec gVisor, image custom par stack, montage GCS via `gcsfuse`.
- DB: Cloud SQL Postgres; Auth Proxy en dev, socket `/cloudsql/<instance>` en prod Cloud Run.
- Secrets: Secret Manager injecté par `--set-secrets`.
- Terminal/PTY: WebSocket Cloud Run jusqu'à 60 min; au-delà, option premium Cloud Workstations.
- LSP: dans le même container Cloud Run que le runtime utilisateur.
- Git: `isomorphic-git` serveur ou shellout `git` dans le container runtime.
- Déploiement: Terraform `infra/terraform/` + Cloud Build uniquement.

## Actions manuelles restantes

### Google Cloud Deploy

- provisionner/valider Terraform `infra/terraform/`
- vérifier les secrets Secret Manager et les mappings Cloud Run `--set-secrets`
- vérifier `APP_URL` et `ALLOWED_ORIGINS`
- confirmer Cloud SQL Postgres et la connexion `/cloudsql/<instance>`
- confirmer le bucket GCS projet et les permissions IAM `gcsfuse`

### Sentry

- créer/provisionner le projet Sentry serveur
- créer/provisionner le projet Sentry client
- injecter `SENTRY_DSN` et `VITE_SENTRY_DSN`

### Stripe

- configurer les prix réellement utilisés
- injecter `STRIPE_SECRET_KEY`
- configurer le webhook

### Email

- configurer SendGrid ou SMTP
- vérifier l’adresse `FROM_EMAIL`

### Validation finale

- lancer la création d’une app réelle via prompt
- vérifier que la preview affiche bien l’app générée
- vérifier panels critiques:
  - files
  - terminal
  - preview
  - deploy
  - git
  - secrets
  - database

## État certification stricte — 2026-04-26

- `npm run typecheck` : PASS
- `npm run build` : PASS
- `npm audit --audit-level=high` : PASS
- `npm run lint` : PASS — 0 warning
- `setup-local-db.sh` : PASS avec Postgres local idempotent
- `/health` et `/health/readiness` : PASS en boot dev contrôlé
- `test/e2e/panels/workspace-core.spec.ts` : PASS, couvre ouverture IDE, file tree create/rename/delete, preview URL
- `test/e2e/api/router-contracts.spec.ts` : PASS, couvre templates statiques, projet public `/u/:username/:slug`, et `/api/agent/tools/status`
- `test/e2e/api/panel-router-contracts.spec.ts` : PASS, couvre l’inventaire panels IDE → routers dans `docs/PANEL-ROUTER-INVENTORY.md`
- `npm run test:e2e:panels` : PASS 92/92 — boot serveur isolé, seed deux projets (`fresh`, `with-files`), exécute une spec systématique panel × viewport sur 4 viewports desktop/compact, capture screenshots, et échoue sur erreur console/page.
- Validation suite systématique `desktop-xl-1600` : PASS 23/23 panels.
- Validations ciblées suite systématique : PASS 12/12 sur Preview, Deployment, Deploy Left Panel après correction des routes/preview.

Routers cassés corrigés:

- Templates: `/:id` capturait `/categories`, `/collections`, `/suggestions`
- Projects: `/:projectId` capturait `/u/:username/:slug`
- Agent tools: `/tools/status` dépendait de `req.app.locals.storage` non initialisé
- Files: `/:projectId/files/*` capturait `/files/by-id/:fileId` sur DELETE
- Files history: `/:projectId/files/*` capturait `/files/:fileId/history`
- Search: `/api/search/global` rejetait `projectId` numérique et ignorait `searchType`
- Terminal: le panel appelait `/api/shell/:projectId/shell/create` sans mount backend compatible
- Agent actions: `/api/agent/actions/:projectId` pouvait être capturé par les routes autonomes `/api/agent/actions/:sessionId`; ordre de montage corrigé.
- Deployment latest: `/api/projects/:projectId/deployment/latest` renvoyait 404 pour un projet neuf sans déploiement; le contrat renvoie maintenant 200 avec état vide.
- Preview proxifiée: les assets sous `/preview/:projectId/:port/style.css` et `script.js` pouvaient être servis comme HTML de fallback; le serveur statique résout maintenant les assets réels et le seed panel utilise une page inline stable.
- Preview sandbox: l’init Playwright `sessionStorage` s’exécutait dans l’iframe preview sandboxée; le helper limite maintenant l’écriture au chemin `/ide/*`.

Nouvelle commande de validation panels:

- `npm run test:e2e:panels`
- Variables utiles: `PORT`, `HOST`, `BASE_URL`, `DATABASE_URL`, `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, `PANEL_TEST_SEED_FILE`
- Le runner active uniquement en local `PLAYWRIGHT_PANEL_E2E=true`, désactive Sentry, bypass les rate-limits API pour localhost, seed les projets, puis lance les 4 viewports.
- Config Playwright dédiée: `playwright.panels.config.ts`
- Spec systématique: `test/e2e/panels/systematic-panels.spec.ts`

Blockers externes confirmés pour le boot artefact production local:

- `APP_URL` doit être HTTPS en `NODE_ENV=production`
- secrets production 32+ caractères requis
- stockage durable obligatoire (`replit` ou `s3`)
- credentials de providers IA requis pour certifier l’E2E de génération multi-format
