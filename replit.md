# E-Code Platform

## Overview
E-Code Platform is a production-ready AI-powered development platform that streamlines software creation through automated deployment and collaboration tools. It offers enterprise-grade infrastructure, AI capabilities like custom prompts and a template library, and comprehensive tools for software development lifecycle management. The platform is optimized for performance, security, and scalability, ready for Fortune 500 deployment on Replit.

## Critical Pages - DO NOT REMOVE
The following pages are essential to the platform and should NEVER be removed:

### Marketing & Comparison Pages
- **AIDocumentation** (`/ai-documentation`) - Complete AI features documentation
- **Bounties** (`/marketing/bounties`) - Developer marketplace and bounties landing page
- **Compare** (`/compare`) - Main comparison landing page
- **VsGitHubCodespaces** (`/compare/github-codespaces`) - E-Code vs GitHub Codespaces comparison
- **VsGlitch** (`/compare/glitch`) - E-Code vs Glitch comparison
- **VsHeroku** (`/compare/heroku`) - E-Code vs Heroku comparison
- **VsCodeSandbox** (`/compare/codesandbox`) - E-Code vs CodeSandbox comparison
- **VsAwsCloud9** (`/compare/aws-cloud9`) - E-Code vs AWS Cloud9 comparison

### Core Pages
- **Landing** (`/`) - Main landing page
- **Pricing** (`/pricing`) - Pricing information
- **Features** (`/features`) - Platform features
- **About** (`/about`) - About the platform
- **AI** (`/ai`) - AI capabilities overview
- **AIAgent** (`/ai-agent`) - AI Agent interface
- **Dashboard** (`/dashboard`) - User dashboard
- **ProjectPage** (`/u/:username/:projectname`) - Individual project page

### Solutions Pages
- **AppBuilder** (`/solutions/app-builder`) - App building solution
- **WebsiteBuilder** (`/solutions/website-builder`) - Website building solution
- **GameBuilder** (`/solutions/game-builder`) - Game development solution
- **DashboardBuilder** (`/solutions/dashboard-builder`) - Dashboard creation solution
- **ChatbotBuilder** (`/solutions/chatbot-builder`) - Chatbot building solution

### Technical Pages
- **CodeGeneration** (`/code-generation`) - Code generation features
- **MCPInterface** (`/mcp`) - Model Context Protocol interface
- **PolyglotBackendPage** (`/polyglot`) - Polyglot backend information
- **DatabaseManagement** - Database management interface
- **ObjectStorage** - Object storage management
- **Secrets** - Secret management
- **SecurityScanner** - Security scanning tools

## User Preferences
- **Code Style**: Use TypeScript with strict typing
- **Error Handling**: Comprehensive error handling with proper logging
- **Performance**: Prioritize optimization for production deployment
- **Security**: Implement secure practices and avoid unsafe operations
- **Documentation**: Maintain clear documentation for deployment and architecture
- **File Management**: NEVER remove existing pages/files without explicit user request. If files are missing, CREATE them instead of removing imports.

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

## Development Guidelines
1. **Never remove existing pages** - If a page import causes an error, CREATE the missing page instead of removing the import
2. **Check before deleting** - Always verify with the user before removing any functionality
3. **Preserve all routes** - All routes in App.tsx serve a purpose and should remain
4. **Create missing files** - When Vite reports missing imports, create the file instead of removing the import
5. **Document all pages** - Keep this file updated with all important pages and routes

## AI Features (Critical - Do Not Remove)
- **Custom Prompts System**: Full CRUD for managing AI prompts
- **AI Documentation Page**: Complete guide at `/ai-documentation`
- **Multiple AI Models**: GPT-5, Claude 3.5 Sonnet, Gemini Pro
- **Template Library**: Pre-built templates for common tasks
- **Model Context Protocol**: MCP integration for enhanced AI capabilities

## Marketing & Comparison Features (Critical - Do Not Remove)
The platform includes comprehensive comparison pages to showcase advantages over competitors:
- Main comparison landing page with overview
- Individual comparison pages for each major competitor
- Feature-by-feature comparison tables
- Clear CTAs for user conversion
- All comparison pages are located in `client/src/pages/marketing/`

## Recent Fixes (October 19, 2025)
- Fixed import error in `server/api/mobile.ts` (wrong ai-service path)
- Created ScrollToTop component
- Created all comparison pages (Compare, VsGitHubCodespaces, VsGlitch, VsHeroku, VsCodeSandbox, VsAwsCloud9)
- Restored all comparison routes
- **Workspace Settings**: Added comprehensive WorkspaceSettings component and Settings tab in ProjectPage bottom panel
  - Agent & Assistant settings (audio/push notifications)
  - App Preview settings (automatic preview, port forwarding)
  - Appearance settings (font size, theme)
  - Code Editing settings (AI completion, brackets, indentation, inline chat)
  - Advanced Developer Settings (experimental features, performance mode, debug logging, GPU acceleration)
  - Styled to match Replit's mobile app design with card-based sections
- **PR #109 Critical Fixes**: Resolved severe merge conflict corruption in test infrastructure files
  - **test/setup/test-runner.ts**: Removed 3 duplicate implementations concatenated together (lines were repeated 3x)
  - **test/setup/globals.ts**: Cleaned up 3 different `expect` implementations merged incorrectly
  - **test/security.test.ts**: Moved imports to top, removed duplicate suite registration
  - **test/ai-ux-features.test.ts**: Removed duplicate empty suite at end of file
  - All test files now compile without TypeScript errors
  - Test infrastructure includes: `.only` and `.skip` support, pattern matching, lifecycle hooks (beforeAll/afterAll/beforeEach/afterEach)
- **Comprehensive Codex Commits Audit**: Analyzed 15 most recent codex commits (PR #101-115)
  - 13/15 commits were clean (87% success rate)
  - PR #109 was the only one with severe merge conflict corruption
  - PR #112 attempted partial fix but left residual duplications
  - All missing PRs verified: #101-105 and #115 are all clean
  - All issues now completely resolved
  - Full analysis report available in `docs/CODEX_COMMITS_ANALYSIS.md`
- App now running successfully with all features intact