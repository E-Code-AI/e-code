# E-Code Platform

## Overview
E-Code Platform is a production-ready, AI-powered development platform designed to streamline software creation through automated deployment and collaboration tools. It provides enterprise-grade infrastructure, advanced AI capabilities including custom prompts and a template library, and comprehensive tools for the entire software development lifecycle. The platform emphasizes performance, security, and scalability, optimized for Replit Reserved VM deployment.

## User Preferences
- **Code Style**: Use TypeScript with strict typing
- **Error Handling**: Comprehensive error handling with proper logging
- **Performance**: Prioritize optimization for production deployment
- **Security**: Implement secure practices and avoid unsafe operations
- **Documentation**: Maintain clear documentation for deployment and architecture
- **File Management**: NEVER remove existing pages/files without explicit user request. If files are missing, CREATE them instead of removing imports.
- **Deployment**: Replit Reserved VM with 4-port configuration for optimal performance

## System Architecture

### Core Services
The platform employs a polyglot backend architecture:
- **Go Runtime Service** (Port 8080): Manages container orchestration, file operations, and WebSocket real-time services.
- **Python ML Service** (Port 8081): Handles AI/ML workloads.
- **TypeScript Core** (Port 5000): Manages Web API, user management, database operations, and serves the frontend.
- **MCP Standalone Server** (Port 3200): Facilitates AI Agent operations, tools, and Model Context Protocol integration.
- **AI Agent System**: Supports autonomous code generation using various AI models (Anthropic, OpenAI, etc.) and the OpenAI Assistants API.
- **Real-time Collaboration**: WebSocket-based editing and live progress streaming.
- **Process Isolation**: Node.js child processes with configurable resource limits.
- **Database Management**: PostgreSQL with Drizzle ORM.
- **Security Services**: Role-based permissions, audit logs, secret management, advanced authentication (7 OAuth providers, hardware security key support), and secure session management.
- **Analytics & Monitoring**: Production monitoring with a 95% memory threshold and 5-minute intervals.

### Production Hardening
Includes Redis caching, CDN optimization (via Replit's built-in CDN), multi-tier rate limiting, comprehensive security middleware, database connection pooling, and performance monitoring.

### Technology Stack
- **Frontend**: React.js with TypeScript, Tailwind CSS, shadcn/ui, wouter.
- **Backend**: Express.js with TypeScript, Drizzle ORM.
- **Deployment**: Replit Reserved VM with `cloudrun` deployment target.

### UI/UX Decisions
Features a streamlined interface with a 4-tab layout (Files, Preview, Features, Deploy) and a principal AI Agent interface. Routing ensures backwards compatibility with automatic redirects.

### Technical Implementations
- **Routing**: Replit-style slug routing (`/u/username/projectname`) with authentication.
- **Performance**: Compression, code splitting, caching, and build optimizations.
- **Security**: CSP headers, input validation.
- **Deployment**: Dynamic 4-port configuration, non-blocking initialization, optimized for Replit Reserved VM.
- **Preview System**: Live server previews via WebSockets, Eruda developer tools integration, responsive device testing.
- **Memory Management**: Optimized monitoring (95% threshold, 5-minute intervals).
- **Database Optimization**: Graceful handling of missing tables, proper SQL syntax, efficient connection pooling.

### Deployment Configuration
The `.replit` file is configured for Replit Reserved VM deployment with `deploymentTarget = "cloudrun"`. It specifies `npm install` for building and `npm run dev` for running. A 4-port configuration is used, mapping local ports 5000, 3200, 8080, and 8081 to their respective external ports for the main Express server, MCP server, Go Runtime, and Python ML service.

## Recent Changes (October 20, 2025)

### Critical Bug Fixes
- **Deployment Button Hanging Fix**: Resolved critical issue where publish/deploy button would get stuck in loading state.
  - Refactored DeploymentManager to use truly non-blocking container creation via `setTimeout(() => fetch(), 0)` pattern
  - Implemented manual AbortController with 30-second timeout for better browser compatibility
  - Container creation now runs fire-and-forget, cannot block deployment flow
  - Proper cleanup with clearTimeout prevents memory leaks
  - Clear error messages distinguish timeouts from other failures
  - Files modified: client/src/components/DeploymentManager.tsx

- **Workspace Loading Error Fix**: Fixed "useQuery is not defined" error preventing workspace from rendering.
  - Added missing `import { useQuery } from '@tanstack/react-query'` to NixConfig.tsx
  - Workspace editor now loads correctly, showing file tree, editor toolbar, and deploy button
  - Files modified: client/src/components/NixConfig.tsx

### Platform Updates
- **Google Cloud Platform Removal**: All Google Cloud dependencies and deployment references removed. Platform now exclusively uses Replit Reserved VM deployment.
  - Removed packages: @google-cloud/storage, @google/genai, @google/generative-ai, googleapis, google-auth-library
  - Replaced Google Cloud Storage with Replit's built-in Object Storage (server/services/real-object-storage.ts)
  - Removed Gemini AI provider from ai-providers.ts, ai-service.ts, ai-provider-factory.ts
  - Commented out Google OAuth in auth-complete.ts
  - Removed Google Drive MCP integration from server/mcp/server.ts
  - Updated all documentation (replit.md, README.md, docs/) to focus on Replit Reserved VM deployment only
  - AI providers now limited to: Anthropic Claude, OpenAI, Together AI, Replicate, Hugging Face, Groq, Anyscale

- **Dashboard Responsiveness Enhancements**: Upgraded dashboard to Fortune 500-grade responsive design.
  - Search/filter bar: Stacks vertically on mobile, horizontal scrolling for filter pills with hidden scrollbar
  - Project grid: 1 column (mobile), 2 columns (tablet), 3 columns (desktop), 4 columns (large desktop)
  - List view: Optimized for mobile with hidden icons and condensed deployment badges
  - Popular examples: Shortened labels on mobile for better UX
  - Added comprehensive data-testid attributes for automated testing
  - Enhanced dark mode support for all interactive elements

## External Dependencies
- **AI Integration**: Anthropic Claude API, OpenAI API, Together AI, Replicate, Hugging Face, Groq, Anyscale.
- **Deployment Platform**: Replit Reserved VM.
- **Authentication**: Passport.js (for GitHub, Google, GitLab, Bitbucket, Discord, Slack, Azure AD).
- **Real-time Communication**: WebSockets.
- **Database**: PostgreSQL (111 tables).
- **Frontend Libraries**: React.js, Tailwind CSS, shadcn/ui, wouter.
- **Backend Framework**: Express.js.
- **ORM**: Drizzle ORM.
- **Editor**: Monaco Editor.
- **Charting**: Chart.js.
- **Containerization**: Docker.
- **Caching**: Redis/ioredis.
- **CDN**: Replit's built-in CDN.