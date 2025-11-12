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
- Mobile UI features a bottom tab bar, swipe panels, and bottom sheet/full-screen modals.
- Tablet UI is optimized for dual-panel layouts, with comprehensive device detection, sliding drawer navigation, and touch-optimized controls.
- Desktop UI includes Monaco minimap, breadcrumbs, multi-editor instances, and Command Palette.

**Technical Implementations:**
- **Routing**: Unified `/ide/:id` workspace routing with SPA navigation. All project access (cards, slugs, direct links) resolves to `/ide/:id` for consistent UX. Slug URLs (`/@username/slug`) redirect via SPA to preserve client state. Legacy `/editor/:id` redirects to `/ide/:id` via EditorRedirect component with query/hash preservation, replace navigation, and telemetry logging. No full page reloads - pure React Router navigation.
  - **Browser History State Persistence (FIXED)**: IDEPage now persists workspace state to sessionStorage (key: `ide-state-${projectId}`) on every change, including activeTab, tabs array, selectedFileId, and showFileExplorer. State is restored on mount with validation to ensure file tab consistency (orphaned selectedFileId cleared if corresponding tab missing). This fixes browser back/forward navigation to preserve IDE tab state across navigations.
  - **Legacy Redirect Telemetry**: EditorRedirect logs all /editor/:id redirect usage to console with projectId, query params, hash fragments, and timestamp for monitoring adoption.
- **Device Detection**: Canonical breakpoints for mobile, tablet, laptop, and desktop via `useDeviceType()` hook.
- **Code Splitting**: Optimized bundle splitting using React.lazy() for device-specific UI components.
- **Performance**: Compression, code splitting, caching, build optimizations, service workers, network/image optimization.
- **Security**: CSP headers, input validation, OWASP Top 10, production-ready CORS, path sandboxing, and admin authorization hardening.
  - **Authentication**: Bcrypt password hashing (10 rounds), email-based login via Passport.js LocalStrategy, session-based authentication with PostgreSQL session store, session fixation protection (new session ID on login), secure cookies (HttpOnly, SameSite=Lax).
  - **CSRF Protection**: Production-grade CSRF protection on all session-based mutations (register, login, logout, resend-verification) using singleton-backed tokens tied to session ID with 1-hour expiry and timing-safe comparison. Token-based endpoints (verify-email, forgot/reset-password) rely on high-entropy single-use tokens and are correctly excluded from CSRF requirements. Frontend automatically fetches and includes CSRF tokens via queryClient.ts for all POST/PUT/PATCH/DELETE requests.
- **Deployment**: Dynamic 4-port configuration, non-blocking initialization, optimized for Replit Reserved VM.

