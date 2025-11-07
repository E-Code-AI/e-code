# Content Security Policy (CSP) Configuration Guide

## Overview

The E-Code Platform implements a strict Content Security Policy to prevent Cross-Site Scripting (XSS) attacks and other code injection vulnerabilities. The CSP configuration is **automatically** split between development and production environments.

## Security Model

### Production CSP (Strict)

**CRITICAL:** Production CSP **removes all** `unsafe-inline` and `unsafe-eval` directives to maximize security.

**Security Features:**
- ✅ **NO** `unsafe-inline` in `script-src`
- ✅ **NO** `unsafe-eval` in `script-src`
- ✅ **NO** `unsafe-inline` in `style-src`
- ✅ Nonce-based inline script/style support
- ✅ Unique nonce per request
- ✅ HTTPS upgrade for all resources
- ✅ Blocks all object sources (Flash, Java, etc.)
- ✅ Frame-ancestors set to `none`

### Development CSP (Permissive)

**Convenience Features:**
- ✅ `unsafe-inline` allowed for Hot Module Replacement (HMR)
- ✅ `unsafe-eval` allowed for development tools
- ✅ Localhost WebSocket connections for HMR
- ✅ Localhost HTTP connections for dev server

## CSP Directives Comparison

### Production Directives

```javascript
{
  defaultSrc: ["'self'"],
  scriptSrc: [
    "'self'",
    "'nonce-{{nonce}}'",  // Nonce-based inline scripts
    "https://cdn.jsdelivr.net",
    "https://cdnjs.cloudflare.com",
    "https://unpkg.com"
    // NO 'unsafe-inline' or 'unsafe-eval'
  ],
  styleSrc: [
    "'self'",
    "'nonce-{{nonce}}'",  // Nonce-based inline styles
    "https://fonts.googleapis.com",
    "https://cdn.jsdelivr.net"
    // NO 'unsafe-inline'
  ],
  objectSrc: ["'none'"],
  frameAncestors: ["'none'"],
  upgradeInsecureRequests: []
}
```

### Development Directives

```javascript
{
  scriptSrc: [
    "'self'",
    "'unsafe-inline'",    // For HMR
    "'unsafe-eval'",      // For dev tools
    "'nonce-{{nonce}}'",
    ...
  ],
  connectSrc: [
    "'self'",
    "ws://localhost:*",   // WebSocket for HMR
    "http://localhost:*", // HTTP for dev server
    ...
  ]
}
```

## Nonce-Based CSP

### What is a Nonce?

A **nonce** (number used once) is a cryptographically random value generated for each request. It allows specific inline scripts/styles while blocking all others.

### How It Works

1. **Server generates nonce** for each request (16 bytes, base64-encoded)
2. **Server includes nonce** in CSP header: `script-src 'nonce-abc123...'`
3. **HTML uses nonce** in inline script tags: `<script nonce="abc123...">`
4. **Browser allows** scripts with matching nonce, blocks all others

### Using Nonces in Your Code

The nonce is available in `res.locals.cspNonce`:

```typescript
// In route handler
app.get('/page', (req, res) => {
  const nonce = res.locals.cspNonce;
  res.render('template', { nonce });
});
```

```html
<!-- In HTML template -->
<script nonce="<%= nonce %>">
  // Inline script that will be allowed
  console.log('This works!');
</script>

<style nonce="<%= nonce %>">
  /* Inline style that will be allowed */
  .class { color: red; }
</style>
```

## Environment Configuration

### Automatic Environment Detection

The CSP configuration automatically detects the environment:

```bash
# Production (strict CSP)
NODE_ENV=production

# Development (permissive CSP)
NODE_ENV=development

# Unset (defaults to development)
# NODE_ENV not set
```

### CSP Report-Only Mode

For testing CSP changes without blocking resources:

```bash
CSP_REPORT_ONLY=true
```

This sets both `Content-Security-Policy` and `Content-Security-Policy-Report-Only` headers.

## Testing CSP Configuration

### Health Check

Inspect CSP headers manually:

```bash
curl -I http://localhost:5000/api/health
```

