# E-code Production Finalization

## Checklist

- [x] T2 — Qualité génération IA
- [x] T3 — Production-ready
- [x] T4 — CI / monitoring / docs

## Scope

Finaliser E-code pour une cible de production `replit-deploy` avec :

- génération d’apps moderne pilotée par prompt
- preview exploitable
- sessions persistées
- sécurité HTTP cohérente
- CI reproductible
- documentation d’exploitation minimale

## Progression en cours

### T2 terminé

- fallback chain IA réalignée
- prompts design modernes ajoutés
- post-processing IA ajouté
- scaffold moderne prompt-aware avec dark mode, HSL, shadcn-style, Framer Motion
- hot-reload preview avec bouton `Stop silent retry`
- test unitaire scaffold ajouté et vert

### T3 terminé

- logger Pino compatible en place
- session store PostgreSQL prioritaire
- seed sans secrets statiques
- CSP/preview Replit réalignés
- stratégie cible de déploiement fixée à `replit-deploy`

### T4 terminé

- config Jest corrigée
- workflow CI ajouté
- README/DEPLOYMENT réalignés
- docs architecture / handoff ajoutées
- `.env.production.example` réaligné

## État production E-code

`CERTIFICATION EN COURS — BLOCKED` — 2026-04-26.

Nouvelle certification stricte lancée sur la branche `codex/production-certification-20260426`.
Source de cartographie exhaustive: `docs/SURFACE-MAP.md`.
Journal de certification: `docs/PRODUCTION-CERTIFICATION.md`.

Dernier état vérifié:

- typecheck, build, audit high: PASS
- boot dev contrôlé, `/health`, `/health/readiness`: PASS
- workspace-core Playwright smoke: PASS
- suite systématique panels ajoutée: `npm run test:e2e:panels`
- suite panels `desktop-xl-1600`: PASS 23/23
- suite panels complète 4 viewports: PASS 92/92
- validations ciblées suite panels: PASS sur Files, Terminal/Shell, Testing, Git, Agent, Actions, Preview, Output, Console, Deployment
- lint zéro warning: PASS
- couche multi-modèles + orchestration agentique locale: PARTIAL GATE PASS — proxy unifié `/api/ai/proxy/*`, runner plan/act/observe/reflect, outils agent normalisés, smoke `pnpm run test:smoke:agent` validé 3 fois
- front web React ciblé: PARTIAL GATE PASS — split editor réel, reveal file tree réel, security auto-update via agent, alertes bloquantes remplacées par toasts; typecheck/lint/build PASS, panels desktop 23/23 PASS
- app desktop Electron: PARTIAL GATE PASS — Electron confirmé, preload sécurisé, bundle React local + fallback offline, dossiers locaux, Docker detect, safeStorage secrets, menus/tray/notifications/deep links/single-instance, electron-updater, workflow CI tag multi-plateforme; `desktop:smoke`, typecheck, lint, `desktop:pack` macOS arm64 PASS
- client mobile iOS/Android Capacitor: PARTIAL GATE PASS — tabs Projects/Editor/AI/Terminal/Settings, layouts phone portrait/landscape/tablet, Projects API mobile, CodeMirror 6 tactile, xterm terminal, offline sync queue, push/deep links/network bridge; `mobile:smoke`, typecheck, lint, `mobile:build` PASS. Blocage explicite: pas de client React Native pur dans ce repo.
- génération multi-format + hardening + déploiement production: en cours

État précédent:

`READY` — 2026-04-26.

Validations globales passées ensemble :

- `npm run typecheck` — OK
- `npm run lint` — OK
- `npm run build` — OK (artifacts `dist/index.js` + `dist/public/`)
- `npm run test:file -- test/unit/agent-system-prompt.test.ts` — OK (2/2)
- boot serveur dev sur port 5057, alive ≥ 30 s, `/health` 200, `/health/liveness` 200, `/api/health` 200 (DB up via Postgres dédié pour la validation locale ; `/health/readiness` 503 attendu — sous-système optionnel `debug-ws` non présent, cf. memory `project_panel_status`).

Livrable de démonstration finale :

- screenshot `docs/demo-screenshot.png` capturé via `scripts/demo-screenshot.mjs` (Playwright Chromium headless, 1440×900) sur le hero de production.

## E2E validé — 4 trous fermés (2026-04-26)

État : `READY (code + E2E validé)` — 2026-04-26.

Score E2E final : **5/6** sur `claude-opus-4-7` (multi-fichier, itération 2 du test E2E). Détails complets : `docs/E2E-VALIDATION.md`.

| Trou | Fix |
|---|---|
| (a) Test E2E de génération | FIXED — `scripts/e2e-generate-demo.ts`, `e2e-inspect.ts`, `e2e-build-and-shoot.ts`. Score 5/6 en multi-fichier sur Opus 4.7 ; build + screenshots light/dark de l’app générée par Sonnet 4.6 single-file. `docs/demo-screenshot.png` et `docs/demo-screenshot-dark.png` remplacent l’ancien screenshot du hero. |
| (b) `/health/readiness` 503 | FIXED — services optionnels filtrés (`registerService(name, { optional: true })` ; `debug-ws` n’entre plus dans le contrat strict). `/health/readiness` renvoie 200, `/health/components` expose le détail pour observabilité. |
| (c) `DATABASE_URL` incohérente | FIXED — `scripts/setup-local-db.sh` idempotent : container `e-code-postgres` sur 5455, mot de passe stable persisté dans `.env.local` (jamais `.env`), `npm run db:push` automatique. README quickstart aligné. |
| (d) Dependabot modéré | FIXED — `postcss` 8.5.8 → 8.5.12 (≥ 8.5.10 corrige GHSA-qx2v-qp2m-jg93). `npm audit --audit-level=moderate` : `0 vulnerabilities`. |

Bugs platform identifiés et corrigés pendant l’E2E :

- `code-generation.router.ts` : `max_tokens` 4 000 → 16 000 (truncation des projets multi-fichier).
- `code-generation.router.ts` : `streamLimiter timeoutMs` override à 300 000 ms (60 s par défaut était trop court pour 16 KB).
- `ai-provider-manager.ts` : ne plus envoyer `temperature` aux Claude 4.x (deprecated, cassait la fallback chain).
