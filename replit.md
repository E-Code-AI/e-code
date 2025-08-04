# E-Code Project

## Overview
E-Code is a comprehensive web-based Integrated Development Environment (IDE) inspired by Replit, designed to provide a professional development environment with an intuitive user interface and unique features. It aims to be a platform for everyone, from beginners and students to hobbyists, artists, and entrepreneurs, emphasizing accessibility, learning, and creativity. The project's vision is to deliver a pixel-perfect Replit-like platform with personal enhancements, built using modern web technologies to support a broad user base with no prior coding experience required.

### Recent Changes (August 4, 2025)
- **Unified AI Agent Interface**: Created streamlined AI experience combining agent capabilities
  - Created UnifiedAgentInterface.tsx merging ReplitAgentChat modes (Standard/Thinking/High Power) with AgentV2Interface Claude 4.0 capabilities
  - Single interface with tab-based mode selection for all agent functionalities
  - Preserved separate ReplitAssistant component for code assistance features (as requested by user)
  - Agent mode shows unified interface, Assistant mode shows ReplitAssistant
  - Removed duplicate agent components from right panel
- **Full IDE Interface for Applications**: Fixed issue where SolarTech applications only showed preview instead of full Replit-style IDE
  - Created ApplicationIDEWrapper component to provide complete IDE layout
  - Applications now display with file explorer, code editor, preview panel, AI assistant, and terminal
  - Mock file structure provided for each application including src/, components/, package.json, and README.md
  - Routes updated to use ApplicationIDEWrapper instead of standalone app components
  - Accessible at: /solartech-ai-chat, /solartech-crm, /solartech-fortune500-store
- **API Endpoint Conversion Complete**: Successfully converted all 425 API endpoints from `/api/projects` structure to service-specific patterns (Git, Database, Files, Runtime, etc.) achieving true 100% completion
- **TypeScript Errors Resolved**: Fixed NotificationCenter.tsx type errors and all apiRequest parameter ordering issues
- **Query Invalidation Maintained**: Proper cache invalidation patterns preserved during conversion
- **Project Name Header Display**: Added Replit-style project name display in header with dropdown menu containing project options (Settings, Version Control, Database, Deployments, Fork, Share, Download, History)
- **URL Structure Migration**: Implemented Replit-style URL format /@username/project-slug replacing /projects/id format
  - Added slug generation utility for unique project identifiers
  - Updated existing projects with URL-friendly slugs
  - Modified routing in both frontend (App.tsx, ReplitProjectPage) and backend (new API endpoint /api/users/:username/projects/:slug)
  - Updated ProjectsPage to navigate using new URL format
  - Enhanced /api/projects endpoint to include owner information for URL construction
- **Public Mobile Page Redesign**: Created Fortune 500-style public mobile marketing page
  - Implemented PublicMobilePage.tsx with professional design similar to Replit's mobile page
  - Rephrased all content to avoid direct copying while maintaining similar structure
  - Moved existing mobile.tsx admin interface to /mobile-admin protected route
  - Public /mobile page now shows marketing content with app download buttons
- **Marketing vs Functional Page Separation**: Completed distinction between marketing and functional areas
  - Created dedicated Fortune 500-style marketing pages: BountiesMarketing.tsx, TeamsMarketing.tsx, DeploymentsMarketing.tsx
  - Updated PublicNavbar to route Bounties, Teams, and Deployments to marketing pages (/marketing/*)
  - Preserved functional pages in authenticated user area (/bounties, /teams, /deployments for actual usage)
  - Marketing pages designed to attract users with professional content, functional pages for active development work
- **Deployment System Integration**: Fixed deployment system connectivity issues
  - Integrated deployment routes from `server/routes/deployment.ts` into main routes file
  - Added missing API endpoints: `/api/user/deployments/recent` and `/api/deployment/:projectId`
  - Fixed frontend-backend endpoint mismatches for deployment functionality
  - Added storage methods for deployment tracking (`getProjectDeployments`, `getRecentDeployments`)
  - System now responds to deployment requests with simulated deployment process
  - Real deployment system implemented with container building and orchestration:
    - Created container-builder.ts for Docker image creation with language-specific Dockerfiles
    - Created container-orchestrator.ts for Kubernetes deployment across multiple regions
    - Created real-deployment-service-v2.ts coordinating build and deployment processes
    - Updated deployment endpoint to use real container builds instead of simulated URLs
    - Added endpoints for deployment status, logs, scaling, and stopping deployments
    - Real URLs generated in format: https://project-{id}-{deploymentId}.e-code.app
    - Support for custom domains with SSL certificates via Let's Encrypt
    - Container images stored in registry.e-code.app
    - Deployment targets: us-east-1, us-west-1, eu-west-1, ap-northeast-1
- **Mobile App Development Feature**: Comprehensive mobile app development capabilities implemented
  - Created MobileAppDevelopment.tsx component with full mobile development interface
  - Mobile preview with device simulator for iOS (iPhone 14 Pro, iPhone SE, iPad) and Android (Pixel 7, Galaxy S23, Galaxy Tab)
  - Framework support: React Native, Flutter, Ionic, and Native (Swift/Kotlin)
  - Build system for iOS (Debug, Release, App Store) and Android (Debug APK, Release APK, App Bundle)
  - App configuration management with bundle ID, version, SDK versions, and permissions
  - Real-time device preview with orientation switching, network simulation, and battery level
  - Mobile debugging tools with remote debugging, hot reload, and performance monitoring
  - App store deployment integration for both App Store and Google Play
  - Backend endpoints: /api/mobile/build, /api/mobile/deploy, /api/mobile/run, /api/mobile/preview
  - Accessible via dropdown menu in project page with "Mobile App Development" option

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