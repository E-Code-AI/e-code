# Gaps production E-code

Date: 2026-04-26
Source: audit statique + commandes réelles lancées depuis `main` à `6efd9bf6`.

## Bloquants

1. Playwright E2E global rouge.
   - Résultat: `npm run test:e2e` => 156 tests, 0 succès, 144 échecs, 12 skipped.
   - Symptôme dominant: réponses 403 sur `/`, `/api/csrf-token`, `/api/templates/categories`, `/api/projects/u/...`.
   - Impact: aucune certification workspace/panels/layouts possible tant que le bootstrap E2E auth/CSRF/serveur local renvoie 403.

2. E2E backend initialement bloqué par le chargement d'environnement.
   - Résultat initial: `npm run test:integration` échouait au chargement avec `DATABASE_URL must be set`.
   - État corrigé: le bootstrap Jest charge maintenant `.env.test`, `.env.local` ou `.env`; `pnpm run test:integration` passe.
   - Impact restant: les flows DB/session/auth profonds doivent encore être prouvés par des specs dédiées, au-delà du diagnostic d'intégration existant.

3. Tests client Vitest non branchés au bon répertoire.
   - Résultat: `npx vitest run --config client/vitest.config.ts` => `No test files found`.
   - Cause probable: config lancée depuis la racine avec include `src/**/*` alors que les tests sont sous `client/src/__tests__`.
   - Impact: les tests React existants ne tournent pas dans la commande auditée.

4. Backend réel Express alors que la cible demandée mentionne Fastify.
   - Aucun serveur Fastify applicatif détecté.
   - Impact: documentation/architecture et attentes d'exploitation doivent être alignées; si Fastify est requis, c'est une migration, pas un simple câblage.

5. Desktop non autonome.
   - `electron/main.js` charge `https://e-code.ai`; pas de serveur local, pas de fallback offline implémenté.
   - Impact: desktop ne certifie pas la plateforme locale/repo; dépend du site distant.

6. Mobile/tablet non React Native.
   - Présence Capacitor/Android + responsive React web; `app.json` Expo vide.
   - Impact: si la promesse produit est React Native, elle n'est pas implémentée dans ce repo.

## Majeurs

1. Couverture API très incomplète.
   - 857 routes normalisées uniques détectées; 337 sans consommation front évidente.
   - Risque: endpoints orphelins, contrats morts, surfaces admin/mobile/MCP/polyglot non testées.

2. UI/panels déclarés non prouvés.
   - Les specs panels existent, mais échouent toutes dans le run actuel après blocage 403.
   - Panels touchés dans les échecs: Agent, Actions, Tools, Deploy Left, Files, Search, Git, Packages, Debugger, Terminal, Deployment, Secrets, Database, MCP Suite, Preview, Workflows, Extensions, Settings, Testing, Problems, Output, History, Console.

3. Fonctionnalités explicitement désactivées ou non disponibles.
   - Debugger WebSocket marqué optional failed dans `server/index.ts`.
   - K8s/multi-region désactivés en single-VM.
   - `DomainPurchasePanel` annonce domaine indisponible.
   - SendGrid/OpenAI Agents/Batch API/FCM peuvent se désactiver sans clés.

4. Multiplication d'implémentations parallèles.
   - Runtime/Docker: plusieurs executors et orchestrators.
   - Collaboration: plusieurs services realtime/collaboration.
   - Auth: routes auth complètes + routes auth historiques.
   - Billing: Stripe + simple payment/subscription manager.
   - Risque: divergence de contrats, corrections appliquées sur le mauvais chemin.

5. Routes backend potentiellement non montées ou non consommées.
   - À confirmer: `2fa.router.ts`, `mobile-builds.router.ts`, `rag.router.ts`, `rollback.router.ts`, `sync.ts`, `terminal.router.ts`.
   - Risque: UI existante sans backend réel ou backend inaccessible.

6. Secrets et dépendances externes nécessaires pour prouver les flows.
   - IA multi-provider, Stripe, SendGrid, OAuth, Firebase, S3/Postgres/Redis ne sont pas validés en E2E sans environnement complet.

7. Build OK mais performance bundle à surveiller.
   - Warning Vite: chunk `vendor-ag-grid-community` >500 kB.
   - Impact: pas bloquant build, mais risque UX/perf.

## Polish / Dette

1. Nettoyer ou justifier les composants orphelins candidats.
   - `MobileTransitions`, `aspect-ratio`, `dark-mode-transition`, `enhanced-feedback`, `input-otp`, `menubar`, `skeleton-loader`, `stagger-container`, `themed-panel`, `typewriter-effect`.

2. Trier les 1 016 occurrences placeholder/TODO/mock/disabled.
   - Beaucoup sont des placeholders de champs de formulaire, mais certains sont vrais gaps produit.

3. Ajouter une commande test unique réellement représentative.
   - Aujourd'hui `test:unit`, `test:integration`, Vitest client, Playwright et tests `tests/*.test.ts` ne sont pas harmonisés.

4. Documenter clairement les modes mobile.
   - Capacitor/PWA responsive est présent; React Native n'est pas présent.

5. Documenter clairement les modes desktop.
   - Wrapper distant uniquement; pas de desktop offline local.

6. Créer un inventaire API machine-readable.
   - Les extractions regex donnent une base, mais un export OpenAPI validé par runtime serait plus fiable.
