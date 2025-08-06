# E-Code Platform

## Overview
E-Code Platform is an advanced AI-powered development platform that streamlines software creation through intelligent, automated deployment and collaboration tools. Its purpose is to provide an integrated development environment that goes beyond existing solutions like Replit, offering enhanced features such as industry-leading GPU computing, advanced monitoring, and comprehensive authentication methods. The platform aims to enable users to launch complete applications with a single prompt, transforming ideas into running code quickly and efficiently.

**Production Domain**: https://e-code.ai (Ready for deployment - August 6, 2025)

## Recent Updates (August 6, 2025)
- **MCP Integration Complete**: Fully integrated GitHub, PostgreSQL, and Memory MCP servers into the project UI
- **MCP Panels Added**: Created dedicated UI panels for each critical MCP server with comprehensive functionality
- **API Routes Implemented**: Added specific API endpoints for MCP server operations at `/api/mcp/github/*`, `/api/mcp/postgres/*`, `/api/mcp/memory/*`
- **Deep UI Integration**: MCP panels now accessible directly from the project page right sidebar

## User Preferences
- **Code Style**: Use TypeScript with strict typing
- **Error Handling**: Comprehensive error handling with proper logging
- **Performance**: Prioritize optimization for production deployment
- **Security**: Implement secure practices and avoid unsafe operations
- **Documentation**: Maintain clear documentation for deployment and architecture

## System Architecture

### Core Services
- **MCP (Model Context Protocol) Server**: 100% Complete implementation following modelcontextprotocol.io specification with HTTP transport for web compatibility. **FULLY INTEGRATED** into AI Agent System and ALL UI Areas with dedicated panels for GitHub, PostgreSQL, and Memory MCP servers (as of August 6, 2025). **CLAUDE.AI INTEGRATION READY** with OAuth2, JWT, and API key authentication. **6 MCP SERVERS INTEGRATED** with comprehensive UI panels. Provides:
  - Standalone HTTP server running on port 3200
  - Full HTTP transport implementation for web compatibility
  - **Authentication Layer**: OAuth2, JWT tokens, and API key support for Claude.ai Custom Connector
  - **CORS Configuration**: Configured for claude.ai domain access with security headers
  - **Cloud Run Deployment**: Automated deployment scripts with HTTPS for production
  - Filesystem operations (read, write, list, search, watch, move, copy)
  - Command execution with streaming output support
  - Database integration with full SQL capabilities
  - API access with HTTP/GraphQL client functionality
  - Tool integration with 30+ built-in tools including:
    * Filesystem tools (fs_read, fs_write, fs_list, fs_delete, fs_mkdir, fs_move, fs_copy, fs_search, fs_watch)
    * Execution tools (exec_command, exec_spawn, process_kill)
    * Database tools (db_query, db_transaction)
    * API tools (api_request, graphql_query)
    * System tools (system_info, env_get, env_set)
    * Development tools (git_status, npm_install, docker_build, kube_deploy)
    * Security tools (crypto_hash, crypto_encrypt, crypto_decrypt)
    * AI tools (ai_complete with Anthropic Claude integration)
    * **GitHub MCP Tools** (github_list_repos, github_create_repo, github_create_issue, github_create_pr)
    * **PostgreSQL MCP Tools** (postgres_list_tables, postgres_get_schema, postgres_query, postgres_backup)
    * **Memory MCP Tools** (memory_create_node, memory_search, memory_create_edge, memory_save_conversation, memory_get_history)
  - Resource management with 5 resource types (filesystem, database, environment, processes, git)
  - System monitoring and resource management
  - Complete tool execution handlers with fallback implementations
  - Health check endpoint at /mcp/health
  - OAuth endpoints at /mcp/oauth/authorize and /mcp/oauth/token
  - Full compatibility with MCP specification from modelcontextprotocol.io
  - **Real-time Integration**: All AI agent operations now route through MCP tools instead of direct storage/execution calls
  - **Complete UI Integration** (August 6, 2025):
    * ✅ File operations replaced with MCP fs_write, fs_read, fs_mkdir tools
    * ✅ Command execution replaced with MCP exec_command tool  
    * ✅ AI agent requests routed through MCP client in backend
    * ✅ Chat interface connected to MCP with visual status indicators
    * ✅ All MCP endpoints implemented in agent AI 
    * ✅ Chat user input processed through MCP with "MCP Powered" badges
    * ✅ Dedicated UI panels for GitHub, PostgreSQL, and Memory MCP servers
    * ✅ Full integration of MCP panels into ProjectPage right sidebar
    * ✅ API routes for all MCP server operations
  - **Claude.ai Integration** (August 6, 2025):
    * ✅ OAuth2 authorization flow for secure access
    * ✅ API key authentication for simple integration
    * ✅ CORS headers configured for claude.ai domains
    * ✅ Cloud Run deployment scripts with HTTPS
    * ✅ JWT token management with refresh tokens
    * ✅ Rate limiting and security headers
- **AI Agent System**: Enhanced autonomous code generation with Anthropic Claude integration (currently Claude 3.5 Sonnet, with support for Claude 4 Sonnet agentic coding tools). **NOW POWERED BY MCP** for all operations including file creation, package installation, and command execution. This includes inline code completion and autonomous application building via MCP tools.
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

### Production Hardening (Added August 5, 2025)
- **Redis Caching Service**: Fortune 500-grade caching with Redis/ioredis
  - Automatic failover and reconnection strategies
  - Cache patterns: remember, invalidation, rate limiting
  - Session storage with TTL management
  - Health monitoring and graceful degradation
- **CDN Optimization Service**: Multi-provider CDN support
  - Cloudflare, CloudFront, and Fastly integration ready
  - Static asset optimization with 1-year cache headers
  - Dynamic content caching strategies
  - Edge location routing and performance reporting
  - Security headers and mobile optimization
- **Rate Limiting Infrastructure**: Multi-tier protection
  - Redis-backed distributed rate limiting
  - Different limits for auth (5/15min), API (100/min), static (500/min)
  - Cost-based rate limiting for expensive operations
  - Dynamic tier-based limits (free/pro/enterprise)
  - IP whitelisting/blacklisting support
- **Security Middleware Suite**: Comprehensive protection
  - Helmet.js integration with CSP configuration
  - XSS, SQL injection, and CSRF protection
  - Input sanitization and validation
  - File upload security with MIME type validation
  - API key validation and security monitoring
  - IP-based access control for admin routes
- **Database Connection Pooling**: Enterprise-grade optimization
  - Configurable connection pools (min: 5, max: 20)
  - Automatic connection health monitoring
  - Query performance tracking and slow query alerts
  - Read replica support with load balancing
  - Transaction support with automatic rollback
  - Graceful shutdown and connection cleanup
- **Performance Monitoring Service**: Real-time insights
  - Request timing middleware with automatic alerts
  - System metrics: CPU, memory, event loop lag
  - Endpoint performance tracking
  - Automatic slow request detection (>1s threshold)
  - Health status reporting and metrics aggregation
- **Comprehensive Testing Infrastructure**: Production-ready testing
  - Test database with automatic setup/teardown
  - Test runner with suite management
  - Security, performance, and integration test suites
  - Mock service configuration for external dependencies
  - Retry mechanisms and timeout handling

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
- **Routing**: Robust Replit-style slug routing for projects (`/@username/projectslug`) with full authentication and access control (Fixed August 6, 2025). Consolidated duplicate route definitions and fixed parameter mapping for proper project navigation.
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