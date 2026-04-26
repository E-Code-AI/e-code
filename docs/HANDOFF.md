# Handoff Henri

## Variables d’environnement à configurer

Minimum production:

- `DATABASE_URL`
- `SESSION_SECRET`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `ENCRYPTION_KEY`
- `APP_URL`
- `ALLOWED_ORIGINS`
- `RUNNER_JWT_SECRET`

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
