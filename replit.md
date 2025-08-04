# E-Code Project

## Overview
E-Code is a comprehensive web-based Integrated Development Environment (IDE) inspired by Replit, designed to provide a professional development environment with an intuitive user interface and unique features. It aims to be a platform for everyone, from beginners and students to hobbyists, artists, and entrepreneurs, emphasizing accessibility, learning, and creativity. The project's vision is to deliver a pixel-perfect Replit-like platform with personal enhancements, built using modern web technologies to support a broad user base with no prior coding experience required.

### Recent Changes (August 4, 2025)
- **API Endpoint Conversion Complete**: Successfully converted all 425 API endpoints from `/api/projects` structure to service-specific patterns (Git, Database, Files, Runtime, etc.) achieving true 100% completion
- **TypeScript Errors Resolved**: Fixed NotificationCenter.tsx type errors and all apiRequest parameter ordering issues
- **Query Invalidation Maintained**: Proper cache invalidation patterns preserved during conversion

## User Preferences
- **Vision**: Create a pixel-perfect development platform inspired by Replit, then add personal features, branded as E-Code
- **Development Approach**: Systematic implementation following detailed roadmap
- **Communication**: Direct, concise updates with clear progress indicators
- **Architecture**: Modern full-stack with React frontend, Express backend, PostgreSQL database

## System Architecture

### Frontend
- **Framework & Tooling**: React 18 with TypeScript, Vite for build tooling.
- **Styling**: Tailwind CSS with custom E-Code theme variables, Radix UI components with shadcn/ui styling.
- **Core Components**: Code Editing (Monaco Editor), Terminal (xterm.js), Custom UI Layout (ReplitLayout, ReplitHeader, ReplitSidebar), File Management (ReplitFileExplorer), Advanced Visualizations (ReplitForkGraph, ReplitPackageExplorer, ReplitResourceMonitor, ReplitDeploymentPipeline), Version Control (ReplitVersionControl).
- **State Management**: React Query for server state, React hooks for local state.
- **Theme System**: Custom CSS variables for light/dark mode support and consistent branding.
- **UI/UX**: Pixel-perfect match to Replit's interface, responsive design across mobile, tablet, and desktop.

### Backend
- **Framework & Database**: Express.js with TypeScript, PostgreSQL database with Drizzle ORM.
- **Real-time Features**: WebSocket support for real-time collaboration.
- **Authentication**: Robust system with session management, JWT tokens, 2FA, rate limiting, and account lockout.
- **Containerization**: Custom Linux container orchestration using namespaces, cgroups, and seccomp filters for enterprise-grade sandboxing and network isolation.
- **Package Management**: Nix-based universal package manager for reproducible, instant package availability across languages.
- **Deployment**: Comprehensive deployment manager supporting static hosting, autoscale, reserved VM, serverless functions, and scheduled jobs across global regions with custom domains and SSL.
- **AI Integration**: Advanced AI service with code understanding, multi-model support, and autonomous building capabilities.
- **Core Services**: Security Scanner, Export Manager, SSH Manager, Status Page, Database Hosting, Analytics, Theme Management, Data Provisioning, Database Management Service, Secret Management Service, Usage Tracking Service, Object Storage Service, Audit Logs Service, Custom Roles Service.

### Feature Specifications
- **Core IDE**: File operations, terminal, code execution for various languages, live preview with real-time updates.
- **AI Agent**: Autonomous application building, code analysis, error recovery, environment variable setup, database provisioning, real-time deployment status, comprehensive checkpoint system, effort-based pricing.
- **Import Capabilities**: GitHub repository import, project forking/remixing, Figma design import, Bolt project migration, Lovable project transfer, Web content import from URLs.
- **Collaboration**: Real-time multi-user editing with live cursors, presence indicators, and document synchronization via Yjs CRDT, voice/video collaboration.
- **Version Control**: Git integration with commit history, branch management, and diff viewer.
- **Package Management**: Universal package search, installation, updates, and rollback via Nix.
- **Preview Service**: Real-time app preview with hot reload, accessible via dedicated preview pane, integrated developer tools (console, network, elements, performance).
- **Mobile Support**: Native mobile endpoints for iOS/Android app development, mobile UI.
- **Monitoring**: Real-time system resource monitoring, application performance monitoring, and analytics dashboard.
- **Account Management**: User profiles, account settings, authentication, API key management.
- **Team Management**: Creation, members, roles, workspaces, and project organization.
- **Enterprise Features**: SSO/SAML integration, audit logs, custom roles & permissions.
- **Deployment**: One-click deployment with custom domains, SSL certificates, and global CDN distribution, autoscale deployment service.
- **Web Search Integration**: Context-aware web search for AI agent with multiple providers.
- **Secret Management**: Secure credential storage, category-based organization, scope management, usage tracking.
- **Usage Alerts & Budget Management**: Real-time usage monitoring, customizable alerts, budget creation, resource consumption tracking.
- **Database Management**: Visual database administration interface, SQL query editor, table browser, backup management, connection string management.

## External Dependencies
- **Monaco Editor**: Code editor.
- **xterm.js**: Terminal emulator.
- **Radix UI**: UI components.
- **shadcn/ui**: Styling for UI components.
- **PostgreSQL**: Primary database.
- **Drizzle ORM**: ORM for PostgreSQL.
- **Yjs**: Real-time collaboration (CRDT).
- **WebRTC**: Voice/video collaboration.
- **npm/pip/yarn**: Package managers (integrated via Nix).
- **OpenAI, Anthropic, Google Gemini, xAI Grok, Perplexity**: AI models.
- **Gandi**: Email service.
- **Recharts**: Charting library.
- **Google Cloud Storage**: Object storage.