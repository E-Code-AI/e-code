# API Configuration Guide

## Overview

The E-Code Platform uses a **shared configuration system** to ensure consistent API and WebSocket endpoints across all tooling (CLI, JavaScript SDK, and mobile apps). This eliminates configuration drift and ensures all clients connect to the correct servers.

## Authoritative Domain

**Production Domain**: `e-code.ai`

All production endpoints use the `e-code.ai` domain:
- **API**: `https://e-code.ai/api`
- **Web**: `https://e-code.ai`
- **WebSocket**: `wss://e-code.ai`

## Architecture

### Shared Configuration (`shared/config.ts`)

The central source of truth for all API endpoints. Both CLI and SDK import from this module to ensure consistency.

**Key Functions**:
- `getEnvironment()` - Detect current environment (development|staging|production)
- `getEndpoints()` - Get all endpoints for an environment
- `getAPIURL()` - Get full API URL with `/api` suffix (for CLI)
- `getAPIBaseURL()` - Get base URL without `/api` (for SDK)
- `getWebSocketURL()` - Get WebSocket URL
- `getWebURL()` - Get web application URL
- `validateEndpoints()` - Validate configuration (throws in production if misconfigured)

### Environment-Specific Endpoints

| Environment | API | WebSocket | Web |
|------------|-----|-----------|-----|
| **Development** | `http://localhost:5000/api` | `ws://localhost:5000` | `http://localhost:5000` |
| **Staging** | `https://staging.e-code.ai/api` | `wss://staging.e-code.ai` | `https://staging.e-code.ai` |
| **Production** | `https://e-code.ai/api` | `wss://e-code.ai` | `https://e-code.ai` |

## Environment Variables

### Setting the Environment

```bash
# Set environment (development|staging|production)
export ECODE_ENV=production

# Or use NODE_ENV as fallback
export NODE_ENV=development
```

**Environment Detection Priority**:
1. `ECODE_ENV` environment variable
2. `NODE_ENV` environment variable
3. **Default**: `production` (conservative/safe default)

### Overriding Endpoints

You can override individual endpoints for custom deployments:

```bash
# Override API endpoint
export ECODE_API_URL=https://custom-api.example.com/api

# Override WebSocket endpoint
export ECODE_WS_URL=wss://custom-api.example.com

# Override web endpoint
export ECODE_WEB_URL=https://custom-app.example.com
```

### Complete Example

```bash
# Custom production deployment
export ECODE_ENV=production
export ECODE_API_URL=https://api.mycompany.com/api
export ECODE_WS_URL=wss://api.mycompany.com
export ECODE_WEB_URL=https://app.mycompany.com
```

## Usage in Code

### CLI Usage

The CLI automatically uses the shared configuration:

```typescript
// cli/src/constants.ts
import { getAPIURL, getWebURL, getWebSocketURL } from '@shared/config';

export const API_BASE_URL = getAPIURL();
export const WEB_BASE_URL = getWebURL();
export const WS_BASE_URL = getWebSocketURL();
```

**No code changes needed** - environment variables work automatically.

### SDK Usage

The JavaScript SDK uses shared configuration for defaults:

```typescript
// Using defaults (reads from environment)
const ecode = new ECode({
  apiKey: 'your-api-key'
});

// Custom endpoint override
const ecode = new ECode({
  apiKey: 'your-api-key',
  baseUrl: 'https://custom.example.com',
  websocketUrl: 'wss://custom.example.com'
});
```

**SDK Client Behavior**:
- Receives base URL (e.g., `https://e-code.ai`)
- Automatically appends `/api` for all requests
- Final requests go to `https://e-code.ai/api/*`

### Direct Import

You can also import the configuration directly in your code:

```typescript
import * as config from '@shared/config';

// Get current environment
const env = config.getEnvironment();
console.log(`Running in ${env} environment`);

// Get endpoints
const endpoints = config.getEndpoints();
console.log('API:', endpoints.api);
console.log('WebSocket:', endpoints.ws);

// Check environment
if (config.isProduction()) {
  console.log('Production mode - using e-code.ai');
}

// Validate configuration (throws if misconfigured)
config.validateEndpoints();
```

## Testing

### Running Integration Tests

```bash
# Run full integration test suite
npm test tests/integration/api-config.test.ts

# Run smoke tests (requires server to be running)
RUN_SMOKE_TESTS=true npm test tests/integration/api-config.test.ts

# Or use the smoke test script
./tests/integration/smoke-test.sh
```

### Smoke Test Script

The smoke test script verifies:
- ✅ Shared configuration provides correct URLs for each environment
- ✅ CLI constants match shared configuration
- ✅ SDK uses shared configuration
- ✅ Environment variable overrides work
- ✅ Health check endpoints are accessible (if server running)

```bash
# Run smoke tests
./tests/integration/smoke-test.sh

# Output example:
# ✓ PASSED: URL matches expected
# ✓ PASSED: CLI constants aligned
# ✓ PASSED: SDK configuration aligned
# ✓ PASSED: Environment override works
```

### Manual Testing

**Test development environment**:
```bash
ECODE_ENV=development node -e "
  const config = require('./shared/config');
  console.log('API:', config.getAPIURL());
  console.log('WS:', config.getWebSocketURL());
"
# Output:
# API: http://localhost:5000/api
# WS: ws://localhost:5000
```

**Test production environment**:
```bash
ECODE_ENV=production node -e "
  const config = require('./shared/config');
  console.log('API:', config.getAPIURL());
  console.log('WS:', config.getWebSocketURL());
"
# Output:
# API: https://e-code.ai/api
# WS: wss://e-code.ai
```

