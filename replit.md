# E-Code Development Platform - Replit Project Documentation

## Project Overview

An advanced AI-powered development platform that streamlines software creation through intelligent, automated deployment and collaboration tools. This is a comprehensive full-stack application built on Replit.

### Stack
- **Frontend**: React.js with TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Express.js with TypeScript, PostgreSQL with Drizzle ORM
- **AI Integration**: OpenAI GPT-4, Google Gemini, Anthropic Claude
- **Deployment**: Cloud Run ready, containerized with Docker
- **Real-time**: WebSocket collaboration, WebRTC for video/voice
- **Authentication**: Passport.js with session management
- **Package Management**: Nix-based environment management
- **Monitoring**: Performance monitoring, real-time analytics

## Project Architecture

### Backend Services
- **AI Provider Factory**: Unified interface for multiple AI providers (OpenAI, Google AI)
- **Performance Monitor**: Real-time system metrics and health monitoring
- **CDN Service**: Edge content delivery and optimization
- **Database Management**: PostgreSQL with comprehensive schema and relations
- **Deployment Pipeline**: Multi-stage deployment with blue-green support
- **Real-time Collaboration**: WebSocket-based code collaboration
- **Container Management**: Docker/Kubernetes orchestration

### Frontend Structure
- **Component Library**: shadcn/ui with Radix primitives
- **State Management**: TanStack Query for server state
- **Form Handling**: React Hook Form with Zod validation
- **Routing**: Wouter for client-side routing
- **Styling**: Tailwind CSS with responsive design
- **Animations**: Framer Motion for smooth interactions

## Recent Changes (August 5, 2025)

### ✅ Deployment Fixes Applied
1. **Created Missing AI Provider Factory Module** (`server/ai/ai-provider-factory.ts`)
   - Unified interface for OpenAI and Google AI providers
   - Support for code generation, analysis, testing, and explanation
   - Automatic API key detection from environment variables

2. **Created Performance Monitor Module** (`server/monitoring/performance-monitor.ts`)
   - Real-time CPU, memory, and system load monitoring
   - Performance metrics history with configurable retention
   - Health status monitoring with alerting thresholds
   - Application metrics tracking for request/response patterns

3. **Fixed Duplicate Method Definitions** in `server/storage.ts`
   - Removed duplicate `getProjectDeployments` implementations
   - Removed duplicate `getRecentDeployments` implementations
   - Cleaned up inconsistent method signatures

4. **Fixed Database Schema Issues** in `shared/schema.ts`
   - Added missing `createdAt` field to `projectTimeTracking` table
   - Fixed Drizzle ORM type mismatches for array fields
   - Corrected insert operation syntax for single value operations

5. **Ensured Cloud Run Compatibility**
   - Server already correctly configured to bind to `0.0.0.0:5000`
   - Proper environment variable handling for production deployment
   - Container-ready configuration with health checks

### ✅ Build and Module Resolution
- All missing performance monitor modules created
- All missing CDN service modules verified (already existed)
- All missing AI provider factory modules created
- Module import paths resolved and validated

### ✅ Server Configuration
- **Host Binding**: Correctly configured for `0.0.0.0` (Cloud Run compatible)
- **Port Configuration**: Fixed port 5000 for consistent deployment
- **Environment Handling**: Development and production modes properly configured
- **Database Initialization**: Automatic schema setup and seeding

## Deployment Status

### ✅ Ready for Cloud Run Deployment
The application is now configured for successful Cloud Run deployment with:
- Proper host binding (`0.0.0.0`)
- Required modules present and importable
- No duplicate method definitions causing build failures
- Database schema consistency maintained
- Container-ready server configuration

### Build Process
- **Development**: `npm run dev` (with hot reloading)
- **Production Build**: `npm run build` (Vite + esbuild bundling)
- **Production Start**: `npm run start` (optimized Node.js server)

## Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow ESLint and Prettier configurations
- Implement proper error handling and logging
- Use Drizzle ORM for database operations
- Prefer composition over inheritance

### Database Management
- Use `npm run db:push` for schema changes (never manual SQL migrations)
- Maintain schema definitions in `shared/schema.ts`
- Update storage interface (`server/storage.ts`) for new operations
- Use strongly typed Zod schemas for validation

### AI Integration
- Use `AIProviderFactory` for consistent AI provider access
- Implement proper error handling for API failures
- Track usage and implement rate limiting where appropriate
- Support multiple AI providers for redundancy

### Performance
- Monitor system metrics through Performance Monitor
- Implement proper caching strategies
- Use database indexing for query optimization
- Monitor and log application performance metrics

## User Preferences

### Communication Style
- Provide clear, technical explanations when needed
- Document architectural decisions with reasoning
- Maintain comprehensive logs of changes and fixes
- Use professional tone without excessive verbosity

### Development Workflow
- Prioritize working solutions over perfect code
- Address critical deployment blockers immediately
- Maintain backward compatibility when possible
- Document breaking changes and migration paths

## Critical Dependencies

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API access (optional)
- `GOOGLE_AI_API_KEY`: Google AI API access (optional)
- `NODE_ENV`: Environment mode (development/production)

### Key Packages
- `drizzle-orm`: Database ORM and query builder
- `@tanstack/react-query`: Server state management
- `wouter`: Lightweight client-side routing
- `@radix-ui/react-*`: UI primitive components
- `framer-motion`: Animation library
- `tailwindcss`: Utility-first CSS framework

## Known Issues and Technical Debt

### Minor LSP Diagnostics Remaining
- Some array type mismatches in storage operations (non-critical)
- Missing logo property in teams table (cosmetic)
- Checkpoint filesSnapshot property access (functional but type-unsafe)

These issues do not affect deployment or core functionality but should be addressed in future iterations.

## Next Steps for Enhancement

1. **Complete TypeScript Strictness**: Address remaining type safety issues
2. **Enhanced Monitoring**: Expand performance monitoring with custom metrics
3. **Security Audit**: Implement comprehensive security scanning
4. **API Documentation**: Generate OpenAPI/Swagger documentation
5. **Test Coverage**: Implement comprehensive unit and integration tests

## Deployment Instructions

### Local Development
```bash
npm install
npm run dev
```

### Production Deployment
```bash
npm run build
npm run start
```

### Cloud Run Deployment
The application is configured for automatic Cloud Run deployment with proper:
- Container configuration
- Environment variable handling
- Health check endpoints
- Scaling configuration

---

*Last Updated: August 5, 2025*
*Status: Ready for Production Deployment*