# E-Code Platform

## Overview
E-Code is a web-based collaborative IDE with AI assistance, offering code editing, terminal access, and file management. Its core purpose is to facilitate rapid prototyping and education. The platform aims for enterprise-grade scalability, multi-provider AI model selection, real-time collaboration, robust security, and the ability to create autonomous workspaces from a natural language prompt to a live preview with streaming progress. The business vision is to provide a comprehensive, AI-powered development environment that streamlines the coding process and enhances learning.

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
- **Monaco Editor:** Safe disposal pattern with optional chaining (`d?.dispose?.()`) for all enhancement classes
- **Documentation:** Ruthlessly remove obsolete/misleading docs - maintain technical honesty

## System Architecture

### UI/UX Decisions
The frontend uses Shadcn/UI with Tailwind CSS and Monaco Editor. The design system incorporates iOS Dynamic Color System, San Francisco Pro Typography, 8pt Grid Spacing, Apple-quality animation springs, iOS-style shadows, continuous corners, and appropriate touch target sizes for a comprehensive Apple-quality mobile experience. The autonomous agent interface is platform-agnostic with responsive layouts and real-time progress tracking.

### Technical Implementations
The frontend is built with React 18, TypeScript, Vite, TanStack Query, and Wouter. The backend is a Node.js and Express.js application in TypeScript, utilizing Drizzle ORM for PostgreSQL and Passport.js for authentication, following a RESTful API design. Real-time services for terminal, collaborative editing (Y.js), and build logs are powered by WebSockets. AI optimization infrastructure includes a Task Classifier, Circuit Breaker, Priority Queue, Intelligent Caching, and Observability. Environment variables are encrypted using AES-256-GCM. Backend implements SSE streaming with buffered JSON parsing for reliable code generation. Anonymous bootstrap authentication creates ephemeral guest users with project-specific JWT tokens.

**AI Agent Enhancements (Nov 24, 2025):**
- **Structured System Prompts** (`server/ai/prompts/agent-system-prompt.ts`): XML-based prompts with identity, capabilities, behavioral rules, environment context, response protocols, and quality standards. Automatically injected into all AI provider calls.
- **Repository Overview Service** (`server/agent/repo-overview-service.ts`): Auto-generates comprehensive repo structure analysis including languages, frameworks, dependencies, and project context. Protected with authentication, 30s timeout, and 5000 file limit to prevent event loop blocking.
- **Context Window Manager** (`server/ai/context-window-manager.ts`): Smart conversation history optimization with token counting, truncation strategies, and automatic new conversation detection when context window approaches limits.
- **Templates Marketplace API** (`server/routes/templates.ts`): Complete CRUD operations for templates with categories, ratings, collections, filtering, search, and pagination. All routes secured with authentication and safe req.user access patterns.
- **Desktop Quick Actions Component** (`client/src/components/editor/DesktopQuickActions.tsx`): Toolbar component with AI-powered actions (Explain, Debug, Test, Document, Optimize, Review, Search) ready for Monaco Editor integration.
- **Unified AI Provider System** (`server/ai/ai-provider-manager.ts`): Consolidated all AI services to use single modern provider system with multi-provider fallback, system prompts injection, context window optimization, and circuit breakers. Legacy `ai-provider.ts` marked DEPRECATED (Nov 24, 2025).
- **🔥 AI-Powered Inline Code Actions** (`client/src/lib/monaco-features-enhancement.ts`, `server/ai.ts`): Replit Agent 3 style lightbulb quick fixes and right-click context menu AI actions in Monaco Editor. Provides 7 inline actions (Explain, Debug, Test, Document, Optimize, Review, Search) with `registerCodeActionProvider` for all languages. Backend API endpoint `/api/ai/code-actions` handles multi-provider AI requests with action-specific prompts and automatic code suggestion extraction.

**🔥 Checkpoints & Rollback System (Nov 25, 2025):**
- **Database Schema** (`shared/schema.ts`): Production-ready checkpoints table with 19 columns, self-referencing parent-child FK for bidirectional navigation, 3 composite indexes (projectId+createdAt, projectId+type, projectId+parentCheckpointId), metadata JSONB for agent state/screenshots/test results, and Neon branch integration. Added `currentCheckpointId` to projects table for O(1) navigation queries.
- **Checkpoint Service** (`server/services/checkpoint-service.ts`): Atomic transactions with `SELECT FOR UPDATE` row-level locks prevent race conditions during concurrent checkpoint creation. Auto-assigns `parentCheckpointId` from `projects.currentCheckpointId` for parent-child chain. Post-commit lineage validation ensures data integrity. Supports manual/automatic/before_action/error_recovery checkpoint types with file snapshots, database dumps, environment variables, and AI conversation history.
- **Rollback Service** (`server/services/rollback-service.ts`): Bidirectional navigation (backward/forward) with transactional safety. Creates "Before rollback" checkpoint automatically. Zero chronological fallbacks—all navigation uses parent-child relationships. Supports selective restore (files only, database only, or environment only).
- **API Routes** (`server/routes/checkpoints.router.ts`): 9 production-ready endpoints mounted at `/api` with comprehensive Zod validation and error handling:
  - `POST /api/checkpoints` - Create checkpoint with atomic transactions
  - `GET /api/checkpoints/:id` - Get checkpoint by ID (direct SELECT, no project filter)
  - `POST /api/checkpoints/:id/restore` - Restore files/database/environment
  - `POST /api/checkpoints/rollback` - Navigate backward to previous checkpoint
  - `POST /api/checkpoints/rollforward` - Navigate forward to future checkpoint
  - `GET /api/projects/:projectId/checkpoints` - List all checkpoints for project
  - `GET /api/projects/:projectId/checkpoints/tree` - Tree visualization for timeline UI
  - `GET /api/projects/:projectId/checkpoints/navigation` - Navigation options from current checkpoint
  - `DELETE /api/checkpoints/:id` - Delete checkpoint with cascade cleanup
