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
The frontend uses Shadcn/UI with Tailwind CSS and Monaco Editor. The design system incorporates iOS Dynamic Color System, San Francisco Pro Typography, 8pt Grid Spacing, Apple-quality animation springs, iOS-style shadows, continuous corners, and appropriate touch target sizes for a comprehensive Apple-quality mobile experience. The autonomous agent interface is platform-agnostic with responsive layouts and real-time progress tracking. Recent UI components include `AppsView`, `AppToaster`, `TabBar`, `TestResultsPanel`, `CheckpointTimeline`, `AutonomyControlPanel`, and a `TemplatesMarketplace` with various sub-components. A consolidated `CommandPalette` provides fuzzy search and keyboard navigation.

### Technical Implementations
The frontend is built with React 18, TypeScript, Vite, TanStack Query, and Wouter. The backend is a Node.js and Express.js application in TypeScript, utilizing Drizzle ORM for PostgreSQL and Passport.js for authentication, following a RESTful API design. Real-time services for terminal, collaborative editing (Y.js), and build logs are powered by WebSockets. AI optimization infrastructure includes a Task Classifier, Circuit Breaker, Priority Queue, Intelligent Caching, and Observability. Environment variables are encrypted using AES-256-GCM. Backend implements SSE streaming with buffered JSON parsing for reliable code generation. Anonymous bootstrap authentication creates ephemeral guest users with project-specific JWT tokens.

Key AI Agent Enhancements include structured XML-based system prompts, a repository overview service, a context window manager with token optimization and long-term memory, a unified AI provider system with multi-provider fallback, and AI-powered inline code actions within the Monaco Editor.

A robust Checkpoints & Rollback System provides atomic transactions for checkpoint creation, bidirectional navigation, and selective restore of files, databases, or environment variables. This system integrates with a dedicated API and frontend components for timeline visualization.

A Background Auto-Testing System uses Playwright for test execution, persisting results, and providing real-time notifications via a secure WebSocket.

Max Autonomy Mode enables 240-minute autonomous sessions with AI task decomposition, auto-execution, ETA estimation, and cost tracking, integrating with auto-checkpointing, auto-testing, and auto-rollback.

A Templates Marketplace offers CRUD operations, ratings, filtering, and one-click forking. A Bounties Marketplace includes schema enhancements for payout status, bidirectional ratings, and Stripe integration for escrow and payouts.

Context Window Enhancements include separate dev/prod database connections, screenshot capture for checkpoints, and AI memory retention with smart summarization and priority-based message retention.

### Feature Specifications
Core features include a Monaco Code Editor with advanced enhancements (Git UI, multi-cursor, refactoring, IntelliSense), an interactive terminal (xterm.js), file management, real-time collaboration, robust authentication, TypeScript-based container orchestration, Global Search & Replace, an Environment Variables Manager, a Logs Viewer, and a Debugger UI. The UI is responsive across devices. Autonomous workspace creation involves a Bootstrap API call, AI plan generation, WebSocket-based real-time progress, autonomous execution, and a live preview. PWA features and Electron desktop support are included.

### System Design Choices
A PostgreSQL database stores user data, project hierarchies, AI agent sessions, deployment history, subscription management, and AI optimization monitoring. Security measures include CSRF protection, input sanitization, tier-based rate limiting, API versioning, session-based authentication, and encrypted environment variables. The AI agent system provides server-sent event streaming, multi-provider AI model selection, database-backed conversation history, circuit breakers, and retry logic. Health monitoring integrates Kubernetes probes and a Provider Health API with Prometheus metrics. A two-tier database API architecture (Admin and Project Data APIs) is used with integrated security. Docker builds are optimized for small image sizes. Security enhancements include authentication and authorization for repository overview and templates APIs, context route timeouts, file system scanning limits, and project path scoping.

### Stripe Payment Integration
**Complete production-ready Stripe integration** for subscription billing and usage-based pricing with comprehensive security patterns.

