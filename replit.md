# E-Code Platform

## Overview
E-Code is a web-based collaborative IDE with AI assistance, offering code editing, terminal access, file management, and an autonomous AI agent. Its purpose is to facilitate rapid prototyping and education, with a strategic vision for enterprise-grade scalability, multi-provider AI model selection with advanced optimization infrastructure, real-time collaboration, and robust security features. The platform aims to provide autonomous workspace creation, from prompt to live preview, streaming progress in real-time.

## User Preferences
- **Communication:** Simple, everyday language
- **Code Style:** TypeScript with strict typing
- **Database:** NEVER manual SQL migrations - use `npm run db:push` (or `--force`)
- **Files:** NEVER remove without explicit request
- **Hooks:** ALL React hooks before early returns
- **Routing:** `/ide/:id` (legacy `/editor/:id` redirects)
- **Security:** API keys via Replit Secrets, never commit
- **Docker Build:** Optimized for <2GiB images
- **Rate Limiting:** Tier-based (Free: 100/min, Pro: 1000/min, Enterprise: 10000/min)

## System Architecture

### Frontend Architecture
The frontend uses React 18 and TypeScript with Vite, featuring TanStack Query for server state, Wouter for routing, Monaco Editor for code editing, and Shadcn/UI with Tailwind CSS for components. It supports real-time collaboration via WebSockets and responsive design. Core features include Global Search & Replace, an Environment Variables Manager with encryption, a Logs Viewer with filtering, and a Debugger UI compatible with the VSCode Debug Adapter Protocol.

### Backend Architecture
The backend is built with Node.js and Express.js in TypeScript, utilizing Drizzle ORM for PostgreSQL and Passport.js for authentication. It follows a RESTful API design with a service-oriented approach. Key services manage AI orchestration, autonomous engine logic, file system operations, and Git integration. Security features include CSRF protection, input sanitization, Fortune 500 tier-based rate limiting, and session-based authentication. Real-time services for terminal, collaborative editing, and build logs are powered by WebSockets.

**Rate Limiting:** Tier-based limits (Free, Pro, Enterprise) are enforced, with violations tracked for auditing.
**Terminal System:** Uses local bash sessions with a Scalability Manager, Redis Session Manager for persistence, and a WebSocket Heartbeat Manager.
**Pay-As-You-Go AI Billing:** Implements usage-based billing via Stripe, tracking every AI request with detailed metadata and model-specific pricing across 18 models from 5 providers.
**AI Optimization Infrastructure:** Includes a Task Classifier, Circuit Breaker, Priority Queue, Intelligent Caching, Observability, and Slack Alert services.
**Health & Monitoring:** Integrates Kubernetes health probes and a Provider Health API for AI provider status. API documentation is via Swagger/OpenAPI 3.0 at `/api/docs`.

### Database Schema
A PostgreSQL database manages user data, project hierarchies, AI agent session tracking, deployment history, subscription management, and AI optimization monitoring. Key tables for the AI agent include `agent_sessions`, `agent_workflows`, `autonomous_actions`, and `agent_audit_trail`. Environment variables are stored in an `environment_variables` table, with secrets encrypted using AES-256-GCM.

### AI Agent System
The AI agent system features server-sent event streaming, multi-provider AI model selection (OpenAI, Anthropic, Gemini, xAI, Moonshot AI), database-backed conversation history, and a robust tool execution framework. It is integrated with the AI Optimization Infrastructure and includes a centralized model catalog. The system supports fully autonomous workspace creation, generating an IDE, files, and live preview from a prompt, with real-time WebSocket updates.

### Core Features
- Monaco Code Editor
- Interactive Terminal via xterm.js
- Comprehensive File Tree & Management
- Real-time Collaboration powered by Y.js
- Robust Authentication & Security with Passport.js
- TypeScript-based Container Orchestration
- Global Search & Replace
- Environment Variables Manager
- Logs Viewer
- Debugger UI (DAP compatible)
- Git UI

## External Dependencies