Look for the `Content-Security-Policy` header.

### Integration Tests

Run the CSP integration test:

```bash
node server/__tests__/csp-integration.test.cjs
```

This tests:
- ✅ CSP header presence
- ✅ No `unsafe-inline` in production
- ✅ No `unsafe-eval` in production
- ✅ Nonce support
- ✅ Critical directives present
- ✅ Unique nonces per request

### Unit Tests

Run the CSP unit tests:

```bash
npm test -- csp-security.test.ts
```

This tests:
- ✅ Production directive validation
- ✅ Development directive validation
- ✅ Environment-based selection
- ✅ CSP header building
- ✅ Nonce replacement
- ✅ **Regression prevention** (blocks reintroduction of unsafe directives)

## Migration Guide

### From Unsafe CSP to Nonce-Based CSP

**Before (INSECURE):**
```html
<script>
  // Inline script
  console.log('Hello');
</script>
```

**After (SECURE):**
```html
<script nonce="<%= nonce %>">
  // Inline script with nonce
  console.log('Hello');
</script>
```

### Converting Inline Styles

**Before (INSECURE):**
```html
<style>
  .class { color: red; }
</style>
```

**After (SECURE):**
```html
<style nonce="<%= nonce %>">
  .class { color: red; }
</style>
```

### Alternative: External Files

Instead of inline scripts/styles, use external files:

```html
<!-- External script (no nonce needed) -->
<script src="/js/app.js"></script>

<!-- External stylesheet (no nonce needed) -->
<link rel="stylesheet" href="/css/app.css">
```

## CSP Violation Reporting

### Report Endpoint

CSP violations are reported to: `/api/security/csp-report`

Implement the endpoint to log violations:

```typescript
app.post('/api/security/csp-report', (req, res) => {
  const report = req.body['csp-report'];
  
  logger.warn('CSP Violation', {
    blockedUri: report['blocked-uri'],
    violatedDirective: report['violated-directive'],
    documentUri: report['document-uri']
  });
  
  res.status(204).end();
});
```

### Monitoring Violations

In production, monitor CSP reports to:
- Identify XSS attempts
- Find legitimate resources being blocked
- Adjust CSP policy as needed

## Troubleshooting

### Inline Scripts Blocked

**Error:** "Refused to execute inline script because it violates CSP"

**Solution:** Add nonce to the script tag:
```html
<script nonce="<%= nonce %>">...</script>
```

### External Scripts Blocked

**Error:** "Refused to load script from 'https://example.com/script.js'"

**Solution:** Add the domain to `scriptSrc` in production config:
```typescript
scriptSrc: [
  "'self'",
  "'nonce-{{nonce}}'",
  "https://example.com"  // Add allowed domain
]
```

### Styles Not Loading

**Error:** "Refused to apply inline style"

**Solution:** Add nonce to the style tag:
```html
<style nonce="<%= nonce %>">...</style>
```

### Development CSP Too Strict

**Issue:** HMR not working in development

**Solution:** Ensure `NODE_ENV=development` is set:
```bash
export NODE_ENV=development
```

## Security Best Practices

1. **Never use `unsafe-inline` in production** - Use nonces instead
2. **Never use `unsafe-eval` in production** - Refactor code to avoid eval()
3. **Monitor CSP reports** - Track violations to identify attacks
4. **Test before deploying** - Run CSP tests in staging
5. **Keep CSP strict** - Only allow necessary sources
6. **Use HTTPS** - Upgrade all resources to HTTPS
7. **Review regularly** - Audit CSP policy quarterly

## Security Checklist

- [ ] Production CSP does NOT contain `unsafe-inline`
- [ ] Production CSP does NOT contain `unsafe-eval`
- [ ] All inline scripts use nonces
- [ ] All inline styles use nonces
- [ ] Nonces are unique per request
- [ ] CSP integration tests pass
- [ ] CSP unit tests pass
- [ ] CSP violation reporting configured
- [ ] Monitoring alerts set up for violations

## References

- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- [OWASP: CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [CSP Level 3 Specification](https://www.w3.org/TR/CSP3/)
