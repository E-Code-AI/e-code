# Mobile App Environment Variables

## Overview

The E-Code mobile app requires proper environment configuration to connect to the API server. This document explains the required environment variables and how to configure them for different environments.

## Required Environment Variables

### `EXPO_PUBLIC_API_BASE` (REQUIRED for Production/Staging)

The base URL for the E-Code API server.

**Format**: `https://your-domain.com/api` (must include `/api` suffix)

**Examples**:
```bash
# Production
EXPO_PUBLIC_API_BASE=https://api.e-code.app/api

# Staging
EXPO_PUBLIC_API_BASE=https://staging.e-code.app/api

# Local network testing (development only)
EXPO_PUBLIC_API_BASE=http://192.168.1.100:5000/api
```

**Important**: 
- Production builds **MUST** have this variable set
- **NEVER** use `localhost` URLs in production/staging
- The build will **FAIL LOUDLY** if production has no URL configured

### `EXPO_PUBLIC_ENV` (Optional)

Explicitly set the environment name.

**Valid values**: `development` | `staging` | `production`

**Examples**:
```bash
# Force development mode (allows localhost)
EXPO_PUBLIC_ENV=development

# Staging environment
EXPO_PUBLIC_ENV=staging

# Production environment  
EXPO_PUBLIC_ENV=production
```

**Default behavior** (if not set):
- If `__DEV__` is true → `development`
- If `NODE_ENV` is `production` → `production`
- Otherwise → `production` (safe default)

### `EXPO_PUBLIC_RELEASE_CHANNEL` (Optional)

For EAS builds, specifies the release channel.

**Examples**:
```bash
EXPO_PUBLIC_RELEASE_CHANNEL=production
EXPO_PUBLIC_RELEASE_CHANNEL=staging
```

## Environment-Specific Behavior

### Development Environment

**Characteristics**:
- Allows localhost URLs
- Provides helpful debug logging
- Defaults to `http://localhost:5000/api` if no URL provided

**Example .env.development**:
```bash
# Not required - will default to localhost
# EXPO_PUBLIC_API_BASE=http://localhost:5000/api

# Or use local network IP for device testing
EXPO_PUBLIC_API_BASE=http://192.168.1.100:5000/api
EXPO_PUBLIC_ENV=development
```

### Staging Environment

**Characteristics**:
- **REQUIRES** explicit URL configuration
- **REJECTS** localhost URLs
- No fallback defaults

**Example .env.staging**:
```bash
EXPO_PUBLIC_API_BASE=https://staging.e-code.app/api
EXPO_PUBLIC_ENV=staging
EXPO_PUBLIC_RELEASE_CHANNEL=staging
```

**Build command**:
```bash
EXPO_PUBLIC_API_BASE=https://staging.e-code.app/api \
EXPO_PUBLIC_ENV=staging \
eas build --profile staging
```

### Production Environment

**Characteristics**:
- **REQUIRES** explicit URL configuration
- **REJECTS** localhost URLs
- **FAILS BUILD** if URL not provided
- **FAILS AT RUNTIME** if URL is localhost

**Example .env.production**:
```bash
EXPO_PUBLIC_API_BASE=https://api.e-code.app/api
EXPO_PUBLIC_ENV=production
EXPO_PUBLIC_RELEASE_CHANNEL=production
```

**Build command**:
```bash
EXPO_PUBLIC_API_BASE=https://api.e-code.app/api \
EXPO_PUBLIC_ENV=production \
eas build --profile production
```

## Configuration Files

### `.env` File (Local Development)

Create a `.env` file in the `mobile/` directory:

```bash
# Development (localhost)
EXPO_PUBLIC_API_BASE=http://localhost:5000/api
EXPO_PUBLIC_ENV=development

# Or for device testing on local network
# EXPO_PUBLIC_API_BASE=http://192.168.1.100:5000/api
```

### `eas.json` (EAS Builds)

Configure environment-specific builds:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "env": {
        "EXPO_PUBLIC_ENV": "development",
        "EXPO_PUBLIC_API_BASE": "http://192.168.1.100:5000/api"
      }
    },
    "staging": {
      "env": {
        "EXPO_PUBLIC_ENV": "staging",
        "EXPO_PUBLIC_API_BASE": "https://staging.e-code.app/api",
        "EXPO_PUBLIC_RELEASE_CHANNEL": "staging"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_ENV": "production",
        "EXPO_PUBLIC_API_BASE": "https://api.e-code.app/api",
        "EXPO_PUBLIC_RELEASE_CHANNEL": "production"
      }
    }
  }
}
```

## Error Messages & Troubleshooting

### Build-Time Error: Missing Production URL

```
═══════════════════════════════════════════════════════════
  CONFIGURATION ERROR: Missing Production API URL
