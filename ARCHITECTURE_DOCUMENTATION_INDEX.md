# INDEX DE LA DOCUMENTATION ARCHITECTURE E-CODE

## Documents Générés

Cette documentation a été créée le **19 novembre 2025** pour fournir une compréhension complète de l'architecture du projet E-Code.

### 1. **PROJECT_ARCHITECTURE_SUMMARY.md** (Main Document)
**Chemin**: `/home/user/e-code/PROJECT_ARCHITECTURE_SUMMARY.md`

Document principal contenant:
- Résumé exécutif
- Structure complète des dossiers
- Fichiers de configuration clés
- Points d'entrée (Frontend & Backend)
- Stack technologique complet
- Configuration base de données
- Routes API & WebSocket endpoints
- Services backend importants
- Middleware stack
- Scripts de build & déploiement
- Variables d'environnement
- Architecture résumée
- Dépendances clés
- Checklist de vérification
- Prochaines étapes

### 2. Documents de Référence (Temporaires)

#### a. Synthèse Complète
**Fichier**: `/tmp/SYNTHESIS.txt` (15 sections)
- Vue d'ensemble structure et stack
- Points d'entrée clés
- Dépendances principales
- Base de données (150+ tables)
- Endpoints WebSocket
- Fichiers de configuration critiques

#### b. Référence Rapide avec Chemins Absolus
**Fichier**: `/tmp/quick_reference.md`
- Points d'entrée avec chemins absolus
- Répertoires structurés
- Schéma base de données
- Commandes principales
- URLs & endpoints
- Variables d'environnement clés
- Fichiers de test

#### c. Services & Composants Détaillés
**Fichier**: `/tmp/services_details.md`
- Agent Services (8 fichiers)
- Monitoring & Analytics
- Real-time Services
- Infrastructure Services
- WebSocket Services
- Middleware Stack détaillé
- Routes API (51 fichiers)
- Database Tables (150+)
- Flux de données

---

## STRUCTURE DES FICHIERS CLÉS

### Points d'Entrée Absolus

**Frontend**:
```
/home/user/e-code/client/src/main.tsx
/home/user/e-code/client/src/App.tsx
/home/user/e-code/client/index.html
```

**Backend**:
```
/home/user/e-code/server/index.ts (380 lignes)
```

### Configuration Absolue

**Build & Development**:
```
/home/user/e-code/package.json
/home/user/e-code/vite.config.ts
/home/user/e-code/tsconfig.json
/home/user/e-code/tailwind.config.ts
/home/user/e-code/eslint.config.mjs
/home/user/e-code/jest.config.js
```

**Database**:
```
/home/user/e-code/drizzle.config.ts
/home/user/e-code/shared/schema.ts (3166 lignes)
/home/user/e-code/migrations/
```

**Environment**:
```
/home/user/e-code/.env.example (177 lignes)
/home/user/e-code/.env.production.example
/home/user/e-code/.env.staging
/home/user/e-code/.env (gitignored)
```

**Docker**:
```
/home/user/e-code/Dockerfile
/home/user/e-code/docker-compose.yml
/home/user/e-code/docker-compose.production.yml
```

---

## RÉSUMÉ DES COMPOSANTS

### Frontend (React 18 + Vite)
- **50+ Pages** dans `client/src/pages/`
- **Composants UI** via Radix UI (20+ libraries)
- **État**: Zustand + React Query
- **Édition**: Monaco Editor + Xterm terminal
- **Real-time**: WebSocket connections

### Backend (Express.js)
- **51 Routes** en TypeScript
- **28+ Services** (Agent, Analytics, Deployment)
- **6 Middleware** (CORS, Security, Rate-limiting)
- **9 WebSocket Servers** (Terminal, Collaboration, WebRTC, LSP)
- **150+ Tables** PostgreSQL via Drizzle ORM

### Infrastructure
- **PostgreSQL 15** - Database
- **Redis 5.8** - Cache & sessions
- **Docker** - Containerization
- **Kubernetes** - Orchestration
- **Stripe** - Billing
- **Multiple LLM APIs** - AI models

---

## DÉPENDANCES PRINCIPALES

### Frontend Stack
- react@18.3.1 + TypeScript
- vite@7.2.2 + esbuild
- tailwind@3.4.17 + radix-ui
- zustand@5.0.8 + @tanstack/react-query
- @monaco-editor/react + xterm
- socket.io-client

### Backend Stack
- express@4.21.2 + TypeScript
- drizzle-orm@0.44.6 + pg
- redis@5.8.0
- bcrypt + jsonwebtoken + passport
- @anthropic-ai/sdk + openai + google generative-ai
- socket.io + stripe

### Testing Stack
- jest@30.2.0
- @playwright/test@1.56.1
- vitest@4.0.8
- supertest@7.1.4

---

## COMMANDES IMPORTANTES

### Development
```bash
cd /home/user/e-code
npm install                    # Installation
npm run dev                    # Dev server (port 5000)
npm run typecheck              # Type checking
npm run lint                   # Linting
```

### Building
```bash
npm run build                  # Build frontend + backend
npm start                      # Production
npm run start:prod             # Production (4GB RAM)
```

### Testing
```bash
npm test                       # All tests
npm run test:ci                # CI tests
npm run test:unit              # Unit tests
npm run test:integration       # Integration tests
npm run test:e2e               # E2E tests
npm run test:full              # Full suite
```

### Database
```bash
npm run db:push                # Push schema
npm run db:migrate             # Migrate
```