### AI/ML Services
- **OpenAI:** GPT-5.1, GPT-5, GPT-5-mini, GPT-5-nano, GPT-4.1, GPT-4o, o3, o4-mini
- **Anthropic:** Claude Sonnet 4.5, Opus 4.1, Haiku 4.5
- **Google Gemini:** Gemini 2.5 Pro, Gemini 2.5 Flash
- **Moonshot AI:** Kimi K2, Kimi K2 Thinking, Kimi K2 Turbo
- **xAI:** Grok 4, Grok 4 Fast
- **Groq:** Open-source models
- **Model Context Protocol (MCP) SDK**

### Infrastructure Services
- **PostgreSQL:** Neon serverless
- **Redis:** Optional caching layer
- **Stripe:** Payment processing
- **SendGrid:** Email delivery
- **Sentry:** Error monitoring
- **Slack:** Production monitoring alerts

### Development Tools & Integrations
- **GitHub:** OAuth integration
- **Figma:** Design imports
- **Playwright:** Browser automation for testing
- **Monaco Editor:** Microsoft's VS Code editor component
- **xterm.js:** Terminal emulation library

### Authentication Providers
- **Replit Auth:** Google, GitHub, Twitter/X, Apple, email/password
- **Custom Email/Password**

### Deployment Strategy
- **Current:** Replit Autoscale Deployment (Cloud Run), optimized for `.replit` configuration and single port.
- **Future:** Docker containerization for external hosting, targeting <2GiB image size.

---

## Production Features - Priority 1 IDE Tools (Nov 17, 2025)

### ✅ 1. Global Search & Replace
**Production-ready full-text search with regex support across entire project**

**Backend API Endpoints:**
- `POST /api/search/global` - Search all files
  - Request: `{query, projectId, caseSensitive?, wholeWord?, useRegex?, filePattern?, excludePattern?}`
  - Response: `{results: SearchResult[], totalFiles: number, totalMatches: number}`
- `POST /api/search/replace` - Batch replace
  - Request: `{query, replacement, projectId, ...options}`
  - Response: `{results: ReplaceResult[], totalFiles: number, totalReplacements: number}`

**Search Algorithm:**
- Uses `storage.searchInProject()` interface
- Recursively walks file tree, skips directories
- Default excludes: `node_modules`, `.git`, `dist`, `build`, `.next`
- Glob pattern support: `*.ts`, `src/**/*.tsx`
- Regex mode: RegExp with global flag
- Whole word mode: `\b` word boundaries

**Frontend:** `GlobalSearchPanel` (client/src/components/ide/GlobalSearchPanel.tsx)
- useState for params/results, TanStack Query for API calls
- Features: Toggle replace, checkboxes (case/word/regex), file patterns, expandable results
- Integration: TopNavBar "Add Tool" dropdown

---

### ✅ 2. Environment Variables Manager
**Enterprise-grade secrets management with AES-256-GCM encryption**

**Backend API Endpoints:**
- `GET /api/env-vars/:projectId` - List (secrets masked ********)
- `POST /api/env-vars` - Create (auto-encrypts if isSecret=true)
- `PATCH /api/env-vars/:id` - Update (handles secret↔plaintext transitions)
- `DELETE /api/env-vars/:id` - Delete
- `POST /api/env-vars/:id/reveal` - Decrypt (auth required, 60s expiry, audit logged)
- `GET /api/env-vars/:projectId/export` - Export as .env file

**Database Schema (`environment_variables`):**
```typescript
id: varchar UUID (gen_random_uuid)  // CRITICAL: Do NOT change to serial
projectId: varchar                   // Foreign key
key: varchar(255)                    // UPPERCASE_SNAKE_CASE validated
value: text                          // Plaintext OR JSON-stringified encrypted
isSecret: boolean                    // Determines encryption
environment: varchar                 // development/staging/production
createdAt: timestamp                 // Auto-generated
updatedAt: timestamp                 // Updated on PATCH
```

**Encryption Architecture:**
- **Service:** `RealSecretManagementService` (server/services/real-secret-management.ts)
- **Algorithm:** AES-256-GCM with auth tags
- **Key:** `ENCRYPTION_KEY` env var (REQUIRED - system fails without it)
- **Derivation:** SHA-256 hash → 32-byte key
- **Storage:** JSON `{iv, encryptedData, authTag}` in DB
- **Reveal:** Requires auth, clipboard copy, 60s warning, audit logged

