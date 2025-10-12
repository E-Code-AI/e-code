# Live Preview System

E-Code provides a powerful live preview system that allows you to instantly view and test your applications during development. The system automatically detects your project type and configures the appropriate preview environment.

## Features

### Multi-Port Support
- **Automatic Port Detection**: The system detects multiple services in your project (e.g., frontend on port 3000, API on port 8000)
- **Port Switching**: Easily switch between different services using the port selector
- **Health Monitoring**: Real-time health checks ensure all services are responsive
- **Service Labels**: Each port is labeled with its service type (Frontend, API, Database, etc.)

### Device Emulation
- **Responsive Testing**: Test your applications on different screen sizes
- **Device Presets**: 
  - Desktop (100% viewport)
  - Tablet (768×1024, landscape 1024×768)
  - Mobile (375×667, iPhone 8 size)
  - Mobile XL (414×896, iPhone 11 size)
- **Persistent Preferences**: Device selections are saved per project

### Framework Support
The preview system automatically detects and configures environments for:

#### Frontend Frameworks
- **React** (Create React App, Vite, Next.js)
- **Vue** (Vue CLI, Vite, Nuxt.js)
- **Angular** (Angular CLI)
- **Static HTML** (Plain HTML, CSS, JavaScript)

#### Backend Frameworks
- **Node.js** (Express, Fastify, Koa)
- **Python** (Flask, Django, FastAPI)
- **Static Files** (HTTP server for assets)

### Developer Tools
- **Eruda Integration**: Mobile-friendly developer tools for debugging
- **Console Access**: View logs and errors directly in the preview
- **Network Inspection**: Monitor API calls and responses
- **Element Inspector**: Inspect HTML elements and styles

## Domain Configuration

### Development Environment
For local development, previews are accessible at:
```
http://localhost:[port]
http://127.0.0.1:[port]
```

### Production Environment (Replit Deploy)

**Important**: Replit Deploy uses a **single external port** architecture. Preview URLs use **path-based routing** instead of wildcard subdomains.

#### Preview URL Scheme
Previews are accessed via path-based routing on the main domain:
```
https://e-code.ai/preview/:projectId/:port/
```

Examples:
- Frontend (port 3000): `https://e-code.ai/preview/123/3000/`
- API (port 8000): `https://e-code.ai/preview/123/8000/`
- WebSocket: `wss://e-code.ai/ws/preview/123/3000/`

#### WebSocket Preview Access
WebSocket connections for previews use the `/ws/preview/` path:
```
wss://e-code.ai/ws/preview/:projectId/:port/
```

This allows real-time communication with preview instances running on different ports.

## API Reference

### Start Preview
```javascript
POST /api/projects/{id}/preview/start
{
  "runId": "optional-custom-run-id"
}
```

### Get Preview Status
```javascript
GET /api/projects/{id}/preview/status
Response:
{
  "status": "running",
  "runId": "run-123-456",
  "ports": [3000, 8000],
  "primaryPort": 3000,
  "services": [
    {
      "port": 3000,
      "name": "React App",
      "description": "Main frontend application"
    },
    {
      "port": 8000,
      "name": "API Server",
      "path": "/api",
      "description": "Backend API endpoints"
    }
  ],
  "healthChecks": {
    "3000": true,
    "8000": true
  },
  "frameworkType": "react",
  "lastHealthCheck": "2025-01-15T10:30:00Z"
}
```

### Switch Port
```javascript
POST /api/projects/{id}/preview/switch-port
{
  "port": 8000
}
```

### Stop Preview
```javascript
POST /api/projects/{id}/preview/stop
```

## WebSocket Events

The preview system uses WebSocket for real-time updates:

### Client Events
- `preview:subscribe` - Subscribe to project updates
- `preview:unsubscribe` - Unsubscribe from updates

### Server Events
- `preview:start` - Preview server starting
- `preview:ready` - Preview server ready
- `preview:stop` - Preview server stopped
- `preview:error` - Error occurred
- `preview:log` - Log message from service
- `preview:port-switch` - Port switched
- `preview:health-check-failed` - Service health check failed

## Security

### Preview Isolation
- Each preview runs in an isolated process
- No cross-project access
- Scoped environment variables
- Resource limits enforced

