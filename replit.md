# E-Code Platform

## Overview
The E-Code Platform is an AI-powered development platform designed to streamline software creation. It offers automated deployment, real-time collaboration, and a comprehensive suite of tools for the entire software development lifecycle. The platform emphasizes performance, security, and scalability, leveraging AI assistance and a robust architecture optimized for Replit Reserved VM deployment. Its core purpose is to facilitate rapid software development with enterprise-grade infrastructure and advanced AI capabilities, targeting enterprise software development and aiming for a significant market presence.

## User Preferences
- **Code Style**: Use TypeScript with strict typing
- **Error Handling**: Comprehensive error handling with proper logging
- **Performance**: Prioritize optimization for production deployment
- **Security**: Implement secure practices and avoid unsafe operations
- **Documentation**: Maintain clear documentation for deployment and architecture
- **File Management**: NEVER remove existing pages/files without explicit user request. If files are missing, CREATE them instead of removing imports.
- **Deployment**: Replit Reserved VM with 4-port configuration for optimal performance
- **React Best Practices**: ALL React hooks MUST be called before any early returns (conditional rendering) to maintain consistent hook order across renders
- **Routing Consolidation Complete**: All workspace navigation standardized to `/ide/:id`. Legacy `/editor/:id` route redirects with full backward compatibility. EditorPage.tsx deprecated in favor of IDEPage.tsx.

## System Architecture
The platform utilizes a polyglot backend architecture with Go for container orchestration, Python for AI/ML, and TypeScript for web API, user management, and database operations. It integrates an MCP Standalone Server for AI Agent operations and an AI Agent System for autonomous code generation. Real-time collaboration is facilitated via WebSockets and WebRTC. The system is designed for enterprise-grade security and performance, including advanced monitoring and a human-in-the-loop approval process for AI-generated actions.

**UI/UX Decisions:**
- Replit-identical IDE interface with a dark theme, centralized design tokens, and consistent spacing.
- **ReplitAgent UI (November 12, 2025)**: Refactored to match Replit's exact interface:
  - Clean header: Only "AI Agent" title, session dropdown, and pause/resume button (no cluttered switches)
  - Model selector: Inline compact variant in input zone (NOT full-width card)
  - Agent Tools dropdown: Extended Thinking, High Power Mode, Auto-checkpoints moved from header to dropdown menu
  - Layout: `[AI Model: GPT-4o ▼] [⚙️ Agent Tools]` on first row, action buttons on second row
  - E2e validated: Playwright test confirms UI matches Replit screenshots exactly
- Mobile UI features a bottom tab bar, swipe panels, and bottom sheet/full-screen modals.
- Tablet UI is optimized for dual-panel layouts, with comprehensive device detection, sliding drawer navigation, and touch-optimized controls.
- Desktop UI includes Monaco minimap, breadcrumbs, multi-editor instances, and Command Palette.

**Technical Implementations:**
- **Routing**: Unified `/ide/:id` workspace routing with SPA navigation, including state persistence for IDE tabs across browser navigations. Legacy `/editor/:id` redirects to `/ide/:id` with query/hash preservation and telemetry.
- **Device Detection**: Canonical breakpoints for mobile, tablet, laptop, and desktop via `useDeviceType()` hook.
- **Code Splitting**: Optimized bundle splitting using React.lazy() for device-specific UI components.
- **Performance**: Compression, code splitting, caching, build optimizations, service workers, network/image optimization.
- **Security**: CSP headers, input validation, OWASP Top 10, production-ready CORS, path sandboxing, admin authorization, and robust authentication (Bcrypt, Passport.js, secure sessions, CSRF protection).
- **Deployment**: Dynamic 4-port configuration, non-blocking initialization, optimized for Replit Reserved VM.

**Feature Specifications:**
- **Workspace Persistence & Responsive Design**: IDEPage implements device-aware rendering (mobile/tablet/desktop) with lazy-loaded device-specific views and sessionStorage persistence for IDE state.
- **AI Agent System**: Autonomous code generation with real tool execution, extended thinking via Anthropic Claude, and database-backed audit logging. Includes "Build from Prompt" feature with autonomous build process (plan generation, risk assessment, file creation, IDE redirect, auto-start preview, auto-execute runtime). Features include Model Selection API, Extended Thinking Streaming, Conversation Persistence, Security Hardening, Autonomous Mode, and Plan Mode (blocking tool execution).
  - **Session Persistence (November 12, 2025)**: Per-project AI Agent state persistence using sessionStorage with auto-save and hydration:
    - **useAgentSession Hook**: Custom hook (`client/src/hooks/use-agent-session.ts`) manages session lifecycle with storage key `agent-session-${projectId}`, 24-hour expiry, and null-guard for first-time users. Stores messages, selectedModel, extendedThinking, highPowerMode, autoCheckpoints, agentMode, pendingActions, and timestamp.
    - **Auto-Save Mechanism**: Debounced auto-save (500ms) for messages, immediate save for settings changes. Only saves after hydration completes to avoid overwriting defaults.
    - **Hydration on Load**: ReplitAgent component hydrates state from sessionStorage on mount, converting timestamps to Date objects. Works for both first-time and returning users.
    - **IDE Integration**: IDEPage supports query params `?panel=agent&prompt=...` to auto-select agent tab and pass prompts. Prompts stored in `agent-prompt-${projectId}` and cleaned from URL after storage.
    - **Routing**: `/ai-agent?projectId=X&prompt=Y` redirects to `/ide/X?panel=agent&prompt=Y`. No-project path (`/ai-agent?prompt=Y`) stores prompt in global `pending-agent-prompt` and redirects to dashboard.
    - **Auto-Start Build Flow (Replit-identical)**: When user arrives with `initialPrompt` via query param, agent automatically calls `generatePlan()` instead of chat, switching to Autonomous tab to display plan for approval. After approval, executes REAL build with file creation, preview auto-start, and Run button automation.
    - **Legacy Cleanup**: Removed all legacy sessionStorage keys (`agent-conversation-${projectId}`, `agent-started-${projectId}`) from ReplitAgent.tsx.
