# E-Code Platform - Single-Port Architecture for Replit Deploy

## Overview

The E-Code platform now uses a **single-port architecture** optimized for Replit Deploy. All services are accessed through the main port (5000, mapped to external port 80) using path-based routing and reverse proxying.

## Architecture

### Single External Port
- **External Port**: 80 (HTTPS: 443)
- **Internal Port**: 5000 (or `$PORT` environment variable)
- **All services**: Accessible through the main port via path-based routing

### Internal Services
While the platform exposes only one external port, it runs multiple internal services on localhost:
- **Main Express Server**: Port 5000 (or `$PORT`)
- **Go Runtime Service**: Port 8080 (internal only)
- **Python ML Service**: Port 8081 (internal only)
- **Preview Services**: Ports 8000+ (internal only, dynamically allocated)

## Path-Based Routing

All services are accessed through the main port using specific path prefixes:

### Main Application
- **Path**: `/`
- **Description**: Main web application, API endpoints, authentication

### Preview Services
- **Path**: `/preview/:projectId/:port/*`
- **Target**: `http://127.0.0.1:<port>`
- **Description**: Multi-port preview for user projects
- **WebSocket**: Supported (for HMR, live reload)
- **Example**: `/preview/123/8000/` → `http://127.0.0.1:8000/`

### Go Runtime Service
- **Path**: `/polyglot/go/*`
- **Target**: `http://127.0.0.1:8080`
- **Description**: Container orchestration, file operations, WebSocket
- **WebSocket**: Supported (for terminal, collaboration)
- **Example**: `/polyglot/go/health` → `http://127.0.0.1:8080/health`

### Python ML Service
- **Path**: `/polyglot/python/*`
- **Target**: `http://127.0.0.1:8081`
- **Description**: AI/ML operations, data processing
- **Example**: `/polyglot/python/ai/completion` → `http://127.0.0.1:8081/ai/completion`

## WebSocket Support

The reverse proxy supports WebSocket connections for real-time features:

### Preview WebSockets
```javascript
// Connect to preview server WebSocket
const ws = new WebSocket(`wss://e-code.ai/preview/123/8000/ws`);
```

### Go Runtime WebSockets
```javascript
// Connect to Go runtime terminal
const ws = new WebSocket(`wss://e-code.ai/polyglot/go/ws?projectId=123&type=terminal`);
```

## Benefits

### 1. Replit Deploy Compatibility
- Replit Deploy exposes a single external port
- No need for wildcard subdomains or multi-port configuration
- Works with custom domains (e.g., `e-code.ai`)

### 2. Simplified Networking
- Single SSL certificate for all services
- No CORS issues between services
- Easier firewall configuration

### 3. Production-Ready
- All services behind one endpoint
- Unified security and monitoring
- Better DDoS protection

### 4. Developer Experience
- Consistent URLs across environments
- Easier local development
- No port conflicts

## Implementation Details

### Server Configuration

The main Express server (`server/index.ts`) sets up proxy routes during initialization:

```typescript
// Setup preview routes
setupPreviewRoutes(app);

// Setup polyglot proxy routes
setupPolyglotProxyRoutes(app);
```

### Preview Service Proxy

The preview service registers routes on the main Express app:

```typescript
// /preview/:projectId/:port/* → http://127.0.0.1:<port>
app.use('/preview/:projectId/:port/*', proxyMiddleware({
  target: `http://127.0.0.1:${port}`,
  ws: true, // WebSocket support
  changeOrigin: true,
  pathRewrite: { '^/preview/:projectId/:port': '' }
}));
```

### Polyglot Service Proxy

Polyglot services are proxied through dedicated paths:

```typescript
// /polyglot/go/* → http://127.0.0.1:8080
// /polyglot/python/* → http://127.0.0.1:8081
```

## Migration from Multi-Port

### Before (Multi-Port)
```
http://localhost:3100 → Preview Server
http://localhost:5000 → Main Server
http://localhost:8080 → Go Runtime
http://localhost:8081 → Python ML
```

### After (Single-Port)
```
http://localhost:5000/                    → Main Server
http://localhost:5000/preview/:id/:port/* → Preview Services
http://localhost:5000/polyglot/go/*       → Go Runtime
http://localhost:5000/polyglot/python/*   → Python ML
```

## Security Considerations

### Internal Services
- Go Runtime (8080) and Python ML (8081) are only accessible on `127.0.0.1`
- Not exposed to external network
- Only accessible through the reverse proxy

### Preview Services
- Dynamically allocated ports (8000+)
- Bound to `localhost` only
- Proxied through authenticated routes

### Middleware
All security middleware from the main server applies to proxied services:
- Rate limiting
- Authentication
- Input sanitization
- CORS policies
- Security headers

## Deployment Configuration

### .replit Configuration
```toml
[deployment]
deploymentTarget = "autoscale"
build = ["npm", "run", "build"]
run = ["npm", "run", "start"]

# Single port configuration
[[ports]]
localPort = 5000
externalPort = 80
```

### Environment Variables
```bash
PORT=5000                    # Main server port (Replit provides this)
NODE_ENV=production         # Production mode
GO_RUNTIME_PORT=8080        # Internal Go service port
PYTHON_ML_PORT=8081         # Internal Python service port
```

## Testing

### Local Development
```bash
npm run dev
# Server starts on port 5000
# All services accessible through http://localhost:5000
```

### Test Preview Service
```bash
# Create a preview
curl http://localhost:5000/api/preview/start -d '{"projectId": 123}'

# Access preview through proxy
curl http://localhost:5000/preview/123/8000/
```

### Test Polyglot Services
```bash
# Go Runtime health check
curl http://localhost:5000/polyglot/go/health

# Python ML health check
curl http://localhost:5000/polyglot/python/health
```

## Troubleshooting

### Preview Not Accessible
1. Check if preview service is running: `curl http://127.0.0.1:8000`
2. Check proxy routes are registered: Look for "Preview routes registered" in logs
3. Verify project ID and port in URL

### Polyglot Service Errors
1. Check if service is running on internal port
2. Verify proxy routes: Look for "Polyglot proxy routes registered" in logs
3. Check service logs for errors

### WebSocket Connection Failed
1. Ensure `ws: true` is set in proxy configuration
2. Check WebSocket upgrade logs
3. Verify client is using correct WebSocket URL

## Performance

### Proxy Overhead
- Minimal latency (<1ms for local proxying)
- No serialization/deserialization overhead
- Direct TCP connection to internal services

### Scalability
- Replit Autoscale handles external traffic
- Internal services can be optimized independently
- Preview services use dynamic port allocation

## Future Enhancements

1. **Service Discovery**: Automatic detection of internal services
2. **Health Monitoring**: Aggregate health checks for all services
3. **Load Balancing**: Distribute preview services across multiple instances
4. **Metrics**: Unified metrics collection for all services

## Summary

The single-port architecture provides a production-ready, Replit-compatible deployment model that:
- ✅ Exposes only one external port (80/443)
- ✅ Supports WebSocket connections
- ✅ Maintains internal service isolation
- ✅ Provides path-based routing for all services
- ✅ Works with custom domains
- ✅ Simplifies deployment and security
