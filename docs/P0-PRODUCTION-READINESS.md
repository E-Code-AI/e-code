# P0 Production Readiness

Date: 2026-04-27

## Résultat

STATUS: BLOCKED BY EXTERNAL SECRETS

Les correctifs applicatifs P0 ont été appliqués dans le code. Deux éléments ne peuvent pas être finalisés depuis le repo sans intervention sur secrets/infrastructure :

- `STRIPE_SECRET_KEY` local est une clé live expirée. Vérification réelle Stripe: `StripeAuthenticationError api_key_expired`.
- `DATABASE_URL` local refuse l'authentification Postgres. Vérification réelle: `password authentication failed for user "postgres"`.

## Matrice P0

| # | Catégorie | État | Correctif appliqué |
|---|---|---|---|
| 1 | Redis désactivé / fallback mémoire | Corrigé côté code, Redis local vérifié `PONG` | `REDIS_URL` active Redis automatiquement, Redis devient obligatoire en production, `RATE_LIMIT_REDIS_ENABLED=false` interdit en production |
| 2 | États mémoire critiques | Corrigé sur les surfaces P0 citées | Idempotence et agent session cache n'utilisent plus le fallback mémoire en production; scheduler stocke les tâches en cours dans Redis; collaboration persiste/publie la présence via Redis; agent progress persiste les tâches actives et leur index projet dans Redis; actions agent en attente persistées dans Redis; lockout auth, sessions auth et CSRF relus depuis Redis; queue de recovery agent persistée dans Redis; historique chat projet persisté dans Redis |
| 3 | Stripe live expiré | Bloqué externe | La validation confirme l'expiration; régénérer la clé dans Stripe et remplacer le secret |
| 4 | Sentry désactivé | Corrigé côté dépendances/config | `@sentry/node` et `@sentry/react` sont présents; `SENTRY_DSN` est maintenant requis en production |
| 5 | Divergence schema DB | Corrigé côté schema/migration, application DB bloquée par auth | Migration idempotente ajoutée pour `ai_conversations.title`, `ai_messages`, `ai_plan_tasks`, `themes`; script `npm run db:audit` ajouté |

## Commandes De Revalidation

```bash
npm run typecheck
npm run lint
npm run test:unit
pnpm build
npm run audit:p0-memory
npm run prod:p0
npm run db:audit
```

Dernière exécution locale :

```text
P0_MEMORY_AUDIT_OK
redis=ok
database=failed:password authentication failed for user "postgres"
stripe=failed:Expired API Key provided: [REDACTED]
sentry=ok
```

`npm run prod:p0` échoue actuellement uniquement sur `database` et `stripe`. `npm run db:audit` doit être relancé après correction de `DATABASE_URL`.

## Audit États Mémoire P0

`npm run audit:p0-memory` vérifie les garde-fous distribués sur les surfaces P0 connues :

- idempotence Redis obligatoire en production
- cache de sessions agent sans fallback mémoire en production
- scheduler distribué avec index Redis des tâches en cours
- présence collaboration hydratée et publiée via Redis
- progression agent persistée dans Redis par tâche et par projet
- actions agent en attente persistées dans Redis avec fallback local réservé au dev
- lockout login, sessions auth et jetons CSRF persistés dans Redis; fallback process-local interdit en production
- queue de recovery de l'orchestrateur agent persistée dans Redis pour survivre aux redémarrages et au scale-out
- historique chat projet persisté dans Redis, avec cache local limité au développement

## Actions Externes Requises

1. Stripe: générer une nouvelle clé live dans le dashboard Stripe et mettre à jour `STRIPE_SECRET_KEY` dans le gestionnaire de secrets.
2. Postgres: corriger `DATABASE_URL` ou le mot de passe utilisateur `postgres`, puis exécuter `npm run db:migrate` et `npm run db:audit`.
3. Production: vérifier que `REDIS_URL`, `SENTRY_DSN`, `STRIPE_SECRET_KEY`, `DATABASE_URL`, `SESSION_SECRET`, `JWT_SECRET`, `ENCRYPTION_KEY` et `APP_URL=https://...` sont fournis avant boot.