### Access Control
- **Public Projects**: Anyone can view previews
- **Private Projects**: Only project collaborators can access
- **Authentication**: Required for private project previews

## Troubleshooting

### Common Issues

#### Preview Won't Start
1. **Check Project Files**: Ensure your project has runnable files (package.json, index.html, main.py)
2. **Port Conflicts**: If default ports are occupied, the system will attempt alternative ports
3. **Dependencies**: For Node.js projects, ensure package.json has valid dependencies
4. **Permissions**: Check file permissions in your project directory

#### Service Not Responding
1. **Health Checks**: Monitor the health indicators in the port selector
2. **Logs**: Check the browser console for service logs
3. **Port Configuration**: Ensure your application listens on the correct port
4. **CORS Issues**: Add appropriate CORS headers for cross-origin requests

#### SSL/TLS Issues (Replit Production)
1. **HTTPS Required**: Replit automatically provides SSL/TLS for deployed apps
2. **WebSocket Secure**: Use `wss://` protocol for WebSocket connections
3. **Mixed Content**: Ensure all preview resources use HTTPS
4. **Certificate Trust**: Replit-provided certificates are trusted by all browsers

### Debug Commands

#### Check Preview Service Status
```bash
# Development
curl http://localhost:3000/api/projects/123/preview/status

# Production (Replit)
curl https://e-code.ai/api/projects/123/preview/status
```

#### Test Preview URL Access
```bash
# Test specific preview port
curl https://e-code.ai/preview/123/3000/

# Test WebSocket preview connection
wscat -c wss://e-code.ai/ws/preview/123/3000/
```

#### Test Port Connectivity (Development)
```bash
# Test specific port
nc -zv localhost 3000

# Test all common ports
for port in 3000 8000 8080 5000; do
  nc -zv localhost $port
done
```

#### Monitor WebSocket Connection
```javascript
// In browser console
const ws = new WebSocket('wss://e-code.ai/ws/preview/123/3000/');
ws.onmessage = (event) => console.log('WS:', JSON.parse(event.data));
```

## Performance Optimization

### Resource Limits
Each preview container has resource limits:
- **CPU**: 1 core maximum
- **Memory**: 512MB maximum
- **Disk**: 1GB maximum
- **Network**: 100Mbps maximum

### Auto-Scaling
- Previews automatically stop after 30 minutes of inactivity
- Health checks run every 30 seconds
- Failed services are automatically restarted (up to 3 attempts)

### Caching
- Static assets are cached for 1 hour
- Preview containers are reused when possible
- Framework detection results are cached

## Best Practices

### Project Structure
```
my-project/
├── package.json          # Node.js dependencies
├── requirements.txt      # Python dependencies
├── public/              # Static assets
├── src/                 # Source code
└── README.md           # Project documentation
```

### Environment Configuration
Use environment variables for configuration:
```javascript
// React/Vite
VITE_API_URL=http://localhost:8000/api

// Node.js
PORT=3000
API_PORT=8000
```

### Framework-Specific Tips

#### React
- Use `VITE_PORT` or `PORT` environment variable
- Ensure dev server binds to `0.0.0.0` for container access
- Configure proxy for API calls in development

#### Vue
- Use `vite.config.js` to configure dev server
- Set `host: true` for external access
- Configure CORS for API integration

#### Python
- Use `app.run(host='0.0.0.0', port=port)` for Flask
- Configure CORS headers for cross-origin requests
- Use requirements.txt for dependency management

## Migration Guide

### From Legacy Preview System
1. **Update API Calls**: Replace old preview endpoints with new multi-port APIs
2. **WebSocket Events**: Update event handlers for new event structure
3. **Port Handling**: Modify frontend to handle multiple ports
4. **Error Handling**: Implement new error states and health checks

### Breaking Changes
- Preview URLs now include port numbers for multi-service projects
- WebSocket event structure has changed
- Health check endpoints are now required
- Old single-port preview URLs are deprecated

## Support

For issues or questions about the preview system:
1. Check this documentation
2. Review project logs in the preview panel
3. Test with a minimal project to isolate issues
4. Contact support with specific error messages and project details