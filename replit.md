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
- **Routing**: Unified `/ide/:id` workspace routing with SPA navigation, including state persistence for IDE tabs across browser navigations. Legacy `/editor/:id` redirects to `/ide/:id` with query/hash preservation and telemetry.
- **Device Detection**: Canonical breakpoints for mobile, tablet, laptop, and desktop via `useDeviceType()` hook.
- **Code Splitting**: Optimized bundle splitting using React.lazy() for device-specific UI components.
- **Performance**: Compression, code splitting, caching, build optimizations, service workers, network/image optimization.
- **Security**: CSP headers, input validation, OWASP Top 10, production-ready CORS, path sandboxing, admin authorization, and robust authentication (Bcrypt, Passport.js, secure sessions, CSRF protection).
- **Deployment**: Dynamic 4-port configuration, non-blocking initialization, optimized for Replit Reserved VM.

**Feature Specifications:**
- **Workspace Persistence & Responsive Design**: IDEPage implements device-aware rendering (mobile/tablet/desktop) with lazy-loaded device-specific views and sessionStorage persistence for IDE state.
- **AI Agent System**: Autonomous code generation with real tool execution, extended thinking via Anthropic Claude, and database-backed audit logging. Includes "Build from Prompt" feature with autonomous build process (plan generation, risk assessment, file creation, IDE redirect, auto-start preview, auto-execute runtime). Features include Model Selection API, Extended Thinking Streaming, Conversation Persistence, Security Hardening, Autonomous Mode, and Plan Mode (blocking tool execution).
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
  - **Multi-Provider System**: Supports 5 AI providers with 13 production models
    - **OpenAI**: gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-4
    - **Anthropic**: claude-3-5-sonnet-20241022, claude-3-5-haiku-20241022, claude-3-opus-20240229
    - **Gemini**: gemini-1.5-pro, gemini-1.5-flash
    - **xAI**: grok-2-1212
    - **Groq**: mixtral-8x7b-32768, llama3-70b-8192
  - **Smart Fallback**: Automatically uses first available provider if user has no preference
  - **User Preference**: Stored in database (users.preferred_ai_model column)
  - **Architecture**: 
    - AIProviderManager (model-ID-based API) for multi-provider selection
    - legacyAIProviderManager (provider-name-based API) for backward compatibility
  - **API Endpoints**:
    - GET /api/models - List available models (filtered by configured providers)
    - GET /api/models/preferred - Get user's preferred model
    - POST /api/models/preferred - Save user's preferred model
    - POST /api/agent/autonomous/build - Accepts optional modelId parameter
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