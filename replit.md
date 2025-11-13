# E-Code Platform

**Last Updated:** November 13, 2025  
**📊 See [DOCUMENTATION_AUDIT.md](./DOCUMENTATION_AUDIT.md) for comprehensive feature status matrix, Fortune 500 readiness assessment, and Replit parity gaps.**

## Overview

E-Code is a web-based collaborative IDE with AI assistance, built with TypeScript/Node.js, React, and PostgreSQL. Provides code editing, terminal access, file management, and an autonomous AI agent. Targets rapid prototyping and education, with ongoing work toward enterprise-grade scalability.

**Current Status:** Functional MVP - Web 70-75% | Mobile Web 60-65% | Fortune 500 Ready 50-60%

**❌ CRITICAL CORRECTION:** Previous documentation falsely claimed "polyglot backend with Go/Python" — Verified reality: 100% TypeScript/Node.js (0 .go/.py files exist)

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

The frontend is built with React 18 and TypeScript, using Vite for optimized builds. Key technologies include TanStack Query for server state, Wouter for routing, Monaco Editor for code editing, and Shadcn/UI with Tailwind CSS for UI components. It employs a component-based architecture with lazy-loaded routes, custom hooks, and a responsive design supporting dedicated mobile and tablet views. Real-time collaboration is managed via WebSocket providers.

### Backend Architecture

The backend is developed with Node.js and Express.js, entirely in TypeScript. It uses Drizzle ORM for PostgreSQL database interactions (hosted on Neon serverless) and Passport.js for authentication. The architecture follows a RESTful API design with a service-oriented approach, including specialized services for AI orchestration (`AgentOrchestrator`), autonomous engine logic (`AutonomousEngineService`), plan generation (`PlanGeneratorService`), testing (`TestingOrchestratorService`), file system operations (`FileSystemService`), Git integration (`GitService`), and deployment (`DeploymentService`). Security features include CSRF protection, input sanitization, multi-tier rate limiting, session-based authentication, RBAC, and bcrypt password hashing. Real-time services for terminal, collaborative editing, and build logs are powered by WebSockets.

### Database Schema

The system utilizes a PostgreSQL database with over 140 tables, supporting features like user management, project and file hierarchies, AI agent session tracking, deployment history, and subscription management.

### AI Agent System

The AI agent system is robust, featuring server-sent event streaming, multi-provider AI model selection (OpenAI, Anthropic, Gemini, xAI, Groq), database-backed conversation history, a tool execution framework, and mobile web parity.

### Core Features

- **Monaco Code Editor:** Integrated for advanced code editing.
- **Terminal:** Utilizes xterm.js for interactive terminal access.
- **File Tree & Management:** Provides comprehensive file system operations.
- **Real-time Collaboration:** Infrastructure for collaborative editing using Y.js.
- **Authentication & Security:** Robust authentication with Passport.js supporting multiple OAuth providers and comprehensive security measures.
- **Container Orchestration:** TypeScript-based container execution and runtime management.

## External Dependencies

### AI/ML Services

- **OpenAI:** GPT-4 / GPT-3.5
- **Anthropic:** Claude 3.5
- **Google:** Gemini Pro
- **Groq:** Llama
- **Model Context Protocol (MCP) SDK:** For tool execution.

### Infrastructure Services

- **PostgreSQL:** Neon serverless for database hosting.
- **Redis:** Optional caching layer.
- **Stripe:** Payment processing.
- **SendGrid:** Email delivery.
- **Sentry:** Error monitoring.

### Development Tools & Integrations

- **GitHub:** OAuth integration.
- **Figma:** Design imports.
- **Playwright:** Browser automation for testing.
- **Monaco Editor:** Microsoft's VS Code editor component.
- **xterm.js:** Terminal emulation library.

### Authentication Providers

- **Replit Auth:** Supports Google, GitHub, Twitter/X, Apple, email/password.
- **Custom Email/Password:** With verification flow.

### Deployment Targets

- **Replit Cloud Run:** Autoscale deployment.
- **Docker:** Containerization support.
- **PM2:** Process management for production.