#### Backend Configuration
- **StripePaymentService** (`server/payments/stripe-service.ts`) - Core Stripe API integration with plan definitions
- **StripeBillingService** (`server/services/stripe-billing-service.ts`) - Subscription management and metered billing
- **BountyPaymentService** (`server/services/bounty-payment-service.ts`) - Escrow and payout handling
- **Stripe Usage Worker** (`server/workflows/stripe-usage-worker.ts`) - Automated billing queue processor (runs every 30s)

#### API Routes
All routes are mounted at `/api/payments/*`. Most routes require authentication via `ensureAuthenticated` middleware except where noted:

**Public Routes:**
- **GET /api/payments/plans** - Returns all subscription plans (Core $20, Pro $40, Enterprise $200) with features and limits (no auth required)
- **POST /api/payments/webhook** - Stripe webhook handler with signature validation (no auth required, validates webhook signature instead)

**Protected Routes (require authentication):**
- **POST /api/payments/create-subscription** - Creates new Stripe subscription with payment intent
- **POST /api/payments/cancel-subscription** - Cancels active subscription
- **POST /api/payments/update-subscription** - Modifies subscription plan
- **POST /api/payments/create-payment-intent** - One-time payments
- **GET /api/payments/subscription-status** - Current user subscription status
- **GET /api/payments/billing-history** - Retrieves user's billing history
- **POST /api/payments/record-usage** - Records usage for metered billing

#### Subscription Plans (Backend Implementation)
1. **Core**: $20/month - 5 private projects, 2 collaborators, 10GB storage, 100 CPU hours/month, 10 deployments/month
2. **Pro**: $40/month - Unlimited projects/collaborators, 50GB storage, 500 CPU hours/month, unlimited deployments, priority support
3. **Enterprise**: $200/month - Everything in Pro + custom domains, SSO/SAML, dedicated support, SLA guarantee, 1TB storage, unlimited CPU hours

#### Usage-Based Pricing (Metered)
- **Compute**: `STRIPE_PRICE_ID_COMPUTE` - Per CPU hour beyond plan limits
- **Storage**: `STRIPE_PRICE_ID_STORAGE` - Per GB/month beyond plan limits
- **Bandwidth**: `STRIPE_PRICE_ID_BANDWIDTH` - Per GB transferred
- **Deployments**: `STRIPE_PRICE_ID_DEPLOYMENT` - Per deployment beyond limits
- **Database**: `STRIPE_PRICE_ID_DATABASE` - Per GB database storage
- **AI Agent Usage**: `STRIPE_PRICE_ID_AGENT_USAGE` - Per AI request

#### Environment Variables
**Shared Environment (Production & Development):**
- `VITE_STRIPE_PUBLIC_KEY` - Stripe publishable key (pk_live_...) for frontend Stripe.js initialization

**Secrets (Backend Only - Never expose to frontend):**
- `STRIPE_SECRET_KEY` - Stripe secret key (sk_live_...)
- `STRIPE_WEBHOOK_SECRET` - Webhook signature verification
- All price IDs for subscription plans and metered billing

**Security Pattern**: NEVER use `VITE_` prefix for secret keys. Only publishable keys (pk_live_...) should be frontend-accessible.

#### Frontend Components
- **Pricing Page** (`/pricing`) - Displays all plans with detailed feature comparison
- **Subscribe Page** (`/subscribe`) - Stripe Elements checkout flow with PaymentElement
- **Usage Dashboard** - Real-time billing and usage tracking

#### Workflow Status
✅ **Stripe Usage Worker**: Active, processing billing queue every 30 seconds
✅ **Backend Routes**: Registered at `/api/payments/*` and verified working
✅ **Frontend Integration**: Stripe.js loaded with VITE_STRIPE_PUBLIC_KEY
✅ **Security**: All secrets properly secured via Replit Secrets

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