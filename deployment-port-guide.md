# E-Code Platform Port Configuration Guide

## Port Mapping Explained

### Development Environment
- **Application**: Runs on `http://localhost:5000`
- **Preview Server**: Runs on `http://localhost:3100`
- **MCP Server**: Runs on `http://localhost:3200`

### Production Environment (Docker)

#### Standard HTTP Deployment
```bash
# Application accessible on port 80 (standard HTTP)
docker-compose -f docker-compose.production.yml up -d
```
- **External Access**: `http://yourdomain.com` (port 80)
- **Internal Port**: Application runs on port 5000 inside container
- **Port Mapping**: `80:5000` (external:internal)

#### Why Port 80?
1. **Standard HTTP Port**: No need to specify port in URL
2. **User-Friendly**: Users can access via `http://yourdomain.com` instead of `http://yourdomain.com:5000`
3. **SEO & Compatibility**: Better for search engines and third-party integrations
4. **Security**: Can add SSL/TLS termination at port 443

### Port Configuration Details

| Service | Internal Port | External Port | Purpose |
|---------|--------------|---------------|---------|
| Node.js App | 5000 | 80 | Main application |
| PostgreSQL | 5432 | - | Database (not exposed) |
| Redis | 6379 | - | Cache (not exposed) |
| MCP Server | 3200 | - | AI Protocol (internal) |

### Quick Deployment Commands

```bash
# Build and run in production mode
docker-compose -f docker-compose.production.yml up -d

# View logs
docker-compose -f docker-compose.production.yml logs -f app

# Stop services
docker-compose -f docker-compose.production.yml down

# Rebuild after code changes
docker-compose -f docker-compose.production.yml up -d --build
```

### Environment Variables
Create a `.env` file with:
```env
# Application
NODE_ENV=production
PORT=5000
SESSION_SECRET=your-secret-key

# Database
DATABASE_URL=postgresql://user:password@postgres:5432/ecode
PGDATABASE=ecode
PGUSER=ecode_user
PGPASSWORD=your-db-password

# Redis
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=your-redis-password

# AI Integration
ANTHROPIC_API_KEY=your-anthropic-key
```

### SSL/HTTPS Configuration
For HTTPS (port 443), use a reverse proxy like Nginx or Traefik, or deploy to a platform that handles SSL termination (Google Cloud Run, AWS ECS, etc.)

### Platform-Specific Deployments

#### Google Cloud Run
Cloud Run automatically handles port mapping. Just ensure:
- Application listens on `PORT` environment variable
- Dockerfile exposes port 5000
- Cloud Run will map it to port 80/443 automatically

#### AWS ECS
Configure task definition with:
```json
"portMappings": [
  {
    "containerPort": 5000,
    "hostPort": 80,
    "protocol": "tcp"
  }
]
```

#### Kubernetes
Use a Service to expose the deployment:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: ecode-service
spec:
  type: LoadBalancer
  ports:
    - port: 80
      targetPort: 5000
  selector:
    app: ecode
```