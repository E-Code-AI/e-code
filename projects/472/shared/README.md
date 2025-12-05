# shared/

This folder contains all cross-cutting, framework-agnostic code that is shared between the client and the server. It is the single source of truth for:

- TypeScript types and interfaces
- Runtime-safe schemas (e.g., Zod)
- Constants and configuration values
- Pure utility functions and helpers
- Shared domain logic that does not depend on React, Node, or any specific framework

The goal is to keep shared logic:

- Type-safe
- Side-effect free (where possible)
- Platform-agnostic (no direct DOM, browser, or Node APIs)
- Easy to import consistently from both client and server code

---

## Folder structure

Typical structure (may vary slightly by project):

shared/
  types/
    domain/
    api/
    common/
  schemas/
  constants/
  utils/
  config/
  index.ts

### types/

Contains TypeScript-only definitions:

- Domain models (e.g., User, Project, Task)
- API request/response shapes
- Enums and discriminated unions
- Utility types (e.g., Branded types, Result types)

These files should not contain runtime logic. They are purely for compile-time type safety.

Example categories:

- `types/domain/` – Core business entities
- `types/api/` – Request/response contracts, pagination, filters
- `types/common/` – Reusable primitives and utility types

### schemas/

Contains runtime validation schemas (e.g., Zod, Yup) that mirror the TypeScript types.

Use these for:

- Validating incoming API payloads on the server
- Validating form data on the client
- Safely parsing external data (e.g., from localStorage or query params)

Keep schemas colocated with their logical domain (e.g., `userSchema`, `projectSchema`) and ensure they stay in sync with the corresponding TypeScript types.

### constants/

Contains shared constants and configuration values that are safe to use in both client and server:

- String literals and labels
- Feature flags (non-secret, public-facing)
- Route names and URL segments
- Common numeric limits (e.g., max lengths, pagination sizes)
- Enum-like constant objects

Do NOT put secrets or environment-specific values here. Those belong in server-only configuration.

### utils/

Contains pure, framework-agnostic utility functions:

- String, number, and date helpers
- Data transformation utilities
- Domain-specific pure functions
- Serialization / deserialization helpers

Guidelines:

- No direct access to browser APIs (window, document, localStorage, etc.)
- No direct access to Node APIs (fs, process.env, etc.)
- No side effects (no logging, no global state mutation) unless clearly documented

If a utility must be platform-specific, consider:

- Creating a shared interface in `shared/`
- Implementing platform-specific versions in `client/` and `server/`

### config/

Contains shared configuration objects that are safe for both client and server:

- Public configuration (e.g., default pagination size, supported locales)
- Non-secret feature configuration

Environment-specific or secret configuration must remain in server-only code.

---

## Import conventions

To keep imports consistent and maintainable, follow these conventions.

### 1. Prefer barrel imports from `shared/`

Where possible, import from the `shared` barrel file (e.g., `shared/index.ts`) instead of deep relative paths.

Example (preferred):

- `import { User, Project } from 'shared';`
- `import { userSchema } from 'shared';`
- `import { formatDate } from 'shared';`

This keeps import paths stable even if internal file structure changes.

### 2. Use path aliases instead of long relative paths

In TypeScript configuration (e.g., `tsconfig.json`), define a path alias for `shared`:

- `"paths": { "shared/*": ["shared/*"], "shared": ["shared/index"] }`

Then, in code:

- `import { User } from 'shared';`
- `import { userSchema } from 'shared/schemas/user';`
- `import { formatCurrency } from 'shared/utils/formatCurrency';`

Avoid:

- `import { User } from '../../shared/types/domain/user';`

### 3. Keep shared code framework-agnostic

Code in `shared/` must not import from:

- React or React DOM
- Next.js, Express, or any server framework
- Node core modules (fs, path, process, etc.)
- Browser-specific APIs (window, document, localStorage, etc.)

If you need a helper that depends on a specific platform:

- Define the type or interface in `shared/`
- Implement the platform-specific logic in `client/` or `server/`

### 4. Avoid circular dependencies

When adding new modules:

- Prefer small, focused files
- Use barrel files (`index.ts`) carefully
- Keep domain types and utilities decoupled where possible

If you notice circular import warnings, consider:

- Splitting shared types into smaller modules
- Moving cross-domain helpers into a more generic location

---

## When to put code in `shared/`

Place code in `shared/` if:

- It is used by both client and server, OR
- It is likely to be reused across multiple layers, AND
- It does not depend on platform-specific APIs

Examples:

- A `User` type used by both API handlers and React components
- A `userSchema` used to validate requests on the server and forms on the client
- A `formatDate` utility used in server-rendered pages and client components
- A `PAGINATION_DEFAULT_LIMIT` constant used in queries and UI

Keep code out of `shared/` if:

- It depends on environment variables or secrets
- It uses Node or browser APIs directly
- It is tightly coupled to a specific framework (React hooks, Express middleware, etc.)

---

## Best practices

- Treat `shared/` as a public API for your application layers
- Keep modules small, focused, and well-named
- Prefer pure functions and immutable data structures
- Keep types and schemas in sync (consider using schema-first or type-first patterns consistently)
- Document any non-obvious behavior or domain rules in comments near the relevant types or utilities

---

## Updating shared contracts

When changing shared types, schemas, or constants:

1. Update the TypeScript types in `shared/types/`
2. Update corresponding schemas in `shared/schemas/`
3. Update any related constants in `shared/constants/`
4. Run type-checks and tests for both client and server
5. Search for usages across the codebase to ensure all call sites are updated

Treat changes in `shared/` as contract changes between client and server. Be especially careful with:

- API request/response shapes
- Validation rules
- Public enums and discriminated unions

---

## Summary

The `shared/` folder is the central place for:

- Cross-cutting TypeScript types
- Runtime-safe schemas
- Shared constants
- Pure utilities and domain logic

Use it to keep your client and server in sync, reduce duplication, and maintain a clear, type-safe contract across your entire application.