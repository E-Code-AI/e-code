# Single-Port Architecture Diagram

## Before: Multi-Port Architecture (Incompatible with Replit Deploy)

```
┌─────────────────────────────────────────────────────────┐
│                    External Network                      │
└─────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
   Port 3100             Port 5000             Port 8080/8081
┌─────────────┐      ┌─────────────┐      ┌─────────────────┐
│   Preview   │      │    Main     │      │  Go / Python    │
│   Server    │      │   Express   │      │    Services     │
│  (Express)  │      │   Server    │      │                 │
└─────────────┘      └─────────────┘      └─────────────────┘
  
❌ Issues:
  - Multiple external ports required
  - Wildcard subdomains needed
  - Complex SSL certificate management
  - Not compatible with Replit Deploy
```

## After: Single-Port Architecture (Replit Deploy Compatible)

```
┌─────────────────────────────────────────────────────────┐
│                    External Network                      │
│                  (Replit Deploy: Port 80)                │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
                         Port 5000
┌─────────────────────────────────────────────────────────┐
│              Main Express Server ($PORT)                 │
│                                                           │
│  Path-Based Reverse Proxy:                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │  /                    → Main App                │   │
│  │  /preview/:id/:port/* → Preview Services (8000+)│   │
│  │  /polyglot/go/*       → Go Runtime (8080)       │   │
│  │  /polyglot/python/*   → Python ML (8081)        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                           │
│  ✅ WebSocket Support Enabled                           │
│  ✅ Security Middleware Applied                         │
│  ✅ Single SSL Certificate                              │
└─────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
   127.0.0.1:8000+     127.0.0.1:8080      127.0.0.1:8081
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Preview Apps   │  │   Go Runtime    │  │   Python ML     │
│  (Dynamic Ports)│  │   Service       │  │   Service       │
│  - Port 8000    │  │  - Containers   │  │  - AI/ML        │
│  - Port 8001    │  │  - File Ops     │  │  - Analysis     │
│  - Port 8002    │  │  - WebSocket    │  │  - Processing   │
│  - ...          │  │  - Terminal     │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
   (localhost only)     (localhost only)     (localhost only)

✅ Benefits:
  - Single external port (80/443)
  - No wildcard subdomains needed
  - Simple SSL management
  - Compatible with Replit Deploy
  - Internal services secured
  - WebSocket support maintained
```

## Request Flow Examples

### Example 1: Preview Service Access

```
Client Request:
  https://e-code.ai/preview/123/8000/index.html
         │
         ▼
  Main Server (Port 5000)
  - Parse: projectId=123, port=8000, path=/index.html
  - Validate: Project exists and port is exposed
  - Health Check: Port 8000 is healthy
         │
         ▼
  Reverse Proxy:
  - Target: http://127.0.0.1:8000
  - Path Rewrite: /preview/123/8000/index.html → /index.html
  - Forward request with proper headers
         │
         ▼
  Preview Service (127.0.0.1:8000)
  - Serve index.html
         │
         ▼
  Response flows back through proxy to client
```

### Example 2: Go Runtime WebSocket

```
Client WebSocket:
  wss://e-code.ai/polyglot/go/ws?type=terminal
         │
         ▼
  Main Server (Port 5000)
  - Detect WebSocket upgrade request
  - Path: /polyglot/go/ws
         │
         ▼
  WebSocket Proxy:
  - Target: ws://127.0.0.1:8080
  - Path Rewrite: /polyglot/go/ws → /ws
  - Upgrade connection and maintain tunnel
         │
         ▼
  Go Runtime Service (127.0.0.1:8080)
  - Handle WebSocket connection
  - Terminal session established
         │
         ▼
  Bidirectional WebSocket communication maintained
```

### Example 3: Python ML Service

```
Client Request:
  POST https://e-code.ai/polyglot/python/ai/completion
  Body: { "prompt": "Generate code...", "model": "gpt-4o" }
         │
         ▼
  Main Server (Port 5000)
  - Path: /polyglot/python/ai/completion
  - Apply security middleware
  - Apply rate limiting
         │
         ▼
  HTTP Proxy:
  - Target: http://127.0.0.1:8081
  - Path Rewrite: /polyglot/python/ai/completion → /ai/completion
  - Forward POST request with body
         │
         ▼
  Python ML Service (127.0.0.1:8081)
  - Process AI completion request
  - Return response
         │
         ▼
  Response flows back through proxy to client
```