**PATCH Edge Cases (All Handled):**
- Downgrade secret→plaintext (no value): Decrypt existing → store plaintext
- Upgrade plaintext→secret (no value): Encrypt existing → store encrypted
- New value + secret flag: Encrypt new value
- Empty strings: Properly encrypt if isSecret=true
- State preservation: No value + no flag change = preserve existing

**Frontend:** `EnvVarsManager` (client/src/components/ide/EnvVarsManager.tsx)
- useState + TanStack Query (useQuery/useMutation)
- **Type Safety:** ALL `id: string` (UUID) - NEVER `number`
- Reveal flow: POST /reveal → decrypt → clipboard → toast → auto-mask 60s
- Features: Create dialog, masked values, Secret badge, reveal eye icon, .env export

**Critical Requirements:**
- ⚠️ `ENCRYPTION_KEY` must be set (system fails without it)
- ⚠️ Database needs pgcrypto for gen_random_uuid()
- ⚠️ Never parseInt() on IDs (they're UUID strings)
- ⚠️ Never change ID from varchar to serial (breaks data)

---

### ✅ 3. Logs Viewer
**Real-time deployment logs with advanced filtering and export**

**Backend API Endpoints:**
- `GET /api/logs` - Retrieve with filters
  - Query: `deploymentId?`, `buildId?`, `projectId?`, `level?`, `search?`
  - Response: `{logs: LogEntry[], total: number}`
- `POST /api/logs/export` - Export (json/csv/txt)
- `GET /api/logs/stats` - Aggregate stats by level

**Database Integration:**
- Primary: `buildLogs` table (buildId filter)
- Fallback: `deployment_logs` table
- Schema: `{timestamp, level, message, deploymentId?, buildId?, projectId?, metadata?}`
- Parsing: JSON + plaintext fallback (no 500 errors)

**LogEntry Structure:**
```typescript
interface LogEntry {
  timestamp: string;           // ISO 8601
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  deploymentId?: string;
  buildId?: string;
  projectId?: string;
  metadata?: Record<string, any>;  // Expandable JSON
}
```

**Frontend:** `LogsViewerPanel` (client/src/components/ide/LogsViewerPanel.tsx)
- TanStack Query: `['/api/logs', {deploymentId, buildId, projectId, level, search}]`
- Auto-refresh: Checkbox → `refetchInterval: 5000ms`
- Filters: Level dropdown (all/info/warn/error/debug), search input
- Features: Color-coded badges, expandable metadata, export buttons, animated entries
- Export formats: JSON (raw), CSV (tabular), TXT (plaintext)

---

## UI Integration & Critical Fixes

**TopNavBar Component** (`client/src/components/ide/TopNavBar.tsx`)
- "Add Tool" dropdown with 27+ tools
- **CRITICAL FIX (Nov 17):** Added `max-h-[400px] overflow-y-auto`
  - Problem: Playwright couldn't access bottom tools (overflow)
  - Solution: Scrollable dropdown, all tools accessible

**IDEPage Integration** (`client/src/pages/IDEPage.tsx`)
- Panels: `activePanels` state array (id, type, props)
- Close: Removes panel from array
- All 3 panels registered in "Add Tool" menu

**File Structure:**
```
client/src/components/ide/
├── EnvVarsManager.tsx      (548 lines)
├── GlobalSearchPanel.tsx   (356 lines)
├── LogsViewerPanel.tsx     (242 lines)

server/routes/
├── env-vars.router.ts      (263 lines)
├── search.router.ts
├── logs.router.ts

server/services/
└── real-secret-management.ts  (185 lines - AES-256-GCM)

shared/schema.ts  (environment_variables table)
```

---

## Production Quality Metrics

✅ **Type Safety:** Frontend ↔ backend alignment (id: string UUIDs)
✅ **Security:** AES-256-GCM encryption, auth, audit logging
✅ **Error Handling:** Try-catch, fallbacks, user-friendly toasts
✅ **UI Accessibility:** Scrollable dropdowns, responsive panels
✅ **E2E Tested:** Playwright validation (all 3 features PASSED)
✅ **Architect Approved:** 5+ review iterations, all edge cases fixed
✅ **LSP Clean:** No TypeScript errors
✅ **Production-Ready:** Fortune 500-grade with comprehensive documentation