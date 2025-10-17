# E-Code Platform

## Overview
E-Code Platform is an advanced AI-powered development platform that streamlines software creation through intelligent, automated deployment and collaboration tools. It provides an integrated development environment with features like GPU computing, advanced monitoring, and comprehensive authentication. The platform enables users to launch complete applications from a single prompt, transforming ideas into running code quickly and efficiently. The project's ambition is to offer a production-ready, highly scalable platform supporting millions of concurrent users with Fortune 500-grade infrastructure. It includes a fully functional React Native mobile app and has achieved 100% functional completion for critical backend features like file operations, AI code generation, live preview, and container orchestration.

## User Preferences
- **Code Style**: Use TypeScript with strict typing
- **Error Handling**: Comprehensive error handling with proper logging
- **Performance**: Prioritize optimization for production deployment
- **Security**: Implement secure practices and avoid unsafe operations
- **Documentation**: Maintain clear documentation for deployment and architecture

## System Architecture

### Core Services
The platform features a polyglot backend architecture with:
-   **Go Runtime Service**: Handles container orchestration, file operations, and WebSocket real-time services for maximum performance.
-   **Python ML Service**: Powers AI/ML workloads with real ML libraries for advanced processing.
-   **TypeScript Core**: Manages the Web API, user management, database operations, and frontend serving.
-   **MCP (Model Context Protocol) Server**: A standalone server providing a comprehensive set of tools for AI agent operations (file system, command execution, database queries, AI completion).
-   **AI Agent System**: Provides autonomous code generation, leveraging MCP for all operations, and supports various Anthropic and OpenAI models, including the OpenAI Assistants API.
-   **Real-time Collaboration**: WebSocket-based collaborative editing and live progress streaming.
-   **Process Isolation System**: Uses Node.js child processes for logical separation of project environments with configurable resource limits.
-   **Database Management**: PostgreSQL with Drizzle ORM, including advanced hosting, monitoring, and credit-based billing.
-   **Security Services**: Role-based permissions, audit logs, secret management, advanced authentication (7 OAuth providers, hardware security key support), and secure session management.
-   **Education Platform**: LMS integration with auto-grading and progress tracking.
-   **Analytics & Monitoring**: Comprehensive production monitoring, including real-time performance tracking, APM, and automatic session replay.

### Production Hardening
-   **Redis Caching Service**: Fortune 500-grade caching with auto-failover and session storage.
-   **CDN Optimization Service**: Multi-provider CDN support for static asset optimization.
-   **Rate Limiting Infrastructure**: Multi-tier protection with Redis-backed distributed rate limiting.
-   **Security Middleware Suite**: Comprehensive protection against common web vulnerabilities.
-   **Database Connection Pooling**: Enterprise-grade optimization for PostgreSQL.
-   **Performance Monitoring Service**: Real-time insights into application performance.
-   **Comprehensive Testing Infrastructure**: Includes security, performance, and integration test suites.

### Technology Stack
-   **Frontend**: React.js with TypeScript, Tailwind CSS, shadcn/ui.
-   **Backend**: Express.js with TypeScript, Drizzle ORM.
-   **Deployment**: Google Cloud Run and Replit Deploy with Nix.

### UI/UX Decisions
-   Focuses on core functionalities with a streamlined interface, including functional project templates.
-   Features a 4-tab layout for code generation preview (Files, Preview, Features, Deploy) and a principal AI Agent interface similar to Replit.

### Technical Implementations
-   **Routing**: Robust Replit-style slug routing for projects with full authentication.
-   **Performance**: Compression, code splitting, caching, and build optimizations.
-   **Security**: CSP headers, input validation, and secure practices.
-   **Deployment**: Dynamic port configuration for cloud compatibility.
-   **Frontend Functionality**: Prioritizes frontend implementation where possible.
-   **Preview System**: Features live server previews via WebSockets, Eruda developer tools integration, responsive device testing, and automatic preview startup, all integrated into the project page.

## External Dependencies
-   **AI Integration**: Anthropic Claude API, OpenAI API, Together AI, Replicate, Hugging Face, Groq, Anyscale.
-   **Deployment Platform**: Google Cloud Run, Replit Deploy.
-   **Authentication**: Passport.js (for GitHub, Google, GitLab, Bitbucket, Discord, Slack, Azure AD).
-   **Real-time Communication**: WebSockets.
-   **Database**: PostgreSQL.
-   **Frontend Libraries**: React.js, Tailwind CSS, shadcn/ui.
-   **Backend Framework**: Express.js.
-   **ORM**: Drizzle ORM.
-   **Editor**: Monaco Editor.
-   **Charting**: Chart.js.
-   **Containerization**: Docker.
-   **Caching**: Redis/ioredis.
-   **CDNs**: Cloudflare, CloudFront, Fastly.