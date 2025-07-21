# Replit Clone Project

## Overview
A comprehensive web-based IDE that clones Replit.com exactly, then adds unique features. The project focuses on pixel-perfect replication of Replit's interface and functionality, built with React, TypeScript, and advanced web technologies.

## User Preferences
- **Vision**: Create exact pixel-perfect clone of replit.com first, then add personal features
- **Development Approach**: Systematic implementation following detailed roadmap
- **Communication**: Direct, concise updates with clear progress indicators
- **Architecture**: Modern full-stack with React frontend, Express backend, PostgreSQL database

## Project Architecture

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS with custom Replit theme variables
- Monaco Editor for advanced code editing
- xterm.js for terminal integration
- Radix UI components with shadcn/ui styling

### Backend
- Express.js with TypeScript
- PostgreSQL database with Drizzle ORM
- WebSocket support for real-time features
- Authentication system with session management

### Key Components Created
- **ReplitLayout**: Main layout system matching Replit's exact structure
- **ReplitHeader**: Navigation header with search, menus, user profile
- **ReplitSidebar**: File explorer and project tools
- **ReplitMonacoEditor**: Advanced code editor with Replit theming
- **ReplitFileExplorer**: Interactive file system with drag/drop
- **ReplitTerminal**: Full-featured terminal with multiple sessions

## Recent Changes
- 2025-01-21: Implemented advanced Monaco editor with Replit-exact theming and features
- 2025-01-21: Created comprehensive file explorer with search, context menus, drag/drop
- 2025-01-21: Developed full-featured terminal component with WebSocket integration
- 2025-01-21: Added API endpoints for file management and project execution
- 2025-01-21: Integrated all components into cohesive editor workspace

## Development Status
- ✅ Phase 1: Core UI foundation with exact Replit layout and theming
- ✅ Advanced editor components (Monaco, File Explorer, Terminal)
- 🔄 Integration testing and refinement
- ⏳ Phase 2: Runtime environments and execution systems
- ⏳ Phase 3: Collaboration and real-time features

## Technical Decisions
- **Theme System**: Custom CSS variables matching Replit's exact color scheme
- **Editor**: Monaco Editor with custom themes and extensive configuration
- **File Management**: Hierarchical file system with full CRUD operations
- **Terminal**: xterm.js with WebSocket communication for real-time interaction
- **State Management**: React Query for server state, React hooks for local state

## Next Steps
1. Test and refine editor integration
2. Implement runtime environment support
3. Add collaboration features
4. Expand language and framework support