**Feature Specifications:**
- **Workspace Persistence & Responsive Design**: IDEPage implements device-aware rendering (mobile/tablet/desktop) via `useDeviceType()` hook with lazy-loaded device-specific views (MobileIDEView, LazyTabletIDEView). SessionStorage persistence ensures IDE state (tabs, panels, file explorer) survives browser back/forward navigation. ResponsiveEditorRoute deprecated and removed in favor of unified IDEPage routing.
- **AI Agent System**: Autonomous code generation with real tool execution, extended thinking via Anthropic Claude, and database-backed audit logging. Includes "Build from Prompt" feature, mobile-first UX with agent as default tab, and auto-start capability via URL parameters. Features include Model Selection API, Extended Thinking Streaming, Conversation Persistence (PostgreSQL), Security Hardening for admin routes, Autonomous Mode, and Plan Mode.
  - **Plan Mode vs Build Mode**: Conversation-scoped mode state with Plan mode blocking all tool execution (brainstorming only) and Build mode allowing full code changes. Backend enforcement via mode-specific system prompts and empty tools array in streaming endpoints. API endpoints: `POST /api/agent/conversation` (bootstrap), `POST /api/agent/conversation/:id/mode` (update). Database schema: `agentMode` enum ('plan' | 'build') in `ai_conversations` table.
  - **Vibe Creation Flow (Production-Ready)**: Complete end-to-end autonomous app building system from Dashboard → AgentWorkflowOrchestrator → Workspace IDE → AI Agent Auto-Start → **Preview Auto-Start** → **Runtime Auto-Execute**. Dashboard.tsx creates project and stores prompt in sessionStorage, redirects to `/project/{id}?agent=true` after workflow completion. Editor.tsx detects `?agent=true` URL parameter and checks sessionStorage for prompt (selective decoding: URL params decoded, sessionStorage used raw), auto-opens AI Agent Panel with prompt. ReplitAgent receives `initialPrompt` prop and auto-submits to AI streaming endpoint. Handles all special characters (%, &, #) correctly with try/catch error handling. Clean URLs (no long prompts in query strings), auto-cleanup (sessionStorage cleared after use), double-trigger prevention.
    - **Preview Auto-Start (Task 12)**: When build completes, IDE automatically switches to preview tab via `onBuildComplete` callback in IDEPage.tsx. Production-ready with architect PASS approval.
    - **Runtime Auto-Execute (Task 13)**: Build completion automatically triggers `POST /api/runtime/start` to boot dev server without manual intervention. Preview loads with running application. Production-ready with architect PASS approval.
    - **Critical Storage Bug Fix**: AIPlanGeneratorService storage initialization fixed - changed from `(global as any).storage` to direct `getStorage()` import. Architect PASS approval.
  - **Autonomous Mode**: Risk-based auto-approval system, AI-powered plan generation, Autonomous Engine Service, Plan Generator Service, dedicated API routes, UI components.
  - **Browser Testing & QA Infrastructure**: Playwright-based testing orchestrator, element selector service (CSS/XPath), session recording with timeline markers, admin-only API routes, database schema for test executions and artifacts, and integrated frontend components.
  - **Tools**: Extended set of 35 tools (25 core + 10 testing) including file operations, commands, web search, browser testing, performance analysis, and accessibility checks.
- **Real-time Collaboration**: WebSocket-based editing and WebRTC for voice/video/screen sharing.
- **Admin Dashboard**: Comprehensive UI for managing projects and users.
- **Template Marketplace**: Allows users to fork and deploy project templates.
- **Production Hardening**: Redis caching, CDN optimization, multi-tier rate limiting, security middleware, DB connection pooling, performance monitoring, input validation, and sanitization.
- **Workspace Parity**: Complete IDE feature parity with unified `/ide/:id` route. IDEPage includes 18+ integrated panels (deployment, environment variables, database browser, package viewer, AI assistant, billing, extensions, test runner, shell, web preview, etc.) plus keyboard-activated overlays (CommandPalette Cmd+K, GlobalSearch Cmd+Shift+F, CollaborationPresence, ReplitDB). All panels use lazy loading for performance. True backend integration for LSP/Problems, Build Logs/Output, Testing, Security Scanner with real-time WebSocket updates. Includes functional Mobile Monaco Editor, Mobile Terminal, Mobile File Tree, and Floating Action Button (FAB).
- **Responsive UI**: Desktop, Tablet, and Mobile layouts.
- **Multi-Tab Editor System**: Maintains independent Monaco editor instances per tab via MultiEditorManager.
- **Keyboard Utilities & Shortcuts**: Production-ready keyboard shortcut system with opt-in feature flags across ALL IDE views (desktop/tablet/mobile):
  - **ShortcutHint**: Displays available shortcuts when modifier keys (Cmd/Ctrl/Alt/Shift) are pressed. Enabled by default, can be disabled via User Settings → Advanced Developer Settings → "Keyboard Shortcut Hint". Uses framer-motion for smooth animations, supports Mac/Windows cross-platform detection.
  - **ShortcutTester**: Developer tool showing last pressed keyboard shortcut combination. Disabled by default, can be enabled via User Settings → Advanced Developer Settings → "Keyboard Shortcut Tester". Useful for debugging custom keyboard shortcuts.
  - **Implementation**: Both utilities use localStorage for persistence (`keyboard-shortcut-hint`, `keyboard-shortcut-tester`), with SSR-safe initialization and real-time sync via custom events. Located in `client/src/components/utilities/`, integrated into ALL IDE shells (IDEPage.tsx, Editor.tsx, TabletIDEView, MobileIDEView), and configurable via WorkspaceSettings.tsx.
  - **Route Coverage**: `/ide/:id` (IDEPage - canonical workspace route), `/@username/slug` (resolves to `/ide/:id` via SPA redirect)
  - **Keyboard Shortcut Mappings**: Cmd/Ctrl+K (CommandPalette - quick file search & tool selection), Cmd/Ctrl+Shift+F (GlobalSearch - project-wide search), Cmd/Ctrl+Shift+E (Toggle File Explorer), Cmd/Ctrl+B (Toggle sidebar), Cmd/Ctrl+S (Save File), Cmd/Ctrl+L (Focus AI Chat). See KeyboardShortcutsOverlay.tsx for complete reference.

**System Design Choices:**
- **Vertical Slice Approach**: End-to-end feature development.
- **Storage Layer**: `IStorage` interface with `DatabaseStorage` implementation using PostgreSQL and Drizzle ORM, extended for agent-specific methods.
- **Type Safety**: Zod, TypeScript, Drizzle ORM.
- **Real-time Updates**: Hybrid WebSocket + HTTP polling, with SSE for AI token streaming and thinking updates.
- **Hybrid Security Model**: AI-generated actions require approval, manual file operations use immediate validation with audit logging. Agent routes split into public and admin-only tiers.
- **Production Compliance**: Fortune 500-readiness with PostgreSQL persistence, tamper-proof append-only logging, and queryable audit trail for all agent conversations and messages.

## External Dependencies
- **AI Integration**: Anthropic Claude API, OpenAI API, Together AI, Replicate, Hugging Face, Groq, Anyscale.
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