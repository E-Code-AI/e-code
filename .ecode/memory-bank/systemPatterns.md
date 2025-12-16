# System Patterns

## Architecture Overview
- **Frontend**: React 18 + TypeScript + Vite + TanStack Query
- **Backend**: Express.js + TypeScript + Drizzle ORM
- **Database**: PostgreSQL (Neon serverless)
- **Real-time**: WebSocket with Central Upgrade Dispatcher
- **AI**: Multi-provider system with circuit breakers

## Key Technical Decisions
1. **Central Upgrade Dispatcher**: Single WebSocket handler prevents "Invalid frame header" errors
2. **Tier-based Rate Limiting**: Free (500/min), Pro (1000/min), Teams (5000/min), Enterprise (10000/min)
3. **Monaco Safe Disposal**: Optional chaining (`d?.dispose?.()`) prevents memory leaks
4. **Hybrid Animations**: LazyMotion + CSS for simple, framer-motion for complex gestures

## Design Patterns in Use
- **Circuit Breaker**: AI provider failover with exponential backoff
- **Repository Pattern**: Storage interface abstracts database operations
- **Middleware Chain**: Security, CORS, rate limiting, logging in order
- **Observer Pattern**: WebSocket event broadcasting for real-time updates

## Component Relationships
- `server/index.ts` → Bootstraps Express, registers middleware and routes
- `centralUpgradeDispatcher` → Routes all WebSocket upgrades to correct handlers
- `client/src/App.tsx` → Main React entry with lazy-loaded routes
- `shared/schema.ts` → Drizzle models shared between frontend and backend
