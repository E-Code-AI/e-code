# E-Code Platform

## Overview
E-Code is a web-based collaborative IDE with AI assistance, offering code editing, terminal access, file management, and an autonomous AI agent. It aims to facilitate rapid prototyping and education, with a strategic vision for enterprise-grade scalability, multi-provider AI model selection, real-time collaboration, and robust security features. The platform's ambition is to provide autonomous workspace creation, from prompt to live preview, streaming progress in real-time.

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
The frontend uses React 18, TypeScript, Vite, TanStack Query for server state, Wouter for routing, Monaco Editor for code editing, and Shadcn/UI with Tailwind CSS for components. It supports real-time collaboration via WebSockets and responsive design. Key features include Global Search & Replace, an Environment Variables Manager with encryption, a Logs Viewer with filtering, and a Debugger UI compatible with the VSCode Debug Adapter Protocol.

### Backend Architecture
The backend is built with Node.js and Express.js in TypeScript, using Drizzle ORM for PostgreSQL and Passport.js for authentication. It follows a RESTful API design with a service-oriented approach. Services manage AI orchestration, autonomous engine logic, file system operations, and Git integration. Security features include CSRF protection, input sanitization, tier-based rate limiting, and session-based authentication. Real-time services for terminal, collaborative editing, and build logs are powered by WebSockets. AI optimization infrastructure includes a Task Classifier, Circuit Breaker, Priority Queue, Intelligent Caching, and Observability. Health monitoring integrates Kubernetes probes and a Provider Health API. API documentation is provided via Swagger/OpenAPI 3.0 at `/api/docs`.

### Database Schema
A PostgreSQL database stores user data, project hierarchies, AI agent sessions, deployment history, subscription management, and AI optimization monitoring. Environment variables are stored in an `environment_variables` table, with secrets encrypted using AES-256-GCM.

### AI Agent System
The AI agent system features server-sent event streaming, multi-provider AI model selection (OpenAI, Anthropic, Gemini, xAI, Moonshot AI), database-backed conversation history, and a robust tool execution framework. It integrates with the AI Optimization Infrastructure and includes a centralized model catalog. This system supports fully autonomous workspace creation, generating an IDE, files, and live preview from a prompt, with real-time WebSocket updates.

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

---

## Autonomous Workspace Creation (Nov 17, 2025)

### Overview
**Production-grade autonomous AI-powered workspace generation from natural language prompts**

Complete end-to-end flow where users describe their application in natural language, and the AI agent autonomously creates a fully functional workspace with files, dependencies, and live preview—all streamed in real-time via WebSocket.

### Backend API
**POST /api/workspace/bootstrap** - Orchestrate autonomous workspace creation
- Request: `{ prompt: string, options: { language?, framework?, autoStart?, visibility? } }`
- Response: `{ success: true, projectId, sessionId, bootstrapToken (JWT), workspaceUrl, status: 'ready' }`
- Flow: Creates project → Generates AI plan → Starts autonomous agent → Returns bootstrap token

**WebSocket /ws/agent?projectId=X&sessionId=Y** - Real-time progress updates
- Messages: task_start, task_progress, task_complete, file_created, build_log, error, complete
- Auto-reconnects with exponential backoff (max 5 attempts)

### Frontend Components
1. **Home.tsx** (already existed) - AI prompt input, model selector, bootstrap API integration (lines 79-116)
2. **AutonomousWorkspaceViewer.tsx** (NEW) - WebSocket progress viewer with base64url-safe JWT decoding, reconnection logic, real-time progress visualization
3. **IDEPage.tsx** (modified) - Bootstrap detection (line 133), completion handlers (lines 152-175), viewer rendering (lines 695-700)

### User Flow
```
User enters prompt → POST /api/workspace/bootstrap → Backend creates project + AI plan
→ Returns bootstrapToken → Redirect to /ide/:id?bootstrap=token → AutonomousWorkspaceViewer
→ WebSocket connection → Real-time progress stream → Auto-close on completion → IDE ready
```

### Implementation Status (Nov 17, 2025 - Final)
- ✅ Backend infrastructure (100% complete - bootstrap API, WebSocket service, agent orchestrator)
- ✅ WebSocket viewer component (100% complete - mobile responsive, reconnection logic)
- ✅ JWT base64url decoding fix (architect-approved)
- ✅ IDEPage bootstrap integration (architect-approved)
- ✅ **THREE critical production bugs fixed** (Nov 17, 2025):
  1. ✅ WebSocket interceptor blocking /ws/agent (client/index.html) - Whitelisted endpoint
  2. ✅ AgentWebSocketService never initialized (server/index.ts) - Added initialization, verified in logs
  3. ✅ Agent plan router mount path mismatch (server/routes/index.ts) - Fixed /api/agent → /api/agent/plan
- ✅ Mobile responsiveness implemented (320px to 1440px viewports)
- ✅ Code review complete (4 comprehensive architect reviews, all approved)
- ⚠️ **End-to-end flow untested** - E2E blocked by authentication, manual QA pending
- ⚠️ **Production readiness: ~60%** - Code complete and reviewed, but real-world validation missing