**Test custom override**:
```bash
ECODE_ENV=production ECODE_API_URL=https://custom.com/api node -e "
  const config = require('./shared/config');
  console.log('API:', config.getAPIURL());
"
# Output:
# API: https://custom.com/api
```

## Production Safety

### Validation

The configuration includes built-in validation:

```typescript
import { validateEndpoints } from '@shared/config';

// Throws error if production uses localhost
validateEndpoints();
```

**Production Checks**:
- ✅ API URL must be configured (no empty values)
- ✅ API URL cannot contain `localhost`
- ✅ API URL cannot contain `127.0.0.1`
- ✅ API URL cannot contain `0.0.0.0`
- ✅ API URL cannot contain `10.0.2.2` (Android emulator localhost)
- ✅ WebSocket URL has same restrictions

**Error Example**:
```
[CONFIG ERROR] Production environment cannot use localhost URL.
Found: http://localhost:5000/api.
Please set ECODE_API_URL to a valid production URL.
```

### Best Practices

1. **Never hardcode URLs** - Always use the shared configuration
2. **Set explicit environment** - Don't rely on auto-detection in production
3. **Validate on startup** - Call `validateEndpoints()` in production code
4. **Use environment files** - Create `.env.production`, `.env.staging` files
5. **Document overrides** - If using custom endpoints, document why

## Migration from Old Configuration

### Before (Inconsistent)

**CLI** (cli/src/constants.ts):
```typescript
export const API_BASE_URL = 'https://api.e-code.com';  // Wrong domain
export const WS_BASE_URL = 'wss://api.e-code.com';    // Wrong domain
```

**SDK** (sdk/javascript/src/index.ts):
```typescript
baseUrl: 'https://e-code.app'  // Wrong domain, different from CLI
websocketUrl: 'wss://e-code.app'  // Wrong domain
```

### After (Consistent)

**Both CLI and SDK**:
```typescript
import { getAPIURL, getWebSocketURL } from '@shared/config';

const apiURL = getAPIURL();       // https://e-code.ai/api
const wsURL = getWebSocketURL();  // wss://e-code.ai
```

**Result**:
- ✅ Both use `e-code.ai` (correct domain)
- ✅ Both respect `ECODE_ENV` environment variable
- ✅ Both support custom endpoint overrides
- ✅ Both fail fast if misconfigured in production

## Troubleshooting

### Issue: "Cannot find module '@shared/config'"

**Cause**: TypeScript path mapping not configured or module not compiled.

**Solution**:
```bash
# Ensure tsconfig.json has path mapping
{
  "compilerOptions": {
    "paths": {
      "@shared/*": ["./shared/*"]
    }
  }
}

# Rebuild packages
npm run build
```

### Issue: "CLI and SDK hitting different endpoints"

**Cause**: Not using shared configuration or using hardcoded URLs.

**Solution**: Import from `@shared/config` instead of hardcoding:
```typescript
// ❌ Wrong
const apiURL = 'https://e-code.app/api';

// ✅ Correct
import { getAPIURL } from '@shared/config';
const apiURL = getAPIURL();
```

### Issue: "Production validation failing"

**Cause**: Localhost URL detected in production environment.

**Solution**: Set proper production URL:
```bash
export ECODE_ENV=production
export ECODE_API_URL=https://e-code.ai/api
export ECODE_WS_URL=wss://e-code.ai
```

### Issue: "Environment detection not working"

**Cause**: Environment variable not set or misspelled.

**Solution**:
```bash
# Check current detection
node -e "console.log(require('./shared/config').getEnvironment())"

# Set explicitly
export ECODE_ENV=development  # or staging, or production
```

## CI/CD Integration

### GitHub Actions

```yaml
name: API Configuration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Run integration tests
        run: npm test tests/integration/api-config.test.ts
      
      - name: Run smoke tests
        run: ./tests/integration/smoke-test.sh
```

### Environment-Specific Deployments

```yaml
# .github/workflows/deploy-staging.yml
env:
  ECODE_ENV: staging
  ECODE_API_URL: https://staging.e-code.ai/api
  ECODE_WS_URL: wss://staging.e-code.ai

# .github/workflows/deploy-production.yml
env:
  ECODE_ENV: production
  ECODE_API_URL: https://e-code.ai/api
  ECODE_WS_URL: wss://e-code.ai
```

## Summary

### Key Benefits

1. **Consistency** - CLI and SDK always use the same endpoints
2. **Correctness** - Authoritative `e-code.ai` domain used everywhere
3. **Flexibility** - Easy environment overrides for custom deployments
4. **Safety** - Production validation prevents localhost URLs
5. **Testability** - Comprehensive tests ensure alignment

### Quick Reference

| Need | Use |
|------|-----|
| Set environment | `export ECODE_ENV=production` |
| Override API URL | `export ECODE_API_URL=https://custom.com/api` |
| Get API URL in code | `import { getAPIURL } from '@shared/config'` |
| Get base URL for SDK | `import { getAPIBaseURL } from '@shared/config'` |
| Validate config | `import { validateEndpoints } from '@shared/config'` |
| Run tests | `./tests/integration/smoke-test.sh` |

### Support

If you encounter configuration issues:
1. Check `shared/config.ts` for available functions
2. Run `./tests/integration/smoke-test.sh` to verify setup
3. Review this documentation for common patterns
4. Check environment variables with `env | grep ECODE`
