# E-Code Platform

## Overview
E-Code is a web-based collaborative IDE with AI assistance, offering code editing, terminal access, file management, and an autonomous AI agent. It aims to facilitate rapid prototyping and education, with a strategic vision for enterprise-grade scalability, multi-provider AI model selection, real-time collaboration, and robust security features. The platform's ambition is to provide autonomous workspace creation, from prompt to live preview, streaming progress in real-time.

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

## System Architecture

### Frontend Architecture
The frontend uses React 18, TypeScript, Vite, TanStack Query for server state, Wouter for routing, Monaco Editor for code editing, and Shadcn/UI with Tailwind CSS for components. It supports real-time collaboration via WebSockets and responsive design. Key features include Global Search & Replace, an Environment Variables Manager with encryption, a Logs Viewer with filtering, and a Debugger UI compatible with the VSCode Debug Adapter Protocol.

### Backend Architecture
The backend is built with Node.js and Express.js in TypeScript, using Drizzle ORM for PostgreSQL and Passport.js for authentication. It follows a RESTful API design with a service-oriented approach. Services manage AI orchestration, autonomous engine logic, file system operations, and Git integration. Security features include CSRF protection, input sanitization, tier-based rate limiting, and session-based authentication. Real-time services for terminal, collaborative editing, and build logs are powered by WebSockets. AI optimization infrastructure includes a Task Classifier, Circuit Breaker, Priority Queue, Intelligent Caching, and Observability. Health monitoring integrates Kubernetes probes and a Provider Health API. API documentation is provided via Swagger/OpenAPI 3.0 at `/api/docs`.

### Database Schema
A PostgreSQL database stores user data, project hierarchies, AI agent sessions, deployment history, subscription management, and AI optimization monitoring. Environment variables are stored in an `environment_variables` table, with secrets encrypted using AES-256-GCM.

### AI Agent System
The AI agent system features server-sent event streaming, multi-provider AI model selection (OpenAI, Anthropic, Gemini, xAI, Moonshot AI), database-backed conversation history, and a robust tool execution framework. It integrates with the AI Optimization Infrastructure and includes a centralized model catalog. This system supports fully autonomous workspace creation, generating an IDE, files, and live preview from a prompt, with real-time WebSocket updates.

### Core Features
- Monaco Code Editor
- Interactive Terminal via xterm.js
- Comprehensive File Tree & Management
- Real-time Collaboration powered by Y.js
- Robust Authentication & Security with Passport.js
- TypeScript-based Container Orchestration
- Global Search & Replace
- Environment Variables Manager
- Logs Viewer
- Debugger UI (DAP compatible)
- Git UI

## External Dependencies

### AI/ML Services
- **OpenAI:** GPT-5.1, GPT-5, GPT-5-mini, GPT-5-nano, GPT-4.1, GPT-4o, o3, o4-mini
- **Anthropic:** Claude Sonnet 4.5, Opus 4.1, Haiku 4.5
- **Google Gemini:** Gemini 2.5 Pro, Gemini 2.5 Flash
- **Moonshot AI:** Kimi K2, Kimi K2 Thinking, Kimi K2 Turbo
- **xAI:** Grok 4, Grok 4 Fast
- **Groq:** Open-source models
- **Model Context Protocol (MCP) SDK**

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