═══════════════════════════════════════════════════════════

  Production builds REQUIRE a valid API base URL.
  Please set EXPO_PUBLIC_API_BASE in your environment.

  Example:
    EXPO_PUBLIC_API_BASE=https://api.e-code.app/api
```

**Solution**: Set `EXPO_PUBLIC_API_BASE` in your environment or `eas.json`

### Runtime Error: Localhost in Production

```
[CONFIG ERROR] PRODUCTION environment cannot use localhost URL.
Found: http://localhost:5000/api.
Please set EXPO_PUBLIC_API_BASE to a valid production URL.
```

**Solution**: The app detected it's running in production mode but has a localhost URL configured. Set a proper production URL.

### Runtime Error: No URL Configured

```
[CONFIG ERROR] No API base URL configured for PRODUCTION environment.
This is required for production builds.

To fix this, set one of:
  - EXPO_PUBLIC_API_BASE=https://your-api.example.com/api (recommended)
  - EXPO_PUBLIC_ENV=development (for local testing only)
```

**Solution**: Configure `EXPO_PUBLIC_API_BASE` or switch to development mode for testing.

## Testing Configuration

### Manual Testing

1. **Check current config** (development):
   ```bash
   npm start
   # Look for console log: "[Mobile Config] { environment: 'development', ... }"
   ```

2. **Test production validation**:
   ```bash
   # This should FAIL with clear error
   EXPO_PUBLIC_ENV=production npm start
   
   # This should SUCCEED
   EXPO_PUBLIC_API_BASE=https://api.example.com/api EXPO_PUBLIC_ENV=production npm start
   ```

### Automated Testing

The configuration includes comprehensive Jest tests in `src/services/__tests__/config.test.ts`:

```bash
# Run all tests
npm test

# Run config tests only
npm test -- config.test

# Run with coverage
npm test -- --coverage config.test
```

**Test coverage includes**:
- ✅ Development allows localhost
- ✅ Production requires explicit URL
- ✅ Production rejects localhost
- ✅ Staging requires explicit URL
- ✅ Environment detection logic
- ✅ Runtime validation
- ✅ Error message quality

## Security Checklist

Before deploying to production, verify:

- [ ] `EXPO_PUBLIC_API_BASE` is set to production URL
- [ ] Production URL uses HTTPS (not HTTP)
- [ ] Production URL does NOT contain `localhost`, `127.0.0.1`, or `10.0.2.2`
- [ ] `EXPO_PUBLIC_ENV` is set to `production` (or omitted)
- [ ] Build completes without configuration errors
- [ ] App starts without runtime configuration errors
- [ ] API requests reach the correct production server

## Quick Reference

| Environment | EXPO_PUBLIC_ENV | EXPO_PUBLIC_API_BASE | Allows Localhost? | Default |
|------------|-----------------|---------------------|-------------------|---------|
| Development | `development` | Optional | ✅ Yes | `http://localhost:5000/api` |
| Staging | `staging` | **REQUIRED** | ❌ No | None (fails) |
| Production | `production` | **REQUIRED** | ❌ No | None (fails) |

## Common Patterns

### Local Development on Device

For testing on a physical device connected to the same network:

```bash
# Find your computer's local IP
# macOS/Linux: ifconfig | grep "inet "
# Windows: ipconfig

# Use that IP in your .env
EXPO_PUBLIC_API_BASE=http://192.168.1.100:5000/api
EXPO_PUBLIC_ENV=development
```

### Multiple Environments

Use different `.env` files:

```bash
# .env.development
EXPO_PUBLIC_API_BASE=http://localhost:5000/api
EXPO_PUBLIC_ENV=development

# .env.staging  
EXPO_PUBLIC_API_BASE=https://staging.e-code.app/api
EXPO_PUBLIC_ENV=staging

# .env.production
EXPO_PUBLIC_API_BASE=https://api.e-code.app/api
EXPO_PUBLIC_ENV=production
```

Load with `dotenv`:
```bash
# Install dotenv-cli
npm install -g dotenv-cli

# Use specific env file
dotenv -e .env.staging npm start
```

## Support

If you encounter configuration issues:

1. Check the console logs for detailed error messages
2. Verify your environment variables are set correctly
3. Review this document for common patterns
4. Check `mobile/app.config.js` for build-time validation
5. Check `mobile/src/services/config.ts` for runtime validation

The configuration is designed to **fail fast** and provide **clear error messages** to prevent silent failures in production.
