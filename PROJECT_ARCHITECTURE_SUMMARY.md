# ARCHITECTURE COMPLÈTE DU PROJET E-CODE

**Date**: Novembre 2025
**Répertoire**: `/home/user/e-code`
**Type**: Full-Stack JavaScript/TypeScript Enterprise Application
**Branche Git**: claude/list-platform-requirements-01BsWYGbxay6jX1MpH6Prdzh

---

## RÉSUMÉ EXÉCUTIF

E-Code est une plateforme IDE collaborative avec support pour l'IA autonome, containerisation, déploiement et collaboration en temps réel. C'est une application Enterprise Fortune 500 utilisant React 18 (frontend), Express.js (backend), PostgreSQL (base de données), Redis (cache), et Docker (containerisation).

---

## 1. STRUCTURE DES DOSSIERS

### Arborescence Principale
```
/home/user/e-code/
├── client/                  # Frontend React - Vite + React 18
├── server/                  # Backend Express.js - Node.js
├── shared/                  # Code partagé (Schéma BD, Types)
├── mobile/                  # Application mobile React Native
├── sdk/                     # SDKs (TypeScript/JavaScript)
├── cli/                     # CLI tool
├── services/                # Microservices (Go, Python)
├── test/                    # Tests (unit, integration, e2e)
├── docs/                    # Documentation
├── kubernetes/              # Config Kubernetes
├── deploy/                  # Scripts déploiement
├── migrations/              # Migrations BD
├── drizzle/                 # Config ORM Drizzle
└── vscode-extension/        # Extension VSCode
```

### Frontend Structure (`client/`)
```
client/src/
├── main.tsx                 # Point d'entrée React
├── App.tsx                  # Composant racine
├── pages/                   # 50+ pages (AI, Admin, Workspace, etc.)
├── components/              # Composants réutilisables (Radix UI)
├── lib/                     # Utilitaires (api.ts, auth.ts, security.ts)
├── hooks/                   # React hooks personnalisés
├── stores/                  # État (Zustand)
├── styles/                  # CSS/Tailwind
├── types/                   # Définitions TypeScript
├── constants/               # Constantes
├── design-system/           # Composants design système
└── utils/                   # Fonctions utilitaires
```

### Backend Structure (`server/`)
```
server/
├── index.ts                 # Point d'entrée serveur (380 lignes)
├── ai.ts                    # Configuration IA
├── auth.ts                  # Logique authentification (34 KB)
├── db.ts                    # Connexion BD
├── db-init.ts               # Initialisation BD
├── db-seed.ts               # Seed données test
├── git.ts                   # Intégration Git (18 KB)
├── deployment.ts            # Logique déploiement (14 KB)
├── routes/                  # 51 fichiers de routes
├── services/                # 28+ fichiers services
├── middleware/              # CORS, Security, Rate-limiting
├── websocket/               # Servers real-time
├── terminal/                # Terminal/shell execution
├── agent/                   # Orchestration agent autonome
├── ai/                      # Intégration modèles IA
├── billing/                 # Stripe & billing
├── analytics/               # Tracking & analytics
├── deployment/              # Docker & déploiement
├── containers/              # Gestion containers
└── health/                  # Health checks K8s
```

### Shared Code (`shared/`)
```
shared/
├── schema.ts                # Schéma Drizzle (3166 lignes, 150+ tables)
├── agent/                   # Logique agent partagée
├── stores/                  # État Zustand partagé
├── schema/                  # Validation Zod
└── theme/                   # Thème partagé
```

---

## 2. FICHIERS DE CONFIGURATION CLÉS

### Build & Development
| Fichier | Chemin | Description |
|---------|--------|-------------|
| `package.json` | `/home/user/e-code/package.json` | Dépendances & scripts npm |
| `vite.config.ts` | `/home/user/e-code/vite.config.ts` | Config build frontend |
| `tsconfig.json` | `/home/user/e-code/tsconfig.json` | Config TypeScript |
| `tsconfig.server.json` | `/home/user/e-code/tsconfig.server.json` | Config TypeScript serveur |
| `tailwind.config.ts` | `/home/user/e-code/tailwind.config.ts` | Config Tailwind CSS |
| `eslint.config.mjs` | `/home/user/e-code/eslint.config.mjs` | Config ESLint |
| `jest.config.js` | `/home/user/e-code/jest.config.js` | Config Jest |
| `playwright.config.ts` | `/home/user/e-code/playwright.config.ts` | Config Playwright |

