# E-Code Project

## Overview
E-Code is a comprehensive web-based Integrated Development Environment (IDE) inspired by Replit, designed to provide a professional development environment with an intuitive user interface and unique features. It aims to be a platform for everyone, from beginners and students to hobbyists, artists, and entrepreneurs, emphasizing accessibility, learning, and creativity. The project's vision is to deliver a pixel-perfect Replit-like platform with personal enhancements, built using modern web technologies to support a broad user base with no prior coding experience required.

## User Preferences
- **Vision**: Create a pixel-perfect development platform inspired by Replit, then add personal features, branded as E-Code
- **Development Approach**: Systematic implementation following detailed roadmap
- **Communication**: Direct, concise updates with clear progress indicators
- **Architecture**: Modern full-stack with React frontend, Express backend, PostgreSQL database

## Recent Major Changes (August 4, 2025)
### Agent Features Completed (100% Functional)
1. **Agent v2 with Claude Sonnet 4.0**
   - Implemented using model `claude-sonnet-4-20250514` (latest Claude model)
   - Enhanced autonomous agent with conversation history tracking
   - Full integration with checkpoint system
   - Extended Thinking and High Power modes
   - Build templates for quick app creation

2. **Comprehensive Checkpoint System**
   - Enhanced schema capturing AI conversation context and database state
   - Automatic checkpoints created during agent work
   - Restore functionality for code, database, and AI memory
   - Complete API routes: create, list, restore, and pricing endpoints
   - Rollback UI with "View Checkpoints" button

3. **Effort-Based Pricing**
   - Dynamic pricing based on complexity (simple to expert levels)
   - Metrics tracked: files modified, lines of code, tokens used, API calls
   - Pricing multipliers: simple (1x), moderate (2.5x), complex (5x), very_complex (10x), expert (20x)
   - UI components display real-time pricing in agent chat and checkpoints panel
   - Usage-based billing with monthly credits system

### Platform Import Features Completed (100% Functional)
1. **Figma Design Import**
   - Full page implementation with React component generation
   - Design token extraction (colors, typography, spacing)
   - Responsive layout conversion
   - Automatic theme generation
   - Import service at `/projects/:id/import/figma`

2. **Bolt Project Import**
   - Complete project structure import
   - Package dependency management
   - Environment variable handling
   - Build configuration preservation
   - Vite + React app support
   - Import service at `/projects/:id/import/bolt`

3. **Lovable App Import**
   - Page and component structure analysis
   - API endpoint generation
   - Database schema migration to Neon Postgres
   - Full-stack application conversion
   - Import service at `/projects/:id/import/lovable`

4. **UI Integration**
   - Import dropdown menu in Agent interface with platform icons
   - Individual import pages with progress tracking
   - Admin dashboard integration with import statistics
   - Real-time import status monitoring
   - GitHub import (rapid and guided methods)

### Feature Parity Status (August 4, 2025)
- **Overall Parity with Replit**: 72%
- **Strengths**: Import features (100%), Core IDE (90%), AI Agent (80%)
- **Gaps**: Mobile support (30%), Enterprise features (40%), Deployments (60%)
- **Documentation Status**: Needs comprehensive update

## System Architecture

### Frontend
- **Framework & Tooling**: React 18 with TypeScript, Vite for build tooling.
- **Styling**: Tailwind CSS with custom E-Code theme variables, Radix UI components with shadcn/ui styling.
- **Core Components**:
    - **Code Editing**: Monaco Editor for advanced code editing with E-Code theming.
    - **Terminal**: xterm.js for real-time terminal integration.
    - **UI Layout**: Custom ReplitLayout, ReplitHeader, ReplitSidebar for interface matching.
    - **File Management**: ReplitFileExplorer for interactive file system operations (drag/drop).
    - **Advanced Visualizations**: ReplitForkGraph, ReplitPackageExplorer, ReplitResourceMonitor, ReplitDeploymentPipeline for interactive data visualization and monitoring.
    - **Version Control**: ReplitVersionControl for Git integration.
- **State Management**: React Query for server state, React hooks for local state.
- **Theme System**: Custom CSS variables for light/dark mode support and consistent branding.

### Backend
- **Framework & Database**: Express.js with TypeScript, PostgreSQL database with Drizzle ORM.
- **Real-time Features**: WebSocket support for real-time collaboration.
- **Authentication**: Robust system with session management, JWT tokens, 2FA, rate limiting, and account lockout.
- **Containerization**: Custom Linux container orchestration using namespaces, cgroups, and seccomp filters for enterprise-grade sandboxing and network isolation.
- **Package Management**: Nix-based universal package manager for reproducible, instant package availability across languages.
- **Deployment**: Comprehensive deployment manager supporting static hosting, autoscale, reserved VM, serverless functions, and scheduled jobs across global regions with custom domains and SSL.
- **AI Integration**: Advanced AI service with code understanding, multi-model support (OpenAI, Anthropic, Gemini, xAI, Perplexity), and autonomous building capabilities.
- **Core Services**: Security Scanner, Export Manager, SSH Manager, Status Page, Database Hosting, Analytics, Theme Management, Data Provisioning.

### Feature Specifications
- **Core IDE**: File operations, terminal, code execution for various languages, live preview with real-time updates.
- **AI Agent**: Autonomous application building, code analysis, error recovery, environment variable setup, database provisioning, real-time deployment status.
- **Import Capabilities**: 
    - GitHub repository import with automatic setup
    - Project forking/remixing from public projects
    - Figma design import with React component generation
    - Bolt project migration with full dependency preservation
    - Lovable project transfer with complete stack conversion
    - Web content import from URLs
- **Collaboration**: Real-time multi-user editing with live cursors, presence indicators, and document synchronization via Yjs CRDT.
- **Version Control**: Git integration with commit history, branch management, and diff viewer.
- **Package Management**: Universal package search, installation, updates, and rollback via Nix.
- **Preview Service**: Real-time app preview with hot reload, accessible via dedicated preview pane.
- **Mobile Support**: Native mobile endpoints for iOS/Android app development on mobile devices.
- **Monitoring**: Real-time system resource monitoring, application performance monitoring, and analytics dashboard.
- **Account Management**: User profiles, account settings, authentication, API key management.
- **Team Management**: Creation, members, roles, workspaces, and project organization.
- **Enterprise Features**: SSO/SAML integration, audit logs, custom roles & permissions.
- **Deployment**: One-click deployment with custom domains, SSL certificates, and global CDN distribution.
- **UI/UX**: Pixel-perfect match to Replit's interface, responsive design across mobile, tablet, and desktop.

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
- **Gandi**: Email service for transactional emails and newsletters.
- **Recharts**: Charting library for visualizations.