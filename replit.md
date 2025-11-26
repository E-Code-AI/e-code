# E-Code Platform

## Overview
E-Code is a web-based collaborative IDE with AI assistance, code editing, terminal access, and file management. It supports rapid prototyping and educational initiatives, aiming to be an enterprise-grade, scalable platform with multi-provider AI model selection, real-time collaboration, and robust security. A core ambition is to generate autonomous workspaces from natural language prompts to live previews with streaming progress, creating a comprehensive, AI-powered development environment that streamlines coding and enhances learning.

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
The frontend uses Shadcn/UI with Tailwind CSS and Monaco Editor. The design adheres to iOS Dynamic Color System principles, San Francisco Pro Typography, 8pt Grid Spacing, Apple-quality animation, iOS-style shadows, continuous corners, and appropriate touch targets for a mobile-first experience. The autonomous agent interface is platform-agnostic, responsive, and includes real-time progress tracking.

**Responsive Implementation (Fortune 500-grade, verified Nov 2025):**
- **Mobile (≤640px):** MobileIDEView with swipe gestures, velocity tracking, haptic feedback; ReplitBottomTabs with min-w-[60px], h-14 touch targets; safe-area-inset-bottom for notched devices
- **Tablet (641-1024px):** TabletIDEView with resizable dual panels, sliding drawer navigation, orientation change handling, panel size persistence
- **Laptop (1025-1440px):** ReplitLayout with conditional sidebar rendering, proper overflow handling
- **Desktop (>1440px):** Full desktop layout with fixed header and backdrop blur
- **Breakpoints:** Mobile ≤640px, Tablet 641-1024px, Laptop 1025-1440px, Desktop >1440px (SSR-safe hooks in use-media-query.ts)

**QA Instrumentation Standards (Nov 2025):**
- **Touch Targets:** All interactive elements require min-h-[44px] (iOS Human Interface Guidelines)
- **data-testid:** Comprehensive coverage on all interactive elements and meaningful displays
  - Interactive: `{action}-{target}` (e.g., `button-submit`, `input-email`, `select-company-size`)
  - Display: `{type}-{content}` (e.g., `text-username`, `card-project-${id}`)
  - SelectItem options: `option-{category}-{value}` (e.g., `option-size-1-10`, `option-interest-enterprise`)
- **Mobile-First Grids:** Always start grid-cols-1, scale with sm:/md:/lg: breakpoints

### Technical Implementations
The frontend is built with React 18, TypeScript, Vite, TanStack Query, and Wouter. The backend is a Node.js and Express.js application in TypeScript, utilizing Drizzle ORM for PostgreSQL and Passport.js for authentication, following a RESTful API design. Real-time features are powered by WebSockets. AI optimization includes a Task Classifier, Circuit Breaker, Priority Queue, Intelligent Caching, and Observability. Environment variables are AES-256-GCM encrypted. Backend uses SSE streaming for code generation. Anonymous bootstrap authentication creates ephemeral guest users with project-specific JWT tokens.

Key AI Agent Enhancements include structured XML-based system prompts, a repository overview service, a context window manager with token optimization and long-term memory, a unified AI provider system with multi-provider fallback, and AI-powered inline code actions within the Monaco Editor. A robust Checkpoints & Rollback System provides atomic transactions for file, database, or environment variable restoration. A Background Auto-Testing System uses Playwright. Max Autonomy Mode enables 240-minute autonomous sessions with AI task decomposition, auto-execution, ETA estimation, and cost tracking, integrating with auto-checkpointing, auto-testing, and auto-rollback. A Templates Marketplace and a Bounties Marketplace with Stripe integration for escrow and payouts are included. Context Window Enhancements provide separate dev/prod database connections, screenshot capture, and AI memory retention.

**Agent Activity Dashboard (Phases 1-3 - Nov 2025):**

Phase 1 - Real-time Activity Components:
- **ToolExecutionDisplay.tsx:** Collapsible tool groups by category (files/commands/search), severity badges (success/warning/error), quick filters (All/Files/Commands/Errors), compact mode with expandable details
- **AgentActivityFeed.tsx:** Real-time activity stream with ActivityEvent interface, session stats display (duration/tokens/cost/files), filter toggles for files/commands/errors, collapsible event details
- **MessageMetadataFooter.tsx:** Enhanced metadata display with model/provider, token breakdown (prompt/completion), cost/latency/finish reason, extended thinking and web search badges, cache hit indicator, expandable details

Phase 2 - AG Grid Enterprise Components:
- **AgentSessionsGrid.tsx:** Session history with filtering, sorting, export; onSessionSelect callback for drill-down; mobile card fallback (SessionCard)
- **AgentActionsGrid.tsx:** Autonomous actions log with session filtering, action type badges, execution status; mobile card fallback (ActionCard)
- **FileOperationsGrid.tsx:** File operations tracking (create/update/delete) with session filtering; mobile card fallback (FileCard)
- **ConversationHistoryGrid.tsx:** Message history with extended thinking details, search, filtering; mobile card fallback (MessageCard)
- **AgentMetricsDashboard.tsx:** Analytics charts using Recharts for session metrics visualization
- **AgentHistoryModal.tsx:** Full-screen modal for detailed grid analysis

