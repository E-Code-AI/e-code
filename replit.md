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

## System Architecture
The platform utilizes a polyglot backend architecture with Go for container orchestration, Python for AI/ML, and TypeScript for web API, user management, and database operations. It integrates an MCP Standalone Server for AI Agent operations and an AI Agent System for autonomous code generation. Real-time collaboration is facilitated via WebSockets and WebRTC. The system is designed for enterprise-grade security and performance, including advanced monitoring and a human-in-the-loop approval process for AI-generated actions.

**UI/UX Decisions:**
- Replit-identical IDE interface with a dark theme, centralized design tokens (E-Code branding, IBM Plex Sans/Mono), and consistent spacing.
- Mobile UI features a bottom tab bar, swipe panels, and bottom sheet/full-screen modals.
- Tablet UI is optimized for dual-panel layouts, with comprehensive device detection, sliding drawer navigation, and touch-optimized controls.
- Desktop UI includes Monaco minimap, breadcrumbs, multi-editor instances, and Command Palette.

**Technical Implementations:**
- **Routing**: Replit-style slug routing with authentication. ResponsiveEditorRoute wrapper at `/editor/:id` provides device-aware routing with lazy-loaded device-specific views (TabletIDEView for tablets, MobileIDEView for mobile, Editor for desktop/laptop).
- **Device Detection**: Canonical breakpoints (Mobile: ≤640px, Tablet: 641-1024px, Laptop: 1025-1440px, Desktop: >1440px) via `useDeviceType()` hook.
- **Code Splitting**: Tablet UI (LazyTabletIDEView) loads only for tablet devices via React.lazy(), with optimized bundle splitting for performance, including iPad Pro optimizations.
- **Performance**: Compression, code splitting, caching, build optimizations, service workers, network/image optimization.
- **Security**: CSP headers, input validation, OWASP Top 10, production-ready CORS, path sandboxing, and admin authorization hardening.
- **Deployment**: Dynamic 4-port configuration, non-blocking initialization, optimized for Replit Reserved VM.

**Feature Specifications:**
- **AI Agent System**: Autonomous code generation with real tool execution (create_file, edit_file, run_command, read_file, list_files, web_search), extended thinking via Anthropic Claude, and database-backed audit logging. **Build from Prompt**: Homepage feature allows users to describe an app and AI autonomously builds it. **Mobile-first UX**: AI Agent is the default tab on mobile, with production-ready chat scrolling using sentinel ref pattern and requestAnimationFrame for reliable auto-scroll during streaming. Horizontal swipe gestures disabled on agent tab to prevent interference with vertical chat scrolling. **Auto-Start**: Agent automatically starts building when navigating with `?agent=true&prompt=...` URL parameters.
  
  **Replit AI Agent V3 Parity Features (Latest):**
  - **Model Selection API**: Backend service (`AgentPreferencesService`) with GET/PUT endpoints for user preferences including model selection (GPT-4, Claude 3.5 Sonnet, Claude 3 Opus, Gemini), extended thinking toggle, auto web search, custom instructions, and more. Routes: `/api/agent/models` (list available models), `/api/agent/preferences` (CRUD user preferences), `/api/agent/recommend-model` (intelligent model recommendation).
  - **Extended Thinking Streaming**: Fully implemented in `ai-streaming.ts` with real-time streaming of AI reasoning via `thinking_start`, `thinking_update`, and `thinking_complete` SSE events. Supports Anthropic's extended thinking mode with 10k token budget for chain-of-thought reasoning. **INTEGRATED**: ExtendedThinkingDisplay component now wired into ReplitAgent.tsx chat message stream, displaying thinking steps in real-time during AI responses.
  - **Conversation Persistence**: Complete database integration using `aiConversations` and `agentMessages` tables. All conversations and messages are persisted to PostgreSQL with proper type safety, token tracking, and metadata storage (thinking steps, reasoning, attachments). Hybrid memory + DB architecture for fast access with permanent storage.
  - **Security Hardening**: All admin-only agent routes (sessions, file ops, commands, tools, workflows) protected with `ensureAdmin` middleware. Public routes (models, preferences) accessible to authenticated users. Prevents privilege escalation.
  - **Frontend Components - FULLY INTEGRATED**: Two production-ready React components created and integrated into AI Agent UI:
    - `ModelSelector.tsx`: Comprehensive dropdown UI with model categorization (GPT/Claude/Gemini), capability badges (extended thinking, speed, cost), detailed descriptions, and search. **INTEGRATED**: Now visible in AI Agent header with full state management, model preference persistence via `/api/agent/preferences`, and toast notifications on model changes.
    - `ExtendedThinkingDisplay.tsx`: Collapsible reasoning viewer with streaming support, color-coded thinking steps, timestamps, and skeleton loading states. **INTEGRATED**: Renders below assistant messages in chat when thinking data is available, with real-time updates during SSE streaming.
  - **UI Integration Details**: 
    - ModelSelector positioned in ReplitAgent header with 200px fixed width to prevent layout overlap
    - ExtendedThinkingDisplay conditionally renders for assistant messages with `message.thinking` property
    - Message interface extended with `thinking` property containing steps, streaming status, tokens, and timing
    - SSE handlers in `sendMessage` function process `thinking_start`, `thinking_update`, `thinking_complete` events
    - State management uses React hooks with proper scoping per assistant message
    - Preferences load on component mount and sync automatically on changes
