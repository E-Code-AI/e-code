# E-Code Platform

## Overview
The E-Code Platform is an AI-powered development platform designed to streamline software creation through automated deployment, real-time collaboration, and a comprehensive suite of tools. Its core purpose is to facilitate rapid, enterprise-grade software development with advanced AI capabilities, aiming for a significant market presence. The platform prioritizes performance, security, and scalability, leveraging AI assistance and an architecture optimized for Replit Reserved VM deployment.

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
The platform employs a polyglot backend with Go for container orchestration, Python for AI/ML, and TypeScript for web API, user management, and database operations. It integrates an MCP Standalone Server and an AI Agent System for autonomous code generation, with real-time collaboration via WebSockets and WebRTC. The system features enterprise-grade security, performance monitoring, and a human-in-the-loop approval process for AI actions.

**AI Agent Chat Architecture:**
- **Structured Message Rendering**: Replit-identical message components with professional-grade UX, supporting various message types (chat, thinking, task, action, system, error, progress, success).
- **Rich Markdown Formatting**: Full markdown parsing with syntax highlighting, including headers, lists, bold/italic text, inline code, code blocks, tables, and emojis.
- **Animations & Interactivity**: VibingAnimation for thinking states, collapsible sections, copy-on-hover code buttons, and tool execution badges.

**UI/UX Decisions:**
- Replit-identical IDE interface with a dark theme, centralized design tokens, and consistent spacing.
- ReplitAgent UI matches Replit's exact interface with a clean header, compact model selector, and extended Agent Tools dropdown.
- Responsive design optimized for mobile (bottom tab bar, swipe panels), tablet (dual-panel layouts), and desktop (Monaco minimap, breadcrumbs, multi-editor instances, Command Palette).

**Technical Implementations:**
- **Routing**: Unified `/ide/:id` workspace routing with SPA navigation and state persistence.
- **Device Detection**: Canonical breakpoints for various devices.
- **Code Splitting**: Optimized bundle splitting using React.lazy().
- **Performance**: Compression, caching, build optimizations, and service workers.
- **Security**: CSP headers, input validation, OWASP Top 10, CORS, path sandboxing, and robust authentication.
- **Deployment**: Dynamic 4-port configuration, optimized for Replit Reserved VM.

**Feature Specifications:**
- **Workspace Persistence & Responsive Design**: IDEPage implements device-aware rendering and `sessionStorage` persistence for IDE state.
- **AI Agent System**: Autonomous code generation with real tool execution, extended thinking, and database-backed audit logging. Includes "Build from Prompt" with an autonomous build process, Model Selection API, Extended Thinking Streaming, Conversation Persistence, and Security Hardening. The AI Agent is integrated as an IDE left sidebar panel.
- **Browser Testing & QA Infrastructure**: Playwright-based testing orchestrator with session recording.
- **Tools**: Extended set of 35 tools for file operations, commands, web search, browser testing, performance analysis, and accessibility.
- **Real-time Collaboration**: WebSocket-based editing and WebRTC for communication.
- **Admin Dashboard**: Comprehensive UI for project and user management.
- **Template Marketplace**: Allows users to fork and deploy project templates.
- **Production Hardening**: Redis caching, CDN optimization, multi-tier rate limiting, and security middleware.
- **Workspace Parity**: Complete IDE feature parity with unified `/ide/:id` route, including integrated panels, real-time WebSocket updates, and functional Monaco Editor, Terminal, and File Tree.
- **Multi-Tab Editor System**: Maintains independent Monaco editor instances per tab.
- **Keyboard Utilities & Shortcuts**: Production-ready keyboard shortcut system.

**System Design Choices:**
- **Vertical Slice Approach**: End-to-end feature development.
- **Storage Layer**: `IStorage` interface with `DatabaseStorage` implementation using PostgreSQL and Drizzle ORM.
- **Type Safety**: Zod, TypeScript, Drizzle ORM.
- **Real-time Updates**: Hybrid WebSocket + HTTP polling, with SSE for AI token streaming.
- **Hybrid Security Model**: AI-generated actions require approval; manual operations have immediate validation with audit logging.
- **Production Compliance**: Fortune 500-ready with PostgreSQL persistence and tamper-proof logging.

## External Dependencies
- **AI Integration**:
  - **Multi-Provider System**: Operational with 5 AI providers (OpenAI, Anthropic, Gemini, xAI, Groq) and 12 production models, managed by `AIProviderManager`.
  - **User Model Preference System**: `useAgentModelPreference` hook with React Query for managing user's preferred AI model, persisted via `/api/models/preferred` API.
  - **Extended Thinking Toggle**: First-class control in the ReplitAgentPanelV3 header for enabling/disabling Extended Thinking, with capability gating based on the selected model.
  - **Context Management**: `server/agent/context-manager.ts` handles context budgeting with provider-specific token and byte limits, intelligent truncation, and client-side warnings via SSE.
  - **Marketing Demo**: `simulateStreaming` helper for simulated AI responses on the landing page, accompanied by a demo mode banner and a "Try Real AI" CTA.
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