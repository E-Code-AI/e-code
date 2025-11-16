# E-Code Platform

## Overview
E-Code is a web-based collaborative IDE with AI assistance, offering code editing, terminal access, file management, and an autonomous AI agent. Built with TypeScript/Node.js, React, and PostgreSQL, its purpose is to facilitate rapid prototyping and education. The platform is currently an MVP, with a strategic vision for enterprise-grade scalability and Fortune 500 readiness. Key capabilities include multi-provider AI model selection with advanced optimization infrastructure, real-time collaboration, and robust security features.

## User Preferences
- **Communication:** Simple, everyday language
- **Code Style:** TypeScript with strict typing
- **Database:** NEVER manual SQL migrations - use `npm run db:push` (or `--force`)
- **Files:** NEVER remove without explicit request
- **Hooks:** ALL React hooks before early returns
- **Routing:** `/ide/:id` (legacy `/editor/:id` redirects)
- **Security:** API keys via Replit Secrets, never commit
- **Docker Build:** Optimized for <2GiB images

## System Architecture

### Frontend Architecture
The frontend uses React 18 and TypeScript with Vite, featuring TanStack Query for server state, Wouter for routing, Monaco Editor for code editing, and Shadcn/UI with Tailwind CSS for components. It's a component-based architecture with lazy-loaded routes, custom hooks, responsive design (including mobile/tablet views), and WebSocket support for real-time collaboration. UX enhancements prioritize layout-aware loading states and mobile optimization, including Safari-compatible solutions for horizontal scroll prevention.

### Backend Architecture
The backend is built with Node.js and Express.js in TypeScript, using Drizzle ORM for PostgreSQL (Neon serverless) and Passport.js for authentication. It employs a RESTful API design with a service-oriented approach, including specialized services for AI orchestration, autonomous engine logic, file system operations, and Git integration. Security features include CSRF protection, input sanitization, multi-tier rate limiting, and session-based authentication. Real-time services for terminal, collaborative editing, and build logs are powered by WebSockets.

**AI Optimization Infrastructure:**
This infrastructure includes a Task Classifier Service for ML-based routing, a Circuit Breaker Service for fault tolerance across AI providers, a Priority Queue Service for SLA-based request prioritization, an Intelligent Caching Service for semantic deduplication of AI responses, and an Observability Service for production monitoring. A Slack Alert Service provides real-time notifications for critical system events.

**Health & Monitoring:**
The system integrates Fortune 500-grade Kubernetes health probes (`/health/liveness`, `/health/readiness`, `/health/deep`, `/health/startup`) to manage pod lifecycle and traffic. A Provider Health API (`GET /api/health/providers`) offers real-time status validation for all integrated AI providers. Load testing infrastructure supports pre-production validation.

**API Documentation:**
Swagger/OpenAPI 3.0 documentation is available at `/api/docs`, providing an interactive API explorer.

### Database Schema
A PostgreSQL database with over 140 tables manages user data, project hierarchies, AI agent session tracking, deployment history, subscription management, and AI optimization monitoring.

### AI Agent System
The AI agent system features server-sent event streaming, multi-provider AI model selection (OpenAI, Anthropic, Gemini, xAI, Moonshot AI), database-backed conversation history, and a robust tool execution framework. It is integrated with the AI Optimization Infrastructure.

**AI Model Registry:**
A centralized model catalog (`shared/aiModels.ts`) contains metadata for 18 production models across 5 providers, detailing capabilities (Extended Thinking, MCP Tool Use, Context Window up to 1M tokens, Code Generation optimization), pricing, and release dates.

### Core Features
-   **Monaco Code Editor:** Advanced code editing.
-   **Terminal:** Interactive access via xterm.js.
-   **File Tree & Management:** Comprehensive file system operations.
-   **Real-time Collaboration:** Powered by Y.js.
-   **Authentication & Security:** Robust authentication with Passport.js.
-   **Container Orchestration:** TypeScript-based container execution and runtime management.

## External Dependencies

### AI/ML Services
-   **OpenAI:** GPT-5.1, GPT-5, GPT-5-mini, GPT-5-nano, GPT-4.1, GPT-4o, o3, o4-mini
-   **Anthropic:** Claude Sonnet 4.5, Opus 4.1, Haiku 4.5
-   **Google Gemini:** Gemini 2.5 Pro, Gemini 2.5 Flash
-   **Moonshot AI:** Kimi K2, Kimi K2 Thinking, Kimi K2 Turbo
-   **xAI:** Grok 4, Grok 4 Fast
-   **Groq:** Open-source models
-   **Model Context Protocol (MCP) SDK**

### Infrastructure Services
-   **PostgreSQL:** Neon serverless
-   **Redis:** Optional caching
-   **Stripe:** Payment processing
-   **SendGrid:** Email delivery
-   **Sentry:** Error monitoring
-   **Slack:** Production monitoring alerts

### Development Tools & Integrations
-   **GitHub:** OAuth integration
-   **Figma:** Design imports
-   **Playwright:** Browser automation for testing
-   **Monaco Editor:** Microsoft's VS Code editor component
-   **xterm.js:** Terminal emulation library

### Authentication Providers
-   **Replit Auth:** Google, GitHub, Twitter/X, Apple, email/password
-   **Custom Email/Password**

### Deployment Targets
-   **Replit Cloud Run**
-   **Docker**
-   **PM2**