# API Versioning Strategy

## Overview

E-Code Platform implements Fortune 500-grade API versioning to ensure backward compatibility while enabling continuous evolution. The API uses a hybrid versioning strategy supporting both URL-based and header-based version negotiation.

## Current API Version

| Property | Value |
|----------|-------|
| **Current Version** | `v1` |
| **Supported Versions** | `v1` |
| **Default Version** | `v1` |
| **Base URL** | `/api` or `/api/v1` |

## Versioning Strategy

### URL-Based Versioning (Recommended)

All API endpoints support explicit version prefixes:

```
GET /api/v1/users
POST /api/v1/projects
PUT /api/v1/files/:id
```

### Header-Based Versioning

For clients preferring header-based negotiation:

```http
GET /api/users
Accept-Version: v1
```

### Default Behavior

When no version is specified, the API defaults to `v1`:

```
GET /api/users       →  Treated as /api/v1/users
GET /api/projects    →  Treated as /api/v1/projects
```

## API Endpoint Categories

### Core Endpoints

| Category | Base Path | Description |
|----------|-----------|-------------|
| Auth | `/api/auth/*` | Authentication & session management |
| Users | `/api/users/*` | User profile & preferences |
| Projects | `/api/projects/*` | Project CRUD & management |
| Files | `/api/files/*` | File operations |
| Database | `/api/database/*` | Database provisioning |

### AI/Agent Endpoints

| Category | Base Path | Description |
|----------|-----------|-------------|
| Agent | `/api/agent/*` | AI agent interactions |
| AI Models | `/api/ai-models/*` | Model configuration |
| Code Generation | `/api/code-generation/*` | AI code generation |
| Chat | `/api/chatgpt/*` | Chat completions |

### Infrastructure Endpoints

| Category | Base Path | Description |
|----------|-----------|-------------|
| Health | `/api/health/*` | Liveness & readiness probes |
| Metrics | `/api/metrics` | Prometheus metrics |
| Deployment | `/api/deployment/*` | Deployment management |

### WebSocket Endpoints

| Path | Purpose |
|------|---------|
| `/ws/agent` | AI Agent real-time communication |
| `/ws/terminal` | Terminal sessions |
| `/ws/collaboration` | Real-time collaboration |
| `/ws/lsp` | Language Server Protocol |

## Response Headers

All API responses include:

```http
X-API-Version: v1
```

Deprecated endpoints also include:

```http
Deprecation: true
Sunset: 2025-12-31
X-API-Warn: API version v1 is deprecated and will be removed on 2025-12-31
```

## Error Responses

### Unsupported Version

```json
{
  "error": "Unsupported API version",
  "requestedVersion": "v9",
  "supportedVersions": ["v1"],
  "currentVersion": "v1",
  "message": "API version v9 is not supported. Please use one of: v1"
}
```

HTTP Status: `400 Bad Request`

## Deprecation Guidelines

### Phase 1: Announce Deprecation

1. Add deprecation headers to affected endpoints
2. Update API documentation
3. Notify API consumers via email/dashboard
4. Minimum 90-day notice period

```typescript
import { deprecationWarning } from '../middleware/api-versioning';

router.get('/legacy-endpoint', 
  deprecationWarning('v1', '2025-12-31'),
  handler
);
```

### Phase 2: Migration Period

1. Maintain both old and new endpoints
2. Log usage of deprecated endpoints
3. Provide migration guides
4. Offer dedicated support for large integrations

### Phase 3: Sunset

1. Return `410 Gone` for removed endpoints
2. Include migration guidance in error response
3. Maintain redirect to new endpoints where possible

## Versioning Best Practices

### For API Developers

1. **Never break v1 contracts** - Add new fields, don't remove or rename
2. **Use additive changes** - New optional fields are backward compatible
3. **Version at route level** - Not at field level
4. **Document all changes** - Maintain changelog in this document

### For API Consumers

1. **Specify version explicitly** - Don't rely on defaults
2. **Handle deprecation warnings** - Monitor `Deprecation` header
3. **Plan for sunset dates** - Migrate before `Sunset` date
4. **Test with new versions** - Use staging environment

## Migration Guide (v1 → v2)

> **Note**: v2 is not yet available. This section is a placeholder for future migration documentation.

When v2 is released:

1. Review breaking changes in changelog
2. Update client SDK or API calls
3. Test in staging environment
4. Deploy during maintenance window
5. Monitor error rates post-migration

## Implementation Details

### Middleware Location

```
server/middleware/api-versioning.ts
```

### Key Exports

```typescript
import {
  apiVersionMiddleware,
  rejectUnsupportedVersions,
  createVersionedRouter,
  deprecationWarning,
  getApiVersion,
  isVersion,
  CURRENT_API_VERSION,
  SUPPORTED_VERSIONS,
} from '../middleware/api-versioning';
```

### Creating Versioned Routes

```typescript
import { createVersionedRouter } from '../middleware/api-versioning';

const v1Router = createVersionedRouter('v1');

v1Router.get('/users', async (req, res) => {
  // v1 implementation
});

const v2Router = createVersionedRouter('v2');

v2Router.get('/users', async (req, res) => {
  // v2 implementation with breaking changes
});

app.use('/api/v1', v1Router);
app.use('/api/v2', v2Router);
```

## Changelog

### v1 (Current - December 2025)

- Initial API version
- All endpoints use implicit v1 versioning
- Header-based version negotiation supported
- URL-based versioning infrastructure ready

---

*Last updated: December 25, 2025*