### Base de Données
| Fichier | Chemin | Description |
|---------|--------|-------------|
| `drizzle.config.ts` | `/home/user/e-code/drizzle.config.ts` | Config Drizzle ORM |
| `shared/schema.ts` | `/home/user/e-code/shared/schema.ts` | Schéma BD (3166 lignes) |
| `migrations/` | `/home/user/e-code/migrations/` | Migrations SQL |

### Environnement
| Fichier | Chemin | Description |
|---------|--------|-------------|
| `.env.example` | `/home/user/e-code/.env.example` | Variables env (177 lignes) |
| `.env.production.example` | `/home/user/e-code/.env.production.example` | Config production |
| `.env.staging` | `/home/user/e-code/.env.staging` | Config staging |
| `.env` | `/home/user/e-code/.env` | Variables locales |

### Docker & Conteneurisation
| Fichier | Chemin | Description |
|---------|--------|-------------|
| `Dockerfile` | `/home/user/e-code/Dockerfile` | Image production multi-stage |
| `Dockerfile.dev` | `/home/user/e-code/Dockerfile.dev` | Image développement |
| `docker-compose.yml` | `/home/user/e-code/docker-compose.yml` | Services locaux |
| `docker-compose.production.yml` | `/home/user/e-code/docker-compose.production.yml` | Services production |

---

## 3. POINTS D'ENTRÉE CLÉS

### Frontend
```typescript
// /home/user/e-code/client/src/main.tsx
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
```

### Backend
```typescript
// /home/user/e-code/server/index.ts (380 lignes)
import 'dotenv/config';
import express from "express";

const app = express();
app.use(configureCors()); // CORS sécurisé
app.use(securityMiddleware()); // CSP, HSTS, etc.
app.use(rateLimiters); // DDoS protection
// ... Setup WebSocket servers
httpServer.listen(port, "0.0.0.0");
```

