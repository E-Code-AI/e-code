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

`READY` — 2026-04-26.

Validations globales passées ensemble :

- `npm run typecheck` — OK
- `npm run lint` — OK
- `npm run build` — OK (artifacts `dist/index.js` + `dist/public/`)
- `npm run test:file -- test/unit/agent-system-prompt.test.ts` — OK (2/2)
- boot serveur dev sur port 5057, alive ≥ 30 s, `/health` 200, `/health/liveness` 200, `/api/health` 200 (DB up via Postgres dédié pour la validation locale ; `/health/readiness` 503 attendu — sous-système optionnel `debug-ws` non présent, cf. memory `project_panel_status`).

Livrable de démonstration finale :

- screenshot `docs/demo-screenshot.png` capturé via `scripts/demo-screenshot.mjs` (Playwright Chromium headless, 1440×900) sur le hero de production.
