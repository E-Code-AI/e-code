# E-Code Platform - GitHub Copilot Instructions

## Project Overview

E-Code is a comprehensive web-based Integrated Development Environment (IDE) that provides a complete development experience with AI-powered features, real-time collaboration, and seamless deployment capabilities. The platform enables users to create, edit, execute, and deploy code projects entirely in the browser.

## Architecture & Technology Stack

### Frontend (`/client/`)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with custom plugins
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **UI Components**: Radix UI primitives with custom shadcn/ui components
- **Code Editor**: Monaco Editor with advanced features
- **State Management**: TanStack Query for server state, React hooks for local state
- **Routing**: Wouter for client-side routing
- **Real-time**: Socket.io client for WebSocket connections

### Backend (`/server/`)
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Caching**: Redis for session storage and caching
- **Authentication**: Express sessions with Passport.js
- **File Storage**: Google Cloud Storage
- **Security**: Comprehensive middleware stack (rate limiting, CORS, helmet, input sanitization)
- **Real-time**: Socket.io server for collaboration and terminal sessions

### AI Integration
- **Providers**: OpenAI GPT-4, Anthropic Claude, Google Gemini
- **Features**: Code completion, explanation, generation, debugging, test creation
- **Architecture**: Provider abstraction layer with fallback mechanisms

### Infrastructure
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Kubernetes for scalable deployment
- **Cloud**: Google Cloud Platform (Cloud Run, GKE, Cloud Storage)
- **Monitoring**: Custom health checks and performance monitoring

## File Structure & Conventions

### Path Aliases
```typescript
"@/*": ["./client/src/*"]     // Frontend components and utilities
"@shared/*": ["./shared/*"]   // Shared types and schemas
"@assets/*": ["./attached_assets/*"] // Static assets
```

### Directory Organization

#### Frontend (`/client/src/`)
```
components/          # Reusable UI components
├── ui/             # Base UI primitives (buttons, dialogs, etc.)
├── editor/         # Code editor related components
├── terminal/       # Terminal and shell components
├── collaboration/  # Real-time collaboration features
└── ...            # Feature-specific component groups

pages/              # Route components (lazy-loaded)
hooks/              # Custom React hooks
lib/                # Utility libraries and configurations
types/              # TypeScript type definitions
utils/              # Helper functions and utilities
constants/          # Application constants
```

#### Backend (`/server/`)
```
routes/             # API route handlers
middleware/         # Express middleware functions
services/           # Business logic and external integrations
auth/               # Authentication and authorization
database/           # Database models and migrations
utils/              # Server-side utilities
types/              # Server-specific types
```

## Coding Standards & Patterns

### TypeScript Guidelines
- **Strict Mode**: Always use strict TypeScript configuration
- **Type Safety**: Prefer explicit types over `any`
- **Interfaces**: Use interfaces for object shapes, types for unions/primitives
- **Null Safety**: Handle null/undefined explicitly

```typescript
// Preferred
interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

// Avoid
type UserProfile = {
  id: any;
  name: string;
  email: string;
  avatar: string | null | undefined;
}
```

### React Component Patterns
- **Function Components**: Use function components with hooks
- **Props Interfaces**: Define explicit prop interfaces
- **Default Props**: Use default parameters instead of defaultProps
- **Error Boundaries**: Wrap async components in error boundaries

