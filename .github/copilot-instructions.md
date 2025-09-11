# E-Code Platform Development Instructions

**Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.**

## Working Effectively

### Prerequisites and Bootstrap
- Set NODE_OPTIONS="--max-old-space-size=4096" for all TypeScript operations to prevent memory issues
- Copy `.env.production.example` to `.env` and configure required environment variables before starting development:
  - `DATABASE_URL` - PostgreSQL connection string (required)
  - `SESSION_SECRET` - Random session secret
  - `ANTHROPIC_API_KEY` - AI functionality
  - Other API keys as needed

### Core Development Workflow
- **Install dependencies**: `npm install` -- takes 2 minutes. NEVER CANCEL.
- **Build the application**: `npm run build` -- takes 40 seconds. NEVER CANCEL. Set timeout to 90+ seconds.
  - Builds both client (Vite) and server (esbuild)
  - Output: `dist/public/` (client) and `dist/index.js` (server)
- **Type checking**: `NODE_OPTIONS="--max-old-space-size=4096" npm run check` -- takes 3-5 minutes for large codebase. NEVER CANCEL. Set timeout to 10+ minutes.
- **Development server**: `npm run dev` -- requires database configuration
- **Production**: `npm start` -- runs built application

### Database Operations
- **Database push**: `npm run db:push` -- applies schema changes using Drizzle ORM
- Database setup requires PostgreSQL and proper environment configuration

### CLI Tool
- Located in `cli/` directory
- Has build issues with missing dependencies (`open`, `ora` type definitions)
- Build script: `cd cli && bash build.sh` -- reports completion but has TypeScript errors
- **Note**: CLI build currently fails due to missing type definitions but script reports success

## Architecture Overview

### Technology Stack
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Drizzle ORM + Redis
- **AI Integration**: Anthropic Claude, OpenAI, Google Generative AI
- **Real-time**: Socket.io + WebRTC + Y.js collaborative editing
- **Containerization**: Docker + Docker Compose

### Key Directories
- `client/` - React frontend application
- `server/` - Node.js backend API server
- `cli/` - Command-line interface tool
- `github-copilot-extension/` - GitHub Copilot integration
- `vscode-extension/` - VS Code extension
- `mobile/` - Mobile application
- `shared/` - Shared types and utilities
- `test/` - Test infrastructure
- `scripts/` - Deployment and utility scripts

### Project Structure
```
client/
├── src/
│   ├── components/ - UI components
│   ├── pages/ - React pages
│   └── App.tsx - Main application
server/
├── routes/ - API endpoints
├── services/ - Business logic
├── sandbox/ - Code execution
├── ai/ - AI integration
└── index.ts - Server entry point
```

## Validation Steps

### Build Validation
1. **Always run the complete build**: `time npm run build`
2. **Check for warnings**: Build produces warnings about duplicate methods and large chunks - these are normal
3. **Verify outputs**: Check `dist/public/` and `dist/index.js` exist
4. **Expected build time**: ~40 seconds

### Manual Testing Scenarios
- **Build verification**: Ensure `npm run build` completes successfully
- **Environment setup**: Verify environment variables are configured
- **Database connectivity**: Test database connection if configured
- **Note**: Full application testing requires database setup and API keys

### Known Issues and Limitations
- **TypeScript errors**: The codebase has numerous TypeScript errors (~3000+) - this is normal during development
- **Memory requirements**: TypeScript checking requires 4GB+ RAM
- **CLI build issues**: Missing dependencies prevent clean CLI build
- **Database dependency**: Development server requires configured database
- **Missing components**: Some UI components may need to be created (AdminSidebar, PublicLayout already fixed)

## Important Commands and Timing

### Critical Build Commands (NEVER CANCEL)
- `npm install` -- 2 minutes. Set timeout to 5+ minutes.
- `npm run build` -- 40 seconds. Set timeout to 90+ seconds.
- `NODE_OPTIONS="--max-old-space-size=4096" npm run check` -- 3-5 minutes. Set timeout to 10+ minutes.

### Deployment Commands
- Production preparation: `bash scripts/prepare-deployment.sh`
- Docker build: `docker-compose build`
- Production deployment: Various scripts in root directory for different platforms

### Common File Patterns
- React components: `client/src/components/`
- API routes: `server/routes/`
- Database schemas: `server/db/`
- Configuration: Root level config files

## Additional Validation Steps
- **Always run `npm run build`** after making changes to verify compilation
- **Check build output size**: Large chunks (500KB+) are normal for this application
- **Memory usage**: Monitor memory usage during development, increase if needed
- **Environment configuration**: Ensure proper environment setup before starting development

## Key Projects in Codebase
1. **Main Platform** - Full-stack web IDE (`client/` + `server/`)
2. **CLI Tool** - Command-line interface (`cli/`)
3. **GitHub Copilot Extension** - IDE integration (`github-copilot-extension/`)
4. **VS Code Extension** - Editor integration (`vscode-extension/`)
5. **Mobile App** - Mobile version (`mobile/`)
6. **SDK** - JavaScript SDK (`sdk/`)

## Performance Notes
- Large codebase with 1300+ npm packages
- Build generates 4MB+ JavaScript bundle (normal for complex IDE)
- TypeScript compilation is memory-intensive
- Docker builds include multi-stage optimization