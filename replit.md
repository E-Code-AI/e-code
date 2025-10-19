# E-Code Platform

## Overview
E-Code Platform is a production-ready AI-powered development platform that streamlines software creation through automated deployment and collaboration tools. It offers enterprise-grade infrastructure, AI capabilities like custom prompts and a template library, and comprehensive tools for software development lifecycle management. The platform is optimized for performance, security, and scalability, ready for Fortune 500 deployment on Replit.

## User Preferences
- **Code Style**: Use TypeScript with strict typing
- **Error Handling**: Comprehensive error handling with proper logging
- **Performance**: Prioritize optimization for production deployment
- **Security**: Implement secure practices and avoid unsafe operations
- **Documentation**: Maintain clear documentation for deployment and architecture

## System Architecture

### Core Services
The platform utilizes a polyglot backend architecture:
- **Go Runtime Service**: Handles container orchestration, file operations, and WebSocket real-time services.
- **Python ML Service**: Powers AI/ML workloads.
- **TypeScript Core**: Manages Web API, user management, database operations, and frontend serving.
- **AI Agent System**: Provides autonomous code generation, leveraging various AI models (Anthropic, OpenAI, etc.) and the OpenAI Assistants API.
- **Real-time Collaboration**: WebSocket-based collaborative editing and live progress streaming.
- **Process Isolation System**: Node.js child processes with configurable resource limits.
- **Database Management**: PostgreSQL with Drizzle ORM.
- **Security Services**: Role-based permissions, audit logs, secret management, advanced authentication (7 OAuth providers, hardware security key support), and secure session management.
- **Analytics & Monitoring**: Optimized production monitoring with 95% memory threshold and 5-minute intervals.

### Production Hardening
Includes Redis caching, CDN optimization via Replit's built-in CDN, multi-tier rate limiting, comprehensive security middleware, database connection pooling, and performance monitoring.

### Technology Stack
- **Frontend**: React.js with TypeScript, Tailwind CSS, shadcn/ui, wouter.
- **Backend**: Express.js with TypeScript, Drizzle ORM.
- **Deployment**: Replit Deploy with Nix environment support and automatic configuration.

### UI/UX Decisions
Features a streamlined interface with a 4-tab layout (Files, Preview, Features, Deploy) and a principal AI Agent interface. Routing is backwards compatible with automatic redirects from old URL formats.

### Technical Implementations
- **Routing**: Replit-style slug routing (`/u/username/projectname`) with authentication and backwards compatibility.
- **Performance**: Compression, code splitting, caching, and build optimizations.
- **Security**: CSP headers, input validation.
- **Deployment**: Dynamic port configuration, non-blocking initialization.
- **Preview System**: Live server previews via WebSockets, Eruda developer tools integration, responsive device testing.
- **Memory Management**: Optimized monitoring (95% threshold, 5-minute intervals).
- **Database Optimization**: Graceful handling of missing tables, proper SQL syntax, efficient connection pooling.

## External Dependencies
- **AI Integration**: Anthropic Claude API, OpenAI API, Together AI, Replicate, Hugging Face, Groq, Anyscale.
- **Deployment Platform**: Replit Deploy.
- **Authentication**: Passport.js (for GitHub, Google, GitLab, Bitbucket, Discord, Slack, Azure AD).
- **Real-time Communication**: WebSockets.
- **Database**: PostgreSQL.
- **Frontend Libraries**: React.js, Tailwind CSS, shadcn/ui, wouter.
- **Backend Framework**: Express.js.
- **ORM**: Drizzle ORM.
- **Editor**: Monaco Editor.
- **Charting**: Chart.js.
- **Containerization**: Docker.
- **Caching**: Redis/ioredis.
- **CDN**: Replit's built-in CDN.