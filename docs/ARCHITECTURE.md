# E-code Architecture

## Cible

`replit-deploy` est la cible de production active.

## Vue d’ensemble

```text
Prompt utilisateur
  -> Bootstrap workspace
  -> Sélection modèle / fallback chain
  -> Scaffold initial moderne
  -> Génération IA incrémentale
  -> Post-processing (prettier / eslint / tsc)
  -> Synchronisation fichiers workspace + DB
  -> Runtime preview
  -> IDE / preview / panels
```

## Pipeline génération

### 1. Entrée produit

- UI création projet / prompt
- bootstrap token éventuel
- création projet + session autonome

### 2. Orchestration IA

Fichiers centraux:

- `server/ai/ai-provider-manager.ts`
- `server/routes/code-generation.router.ts`
- `server/services/agent-content-generator.service.ts`

Ordre de fallback principal:

1. `claude-opus-4-7`
2. `claude-sonnet-4-6`
3. `gpt-5-codex`
4. `gpt-4.1`
5. `claude-haiku-4-5-20251001`

### 3. Scaffold initial

Fichier central:

- `server/services/speculative-scaffold.service.ts`

Rôle:

- choisir un template initial à partir du prompt
- produire un starter réellement runnable
- injecter un design system moderne
- préparer les fichiers critiques avant génération détaillée

### 4. Post-processing

Fichier central:

- `server/ai/post-processing.ts`

Rôle:

- `prettier --write`
- `eslint --fix` non bloquant
- `tsc --noEmit`
- boucle courte de retry pour corriger les erreurs TypeScript

### 5. Stockage et synchronisation

- DB PostgreSQL via Drizzle
- fichiers projet persistés
- workspace disque utilisé comme source live pour preview/runtime
- session store persistant via PostgreSQL

### 6. Preview

Fichiers centraux:

- `server/preview/preview-service.ts`
- `server/routes/preview.ts`

Rôle:

- démarrer la preview à partir du workspace réel
- conserver le bootstrap token
- réécrire assets / fetch / navigation preview
- exposer les états réels au client

### 7. Interface IDE

Le frontend consomme:

- état bootstrap
- statut preview
- logs / panels / agent events

Objectif:

- montrer l’app demandée
- montrer des erreurs backend réelles
- éviter les états silencieux ou trompeurs

## Fondations production

- sécurité HTTP: Helmet + CSP
- traçage erreur: Sentry conditionnel
- logs: Pino
- sessions: PostgreSQL
- déploiement cible: Replit Deploy
