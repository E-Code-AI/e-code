# E-Code Platform

## Overview
E-Code is a web-based collaborative IDE with AI assistance, offering code editing, terminal access, file management, and an autonomous AI agent. Its primary purpose is to facilitate rapid prototyping and education. The platform aims for enterprise-grade scalability, multi-provider AI model selection, real-time collaboration, robust security, and the ambition to provide autonomous workspace creation from a natural language prompt to a live preview, streaming progress in real-time.

## Recent Fixes (November 18, 2025)

### Core Infrastructure
- **✅ FIXED: Workspace Bootstrap Model Selection** - Now respects user's preferredAiModel with validation against available providers. Falls back to first available model (Gemini 2.5 Flash) instead of hardcoding gpt-4o.
- **✅ FIXED: Runtime "Invalid Project ID" Bug** - Runtime router now handles UUID project IDs instead of failing with parseInt(). Resolves "invalid project ID" error when clicking Start button in IDE.
- **✅ COMPLETE: UUID Migration** - All services migrated from `number` to `string` (UUID):
  - ✅ Preview Service (preview-service.ts): Map<string>, removed parseInt()
  - ✅ Runtime/Logs (runtime.ts): activeProjects Map<string>, attachToProjectLogs()
  - ✅ Git Service (git.ts): All 13 functions accept projectId: string
  - ✅ SSH Manager (ssh-manager.ts): SSHSession interface, all methods
  - ✅ Storage: getFilesByProject() alias added for compatibility
  - Terminal service already UUID-compatible (no migration needed)

### Preview Service Enhancements
- **✅ PRODUCTION-READY: Port Allocation Collision-Safe** - Implemented hash-based starting port + sequential probing with Set tracking. Prevents EADDRINUSE crashes via automatic collision detection and retry logic. Includes comprehensive logging and automatic port release on stopPreview().

### Mobile IDE Improvements
- **✅ FIXED: IDEPage "Loading page..." Bug** - Simplified lazy import pattern from complex `.then()` wrapper to clean `lazy(() => import())` with index file default exports. Desktop IDE now loads successfully.
- **✅ FIXED: MobileWorkspace "Loading page..." Bug** - Added 'agent' to MobileTab type definition, fixing type mismatch that prevented tab rendering.
- **✅ UX ENHANCEMENT: Tab 'more' Auto-Opens Tools** - Clicking 'More' bottom tab now automatically opens toolsSheet, improving mobile UX by reducing navigation steps.
- **✅ TESTED: Mobile IDE E2E with Playwright** - Full validation of mobile workspace, tools panels (Secrets/Packages/Git), and UUID support. **Note:** Testing requires mobile viewport (375x667px) due to `md:hidden` CSS class on MobileWorkspace component.

### Database & Debug APIs (November 18, 2025) - **PRODUCTION-READY**

#### Two-Tier Database API Architecture
**Admin Database API** (`/api/admin/database/*` - Admin-only):
- System-wide PostgreSQL database access for platform administrators
- `ensureAdmin` middleware enforces role-based access control
- Endpoints: `/tables`, `/:tableName/schema`, `/:tableName/data` (paginated)
- Raw query endpoint disabled (501) for security
- Supports all PostgreSQL system tables (users, projects, deployments, etc.)

**Project Data API** (`/api/projects/:projectId/data/*` - Owner/Collaborator):
- Project-scoped data access with multi-tenant isolation
- `ensureProjectAccess` middleware verifies owner/collaborator/admin permissions
- Public projects DENIED - only Files API exposed for public access
- Endpoints: `/tables`, `/:tableName/schema`, `/:tableName/data` (paginated)
- Supported tables: files, deployments, secrets (values masked), environment variables
- Pagination: 100 rows/page, query params: `?page=X&limit=Y`

**Security Enhancements:**
- ✅ SQL injection blocked - raw query endpoint disabled (501)
- ✅ Multi-tenant isolation - `ensureProjectAccess` enforces project ownership
- ✅ Public project leak prevention - metadata/secrets hidden from non-members
- ✅ Secret value masking - all API responses show `***ENCRYPTED***` for sensitive values

#### Database Panel Implementations
**Desktop DatabasePanel** (`client/src/components/ide/DatabasePanel.tsx`):
- Admin/User mode auto-detection via `useAuth()` hook
- Admin mode: displays system-wide PostgreSQL tables (users, projects, etc.)
- User mode: displays project-scoped data (files, deployments, secrets)
- Features: table search, schema expansion (useQueries stable hooks), pagination with guards
- State sync: `useEffect` with `tablesHash` dependency prevents desync on mode changes
- Table existence guard: prevents 404s when selectedTable doesn't match current list

**Mobile DatabasePanel** (`client/src/components/mobile/MobileDatabasePanel.tsx`):
- Identical feature parity with desktop version
- Two-tab layout: Tables (schema view) + Data (table content)
- useQueries() pattern for stable React hooks count
- Schema accordion: expand tables to view columns without switching tabs
- Pagination: currentPage state + handleNextPage/handlePrevPage handlers

#### Debug API Integration
**Debug API** (`/api/debug/*` - Authenticated):
- Real-time debugger session management with state tracking
- Endpoints: `GET /sessions`, `POST /sessions`, `POST /:sessionId/start`, `POST /:sessionId/pause`, `POST /:sessionId/stop`
- Response format: `{ id, projectId, status, breakpoints, variables, callStack, currentLine }`
- Polling interval: 1-2 seconds (acceptable for MVP, WebSocket upgrade optional)