```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  disabled = false,
  onClick,
  children 
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }))}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

### API Route Patterns
- **RESTful Design**: Follow REST conventions for API endpoints
- **Type Safety**: Use Zod schemas for request/response validation
- **Error Handling**: Consistent error response format
- **Middleware**: Apply security, validation, and logging middleware

```typescript
// Route structure
router.post('/api/projects/:id/files', 
  authenticateUser,
  validateSchema(createFileSchema),
  rateLimiters.api,
  async (req: Request, res: Response) => {
    try {
      const result = await fileService.createFile(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      handleApiError(error, res);
    }
  }
);
```

### Database Patterns
- **Drizzle ORM**: Use Drizzle for type-safe database operations
- **Migrations**: Version control database schema changes
- **Connection Pooling**: Use connection pools for performance
- **Transactions**: Wrap related operations in transactions

```typescript
// Schema definition
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  userId: uuid('user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Query example
const project = await db
  .select()
  .from(projects)
  .where(eq(projects.id, projectId))
  .limit(1);
```

## AI Integration Guidelines

### Provider Abstraction
- Use the provider abstraction layer in `/server/ai/`
- Implement fallback mechanisms for provider failures
- Handle rate limiting and token management appropriately

```typescript
// AI service pattern
export class AIService {
  async generateCode(prompt: string, language: string): Promise<string> {
    for (const provider of this.providers) {
      try {
        return await provider.generateCode(prompt, language);
      } catch (error) {
        logger.warn(`Provider ${provider.name} failed:`, error);
        continue;
      }
    }
    throw new Error('All AI providers failed');
  }
}
```

### Context Management
- Include relevant file context in AI prompts
- Maintain conversation history for better responses
- Implement token limit management

## Real-time Features

### WebSocket Patterns
- Use Socket.io for real-time communication
- Implement proper room management for collaboration
- Handle connection failures gracefully

```typescript
// Socket event pattern
socket.on('project:join', async (projectId: string) => {
  await socket.join(`project:${projectId}`);
  socket.to(`project:${projectId}`).emit('user:joined', {
    userId: socket.userId,
    userName: socket.userName
  });
});
```

### Collaboration Features
- Operational Transform for concurrent editing
- Presence indicators for active users
- Conflict resolution for simultaneous changes

## Security Guidelines

### Authentication & Authorization
- Session-based authentication with secure cookies
- Role-based access control (RBAC)
- Input validation and sanitization
- CSRF protection for state-changing operations

### Data Protection
- Encrypt sensitive data at rest
- Use HTTPS for all communications
- Implement proper CORS policies
- Rate limiting for API endpoints

## Performance Optimization

### Frontend Performance
- Lazy load components and routes
- Implement virtual scrolling for large lists
- Use React.memo for expensive components
- Optimize bundle size with code splitting

### Backend Performance
- Database query optimization with indexes
- Redis caching for frequently accessed data
- Connection pooling for database connections
- CDN optimization for static assets

## Development Workflow

### Local Development
```bash
# Install dependencies
npm install

# Start development servers
npm run dev          # Start both client and server
npm run build        # Build for production
npm run db:push      # Push database schema changes
```

### Environment Configuration
- Use `.env` files for environment variables
- Never commit sensitive credentials
- Document all required environment variables

### Testing Guidelines
- Write unit tests for utility functions
- Integration tests for API endpoints
- E2E tests for critical user journeys
- Mock external services in tests

## Deployment & Infrastructure

### Docker Containers
- Multi-stage builds for optimized images
- Health checks for container orchestration
- Proper signal handling for graceful shutdowns

### Kubernetes Deployment
- Use ConfigMaps for configuration
- Secrets for sensitive data
- Resource limits and requests
- Horizontal Pod Autoscaling (HPA)

### Monitoring & Logging
- Structured logging with appropriate levels
- Health check endpoints for all services
- Performance metrics collection
- Error tracking and alerting

## Common Tasks & Patterns

### Adding New Components
1. Create component in appropriate `/client/src/components/` subdirectory
2. Export from index file if reusable
3. Add TypeScript interfaces for props
4. Include error boundaries for complex components

### Adding API Endpoints
1. Define route in `/server/routes/`
2. Add request/response schemas with Zod
3. Implement business logic in `/server/services/`
4. Add appropriate middleware (auth, validation, rate limiting)
5. Update API documentation

### Database Changes
1. Modify schema in `/shared/schema.ts`
2. Generate and run migrations with `npm run db:push`
3. Update related services and types
4. Test migration in development environment

### AI Feature Integration
1. Use existing AI service abstractions
2. Implement proper error handling and fallbacks
3. Add context management for better responses
4. Consider token limits and rate limiting

## Best Practices

### Code Quality
- Use ESLint and Prettier for consistent formatting
- Write descriptive commit messages
- Keep functions small and focused
- Use meaningful variable and function names

### Error Handling
- Implement comprehensive error boundaries
- Log errors appropriately (don't expose sensitive data)
- Provide meaningful error messages to users
- Use proper HTTP status codes

### Documentation
- Document complex business logic
- Keep README files up to date
- Comment non-obvious code decisions
- Maintain API documentation

## CLI Integration (`/cli/`)

The E-Code CLI provides command-line access to platform features:

### CLI Architecture
- **Built with**: Commander.js for command parsing
- **TypeScript**: Full type safety throughout CLI
- **API Integration**: Direct REST API calls to platform backend

### CLI Commands Structure
```typescript
// Command pattern
export class ProjectCommand {
  static async create(name: string, options: any) {
    const spinner = ora(`Creating project: ${name}...`).start();
    try {
      const project = await api.post('/projects', { name, ...options });
      spinner.succeed(chalk.green('Project created successfully!'));
      console.log(chalk.blue(`Project ID: ${project.id}`));
    } catch (error) {
      spinner.fail(chalk.red('Failed to create project'));
      handleCliError(error);
    }
  }
}
```

### CLI Best Practices
- Use ora for loading spinners
- Use chalk for colored output
- Implement proper error handling with user-friendly messages
- Validate inputs before API calls

## MCP (Model Context Protocol) Server (`/server/mcp/`)

The platform includes an MCP server for AI model integration:

### MCP Server Features
- Tool definitions for code operations
- Resource management for project files
- Prompt templates for common tasks
- Authentication via API keys

### MCP Integration Pattern
```typescript
// MCP tool definition
export const mcpTools = [
  {
    name: "create_file",
    description: "Create a new file in a project",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        path: { type: "string" },
        content: { type: "string" }
      }
    }
  }
];
```

## Shared Schema & Types (`/shared/`)

### Database Schema Patterns
- Use Drizzle ORM with PostgreSQL
- Define enums for constrained values
- Include proper relationships and indexes
- Use Zod for runtime validation

```typescript
// Schema definition pattern
export const projects = pgTable('projects', {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  visibility: visibilityEnum("visibility").default('private'),
  createdAt: timestamp("created_at").defaultNow(),
  // Always include audit fields
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, { fields: [projects.ownerId], references: [users.id] }),
  files: many(files),
}));