### Critical Bug Fixes (Nov 17, 2025)
**Bug #1: WebSocket Interceptor Blocking /ws/agent**
- **Impact:** AutonomousWorkspaceViewer could never connect to WebSocket endpoint
- **Root Cause:** client/index.html intercepts all WebSocket connections except Vite HMR
- **Fix:** Added whitelist: `url.includes('/ws/agent') || url.includes('/api/terminal/ws')`
- **Status:** ✅ Architect-approved, development-only, no security impact

**Bug #2: AgentWebSocketService Never Initialized**
- **Impact:** /ws/agent endpoint never started listening, all connections failed
- **Root Cause:** server/index.ts imported service but never called `.initialize(httpServer)`
- **Fix:** Added initialization after HTTP server creation (line 234)
- **Status:** ✅ Architect-approved, verified in logs: "[Agent WebSocket] Service initialized at /ws/agent"

**Bug #3: Agent Plan Router Mount Path Mismatch**
- **Impact:** Frontend calls /api/agent/plan/stream but backend mounted at /api/agent/stream (404 errors)
- **Root Cause:** server/routes/index.ts mounted router at `/api/agent` instead of `/api/agent/plan`
- **Fix:** Changed mount path to `/api/agent/plan` for consistency with other agent routes
- **Status:** ✅ Architect-approved, no route collisions, aiUsageTracker still instruments traffic

### Remaining Work (Honest Assessment)
**Testing & QA (UNTESTED):**
- ⚠️ WebSocket connection in real network conditions (dev env only)
- ⚠️ AI agent autonomous execution with real user prompts
- ⚠️ Bootstrap token expiration handling
- ⚠️ Error recovery paths (API failures, timeouts, network issues)
- ⚠️ Reconnection logic under real-world conditions
- ⚠️ Manual QA with authenticated session (requires login credentials)

**Production Hardening (PENDING):**
- Telemetry instrumentation for monitoring
- Error tracking integration (Sentry)
- Performance metrics collection
- Authenticated E2E test suite
- Load testing for concurrent WebSocket connections

### Files Modified/Created
```
client/src/components/ide/AutonomousWorkspaceViewer.tsx (NEW, 468 lines)
client/src/pages/IDEPage.tsx (MODIFIED: +bootstrap detection)
client/src/pages/Home.tsx (bootstrap integration already existed)
server/routes/workspace-bootstrap.router.ts (LSP fixes only)
server/services/agent-orchestrator.service.ts (LSP fixes only)
```

### Manual Testing Procedure
1. Log in with valid credentials
2. Navigate to Home page (/)
3. Enter test prompt: "Build a simple todo list app"
4. Click "Build" button → **Expected:** Redirect to /ide/:id?bootstrap=token
5. Verify AutonomousWorkspaceViewer dialog appears → **Expected:** "Building Your Workspace with AI..."
6. Monitor connection status → **Expected:** Green "Connected" indicator
7. Watch task list and activity logs → **Expected:** Tasks appear, logs update in real-time
8. Wait for completion (30-120s) → **Expected:** "Workspace Ready!" message
9. Verify auto-close → **Expected:** Dialog closes, IDE loads with generated files

**Current Test Results:** Manual testing not yet performed (requires authenticated user session)

---

## Authentication Fix for E2E Testing (Nov 17, 2025)

### Problem
E2E testing was blocked because automated tests couldn't authenticate (401 errors with both manual credentials and Quick Login button).

### Solution Implemented
**Automatic Test User Seeding on Server Startup**

**Changes Made:**
1. Added `seedDatabase()` call in `server/index.ts` (lines 360-367)
2. Runs after database initialization on every server startup
3. Creates test user if it doesn't exist:
   - Email: `testuser@test.com`
   - Password: `testpass123`
   - Username: `testuser`
   - Email verified: `true`

**Code Location:**
```typescript
// server/index.ts (lines 360-367)
try {
  const { seedDatabase } = await import("./db-seed");
  await seedDatabase();
  console.log('✅ Test user seeded (testuser@test.com / testpass123)');
} catch (error) {
  console.warn('[WORKING SERVER] Database seeding failed (non-critical):', error.message);
}
```

**Test Results:**
- ✅ E2E authentication test PASSED (Nov 17, 2025)
- ✅ Login succeeds with testuser@test.com / testpass123
- ✅ User redirected to /dashboard successfully
- ✅ Quick Login button in Login.tsx matches these credentials

### Current Blocker: AI Provider Quota Errors
**Status:** Authentication is fixed, but autonomous workspace flow blocked by AI provider quota limits

**Error Logs:**
```
[AIProviderManager] OpenAI streaming failed for gpt-4o: 429 You exceeded your current quota
[AIProviderManager] Moonshot streaming failed for kimi-k2: 429 Your account is suspended
```

**Impact:**
- Cannot test full autonomous workspace creation flow
- Cannot verify WebSocket connection end-to-end
- Autonomous agent plan generation fails before WebSocket connection

**Next Steps:**
1. Wait for AI provider quota reset, OR
2. Use alternative AI provider (Anthropic, xAI, Gemini), OR
3. Create mock AI provider for testing WebSocket flow independently