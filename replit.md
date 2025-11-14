# E-Code Platform

## Overview

E-Code is a web-based collaborative IDE with AI assistance, built with TypeScript/Node.js, React, and PostgreSQL. It offers code editing, terminal access, file management, and an autonomous AI agent, aiming to facilitate rapid prototyping and education. The platform is currently a functional MVP, with ongoing efforts to achieve enterprise-grade scalability and Fortune 500 readiness. Recent critical fixes include: restored autonomous IDE functionality, enhanced AI provider fallback mechanisms, comprehensive AI optimization infrastructure, production monitoring via Slack, mobile horizontal scroll fixes (Safari-compatible), loading icon positioning fixes preventing jarring UX jumps, and **Phase 3.2 completed: K8s health endpoints + Swagger API documentation integration** (November 14, 2025).

## User Preferences

- **Communication:** Simple, everyday language
- **Code Style:** TypeScript with strict typing
- **Database:** NEVER manual SQL migrations - use `npm run db:push` (or `--force`)
- **Files:** NEVER remove without explicit request
- **Hooks:** ALL React hooks before early returns
- **Routing:** `/ide/:id` (legacy `/editor/:id` redirects)
- **Security:** API keys via Replit Secrets, never commit

## System Architecture

### Frontend Architecture

The frontend uses React 18 and TypeScript with Vite for builds. It features TanStack Query for server state, Wouter for routing, Monaco Editor for code editing, and Shadcn/UI with Tailwind CSS for components. The architecture is component-based with lazy-loaded routes, custom hooks, responsive design (including dedicated mobile/tablet views), and WebSocket support for real-time collaboration.

**UX Enhancements:**
- **Loading States:** Layout-aware loading helpers (`PageShellLoading`, `ReplitLayoutLoading`) ensure loading icons appear immediately centered without position jumps. All loading states follow the pattern: relative container with deterministic height + absolute inset-0 centering.
- **Mobile Optimization:** Progressive enhancement for horizontal scroll prevention (overflow-x:hidden fallback + @supports for clip), Safari-compatible solutions, enhanced ScrollToTop with iOS support.

### Backend Architecture

The backend is built with Node.js and Express.js in TypeScript, utilizing Drizzle ORM for PostgreSQL (Neon serverless) and Passport.js for authentication. It follows a RESTful API design with a service-oriented approach, including specialized services for AI orchestration, autonomous engine logic, plan generation, testing, load testing, file system operations, Git integration, and deployment. Security features include CSRF protection, input sanitization, multi-tier rate limiting, session-based authentication, RBAC, and bcrypt password hashing. Real-time services for terminal, collaborative editing, and build logs are powered by WebSockets.

**AI Optimization Infrastructure:**
This includes a Task Classifier Service for ML-based routing to optimize model usage and cost, a Circuit Breaker Service for fault tolerance across multiple AI providers, a Priority Queue Service for SLA-based request prioritization, an Intelligent Caching Service for semantic deduplication of AI responses, and an Observability Service for production monitoring, structured logging, and metrics. A Slack Alert Service provides real-time notifications for critical system events. All optimization endpoints are secured with admin-only access controls.

**Health & Monitoring:**
A Provider Health API (`GET /api/health/providers`) offers real-time status validation for all integrated AI providers, including response times and error messages. Admin Dashboards provide full web and mobile parity with responsive designs for monitoring provider health and system metrics. Load testing infrastructure supports concurrent AI streaming, database performance, and WebSocket limits for pre-production validation.

**K8s Health Endpoints (Phase 3.2 - November 2025):**
Fortune 500-grade Kubernetes health probes integrated:
- `/health/liveness` - Process alive check (always 200 OK if responding)
- `/health/readiness` - Traffic readiness check (**200 when ready, 503 when not ready** - enables K8s traffic shedding for unhealthy pods)
- `/health/deep` - Comprehensive system check (503 when unhealthy, includes OpenAI, Anthropic, disk space)
- `/health/startup` - Startup probe (ensures all critical dependencies initialized)

Critical behavior: Readiness returns HTTP 503 when any critical dependency (database, Redis, memory) is down, allowing Kubernetes to remove the pod from the load balancer. Liveness always returns 200 if process is alive (prevents unnecessary pod restarts). Health checks include proper 'degraded' state handling for early warning (memory >80%, disk >80%, Redis >500ms response time).

**API Documentation:**
Swagger/OpenAPI 3.0 documentation available at `/api/docs` (controlled via `SWAGGER_ENABLED` flag, enabled by default). Provides interactive API explorer with request/response schemas for all endpoints.

### Database Schema

The system uses a PostgreSQL database with over 140 tables for user management, project and file hierarchies, AI agent session tracking, deployment history, subscription management, and AI optimization monitoring. Recent additions include the `slack_config` table for storing Slack webhook configurations for production alerts.

### AI Agent System

The AI agent system features server-sent event streaming, multi-provider AI model selection (OpenAI, Anthropic, Gemini, xAI, Groq), database-backed conversation history, and a robust tool execution framework. It is fully integrated with the AI Optimization Infrastructure for intelligent task classification, circuit breaker checks, and comprehensive logging/alerting for every streaming request.

### Core Features

-   **Monaco Code Editor:** Advanced code editing.
-   **Terminal:** Interactive access via xterm.js.
-   **File Tree & Management:** Comprehensive file system operations.
-   **Real-time Collaboration:** Powered by Y.js.
-   **Authentication & Security:** Robust authentication with Passport.js and comprehensive security measures.
-   **Container Orchestration:** TypeScript-based container execution and runtime management.

## External Dependencies

### AI/ML Services

-   **OpenAI:** GPT-4 / GPT-3.5
-   **Anthropic:** Claude 3.5
-   **Google:** Gemini Pro
-   **Groq:** Llama
-   **Model Context Protocol (MCP) SDK:** For tool execution.

### Infrastructure Services

-   **PostgreSQL:** Neon serverless.
-   **Redis:** Optional caching.
-   **Stripe:** Payment processing.
-   **SendGrid:** Email delivery.
-   **Sentry:** Error monitoring.
-   **Slack:** Production monitoring alerts.

### Development Tools & Integrations

-   **GitHub:** OAuth integration.
-   **Figma:** Design imports.
-   **Playwright:** Browser automation for testing.
-   **Monaco Editor:** Microsoft's VS Code editor component.
-   **xterm.js:** Terminal emulation library.

### Authentication Providers

-   **Replit Auth:** Google, GitHub, Twitter/X, Apple, email/password.
-   **Custom Email/Password:** With verification.

### Deployment Targets

-   **Replit Cloud Run:** Autoscale deployment.
-   **Docker:** Containerization support.
-   **PM2:** Process management.