### Docker
```bash
docker-compose up              # Local
docker-compose -f docker-compose.production.yml up    # Production
docker build -t e-code:latest . # Build image
```

---

## CONFIGURATION RÉSUMÉE

### Environnement Clés
- `NODE_ENV` - production/development
- `PORT` - Server port (default 3000)
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `ANTHROPIC_API_KEY` - Claude API
- `OPENAI_API_KEY` - GPT models
- `STRIPE_SECRET_KEY` - Payments

### Endpoints Importants
- `/health` - Server health
- `/api/docs` - Swagger documentation
- `/api/auth/*` - Authentication
- `/api/projects/*` - Projects
- `/api/workspace/*` - IDE workspace
- `/api/agent/*` - Autonomous agent
- `/ws/terminal` - Terminal PTY
- `/ws/collaboration` - Real-time editing

---

## ARCHITECTURE HIGH-LEVEL

```
Browser (React 18 + TypeScript)
    ↓ HTTP/WebSocket
Express Server (Node.js + TypeScript)
    ├─ 51 Route Files
    ├─ 28+ Service Files
    ├─ 6 Middleware Files
    └─ 9 WebSocket Servers
    ↓ SQL Queries (Drizzle ORM)
PostgreSQL Database
    ├─ 150+ Tables
    ├─ Users, Projects, Files
    ├─ AI Usage, Deployments
    └─ Community, Collaboration
    ↓ Cache
Redis (Sessions, Rate-limiting)

External Services:
    ├─ LLM APIs (Anthropic, OpenAI, Google, Groq)
    ├─ Stripe (Payments)
    ├─ AWS S3 (Storage)
    ├─ Sentry (Error tracking)
    └─ SendGrid (Email)
```

---

## FICHIERS À CONSULTER

### Pour Comprendre le Frontend
1. `/home/user/e-code/client/src/main.tsx` - Entry point
2. `/home/user/e-code/client/src/App.tsx` - Root component
3. `/home/user/e-code/client/index.html` - HTML template
4. `/home/user/e-code/vite.config.ts` - Build configuration

### Pour Comprendre le Backend
1. `/home/user/e-code/server/index.ts` - Entry point (380 lignes)
2. `/home/user/e-code/server/routes/` - API routes
3. `/home/user/e-code/server/services/` - Business logic
4. `/home/user/e-code/server/middleware/` - Request processing

### Pour Comprendre la BD
1. `/home/user/e-code/shared/schema.ts` - Schema definition (3166 lignes)
2. `/home/user/e-code/drizzle.config.ts` - ORM configuration
3. `/home/user/e-code/migrations/` - Database migrations

### Pour Déployer
1. `/home/user/e-code/Dockerfile` - Production image
2. `/home/user/e-code/docker-compose.yml` - Local services
3. `/home/user/e-code/.env.example` - Environment variables
4. `/home/user/e-code/build.sh` - Build script

---

## CHECKLIST DE MISE EN PLACE

- [ ] `npm install` - Installation dépendances
- [ ] Configure `.env` - Variables d'environnement
- [ ] `npm run db:migrate` - Setup BD
- [ ] `npm run dev` - Démarrer dev server
- [ ] Ouvrir `http://localhost:5000` - Test frontend
- [ ] `npm run test:unit` - Tester unitaires
- [ ] `npm run build` - Build production
- [ ] `docker build -t e-code .` - Image Docker
- [ ] `docker-compose up` - Deploy local
- [ ] Vérifier `/health` endpoint

---

## ARCHITECTURE NOTES

### Points Forts
- Full-stack TypeScript (type-safe)
- Modern React 18 + Vite (fast builds)
- Real-time WebSocket servers (9 endpoints)
- Enterprise security (CORS, rate-limiting, CSP)
- Comprehensive testing (unit, integration, e2e)
- Docker & Kubernetes ready
- Multiple LLM integrations
- Scalable microservices

### Composants Clés
1. **Agent Orchestrator** - AI autonome engine
2. **LSP Service** - Code diagnostics
3. **Collaboration Server** - Real-time editing (Yjs)
4. **WebRTC Server** - P2P voice/video
5. **Terminal Server** - PTY streaming
6. **Admin Dashboard** - User management
7. **Billing System** - Stripe integration

---

## DOCUMENTATION EXTERNE

Fichiers README/Documentation:
- `/home/user/e-code/README.md` - Main README
- `/home/user/e-code/DEPLOYMENT.md` - Deployment guide
- `/home/user/e-code/docs/` - Architecture docs
- `/home/user/e-code/docs/architecture/` - ADR documents

---

## GIT INFORMATION

**Dépôt**: `/home/user/e-code`
**Branche actuelle**: `claude/list-platform-requirements-01BsWYGbxay6jX1MpH6Prdzh`
**Status**: Clean (aucune modification non committée)
**Commits récents**:
- f15f900 - Merge pull request #218
- 1c854e9 - Merge pull request #227
- c65c5eb - Update client/src/lib/security.ts
- f446251 - Update client/src/lib/logger.ts
- 86431f1 - Update client/src/lib/analytics.ts

---

## GÉNÉRÉ LE

**Date**: 19 novembre 2025
**Documentation Version**: 1.0
**Complétude**: 100% (structure, configuration, routes, services, BD)

---

**Note**: Cette documentation fournit une vue d'ensemble complète de l'architecture E-Code. Pour plus de détails sur des composants spécifiques, consultez les fichiers sources directement.

