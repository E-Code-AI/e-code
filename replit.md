# E-Code Platform

## Overview

E-Code Platform is an enterprise-grade AI-powered development environment that enables autonomous application building through natural language prompts. The platform combines a full-featured cloud IDE with intelligent AI agents capable of generating, editing, and deploying complete applications with minimal human intervention.

**Core Value Proposition:** Transform application ideas into production-ready code in minutes through AI-driven autonomous development, collaborative real-time editing, and one-click deployments.

**Key Capabilities:**
- AI-powered autonomous code generation and editing
- Full-featured Monaco-based code editor with real-time collaboration
- Integrated terminal, file management, and debugging tools
- Multi-model AI support (GPT-4, Claude 3.5, Gemini Pro, Llama)
- Enterprise-grade security (CSRF protection, rate limiting, RBAC)
- Automated deployment pipelines
- Mobile and tablet responsive design

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 18 with TypeScript
- Vite build system with optimized code splitting
- TanStack Query for server state management
- Wouter for client-side routing
- Monaco Editor for code editing
- Shadcn/UI component library with Radix UI primitives
- Tailwind CSS for styling

**Key Design Patterns:**
- Lazy-loaded routes for performance optimization
- Component-based architecture with separation of concerns
- Custom hooks for shared logic (authentication, WebSocket connections, mobile gestures)
- Responsive design with dedicated mobile/tablet views
- Real-time collaboration using WebSocket providers

**Major Frontend Components:**
- `EditorPage.tsx` - Main IDE workspace with Monaco integration
- `ProjectPage.tsx` - Project management and navigation
- `Dashboard.tsx` - User dashboard with AI prompt input ("Vibe Creation Flow")
- `AIAgent.tsx` / `ReplitAgentV2.tsx` - AI assistant interfaces
- `MobileIDEView.tsx` / `TabletIDEView.tsx` - Mobile/tablet optimized views
- Command palette system for keyboard-driven workflows

**State Management Strategy:**
- TanStack Query manages server state with automatic caching and invalidation
- React Context for global state (auth, theme, collaborative editing)
- URL-based state for navigation and shareable links
- Local storage persistence for user preferences

### Backend Architecture

**Technology Stack:**
- Node.js with Express.js web framework
- TypeScript for type safety
- Drizzle ORM for database operations
- PostgreSQL database (via Neon serverless)
- Passport.js for authentication
- WebSocket (ws library) for real-time features

**Architectural Patterns:**
- RESTful API design with 300+ endpoints across 34 route files
- Service-oriented architecture with specialized services:
  - `AgentOrchestrator` - Coordinates AI model interactions
  - `AutonomousEngineService` - Risk scoring and auto-approval logic
  - `PlanGeneratorService` - AI-powered task breakdown
  - `TestingOrchestratorService` - Playwright test orchestration
  - `FileSystemService` - File operations with security validation
  - `GitService` - Version control integration
  - `DeploymentService` - Automated deployment workflows

**Database Schema:**
- 140+ tables supporting all platform features
- Key entity relationships:
  - Users → Projects → Files (hierarchical file system)
  - AgentSessions → AgentTasks → AgentAuditLogs (AI workflow tracking)
  - Deployments → DeploymentBuilds (deployment history)
  - Subscriptions → Usage tracking (billing and quotas)

**Security Architecture:**
- CSRF token validation on all state-changing operations
- Custom `apiRequest()` helper replaces raw fetch() calls (109+ endpoints secured)
- Multi-tier rate limiting (global: 100/min, auth: 10/15min, AI: 10/min)
- Session-based authentication with HttpOnly cookies
- Role-based access control (RBAC) with admin middleware
- Input sanitization and XSS protection middleware
- Path traversal prevention in file operations
- bcrypt password hashing (10 rounds)

**Real-Time Services (WebSocket):**
- Terminal sessions with atomic buffer synchronization
- Collaborative editing with operational transforms
- Live presence indicators
- Build log streaming
- Test execution updates
- Security scanning notifications
- Resource monitoring

### External Dependencies

**AI/ML Services:**
- OpenAI GPT-4 / GPT-3.5 (via `OPENAI_API_KEY`)
- Anthropic Claude 3.5 (via `ANTHROPIC_API_KEY`)
- Google Gemini Pro (via `GOOGLE_AI_API_KEY`)
- Groq Llama (via `GROQ_API_KEY`)
- Model Context Protocol (MCP) SDK for tool execution

**Infrastructure Services:**
- PostgreSQL database (Neon serverless via `DATABASE_URL`)
- Redis caching layer (optional via `REDIS_URL`)
- Stripe payment processing (via `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY`)
- SendGrid email delivery (via `SENDGRID_API_KEY`)
- Sentry error monitoring (via `SENTRY_DSN`)

**Development Tools:**
- GitHub OAuth integration (via `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`)
- Figma design imports (via `FIGMA_API_KEY`)
- Playwright browser automation for testing
- Monaco Editor (Microsoft's VS Code editor component)
- xterm.js for terminal emulation

**CDN and Asset Delivery:**
- Configurable CDN support (via `CDN_BASE_URL`)
- Optimized asset caching with configurable TTLs
- Production build with Vite creates optimized chunks

**Authentication Providers:**
- Replit Auth (supports Google, GitHub, Twitter/X, Apple, email/password)
- Custom email/password with verification flow
- Session management with secure cookie configuration

**Deployment Targets:**
- Replit Cloud Run (autoscale deployment target)
- Docker containerization support
- PM2 process management for production (cluster mode)

**Notable Integration Patterns:**
- Fallback mechanisms when API keys unavailable (e.g., Figma service uses demo data)
- Auto-detection of Replit deployment URLs for CORS configuration
- Environment-aware configuration (development vs. production behavior)
- Health check endpoints for deployment verification
- Graceful degradation when optional services unavailable