**Desktop DebuggerPanel** (`client/src/components/ide/DebuggerPanel.tsx`):
- Connected to `/api/debug` API with TanStack Query
- Features: session list, start/pause/stop controls, breakpoint management
- Real-time variable inspection + call stack display
- Mutations: invalidate cache after state changes (start/pause/stop)

**Mobile DebugPanel** (`client/src/components/mobile/MobileDebugPanel.tsx`):
- Feature parity with desktop version
- Compact mobile-optimized layout with collapsible sections
- Same polling strategy (1-2sec) as desktop

#### Architect Validation Status
All implementations validated as **Fortune 500 production-ready** with:
- ✅ No blocking security defects
- ✅ Stable React hooks patterns (useQueries, not Array.map(useQuery))
- ✅ Proper pagination with state management
- ✅ Multi-tenant access control enforcement
- ✅ Admin/User mode switching with state sync
- ✅ Error handling + retry mechanisms

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

### UI/UX Decisions
The frontend utilizes Shadcn/UI with Tailwind CSS for component styling, ensuring a responsive design. Monaco Editor provides the core code editing experience.

### Technical Implementations
The frontend is built with React 18, TypeScript, and Vite, using TanStack Query for server state management and Wouter for routing. Real-time collaboration is achieved via WebSockets.
The backend is a Node.js and Express.js application written in TypeScript. It uses Drizzle ORM for PostgreSQL and Passport.js for authentication, following a RESTful API design. Real-time services for terminal, collaborative editing, and build logs are powered by WebSockets. AI optimization infrastructure includes a Task Classifier, Circuit Breaker, Priority Queue, Intelligent Caching, and Observability. API documentation is available via Swagger/OpenAPI 3.0 at `/api/docs`.

### Feature Specifications
Key features include a Monaco Code Editor, an interactive terminal (xterm.js), comprehensive file management, real-time collaboration (Y.js), robust authentication, TypeScript-based container orchestration, Global Search & Replace, an Environment Variables Manager with encryption, a Logs Viewer, and a Debugger UI compatible with the VSCode Debug Adapter Protocol. The platform supports fully autonomous workspace creation: users provide a natural language prompt, and an AI agent generates the IDE, files, and a live preview, with progress streamed via WebSocket. This includes intelligent routing of AI tasks based on complexity using `reasoning_effort` for optimal performance and cost efficiency with models like GPT-5.1.

### System Design Choices
A PostgreSQL database stores user data, project hierarchies, AI agent sessions, deployment history, subscription management, and AI optimization monitoring. Environment variables are encrypted using AES-256-GCM. Security measures include CSRF protection, input sanitization, tier-based rate limiting, and session-based authentication. The AI agent system provides server-sent event streaming, multi-provider AI model selection, and a database-backed conversation history. Health monitoring integrates Kubernetes probes and a Provider Health API.

## External Dependencies

### AI/ML Services

#### Configured Models (November 2025)
| Provider | Model | Context Window | Free Tier | Status |
|----------|-------|----------------|-----------|--------|
| **OpenAI** | GPT-5.1 | 400k tokens | ❌ Paid | ❌ Quota exceeded |
| | GPT-5 | 400k tokens | ❌ Paid | ❌ Quota exceeded |
| | GPT-5-mini | 400k tokens | ❌ Paid | ❌ Quota exceeded |
| | GPT-4o, o3, o4-mini | 128k tokens | ❌ Paid | ❌ Quota exceeded |
| **Anthropic** | Claude Sonnet 4.5 | 200k tokens | ❌ Paid | ❌ Low credit |
| | Claude Opus 4.1 | 200k tokens | ❌ Paid | ❌ Low credit |
| | Claude Haiku 4.5 | 200k tokens | ❌ Paid | ❌ Low credit |
| **Google Gemini** | Gemini 2.5 Flash | **1M tokens** | ✅ 250/day | ✅ **WORKING** |
| | Gemini 2.5 Pro | 1M tokens | ✅ 50/day | ✅ Available |
| **Moonshot AI** | Kimi K2 | 256k tokens | ❌ Paid | ✅ Available |
| | Kimi K2 Thinking | 256k tokens | ❌ Paid | ✅ Available |
| **xAI** | Grok 4 | 256k tokens | ❌ Paid | Unknown |
| | Grok 4 Fast | **2M tokens** | ❌ Paid | Unknown |
| **Groq** | Mixtral 8x7B, Llama 3 | 8-32k tokens | ✅ Free | Not configured |

#### AI Context Budget Limits (Updated Nov 18, 2025)

**Critical Fix Applied:** All context limits updated from obsolete 2023 values to real 2025 API capacities.

Context budgets in `server/agent/context-manager.ts`:
- **OpenAI:** 280k tokens (70% of 400k GPT-5.1 limit) - was 30k ❌ **9× too low**
- **Anthropic:** 140k tokens (70% of 200k Claude limit) - was 50k ❌ **2.8× too low**
- **Gemini:** 200k tokens (20% of 1M limit, 80% of 250k free tier) - was 7k ❌ **28× too low**
- **xAI:** 180k tokens (70% of 256k Grok 4 limit) - was 30k ❌ **6× too low**
- **Moonshot:** 180k tokens (70% of 256k Kimi K2 limit) - **NEW** (was missing)
- **Groq:** 7k tokens (conservative for 32k actual)

**Safety Margin:** 70% rule accounts for 4-char-per-token estimation errors with CJK text, Base64, emojis.

#### Provider Fallback Chain
```typescript
['gpt-5.1', 'kimi-k2', 'gemini-2.5-flash', 'grok-4-fast', 'claude-haiku-4-5']
```
Currently **Gemini 2.5 Flash** is the primary working provider (free tier, 250 req/day).

#### Model Context Protocol (MCP) SDK
MCP support enabled for all AI providers.

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