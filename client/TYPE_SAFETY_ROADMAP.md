# Type Safety Roadmap

## Current State
- ~962 usages of `any` type identified
- TypeScript strict mode partially enabled
- `noImplicitAny` set to `false` to allow gradual migration

## Priority Files to Fix
1. client/src/lib/queryClient.ts - API layer
2. client/src/lib/collaboration.ts - WebSocket messages
3. client/src/lib/streaming.ts - SSE data
4. client/src/hooks/use-auth.tsx - User data

## Guidelines for Fixing

### Replace explicit `any` types with proper interfaces

**Before:**
```typescript
const handleData = (data: any) => { ... }
```

**After:**
```typescript
interface WebSocketMessage {
  type: 'file_change' | 'cursor_move' | 'chat';
  payload: unknown;
}
const handleData = (data: WebSocketMessage) => { ... }
```

### Use `unknown` instead of `any` for external data

When receiving data from external sources (APIs, WebSockets, etc.), prefer `unknown` over `any`:

```typescript
// Bad
function parseResponse(data: any): User {
  return data;
}

// Good
function parseResponse(data: unknown): User {
  if (isUser(data)) {
    return data;
  }
  throw new Error('Invalid user data');
}
```

### Create type guards for runtime validation

```typescript
function isUser(data: unknown): data is User {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'email' in data
  );
}
```

### Use Zod schemas for API responses

Leverage existing Zod schemas from `@shared/schema.ts` for validation:

```typescript
import { userSchema } from '@shared/schema';

const response = await fetch('/api/user');
const data = await response.json();
const user = userSchema.parse(data); // Validated and typed
```

## Progress Tracking
- [ ] queryClient.ts
- [ ] collaboration.ts
- [ ] streaming.ts
- [ ] use-auth.tsx

## Migration Strategy

1. **Phase 1**: Enable stricter settings in `tsconfig.json` (current)
   - `strict: true`
   - `noImplicitAny: false` (allows existing code to work)

2. **Phase 2**: Fix priority files one at a time
   - Create proper interfaces for each module
   - Add type guards where needed
   - Test thoroughly after each change

3. **Phase 3**: Enable `noImplicitAny: true`
   - Set in `client/tsconfig.json`
   - Fix remaining implicit any errors

4. **Phase 4**: Maintain type safety
   - Add ESLint rules to prevent new `any` usage
   - Code review for type safety compliance