## Security Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Internet (Public)                       │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Firewall/SSL   │
                    │   Port 80/443   │
                    └─────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│              Main Express Server (5000)                  │
│                                                           │
│  Security Layers:                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 1. Helmet (Security Headers)                    │   │
│  │ 2. Rate Limiting                                │   │
│  │ 3. Input Sanitization                           │   │
│  │ 4. Authentication                               │   │
│  │ 5. CORS Policy                                  │   │
│  │ 6. Request Validation                           │   │
│  └─────────────────────────────────────────────────┘   │
│                                                           │
│  Then Forward to Internal Services                      │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Localhost      │
                    │  (127.0.0.1)     │
                    │  Firewall: Drop  │
                    │  External Access │
                    └─────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
   Port 8000+            Port 8080            Port 8081
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Preview   │      │ Go Runtime  │      │  Python ML  │
│  Services   │      │   Service   │      │   Service   │
│  (Internal) │      │  (Internal) │      │  (Internal) │
└─────────────┘      └─────────────┘      └─────────────┘

✅ Security Benefits:
  - Single entry point for all traffic
  - All requests pass through security middleware
  - Internal services not accessible from internet
  - Reduced attack surface
  - Centralized authentication and authorization
  - Unified logging and monitoring
```

## Implementation Details

### Path Rewrite Logic

```typescript
// Preview Service: /preview/123/8000/api/data → http://127.0.0.1:8000/api/data
pathRewrite: {
  [`^/preview/${projectId}/${port}`]: ''
}

// Go Runtime: /polyglot/go/health → http://127.0.0.1:8080/health
pathRewrite: {
  '^/polyglot/go': ''
}

// Python ML: /polyglot/python/ai/completion → http://127.0.0.1:8081/ai/completion
pathRewrite: {
  '^/polyglot/python': ''
}
```

### WebSocket Upgrade Handling

```typescript
// Proxy configuration with WebSocket support
createProxyMiddleware({
  target: 'http://127.0.0.1:8080',
  ws: true,  // Enable WebSocket proxying
  changeOrigin: true,
  pathRewrite: { '^/polyglot/go': '' },
  onProxyReqWs: (proxyReq, req, socket, options, head) => {
    // WebSocket upgrade handling
  }
})
```

## Deployment Comparison

### Development Mode

```bash
npm run dev
# Starts on http://localhost:5000
# All services accessible:
# - http://localhost:5000/                      → Main app
# - http://localhost:5000/preview/123/8000/     → Preview
# - http://localhost:5000/polyglot/go/health    → Go runtime
# - http://localhost:5000/polyglot/python/health → Python ML
```

### Production (Replit Deploy)

```bash
npm run build && npm run start
# Deployed at https://e-code.ai
# All services accessible:
# - https://e-code.ai/                      → Main app
# - https://e-code.ai/preview/123/8000/     → Preview
# - https://e-code.ai/polyglot/go/health    → Go runtime
# - https://e-code.ai/polyglot/python/health → Python ML
```

## Monitoring and Health Checks

```
Health Check Endpoints:

Main Server:
  GET https://e-code.ai/api/monitoring/health
  Response: { status: 'healthy', services: [...] }

Go Runtime (via proxy):
  GET https://e-code.ai/polyglot/go/health
  Response: { status: 'healthy', service: 'go-runtime', ... }

Python ML (via proxy):
  GET https://e-code.ai/polyglot/python/health
  Response: { status: 'healthy', service: 'python-ml', ... }

Preview Services (dynamic):
  GET https://e-code.ai/api/preview/:projectId/health
  Response: { status: 'running', ports: [8000, 8001], ... }
```

## Summary

The single-port architecture successfully:
- ✅ Consolidates all services behind one external port
- ✅ Maintains WebSocket functionality
- ✅ Enhances security through centralized middleware
- ✅ Simplifies deployment and SSL management
- ✅ Enables Replit Deploy compatibility
- ✅ Preserves all existing features and functionality
