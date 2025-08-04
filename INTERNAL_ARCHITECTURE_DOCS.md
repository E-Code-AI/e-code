# E-Code Internal Architecture Documentation

## System Architecture Overview

### Frontend Architecture
```
client/
├── src/
│   ├── components/         # React components
│   │   ├── ReplitAgent.tsx # AI Agent interface (Claude 4.0)
│   │   ├── EditorWorkspace.tsx
│   │   └── ...
│   ├── pages/             # Route pages
│   ├── lib/               # Utilities
│   └── hooks/             # Custom React hooks
```

### Backend Architecture
```
server/
├── routes.ts              # Main API routes
├── ai/                    # AI services
│   ├── ai-provider.ts     # Claude 4.0 integration
│   └── code-analyzer.ts   # Code understanding
├── import/                # Import services
│   ├── figma-import-service.ts
│   ├── bolt-import-service.ts
│   └── lovable-import-service.ts
├── services/              # Core services
│   └── checkpoint-service.ts
└── storage.ts             # Data persistence layer
```

## Key Implementation Details

### AI Agent v2 Architecture
- **Model**: Claude Sonnet 4.0 (`claude-sonnet-4-20250514`)
- **Provider**: Anthropic SDK integration
- **Features**:
  - Autonomous app building with action execution
  - Extended Thinking mode for complex problems
  - High Power mode for resource-intensive tasks
  - Web Search capability (pending implementation)

### Checkpoint System
```typescript
// Checkpoint schema includes:
interface Checkpoint {
  id: number;
  projectId: number;
  userId: number;
  message: string;
  filesSnapshot: Json;        // Complete file tree
  databaseSnapshot: Json;     // DB state
  aiMemorySnapshot: Json;     // Conversation context
  environmentSnapshot: Json;  // Env vars, settings
  agentMetrics: {
    filesModified: number;
    linesOfCode: number;
    tokensUsed: number;
    executionTimeMs: number;
  };
}
```

### Import Services Architecture
Each import service follows a standard pattern:
1. Create import record
2. Process source data
3. Generate E-Code compatible files
4. Update import status
5. Handle errors gracefully

### Real-time Collaboration
- **Technology**: Yjs CRDT for conflict-free editing
- **Protocol**: WebSocket with Socket.io
- **Features**: Live cursors, presence awareness, shared state

### Database Architecture
- **Primary**: PostgreSQL with Drizzle ORM
- **Schema**: Defined in `shared/schema.ts`
- **Migrations**: Automated with `npm run db:push`

### Billing System
```typescript
// Pricing calculation
const complexityMultipliers = {
  simple: 1,
  moderate: 2.5,
  complex: 5,
  very_complex: 10,
  expert: 20
};

// Usage tracking
- AI tokens consumed
- Compute hours
- Storage GB/month
- Bandwidth GB
```

## Security Implementation

### Authentication Flow
1. Session-based auth with Express sessions
2. PostgreSQL session store
3. Dev bypass for local development
4. 2FA support (pending)

### Secrets Management
- Stored encrypted in database
- Accessed as environment variables
- UI for management in workspace
- Audit trail for access

## Deployment Architecture

### Development
- Vite dev server on port 5000
- Hot module replacement
- TypeScript compilation

### Production
- Static asset serving
- API server clustering
- PostgreSQL connection pooling
- Redis for caching (planned)

## Performance Optimizations

### Frontend
- Code splitting with React.lazy
- Route-based chunking
- Image optimization
- Service worker caching (planned)

### Backend
- Database query optimization
- Connection pooling
- Response caching
- CDN integration (planned)

## Monitoring & Analytics

### Current Implementation
- Basic request logging
- Error tracking
- Usage metrics collection
- Performance timing

### Planned Enhancements
- APM integration
- Custom metrics API
- Real user monitoring
- Distributed tracing

## Testing Strategy

### Unit Tests
- Jest for backend
- React Testing Library for frontend
- 80% coverage target

### Integration Tests
- API endpoint testing
- Database integration tests
- Import service tests

### E2E Tests (Planned)
- Playwright for UI testing
- User journey tests
- Cross-browser testing

## CI/CD Pipeline

### Current
- Manual deployment
- Environment-based configs
- Database migrations

### Planned
- GitHub Actions CI
- Automated testing
- Blue-green deployments
- Rollback automation

## Scaling Considerations

### Horizontal Scaling
- Stateless API design
- Session sharing via PostgreSQL
- WebSocket sticky sessions

### Vertical Scaling
- Resource limits per workspace
- Queue-based job processing
- Background task workers

## Known Technical Debt

1. **Vite Configuration**: Cannot be modified (forbidden)
2. **LSP Error**: Type mismatch in server/vite.ts
3. **Mobile Optimization**: Basic responsive design
4. **Test Coverage**: Limited automated testing

## Development Guidelines

### Code Style
- TypeScript strict mode
- ESLint configuration
- Prettier formatting
- Conventional commits

### PR Process
1. Feature branch workflow
2. Code review required
3. CI checks must pass
4. Documentation updates

### Release Process
1. Version bumping
2. Changelog generation
3. Database migrations
4. Deployment scripts

## Emergency Procedures

### Rollback Process
1. Use checkpoint system for user data
2. Database backup restoration
3. Previous deployment activation
4. User notification

### Incident Response
1. Error monitoring alerts
2. On-call rotation
3. Status page updates
4. Post-mortem process

## Future Architecture Plans

### Microservices Migration
- AI service extraction
- Import service separation
- Billing service isolation
- API gateway implementation

### Infrastructure Improvements
- Kubernetes orchestration
- Service mesh
- Distributed caching
- Multi-region deployment

---

Last Updated: August 4, 2025
Next Review: September 1, 2025