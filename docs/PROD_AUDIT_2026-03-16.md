# Audit production - plateforme E-Code (2026-03-16)

## Portée
Audit technique rapide orienté « go/no-go prod » avec exécution des contrôles disponibles dans le repo.

## Commandes exécutées

1. `./run-production-checks.sh`
2. `npm run lint`
3. `npm run test:unit`
4. `npm run test:integration`
5. `npm run test:e2e`
6. `npm run build`
7. `npm audit --omit=dev --audit-level=high`

## Résultats bruts

### 1) Script readiness production
- **Échec immédiat** sur fichier manquant: `test/e2e/homepage.spec.ts`.
- Le script s'arrête au premier échec (comportement `set -e`) au lieu de continuer l'inventaire complet.
- Impact: la check-list prod automatisée n'est pas fiable pour un diagnostic global.

### 2) Lint qualité code
- `npm run lint` retourne **KO**.
- Résultat: **3500 problèmes** (42 erreurs, 3458 warnings).
- Impact: dette qualité très élevée, risque de régression, code difficile à maintenir.

### 3) Tests unitaires / intégration
- `npm run test:unit` et `npm run test:integration` affichent une erreur Jest:
  - `Directory /workspace/e-code/tests/backend in the roots[0] option was not found`.
- Les scripts npm terminent malgré l'erreur grâce à `|| echo ...` (faux positif CI possible).
- Impact: les tests ne valident pas réellement l'application aujourd'hui.

### 4) Tests E2E
- `npm run test:e2e` échoue au démarrage serveur:
  - `Error: DATABASE_URL must be set.`
- Le script npm masque également l'échec via `|| echo ...`.
- Impact: pas de validation parcours utilisateur en condition CI par défaut.

### 5) Build production
- `npm run build` passe (front + bundle serveur + runner).
- Avertissement Vite: chunks > 500 kB après minification.
- Impact: déploiement techniquement possible, mais perf front à optimiser (TTI/LCP potentiellement dégradés).

### 6) Sécurité dépendances
- `npm audit --omit=dev --audit-level=high` retourne **26 vulnérabilités**:
  - 13 high, 7 moderate, 6 low.
- Dépendances concernées (exemples): `express-rate-limit`, `multer`, `tar`, `undici`, `ws` (via `snack-sdk`), etc.
- Impact: risque sécurité non négligeable avant exposition publique.

## Ce qu'il manque avant mise en production

## Bloquants (P0)
1. **Pipeline de tests non fiable** (faux positifs + config Jest cassée).
2. **E2E non exécutable en CI sans secrets DB**.
3. **Niveau de vulnérabilités high trop élevé**.
4. **Script de readiness incomplet / fragile**.

## Important (P1)
5. **Volume d'alertes lint massif** (risque qualité).
6. **Bundles front très lourds** (perf utilisateur).
7. **Checklist d'env prod à valider systématiquement** (DB/Redis/session/CORS/API keys).

## Solutions recommandées

### A. Réparer la chaîne de test (priorité immédiate)
- Corriger `jest.config.enterprise.js` pour pointer vers les dossiers réellement utilisés (`test/...` ou créer `tests/...` cohérent).
- Supprimer les `|| echo ...` dans `test:unit`, `test:integration`, `test:e2e` pour que CI échoue réellement si tests KO.
- Créer un preset CI:
  - `DATABASE_URL` de test (DB éphémère docker),
  - seeds/migrations automatiques,
  - teardown propre.

### B. Fiabiliser le script readiness
- Retirer `set -e` ou encapsuler les checks pour collecter **tous** les résultats.
- Aligner les fichiers attendus avec la réalité du repo (`test/e2e/*.spec.ts`, etc.).
- Ajouter un code retour distinct par catégorie (config, tests, sécurité, perf).

### C. Assainir la sécurité dépendances
- Exécuter d'abord `npm audit fix` (sans `--force`), retester.
- Pour les paquets exigeant breaking changes, planifier un lot de migration dédié (ex: `snack-sdk`/`ws`, stack Google storage).
- Mettre un gate CI: blocage merge si vulnérabilités high > 0 sur runtime deps.

### D. Réduire le risque qualité
- Traiter les 42 erreurs lint en premier, puis réduire progressivement les warnings.
- Imposer seuil max warnings en CI (décroissance par sprint).
- Ajouter ownership par domaine (`client`, `server`, `shared`).

### E. Optimiser performance front
- Introduire davantage de `dynamic import()` sur pages lourdes.
- Configurer `manualChunks` pour séparer vendor lourds (grid/editor/charts).
- Définir budget bundle (gzip) et alerte CI.

### F. Hardening production
- Vérifier les variables critiques listées dans la doc de déploiement (`DATABASE_URL`, `SESSION_SECRET`, `REDIS_PASSWORD`, clés providers, `ALLOWED_ORIGINS`).
- Confirmer endpoints de santé (`/health/liveness`, `/health/readiness`, `/health/deep`) dans l'environnement cible.
- Mettre en place monitoring + alerting (Sentry/Slack + métriques infra).

## Plan d'exécution conseillé (7 jours)
- **J1-J2:** réparer scripts/test config + CI rouge réel.
- **J2-J3:** remettre E2E verts sur environnement éphémère.
- **J3-J4:** corriger vulnérabilités high sans breaking.
- **J4-J5:** lot migrations breaking deps + revalidation.
- **J5-J6:** baisse lint errors + smoke perf.
- **J7:** répétition générale de déploiement + go/no-go.

## Verdict actuel
- **Statut:** **NON PRÊT PROD**.
- **Motif principal:** qualité de validation (tests/readiness) non fiable + surface de vulnérabilités high significative.
