# ADR 001: TypeScript Monorepo Architecture

## Status
**Accepted** - 2024-11-20

## Context
E-Code Platform requires a scalable architecture that supports multiple components (backend, frontend, mobile, SDKs) while maintaining code quality, type safety, and developer experience.

## Decision
Adopt a **TypeScript monorepo** structure with the following characteristics:

### Repository Structure
```
/home/user/e-code/
├── client/          # React frontend (SPA)
├── server/          # Express backend (API)
├── shared/          # Shared types, schemas, utilities
├── sdk/             # TypeScript & JavaScript SDKs
├── mobile/          # React Native mobile app
├── cli/             # Command-line interface
└── package.json     # Root package manager
```

### Key Technologies
- **TypeScript 5.6+**: Type safety across all packages
- **npm workspaces**: Native monorepo support
- **Shared tsconfig**: Consistent compiler options
- **Drizzle ORM schemas**: Single source of truth for database

## Rationale

### Advantages
1. **Code Sharing**: Shared types between client and server eliminate API contract mismatches
2. **Type Safety**: End-to-end type safety from database to frontend
3. **Refactoring**: Cross-package refactoring is straightforward
4. **Consistent Tooling**: Single ESLint, Prettier, and TypeScript configuration
5. **Atomic Changes**: Update shared types in one commit affecting all consumers
6. **Developer Experience**: Single `npm install` for entire project

### Considered Alternatives
1. **Polyrepo**: Rejected due to type synchronization overhead
2. **Lerna/Nx**: Rejected as npm workspaces sufficient for our scale
3. **JavaScript with JSDoc**: Rejected due to weaker type guarantees

## Consequences

### Positive
- ✅ Reduced boilerplate for API contracts
- ✅ Faster onboarding (single repo to clone)
- ✅ Easier CI/CD (single pipeline)
- ✅ Better IDE support (jump to definition across packages)

### Negative
- ⚠️ Longer initial build times (mitigated with caching)
- ⚠️ Larger repository size
- ⚠️ Requires discipline to avoid circular dependencies

### Mitigation Strategies
- Use TypeScript project references for faster incremental builds
- Implement strict module boundaries
- Enforce dependency graph validation in CI

## Implementation Notes
```json
{
  "workspaces": ["client", "server", "shared", "sdk/*", "mobile", "cli"]
}
```

## Related Decisions
- ADR 002: Drizzle ORM Selection
- ADR 003: Multi-LLM Strategy

## References
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [npm Workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces)