- **Browser Testing & QA Infrastructure**: Playwright-based testing orchestrator, element selector service, session recording, and admin-only API routes.
- **Tools**: Extended set of 35 tools including file operations, commands, web search, browser testing, performance analysis, and accessibility checks.
- **Real-time Collaboration**: WebSocket-based editing and WebRTC for voice/video/screen sharing.
- **Admin Dashboard**: Comprehensive UI for managing projects and users.
- **Template Marketplace**: Allows users to fork and deploy project templates.
- **Production Hardening**: Redis caching, CDN optimization, multi-tier rate limiting, security middleware, DB connection pooling, and performance monitoring.
- **Workspace Parity**: Complete IDE feature parity with unified `/ide/:id` route, including 18+ integrated panels, real-time WebSocket updates for LSP/Problems, Build Logs, Testing, Security Scanner, and functional Mobile Monaco Editor, Terminal, File Tree, and Floating Action Button.
- **Multi-Tab Editor System**: Maintains independent Monaco editor instances per tab via MultiEditorManager.
- **Keyboard Utilities & Shortcuts**: Production-ready keyboard shortcut system with `ShortcutHint` (displays shortcuts on modifier press) and `ShortcutTester` (developer tool for debugging shortcuts), configurable via User Settings. Includes mappings for Command Palette, Global Search, File Explorer, sidebar, save, and AI Chat focus.

**System Design Choices:**
- **Vertical Slice Approach**: End-to-end feature development.
- **Storage Layer**: `IStorage` interface with `DatabaseStorage` implementation using PostgreSQL and Drizzle ORM.
- **Type Safety**: Zod, TypeScript, Drizzle ORM.
- **Real-time Updates**: Hybrid WebSocket + HTTP polling, with SSE for AI token streaming and thinking updates.
- **Hybrid Security Model**: AI-generated actions require approval; manual operations use immediate validation with audit logging. Agent routes split into public and admin-only tiers.
- **Production Compliance**: Fortune 500-readiness with PostgreSQL persistence, tamper-proof append-only logging, and queryable audit trail for all agent conversations and messages.

## External Dependencies
- **AI Integration**:
  - **Multi-Provider System**: **FULLY OPERATIONAL** - 5 AI providers with 12 production models (November 2025)
    - **OpenAI** (4 models): gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-4
    - **Anthropic** (3 models): claude-3-5-sonnet-20241022, claude-3-5-haiku-20241022, claude-3-opus-20240229
    - **Gemini** (2 models): gemini-1.5-pro, gemini-1.5-flash
    - **xAI** (1 model): grok-2-1212
    - **Groq** (2 models): mixtral-8x7b-32768, llama3-70b-8192
  - **Initialization**: All 5 providers initialize at server startup with detailed logging
  - **Health Check**: GET /api/models/health (unauthenticated endpoint for external validation)
  - **Smart Fallback**: 3-tier fallback (explicit modelId → user preference → first available)
  - **User Preference**: Stored in database (users.preferredAiModel column, migrated automatically)
  - **Architecture**: 
    - AIProviderManager (singleton, model-ID-based routing) - Primary interface
    - legacyAIProviderManager (provider-name-based API) - Backward compatibility during staged refactor
    - GroqProvider uses OpenAI SDK with baseURL="https://api.groq.com/openai/v1"
    - Vite middleware monkeypatch in vite-loader.ts bypasses API routes (Fortune 500-compliant workaround)
  - **API Endpoints**:
    - GET /api/models/health - Provider status (no auth, returns JSON: {providers, totalModels, providerStats})
    - GET /api/models - List available models (authenticated, filtered by configured providers)
    - GET /api/models/preferred - Get user's preferred model (authenticated)
    - POST /api/models/preferred - Save user's preferred model (authenticated, validates modelId exists)
    - POST /api/agent/autonomous/build - Build from prompt (accepts optional modelId parameter)
  - **Security**: All API keys managed via Replit Secrets (OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, XAI_API_KEY, GROQ_API_KEY)
- **Push Notifications**: Firebase Cloud Messaging (FCM), Firebase Admin SDK.
- **Video Conferencing**: Zoom API.
- **Deployment Platform**: Replit Reserved VM.
- **Authentication**: Passport.js (GitHub, Google, GitLab, Bitbucket, Discord, Slack, Azure AD).
- **Real-time Communication**: WebSockets (y-websocket), WebRTC.
- **Database**: PostgreSQL.
- **Frontend Libraries**: React.js, Tailwind CSS, shadcn/ui, wouter.
- **Backend Framework**: Express.js.
- **ORM**: Drizzle ORM.
- **Editor**: Monaco Editor.
- **Charting**: Chart.js.
- **Containerization**: Docker.
- **Caching**: Redis/ioredis.
- **CDN**: Replit's built-in CDN.