### HTML Template
```html
<!-- /home/user/e-code/client/index.html -->
<html lang="en">
  <head>
    <title>E-Code - Code, Create, and Learn Together</title>
    <link rel="manifest" href="/manifest.json">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## 4. STACK TECHNOLOGIQUE

### Frontend
- **Framework**: React 18.3 + TypeScript 5.6
- **Build**: Vite 7.2 + esbuild
- **Styling**: Tailwind CSS 3.4 + Radix UI (20+ components)
- **Code Editor**: Monaco Editor 0.52 + Yjs (collaboration)
- **Terminal**: Xterm 5.3
- **State**: Zustand 5.0, React Query 5.60
- **Forms**: React Hook Form 7.55
- **Charts**: Recharts 2.15
- **Real-time**: Socket.io, WebSocket
- **Testing**: Jest 30.2, Playwright 1.56, Vitest

### Backend
- **Runtime**: Node.js 18+ (tsx 4.20)
- **Framework**: Express 4.21
- **Database**: PostgreSQL 15 + Drizzle ORM 0.44
- **Cache**: Redis 5.8
- **Security**: bcrypt 6.0, JWT 9.0, Passport
- **LLM APIs**: Anthropic, OpenAI, Google, Groq
- **WebSocket**: Socket.io 4.8, WebRTC, Yjs
- **Monitoring**: Sentry 8.55, Winston, OpenTelemetry
- **Container**: Docker, Kubernetes 1.3
- **Billing**: Stripe 18.4

### Key Dependencies (250+ packages)
- @anthropic-ai/sdk, openai, @google/generative-ai, groq-sdk
- drizzle-orm, pg, redis, socket.io
- helmet, cors, express-rate-limit
- stripe, firebase-admin, @sendgrid/mail

---

## 5. CONFIGURATION BASE DE DONNÉES

### ORM: Drizzle ORM
```typescript
// /home/user/e-code/drizzle.config.ts
export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",  // 3166 lignes
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL
  }
});
```

### Tables Principales (150+)
- **Utilisateurs**: users, sessions, emailVerificationTokens, passwordResetTokens
- **Projets**: projects, files, fileOperations
- **IA**: aiTokenUsage, aiUsageRecords, aiRequestQueue, agentSessions, agentWorkflows
- **Déploiement**: deployments, buildExecutions, buildLogs, deploymentMetrics
- **Collaboration**: collaborationSessions, collaborationPresence, comments
- **Billing**: userCredits, usageAlerts, budgetLimits
- **Monitoring**: auditLogs, securityScans, performanceMetrics, errorLogs

### Migrations
```
/home/user/e-code/migrations/
├── 0000_tired_shotgun.sql (Initial - 48KB)
├── 0001_newsletter_system.sql
├── 0002_community_system.sql
├── 0003_notification_preferences_fk_fix.sql
└── meta/
```

---

## 6. ROUTES API & ENDPOINTS

### Routes Principales (51 fichiers)
| Route | Fichier | Purpose |
|-------|---------|---------|
| `/api/auth/*` | auth.router.ts | OAuth, login, register |
| `/api/projects/*` | projects.router.ts | CRUD projets |
| `/api/workspace/*` | workspace.ts | Workspace IDE |
| `/api/agent/*` | agent.router.ts | Agent autonome |
| `/api/admin/*` | admin.ts | Admin dashboard |
| `/api/terminal/*` | terminal.router.ts | Terminal shell |
| `/api/ai/*` | ai-models.router.ts | Modèles IA |
| `/api/billing/*` | billing.router.ts | Stripe, subscriptions |
| `/api/deployment/*` | deployment.router.ts | Déploiement |
| `/api/collaboration/*` | collaboration.ts | Édition collaborative |

### Health Checks (K8s)
- `/health` - Simple health status
- `/health/liveness` - K8s liveness probe
- `/health/readiness` - K8s readiness probe
- `/health/deep` - Health profond
- `/health/startup` - K8s startup probe

### WebSocket Endpoints
- `/ws/terminal` - Terminal PTY
- `/ws/collaboration` - Édition collaborative (Yjs CRDT)
- `/ws/webrtc` - Voice/video P2P
- `/ws/lsp` - Language Server Protocol
- `/ws/build-logs` - Build output streaming
- `/ws/test-runs` - Test results streaming
- `/ws/security-scanner` - Security scans
- `/ws/resources` - Resource metrics
- `/ws/agent` - Agent autonomous updates

---

## 7. SERVICES BACKEND IMPORTANTS (28+ fichiers)

### Agent Autonome (8 services)
- **agent-orchestrator.service.ts** (36 KB) - Chef d'orchestration
- **agent-autonomous-engine.service.ts** - Moteur autonome
- **agent-tool-framework.service.ts** (31 KB) - Framework outils
- **agent-plan-generator.service.ts** - Génération plans
- **agent-workflow-engine.service.ts** - Exécution workflows
- **agent-command-execution.service.ts** - Exécution commandes
- **agent-file-operations.service.ts** (18 KB) - Opérations fichiers
- **agent-testing-orchestrator.service.ts** - Orchestration tests

### Monitoring & Analytics
- **advanced-analytics-service.ts** (20 KB) - Event tracking
- **advanced-monitoring.ts** - Infrastructure metrics
- **admin-service.ts** (14 KB) - Admin management

### Real-Time Services
- **LSPService.ts** (13 KB) - Language diagnostics
- **BuildLogsService.ts** (10 KB) - Build logs streaming
- **TestRunsService.ts** (11 KB) - Test results
- **SecurityScannerService.ts** (10 KB) - Security scanning
- **ResourcesService.ts** (9 KB) - Resource metrics

### Infrastructure
- **advanced-deployment-service.ts** - Deployment orchestration
- **advanced-capabilities-service.ts** (23 KB) - Advanced features
- **ai-billing-service.ts** - AI billing tracking

---

## 8. MIDDLEWARE STACK

| Middleware | Fichier | Fonction |
|-----------|---------|---------|
| CORS | cors-config.ts | Whitelist origins, credentials |
| Security | security.ts | CSP, HSTS, X-Frame-Options |
| Rate Limit | rate-limiter.ts | DDoS protection |
| Tier Limits | tier-rate-limiter.ts | Free: 100/min, Pro: 1000/min, Enterprise: 10000/min |
| Input Validation | input-validation.ts | XSS sanitization |
| Passport | passport-setup.ts | OAuth2, JWT, Sessions |

---

## 9. SCRIPTS DE BUILD & DÉVELOPPEMENT

### Development
```bash
npm install                    # Install dependencies
npm run dev                    # Launch dev server (PORT 5000)
npm run typecheck              # Type checking
npm run lint                   # Linting
npm run db:push                # Push schema changes
```

### Production
```bash
npm run build                  # Build frontend + backend
npm start                      # Launch production
npm run start:prod             # Production (4GB memory)
./build.sh                     # Full build script
```

### Testing
```bash
npm test                       # All tests
npm run test:ci                # CI tests (typecheck)
npm run test:unit              # Unit tests (Jest)
npm run test:integration       # Integration tests
npm run test:e2e               # E2E tests (Playwright)
npm run test:full              # Complete suite
```

### Docker
```bash
docker-compose up              # Local development
docker-compose -f docker-compose.production.yml up    # Production
docker build -t e-code:latest . # Build image
```

---

## 10. VARIABLES D'ENVIRONNEMENT CLÉS

```env
# Application
NODE_ENV=production|development
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@host:5432/ecode
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=secret_key
SESSION_SECRET=secret_key
ENCRYPTION_KEY=32_char_minimum_key

# LLM APIs
ANTHROPIC_API_KEY=your_key
OPENAI_API_KEY=your_key
GOOGLE_API_KEY=your_key

# Stripe
STRIPE_SECRET_KEY=your_key
STRIPE_PUBLISHABLE_KEY=your_key

# AWS S3
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET=e-code-files

# OAuth
GITHUB_CLIENT_ID=your_id
GITHUB_CLIENT_SECRET=your_secret

# Monitoring
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# Email
SENDGRID_API_KEY=your_key
EMAIL_FROM=noreply@e-code.app
```

---

## 11. ARCHITECTURE RÉSUMÉE

```
FRONTEND (React 18)
    ↓ HTTP/WebSocket
EXPRESS SERVER (Node.js)
    ├─ Routes (51 fichiers)
    ├─ Middleware (CORS, Security, Rate-limiting)
    ├─ Services (Agent, Analytics, Deployment)
    └─ WebSocket Servers (Terminal, Collaboration, WebRTC, LSP)
    ↓ SQL Queries
POSTGRESQL DATABASE
    ├─ 150+ tables
    ├─ Users, Projects, Files
    ├─ AI Usage, Deployments, Billing
    └─ Community, Collaboration, Audit Logs
    ↓ Cache Layer
REDIS
    ├─ Session storage
    ├─ Rate limiting
    └─ Pub/Sub

EXTERNAL SERVICES:
    ├─ LLM APIs (Anthropic, OpenAI, Google, Groq)
    ├─ Payment (Stripe)
    ├─ Storage (AWS S3)
    ├─ Monitoring (Sentry, Datadog)
    └─ Notifications (SendGrid, Slack)
```

---

## 12. DÉPENDANCES CLÉS

### Top-Level Dependencies (250+ packages)

**Frontend**:
- react@18.3.1, react-dom@18.3.1
- @vitejs/plugin-react@4.3.2
- @tanstack/react-query@5.60.5
- @radix-ui/* (20+ libraries)
- zustand@5.0.8
- framer-motion@11.13.1

**Backend**:
- express@4.21.2
- drizzle-orm@0.44.6
- pg@8.16.3
- redis@5.8.0
- bcrypt@6.0.0

**IA**:
- @anthropic-ai/sdk@0.37.0
- openai@4.104.0
- @google/generative-ai@0.24.1
- groq-sdk@0.34.0

---

## 13. CHECKLIST DE VÉRIFICATION

### Architecture
- ✅ Frontend/Backend séparation
- ✅ Schéma BD versionné
- ✅ Configuration environnement
- ✅ Docker multi-stage
- ✅ Kubernetes support

### Sécurité
- ✅ CORS configuration
- ✅ Security headers (CSP, HSTS)
- ✅ Rate limiting (DDoS protection)
- ✅ Input validation (XSS sanitization)
- ✅ Authentication (JWT + OAuth2)

### Performance
- ✅ Caching (Redis)
- ✅ Code splitting
- ✅ Asset optimization
- ✅ Database indexing
- ✅ CDN support

### Monitoring
- ✅ Health checks (K8s)
- ✅ Error tracking (Sentry)
- ✅ Performance metrics
- ✅ Logging (Winston)
- ✅ OpenTelemetry

### Testing
- ✅ Unit tests (Jest)
- ✅ Integration tests
- ✅ E2E tests (Playwright)
- ✅ Type checking (TypeScript)

---

## 14. PROCHAINES ÉTAPES

1. **Setup**: `npm install`, configure `.env`, `npm run db:migrate`
2. **Development**: `npm run dev`, open http://localhost:5000
3. **Testing**: `npm run test:full`
4. **Build**: `npm run build`
5. **Deploy**: `docker build -t e-code . && docker-compose up`

---

## Fichiers Référence Complète

Voir aussi les fichiers générés:
- `PROJECT_ARCHITECTURE_SUMMARY.md` (ce fichier)
- Documentation complète en `/tmp/`