- **Real-time Collaboration**: WebSocket-based editing and WebRTC for voice/video/screen sharing.
- **Admin Dashboard**: Comprehensive UI for managing projects and users.
- **Template Marketplace**: Allows users to fork and deploy project templates.
- **Production Hardening**: Redis caching, CDN optimization, multi-tier rate limiting, security middleware, DB connection pooling, performance monitoring, input validation, and sanitization.
- **Workspace Parity**: True backend integration for IDE panels (LSP/Problems, Build Logs/Output, Testing, Security Scanner) with real-time WebSocket updates, including a functional Mobile Monaco Editor, Mobile Terminal, Mobile File Tree, and Floating Action Button (FAB).
- **Responsive UI**: Desktop, Tablet, and Mobile layouts are largely complete, with specific features like Command Palette, Multi-Editor, Git, Debugger, Breadcrumbs, Minimap for Desktop; TabletIDEView, Split View, Gestures for Tablet; and Bottom Tabs (with Agent as default), Gesture Framework (disabled on agent tab), Monaco Editor, xterm Terminal, File Tree, FAB for Mobile.
- **Multi-Tab Editor System**: Maintains independent Monaco editor instances per tab via MultiEditorManager, preserving state.

**System Design Choices:**
- **Vertical Slice Approach**: End-to-end feature development.
- **Storage Layer**: `IStorage` interface with `DatabaseStorage` implementation using PostgreSQL and Drizzle ORM. Extended with agent-specific methods: `getDynamicIntelligenceSettings`, `updateDynamicIntelligenceSettings`, `getAiConversation`, `createAiConversation`, `updateAiConversation`, `addMessageToConversation`.
- **Type Safety**: Zod, TypeScript, Drizzle ORM. Agent preferences validated using `insertAgentPreferencesSchema` and `aiModelEnum` type.
- **Real-time Updates**: Hybrid WebSocket + HTTP polling. AI streaming uses Server-Sent Events (SSE) for token streaming, thinking updates, and tool execution progress.
- **Hybrid Security Model**: AI-generated actions require approval, manual file operations use immediate validation with audit logging. Agent routes split into public (models/preferences) and admin-only (sessions/operations) tiers.
- **Production Compliance**: Fortune 500-readiness with PostgreSQL persistence, tamper-proof append-only logging, and queryable audit trail. All agent conversations and messages persisted with full metadata.

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