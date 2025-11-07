# CORS Configuration Guide

## Overview

The E-Code Platform implements strict Cross-Origin Resource Sharing (CORS) security to prevent unauthorized access to authenticated APIs. This document explains the CORS configuration, required environment variables, and security best practices.

## Security Model

### Production (NODE_ENV=production)

**CRITICAL:** Production environments **MUST** have explicit CORS origins configured. The server will **fail fast** (exit immediately) if no origins are configured in production.

**Security Features:**
- ✅ Explicit origin whitelist only (no wildcards)
- ✅ Rejects requests without Origin header
- ✅ No automatic Replit domain allowance
- ✅ Fails fast when misconfigured
- ✅ Logs all rejected origins for security monitoring

### Development (NODE_ENV=development)

**Convenience Features:**
- ✅ Automatically allows localhost origins
- ✅ Auto-allows Replit deployment domains
- ✅ Allows requests without Origin header (for testing)
- ⚠️ More permissive for rapid development

## Required Environment Variables

### Production Requirements

At least **one** of the following must be configured:

#### ALLOWED_ORIGINS
Comma-separated list of allowed origins. **Most secure option.**

```bash
ALLOWED_ORIGINS=https://app.example.com,https://www.example.com,https://admin.example.com
```

#### APP_URL
The public URL of your application.

```bash
APP_URL=https://myapp.replit.app
```

#### FRONTEND_URL
The URL of your frontend application (if separate from backend).

```bash
FRONTEND_URL=https://frontend.example.com
```

### Development Environment Variables

These are **automatically** allowed in development:

- `REPL_SLUG` + `REPL_OWNER` → Generates Replit deployment URLs
- `REPLIT_DEV_DOMAIN` → Replit development domain
- Localhost origins: `http://localhost:*`, `http://127.0.0.1:*`

## Configuration Examples

### Example 1: Single Production Domain

```bash
NODE_ENV=production
APP_URL=https://myapp.replit.app
```

This configuration:
- ✅ Allows requests from `https://myapp.replit.app`
- ❌ Rejects all other origins
- ❌ Rejects requests without Origin header

### Example 2: Multiple Production Domains

```bash
NODE_ENV=production
ALLOWED_ORIGINS=https://app.example.com,https://www.example.com,https://api.example.com
```

This configuration:
- ✅ Allows requests from all three specified domains
- ❌ Rejects all other origins
- ❌ Rejects requests without Origin header

### Example 3: Development Mode

```bash
NODE_ENV=development
REPL_SLUG=e-code-platform
REPL_OWNER=youruser
```

This configuration **automatically** allows:
- ✅ `https://e-code-platform-youruser.replit.app`
- ✅ `https://e-code-platform.youruser.repl.co`
- ✅ `http://localhost:3000`, `http://localhost:5000`, `http://localhost:5173`
- ✅ `http://127.0.0.1:3000`, `http://127.0.0.1:5000`, `http://127.0.0.1:5173`
- ✅ Requests without Origin header (for testing)

## Security Features

### 1. Fail-Fast Production Validation

If production starts without CORS configuration, you'll see:

```
════════════════════════════════════════════════════════════════
  CRITICAL: CORS CONFIGURATION MISSING IN PRODUCTION
════════════════════════════════════════════════════════════════

Production environments MUST have explicit CORS origins configured.
Configure at least one of the following environment variables:

  • ALLOWED_ORIGINS - Comma-separated list of allowed origins
    Example: ALLOWED_ORIGINS=https://app.example.com,https://www.example.com

  • APP_URL - The public URL of your application
    Example: APP_URL=https://myapp.replit.app

  • FRONTEND_URL - The URL of your frontend application
    Example: FRONTEND_URL=https://frontend.example.com

SECURITY: Without explicit origins, authenticated APIs would be
exposed to arbitrary origins, allowing CSRF attacks.

════════════════════════════════════════════════════════════════
```

**The server will exit immediately and refuse to start.**

### 2. Origin Validation

Every request is validated:

```javascript
// Allowed origin
Origin: https://app.example.com
→ Request allowed ✓

// Unauthorized origin
Origin: https://evil.com
→ 500 Error: "Not allowed by CORS"
→ Logged: [CORS] Rejected unauthorized origin: https://evil.com

// No origin (production)
→ 500 Error: "Origin required in production"
→ Logged: [CORS] Rejected request with no origin (production mode)
```