// Zod validation
export const insertProjectSchema = createInsertSchema(projects);
export const selectProjectSchema = createSelectSchema(projects);
```

## Environment & Configuration

### Required Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Authentication
SESSION_SECRET=your-session-secret

# AI Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...

# Cloud Storage
GOOGLE_CLOUD_PROJECT=your-project
GOOGLE_CLOUD_BUCKET=your-bucket

# Redis (for sessions and caching)
REDIS_URL=redis://localhost:6379

# Optional: Development settings
NODE_ENV=development
AUTH_BYPASS=true  # Skip auth in development
```

### Development vs Production
- **Development**: Auth bypass enabled, verbose logging, hot reloading
- **Production**: Full security middleware, rate limiting, error monitoring

## GitHub Copilot Extension (`/github-copilot-extension/`)

### Extension Architecture
- **Provider Pattern**: Implements GitHub Copilot SDK interfaces
- **API Integration**: Connects to E-Code platform AI services
- **Error Handling**: Graceful fallbacks for service failures

```typescript
// Copilot provider implementation
export class ECodeCopilotProvider implements CopilotProvider {
  async getCompletions(request: CompletionRequest): Promise<CompletionResponse> {
    try {
      const response = await this.apiClient.post('/ai/completion', {
        code: request.prefix,
        language: request.language,
        maxTokens: request.maxTokens || 150
      });
      
      return {
        completions: response.data.completions.map(c => ({
          text: c.text,
          score: c.confidence,
          range: request.position
        }))
      };
    } catch (error) {
      console.error('E-Code completion error:', error);
      return { completions: [] };
    }
  }
}
```

## Deployment Configurations

### Docker Multi-Stage Build
```dockerfile
# Builder stage
FROM node:18-alpine AS builder
RUN apk add --no-cache python3 make g++ git
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage  
FROM node:18-alpine
RUN apk add --no-cache git
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
```

### Kubernetes Deployment
- Use ConfigMaps for non-sensitive configuration
- Store secrets in Kubernetes Secrets
- Implement health checks and readiness probes
- Configure resource limits and HPA

### Google Cloud Platform
- **Cloud Run**: For serverless deployment
- **GKE**: For Kubernetes orchestration
- **Cloud Storage**: For file uploads and static assets
- **Cloud SQL**: For PostgreSQL database

## Error Handling Patterns

### Frontend Error Boundaries
```typescript
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo);
    // Send to error reporting service
  }
}
```

### Backend Error Handling
```typescript
export const handleApiError = (error: any, res: Response) => {
  if (error.code === 'P2002') {
    return res.status(409).json({ 
      error: 'Conflict', 
      message: 'Resource already exists' 
    });
  }
  
  if (error.status < 500) {
    return res.status(error.status).json({ 
      error: error.message 
    });
  }
  
  // Log server errors but don't expose details
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error' 
  });
};
```

## Testing Strategy

### Component Testing
```typescript
// Use React Testing Library for component tests
import { render, screen, fireEvent } from '@testing-library/react';

test('Button renders with correct variant', () => {
  render(<Button variant="primary">Click me</Button>);
  expect(screen.getByRole('button')).toHaveClass('bg-primary');
});
```

### API Testing
```typescript
// Test API endpoints with proper mocking
import { createMocks } from 'node-mocks-http';

test('POST /api/projects creates project', async () => {
  const { req, res } = createMocks({
    method: 'POST',
    body: { name: 'Test Project' }
  });
  
  await projectHandler(req, res);
  expect(res._getStatusCode()).toBe(201);
});
```

## Monitoring & Observability

### Health Check Implementation
```typescript
// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      redis: 'connected',
      storage: 'accessible'
    }
  };
  res.json(health);
});
```

### Performance Monitoring
- Track API response times
- Monitor database query performance
- Alert on error rate thresholds
- Track user engagement metrics

## Contributing Guidelines

When working on this codebase:

1. **Follow existing patterns**: Maintain consistency with established code patterns
2. **Type safety first**: Always use proper TypeScript types
3. **Security conscious**: Consider security implications of changes
4. **Performance aware**: Consider the performance impact of new features
5. **Test thoroughly**: Test changes in development environment
6. **Document changes**: Update documentation for significant changes

### Development Environment Setup
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Initialize database
npm run db:push

# Start development server
npm run dev
```

### Code Review Checklist
- [ ] TypeScript types are properly defined
- [ ] Error handling is implemented
- [ ] Security middleware is applied where needed
- [ ] Performance implications considered
- [ ] Tests added for new functionality
- [ ] Documentation updated if needed

This platform serves thousands of developers building projects ranging from simple websites to complex applications. Every change should consider scalability, security, and user experience.