Phase 3 - IDE Integration (Nov 2025) - Replit-Style Inline Activity:
- **ReplitAgentPanelV3.tsx:** Activity shown INLINE within chat messages (like Replit)
  - Tool executions (file edits, commands, searches) display directly in conversation
  - ToolExecutionList component renders actions within each message
  - Collapsible details for each action (output, errors, timing)
  - Real-time thinking steps and streaming content visible in chat flow
  - No separate drawer, tab, or toggle - everything is part of the conversation
- **ModeSelector.tsx:** Replit-style Build/Plan dropdown
  - **Build mode:** "Make, test, iterate autonomously" with "Auto" badge
  - **Plan mode:** "Ask questions, plan your work"
  - Positioned above input field with pill-style button
  - Color-coded: emerald for Build, blue for Plan
- **AgentHistoryModal.tsx:** Full-screen modal for detailed session history (optional deep-dive)
- **Mobile Cards:** All grids check `isMobile` (≤768px) and render touch-friendly cards

Database Tables (agent_sessions, autonomous_actions, file_operations, agent_messages):
- All tables indexed on session_id for efficient filtering
- Enum types for status, action_type, operation_type, role
- Foreign key relationships to users and projects tables

API Endpoints (server/routes/agent-grid.router.ts):
- GET /api/agent-grid/sessions - Paginated session list with filtering
- GET /api/agent-grid/actions - Autonomous actions with session filter
- GET /api/agent-grid/files - File operations with session filter
- GET /api/agent-grid/messages - Conversation history with session filter
- GET /api/agent-grid/metrics - Aggregated dashboard metrics
- All endpoints require authentication (401 for unauthorized)

**data-testid Convention:** All metadata details use unique IDs: `metadata-detail-{key}-${messageId}` (e.g., `metadata-detail-promptTokens-${messageId}`)

### Feature Specifications
Core features include a Monaco Code Editor with advanced enhancements, an interactive terminal (xterm.js), file management, real-time collaboration, authentication, TypeScript-based container orchestration, Global Search & Replace, an Environment Variables Manager, a Logs Viewer, and a Debugger UI. The UI is responsive across devices. Autonomous workspace creation involves a Bootstrap API call, AI plan generation, WebSocket-based real-time progress, autonomous execution, and a live preview. PWA features and Electron desktop support are included.

### Critical Authentication Flow: Homepage BUILD → Login → Workspace (Replit-style, Nov 2025)
When unauthenticated users click BUILD on the homepage, the system implements a seamless Replit-style flow:

**SessionStorage Keys:**
- `pendingAppDescription`: Stores the user's prompt text
- `triggerBuildOnLanding`: Flag set to 'true' to auto-resume workspace creation

**Flow Implementation:**
1. **Landing.tsx:** `handleStartBuilding()` checks `user` state first. If not authenticated:
   - Saves prompt to `sessionStorage.pendingAppDescription`
   - Sets `sessionStorage.triggerBuildOnLanding = 'true'`
   - Shows toast "Sign in to continue"
   - Redirects to `/login`

2. **Login.tsx/Register.tsx:** After successful auth, `useEffect` checks flags:
   - If `triggerBuildOnLanding === 'true'` AND `pendingAppDescription` exists
   - Redirects to `/` (Landing page)

3. **Landing.tsx useEffect:** Monitors `user` state changes:
   - If user AND flags exist → clears flags → calls `handleStartBuilding(pendingPrompt)`
   - Workspace bootstrap API called → redirects to `/ide/{projectId}`

**Critical: ALL changes to Landing.tsx, Login.tsx, or Register.tsx must preserve this flow.**

### System Design Choices
A PostgreSQL database stores user data, project hierarchies, AI agent sessions, deployment history, subscription management, and AI optimization monitoring. Security measures include CSRF protection, input sanitization, tier-based rate limiting, API versioning, session-based authentication, and encrypted environment variables. The AI agent system provides server-sent event streaming, multi-provider AI model selection, database-backed conversation history, circuit breakers, and retry logic. Health monitoring integrates Kubernetes probes and a Provider Health API with Prometheus metrics. A two-tier database API architecture (Admin and Project Data APIs) is used with integrated security. Docker builds are optimized for small image sizes. Security enhancements include authentication/authorization for repository overview and templates APIs, context route timeouts, file system scanning limits, and project path scoping.

The Stripe payment integration supports a Replit-style hybrid pricing model (fixed subscription, monthly credits, resource allowances, and pay-as-you-go). This includes backend services for Stripe API integration, subscription management, metered billing, credit tracking, and bounty payouts, all processed by dedicated workers. API routes manage subscription lifecycle, payments, and billing history. Subscription plans (Starter, Core, Teams, Enterprise) define credit allowances and resource limits. Metered prices are applied when credits are exhausted. Database schema additions support credits, resource allowances, and usage tracking. Critical security measures are in place for Stripe keys. All core billing infrastructure, including idempotent usage recording, monthly snapshots, and a pay-as-you-go queue processor, is production-ready.

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