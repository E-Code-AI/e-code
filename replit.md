# E-Code Platform

## Overview
E-Code is a web-based collaborative IDE with AI assistance, offering code editing, terminal access, file management, and an autonomous AI agent. Its primary purpose is to facilitate rapid prototyping and education. The platform aims for enterprise-grade scalability, multi-provider AI model selection, real-time collaboration, robust security, and the ability to create autonomous workspaces from a natural language prompt to a live preview with streaming progress. Key capabilities include Monaco-based code editing with keyboard shortcuts (30+), real-time WebSocket streaming, and responsive UI design (cross-device verification pending).

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

## Recent Changes

### 2025-11-21: Documentation Cleanup & WebSocket Fixes
**Removed Obsolete Documentation**:
- ❌ **VS-CODE-PARITY-COMPLETE.md** - Claimed 95% VS Code parity but used mock Git data and null Monaco providers (not production-ready)
- ❌ **TEST-AI-AGENT-LIVE.md** - Obsolete guide suggesting features to implement that already exist (executeAutonomousPlan: 1144 lines, file ops: 626 lines, command exec: 490 lines)
- ❌ **WORKSPACE_PANELS_VERIFICATION.md** - Referenced non-existent files (EditorPage.tsx instead of Editor.tsx), wrong line numbers, claimed "100% verified" with 4 TypeScript errors existing, never tested on web/tablet/mobile
- ❌ **VIBE_CREATION_FLOW.md** - Claimed "AI-powered autonomous code generation" but uses simple keyword matching (lines 143-191), claimed "Production-Ready (Architect-Approved)" but Architect confirmed FAIL, claimed "Fortune 500 Enterprise-Grade" but never tested web/tablet/mobile, all KPIs unverified

**WebSocket Critical Fixes**:
- ✅ Fixed 3× `broadcastToProject()` errors in workspace-bootstrap.router.ts - replaced with correct `broadcast(message, projectId)` signature
- ✅ AgentSessionCache production-ready with Redis + in-memory fallback (10K LRU)
- ✅ HttpUpgradeResponder for reliable HTTP error framing

**Current State of Git/Monaco Features**:
- **Git Components** (client/src/components/git/): 1,868 lines total
  - ⚠️ BranchManager.tsx, GitGraph.tsx, MergeConflictResolver.tsx, VisualDiffEditor.tsx, GitBlameDecorator.tsx
  - ⚠️ **Status**: Demo UI with hardcoded mock data - NOT connected to real Git API endpoints
  - ⚠️ **Production Requirement**: Replace mock data with `/api/projects/:id/git/*` backend integrations
- **Monaco Enhancements** (client/src/lib/monaco-features-enhancement.ts): 603 lines
  - ✅ 6 feature classes: MultiCursor, CodeNavigation, CodeRefactoring, AdvancedSearch, IntelliSense, MonacoFeaturesEnhancement
  - ⚠️ Some providers return null - defers to default Monaco behavior
  - ✅ 30+ keyboard shortcuts registered and functional

**Known Issues**:
- 4 TypeScript diagnostics remaining (non-blocking):
  - diff-match-patch missing types declaration
  - Drizzle ORM overload mismatches in file-operations service
  - ProcessEnv type incompleteness in command-execution service

## System Architecture

### UI/UX Decisions
The frontend uses Shadcn/UI with Tailwind CSS for responsive component styling and Monaco Editor for code editing. A comprehensive Apple-quality mobile design system is implemented, including iOS Dynamic Color System, San Francisco Pro Typography, 8pt Grid Spacing, Apple-quality animation springs, iOS-style shadows, continuous corners, and appropriate touch target sizes. The autonomous agent interface is platform-agnostic with responsive layouts and real-time progress tracking.

### Technical Implementations
The frontend is built with React 18, TypeScript, Vite, TanStack Query, and Wouter. The backend is a Node.js and Express.js application in TypeScript, utilizing Drizzle ORM for PostgreSQL and Passport.js for authentication, following a RESTful API design. Real-time services for terminal, collaborative editing (Y.js), and build logs are powered by WebSockets. AI optimization infrastructure includes a Task Classifier, Circuit Breaker, Priority Queue, Intelligent Caching, and Observability. UUIDs identify projects, and environment variables are encrypted using AES-256-GCM. Backend implements SSE streaming with buffered JSON parsing for reliable code generation.

### Feature Specifications
Key features include a Monaco Code Editor with enhancements (Git UI components with demo data, multi-cursor editing, code navigation, refactoring, advanced search, IntelliSense with partial provider support), an interactive terminal (xterm.js), file management, real-time collaboration, robust authentication, TypeScript-based container orchestration, Global Search & Replace, an Environment Variables Manager with encryption, a Logs Viewer, and a Debugger UI (VSCode Debug Adapter Protocol integration conceptual). The responsive UI adapts to desktop, tablet, and mobile devices (cross-device testing pending).

**Autonomous Workspace Creation (Replit-Style Flow):**
The platform implements autonomous workspace creation from natural language prompts (end-to-end validation pending). The intended flow:
1. **Bootstrap API Call:** `POST /api/workspace/bootstrap` immediately creates a project and agent session, returning a token.
2. **Instant Redirect:** Client is redirected to `/ide/:id?bootstrap=token`.
3. **Background Plan Generation:** An AI plan is generated asynchronously with multi-provider fallback.
4. **WebSocket Connection:** `AutonomousWorkspaceViewer` connects to `/ws/agent` for real-time progress display.
5. **Autonomous Execution:** `agentOrchestrator.executeAutonomousPlan()` autonomously generates all files and code.
6. **Live Preview:** A preview tab opens by default, showing the application building in real-time.
7. **Agent Integration:** `ReplitAgent` receives the `initialPrompt` and continues autonomous development.

### System Design Choices
A PostgreSQL database stores user data, project hierarchies, AI agent sessions, deployment history, subscription management, and AI optimization monitoring. Security measures include CSRF protection, input sanitization, tier-based rate limiting, API versioning, and session-based authentication. The AI agent system provides server-sent event streaming, multi-provider AI model selection, and a database-backed conversation history, incorporating circuit breakers and retry logic. Health monitoring integrates Kubernetes probes and a Provider Health API, including a Prometheus metrics endpoint. A two-tier database API architecture is used: an Admin Database API and a Project Data API, with integrated security features like secret value masking and access control. Docker builds are optimized for small image sizes.

## External Dependencies

### AI/ML Services
- **OpenAI:** GPT-5.1, GPT-5, GPT-5-mini, GPT-4o, o3, o4-mini
- **Anthropic:** Claude Sonnet 4.5, Claude Opus 4.1, Claude Haiku 4.5
- **Google Gemini:** Gemini 2.5 Flash, Gemini 2.5 Pro
- **Moonshot AI:** Kimi K2 (kimi-k2-0711-preview, kimi-k2-0905-preview), Kimi K2 Thinking
- **xAI:** Grok 4, Grok 4 Fast
- **Groq:** Mixtral 8x7B
- **Provider Fallback Chain:** `['kimi-k2-0711-preview', 'gemini-2.5-flash', 'grok-4-fast', 'claude-haiku-4-5-20251015', 'gpt-5.1']`

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