- **Integration** (`server/index.ts`): Routes registered at `/api` with atomic transactions and row-level locks enabled. Comprehensive logging for all checkpoint operations.

**🔥 Background Auto-Testing System (Nov 25, 2025):**
- **Testing Service** (`server/services/background-testing-service.ts`): Production-ready background test execution with Playwright integration. Features configurable `APP_URL` env var (defaults to http://localhost:5000), async Playwright import with availability check and graceful fallback when binaries missing, test result persistence with success/failure tracking, and EventEmitter-based real-time notifications.
- **WebSocket Security** (`server/websocket/background-testing-ws.ts`): Enterprise-grade authenticated WebSocket bridge with 5-layer security:
  1. **JWT Signature Verification**: `jwt.verify(token, JWT_SECRET)` prevents forged tokens
  2. **Database User Validation**: `storage.getUser(decoded.userId)` prevents deleted/invalid users
  3. **Strict Project Ownership**: `and(eq(projects.id, projectId), eq(projects.ownerId, userIdNum))` prevents unauthorized subscriptions
  4. **Filtered Event Broadcasting**: Only subscribed projects receive test events (prevents data leaks)
  5. **Comprehensive Security Logging**: Audit trail for all auth failures with explicit rejection messages
- **Real-Time Notifications**: WebSocket clients receive test:queued, test:started, test:completed, test:failed, and test:agent-notification events only for projects they own.
- **Security Best Practices**: 
  - Token validation before any operations (no naive splitting)
  - Database-backed authorization checks (not just token claims)
  - Event listener lifecycle scoped per connection with cleanup on disconnect
  - Production requirement: Configure `JWT_SECRET` env var (never use dev-secret fallback)
- **Future Enhancements**: Extend `handleSubscribe` to honor collaborator/role-based access when those models land.

### Feature Specifications
Key features include a Monaco Code Editor with enhancements (Git UI components, multi-cursor editing, code navigation, refactoring, advanced search, IntelliSense), an interactive terminal (xterm.js), file management, real-time collaboration, robust authentication, TypeScript-based container orchestration, Global Search & Replace, an Environment Variables Manager, a Logs Viewer, and a Debugger UI. The UI is responsive across desktop, tablet, and mobile devices. Autonomous workspace creation involves a Bootstrap API call, client redirection to the IDE, background AI plan generation with multi-provider fallback, a WebSocket connection for real-time progress, autonomous execution, and a live preview tab. The platform also includes PWA features and desktop application support via Electron.

**Recent UI Components (Nov 2025):**
- **AppsView** (`/apps` route): Project management interface with grid/list views, search, filtering, sorting, and CRUD operations. Integrates with TanStack Query and existing authentication.
- **AppToaster**: Sonner-based toast notification system with theme integration (uses `resolvedTheme` from ThemeProvider).
- **TabBar**: Simplified tab management component for IDE workspace without complex drag-and-drop.

### System Design Choices
A PostgreSQL database stores user data, project hierarchies, AI agent sessions, deployment history, subscription management, and AI optimization monitoring. Security measures include CSRF protection, input sanitization, tier-based rate limiting, API versioning, and session-based authentication. The AI agent system provides server-sent event streaming, multi-provider AI model selection, and a database-backed conversation history, incorporating circuit breakers and retry logic. Health monitoring integrates Kubernetes probes and a Provider Health API, including a Prometheus metrics endpoint. A two-tier database API architecture is used: an Admin Database API and a Project Data API, with integrated security features. Docker builds are optimized for small image sizes.

**Security Enhancements (Nov 24, 2025):**
- Repository overview endpoints require authentication and validate project access
- Templates API routes use type-safe req.user access with proper guards
- All agent context routes protected with 30-second timeouts
- File system scanning limited to 5000 files with early termination to prevent DoS
- Project path scoping to prevent unauthorized filesystem access

## External Dependencies

### AI/ML Services
- **OpenAI:** GPT-5.1, GPT-5, GPT-5-mini, GPT-4o, o3, o4-mini
- **Anthropic:** Claude Sonnet 4.5, Claude Opus 4.1, Claude Haiku 4.5
- **Google Gemini:** Gemini 2.5 Flash, Gemini 2.5 Pro
- **Moonshot AI:** Kimi K2 (kimi-k2-0711-preview, kimi-k2-0905-preview), Kimi K2 Thinking
- **xAI:** Grok 4, Grok 4 Fast
- **Groq:** Mixtral 8x7B

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