### 3. CSRF Integration

CORS configuration includes CSRF token support:

```javascript
exposedHeaders: [
  'X-Total-Count',
  'X-Page',
  'X-Per-Page',
  'X-CSRF-Token'  // ← CSRF token exposed to client
]
```

This allows clients to read the `X-CSRF-Token` header for subsequent requests.

### 4. Credentials Support

```javascript
credentials: true  // Allow cookies and authorization headers
```

This enables:
- Session cookies
- JWT tokens in Authorization header
- CSRF tokens in custom headers

### 5. Insecure HTTP Warning

If you configure an insecure HTTP origin in production:

```bash
ALLOWED_ORIGINS=http://insecure.example.com
```

You'll receive a warning:

```
[CORS WARNING] Insecure HTTP origin in production: http://insecure.example.com
[CORS WARNING] Consider using HTTPS for security
```

**Note:** Localhost HTTP is exempt from this warning.

## Testing CORS Configuration

### Health Check Endpoint

Use the CORS health check endpoint to verify configuration:

```bash
curl http://localhost:5000/api/cors-health
```

Response:
```json
{
  "status": "healthy",
  "message": "CORS properly configured for production",
  "origins": [
    "https://app.example.com",
    "https://www.example.com"
  ],
  "environment": "production"
}
```

### Integration Tests

Run the CORS integration test:

```bash
node server/__tests__/cors-integration.test.js
```

This tests:
- ✅ No-origin request handling
- ✅ Localhost origin (dev vs prod)
- ✅ Unauthorized origin rejection
- ✅ CORS headers include CSRF token
- ✅ Credentials support

### Manual Testing

Test with curl:

```bash
# Test allowed origin
curl -H "Origin: https://app.example.com" \
     http://localhost:5000/api/health \
     -v

# Test unauthorized origin
curl -H "Origin: https://evil.com" \
     http://localhost:5000/api/health \
     -v
```

## Migration Guide

### From Wildcard (*) to Explicit Origins

**Before (INSECURE):**
```javascript
origin: '*'  // ❌ Allows ANY origin
```

**After (SECURE):**
```bash
# Configure explicit origins
ALLOWED_ORIGINS=https://myapp.replit.app,https://www.myapp.com
```

### From Auto-Allow Replit Domains

**Before (INSECURE in production):**
```javascript
// Always allowed .repl.co and .replit.app domains
```

**After (SECURE):**
```bash
# Development: Auto-allowed ✓
NODE_ENV=development

# Production: Must be explicit
NODE_ENV=production
APP_URL=https://myapp.replit.app
```

## Troubleshooting

### Server Won't Start in Production

**Error:** "CRITICAL: CORS CONFIGURATION MISSING IN PRODUCTION"

**Solution:** Configure at least one origin:
```bash
export APP_URL=https://myapp.replit.app
```

### Browser Requests Blocked

**Error:** "Not allowed by CORS"

**Solution:** Add your frontend origin to `ALLOWED_ORIGINS`:
```bash
export ALLOWED_ORIGINS=https://frontend.example.com,https://app.example.com
```

### Health Checks Failing

**Error:** "Origin required in production"

**Solution:** Health check endpoints should not send an Origin header. If using a monitoring service, configure it to omit the Origin header or add its IP/domain to allowed origins.

### Development Requests Blocked

**Error:** "Not allowed by CORS" for localhost

**Solution:** Ensure `NODE_ENV=development`:
```bash
export NODE_ENV=development
```

## Best Practices

1. **Always use HTTPS in production** (except localhost)
2. **Use specific origins**, not wildcards
3. **Regularly audit** allowed origins
4. **Monitor CORS logs** for rejected origins
5. **Test CORS** before deploying to production
6. **Use environment variables** for configuration
7. **Never hardcode** production origins in code

## Security Checklist

- [ ] Production has explicit CORS origins configured
- [ ] No wildcard (`*`) origins in production
- [ ] All production origins use HTTPS
- [ ] CORS health check returns valid configuration
- [ ] Integration tests pass
- [ ] Unauthorized origins are rejected
- [ ] CSRF tokens are exposed in headers
- [ ] Credentials are properly supported

## References

- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [OWASP: CORS Security](https://owasp.org/www-community/attacks/csrf)
- [Express CORS Middleware](https://expressjs.com/en/resources/middleware/cors.html)
