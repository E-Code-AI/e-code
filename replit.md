# E-Code Platform

## Overview
E-Code Platform is an advanced AI-powered development platform that streamlines software creation through intelligent, automated deployment and collaboration tools. Its purpose is to provide an integrated development environment that goes beyond existing solutions like Replit, offering enhanced features such as industry-leading GPU computing, advanced monitoring, and comprehensive authentication methods. The platform aims to enable users to launch complete applications with a single prompt, transforming ideas into running code quickly and efficiently.

## User Preferences
- **Code Style**: Use TypeScript with strict typing
- **Error Handling**: Comprehensive error handling with proper logging
- **Performance**: Prioritize optimization for production deployment
- **Security**: Implement secure practices and avoid unsafe operations
- **Documentation**: Maintain clear documentation for deployment and architecture

## System Architecture

### Core Services
- **AI Agent System**: Enhanced autonomous code generation with Anthropic Claude integration (currently Claude 3.5 Sonnet, with support for Claude 4 Sonnet agentic coding tools). This includes inline code completion and autonomous application building (file creation, dependency installation, app startup).
- **Real-time Collaboration**: WebSocket-based collaborative editing and live progress streaming for AI agent updates.
- **Container Orchestration**: Docker-based deployment with Kubernetes support, optimized for Cloud Run. Includes automatic package installation and application startup.
- **Database Management**: PostgreSQL with Drizzle ORM for advanced hosting, monitoring, and backups. Includes comprehensive credit-based billing, type-specific deployment configurations (autoscale, VM, scheduled, static), object storage, and key-value store.
- **Security Services**: Role-based permissions, audit logs, secret management, advanced authentication (7 OAuth providers, hardware security key support, session management, IP allowlisting), and secure session management.
- **Education Platform**: LMS integration with auto-grading and progress tracking.
- **Analytics & Monitoring**: Comprehensive production monitoring system for Fortune 500 standards including:
  - Real-time performance tracking with automatic error handling
  - Client-side monitoring for user analytics and error tracking
  - Server-side monitoring with APM integration
  - Health checks at `/api/monitoring/health`
  - Event tracking endpoint at `/api/monitoring/event`
  - Database tables for monitoring events, performance metrics, error logs, and API usage
  - Automatic session replay and user behavior analytics
  - Network monitoring with retry logic
  - Alert thresholds and anomaly detection

### Technology Stack
- **Frontend**: React.js with TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Express.js with TypeScript, Drizzle ORM
- **Deployment**: Cloud Run ready with Nix package management

### UI/UX Decisions
- Cleaned up the user interface by removing unnecessary pages and focusing on core functionalities.
- Implemented real, functional project templates (e.g., Next.js Blog, Express API, React Dashboard) with complete file structures ready to run.
- Enhanced UI with a 4-tab layout for code generation preview (Files, Preview, Features, Deploy).
- Icon transformations from string names to React components.

### Technical Implementations
- **Routing**: Slug-based routing for projects (`/@username/projectslug`) for consistent navigation.
- **Performance**: Compression middleware, code splitting, caching, build optimization utilities, and Docker optimization for smaller image sizes.
- **Security**: Replaced unsafe `eval()` usage with `Function` constructor, CSP headers, input validation.
- **Deployment**: Dynamic port configuration using `process.env.PORT` for Cloud Run compatibility.
- **Frontend Functionality**: Prioritizing frontend implementation where possible.

## External Dependencies
- **AI Integration**: Anthropic Claude API (specifically Claude 3.5 Sonnet and Claude 4 Sonnet)
- **Deployment Platform**: Google Cloud Run
- **Authentication**: Passport.js (for session management and integration with 7 OAuth providers: GitHub, Google, GitLab, Bitbucket, Discord, Slack, Azure AD)
- **Real-time Communication**: WebSockets
- **Database**: PostgreSQL
- **Frontend Libraries**: React.js, Tailwind CSS, shadcn/ui
- **Backend Framework**: Express.js
- **ORM**: Drizzle ORM
- **Editor**: Monaco Editor (for inline AI code completion)
- **Charting**: Chart.js (for React Dashboard template)
- **Containerization**: Docker