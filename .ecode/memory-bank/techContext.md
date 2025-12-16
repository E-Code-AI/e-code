# Technical Context

## Tech Stack
- **Frontend**: React 18, TypeScript, Vite, TanStack Query, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, Node.js 20, TypeScript
- **Database**: PostgreSQL (Neon serverless), Drizzle ORM
- **AI Providers**: OpenAI (GPT-4o, o3), Anthropic (Claude 4.5), Gemini 2.5, xAI (Grok 4), Moonshot (Kimi K2)
- **Real-time**: WebSocket, Yjs, Socket.IO
- **Caching**: Redis (optional), TanStack Query with IndexedDB persistence

## Development Setup
```bash
npm run dev          # Start development server on port 5000
npm run db:push      # Push schema changes to database
npm run db:studio    # Open Drizzle Studio for database inspection
```

## Key Dependencies
- `@tanstack/react-query` - Server state management with caching
- `drizzle-orm` + `drizzle-zod` - Type-safe ORM with Zod validation
- `monaco-editor` - VS Code-style code editor
- `xterm.js` - Terminal emulation
- `yjs` - CRDT for real-time collaboration
- `framer-motion` - Animations and gestures

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (auto-set by Replit)
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` - AI providers
- `REDIS_URL` - Optional caching layer
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` - Payment processing

## Default Test Credentials
- User: testuser@test.com / testpass123
- Admin: admin@ecode.com / adminpass123
