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
- `STORAGE_BACKEND=replit` ou `STORAGE_BACKEND=s3` avec les credentials associés

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
- `S3_*` ou stockage Replit

## Actions manuelles restantes

### Replit Deploy

- vérifier les secrets de déploiement
- vérifier `APP_URL`
- vérifier `ALLOWED_ORIGINS`
- confirmer la disponibilité PostgreSQL

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
- `npm run lint` : BLOCKED — 3352 warnings à résorber pour satisfaire le gate zéro warning
- `setup-local-db.sh` : PASS avec Postgres local idempotent
- `/health` et `/health/readiness` : PASS en boot dev contrôlé
- `test/e2e/panels/workspace-core.spec.ts` : PASS, couvre ouverture IDE, file tree create/rename/delete, preview URL
- `test/e2e/api/router-contracts.spec.ts` : PASS, couvre templates statiques, projet public `/u/:username/:slug`, et `/api/agent/tools/status`

Routers cassés corrigés:

- Templates: `/:id` capturait `/categories`, `/collections`, `/suggestions`
- Projects: `/:projectId` capturait `/u/:username/:slug`
- Agent tools: `/tools/status` dépendait de `req.app.locals.storage` non initialisé
- Files: `/:projectId/files/*` capturait `/files/by-id/:fileId` sur DELETE

Blockers externes confirmés pour le boot artefact production local:

- `APP_URL` doit être HTTPS en `NODE_ENV=production`
- secrets production 32+ caractères requis
- stockage durable obligatoire (`replit` ou `s3`)
- credentials de providers IA requis pour certifier l’E2E de génération multi-format
