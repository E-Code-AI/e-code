# E-Code Platform - Deployment Guide

This guide covers deploying E-Code to different environments.

## Deployment Options

| Environment | Docker Mode | Configuration File |
|-------------|-------------|-------------------|
| Development | DooD (socket) | `docker-compose.yml` |
| Production (VM) | DinD (TLS) | `docker-compose.prod.yml` |
| Replit Reserved VM | DooD (socket) | `docker-compose.replit-vm.yml` |
| Kubernetes | K8s Orchestrator | See K8s section |

## Quick Start

### Option 1: Replit Reserved VM (Recommended)

```bash
# 1. Set environment variables
export DATABASE_URL="postgresql://..."
export REDIS_PASSWORD="your-redis-password"
export SESSION_SECRET="your-session-secret"
export ANTHROPIC_API_KEY="your-api-key"
# ... other API keys

# 2. Deploy
docker-compose -f docker-compose.replit-vm.yml up -d

# 3. View logs
docker-compose -f docker-compose.replit-vm.yml logs -f app
```

### Option 2: Standard VM with Docker-in-Docker

```bash
# 1. Set environment variables
export POSTGRES_PASSWORD="secure-password"
export REDIS_PASSWORD="secure-password"
export ANTHROPIC_API_KEY="your-api-key"

# 2. Deploy with DinD (more isolated)
docker-compose -f docker-compose.prod.yml up -d
```

## Docker Socket Configuration

### Docker-outside-of-Docker (DooD)

Used in: `docker-compose.yml`, `docker-compose.replit-vm.yml`

The host Docker socket is mounted into the container:

```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock
```

**Pros:**
- Simple configuration
- Shares images with host (faster startup)
- Lower resource usage

**Cons:**
- Less isolation
- Container has access to all host containers

**Permissions:** The container must run as root to access the Docker socket:
```yaml
# All docker-compose files are configured with:
services:
  app:
    user: root
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```

```bash
# Verify socket permissions on host
ls -la /var/run/docker.sock
# Should show: srw-rw---- 1 root docker ...
```

### Docker-in-Docker (DinD)

Used in: `docker-compose.prod.yml`

A separate Docker daemon runs inside a privileged container:

```yaml
services:
  docker:
    image: docker:24-dind
    privileged: true
    environment:
      - DOCKER_TLS_CERTDIR=/certs
```

The app connects via TLS:

```yaml
environment:
  - DOCKER_HOST=tcp://docker:2376
  - DOCKER_TLS_VERIFY=1
  - DOCKER_CERT_PATH=/certs/client
volumes:
  - docker-certs-client:/certs/client:ro
```

**Pros:**
- Better isolation
- Secure TLS communication
- Independent image cache

**Cons:**
- Higher resource usage
- Slower initial image pulls

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Express session encryption key |
| `REDIS_PASSWORD` | Redis authentication password |

### AI Providers

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Claude API key |
| `OPENAI_API_KEY` | GPT API key |
| `GEMINI_API_KEY` | Google Gemini API key |
| `XAI_API_KEY` | Grok API key |
| `MOONSHOT_API_KEY` | Kimi API key |

### Payments & Email

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret |
| `SENDGRID_API_KEY` | SendGrid email API key |

### Docker Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `DOCKER_HOST` | Docker daemon URL | `unix:///var/run/docker.sock` |
| `DOCKER_NETWORK` | Network for containers | `bridge` |
| `EXECUTION_MODE` | `docker` or `process` | `docker` in production |
| `DEPLOYMENT_MODE` | `single-vm` or `kubernetes` | `single-vm` |

### Application

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | `development` or `production` | - |
| `PORT` | HTTP port | `5000` |
| `BASE_URL` | Public URL | `https://e-code.ai` |

## Replit Reserved VM Setup

### Prerequisites

1. **Reserved VM** with Docker support
2. **PostgreSQL** database (Replit Neon or external)
3. **Domain** configured (e.g., e-code.ai)

### Step-by-Step

```bash
# 1. Clone repository
git clone https://github.com/e-code/e-code.git
cd e-code

# 2. Create .env file
cat > .env << 'EOF'
DATABASE_URL=postgresql://user:pass@host:5432/db
SESSION_SECRET=your-secret-key-here
REDIS_PASSWORD=your-redis-password
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
# Add other API keys as needed
EOF

# 3. Verify Docker socket access
docker ps

# 4. Deploy
docker-compose -f docker-compose.replit-vm.yml up -d

# 5. Check health
curl http://localhost:5000/health/liveness
```

### Troubleshooting Docker Socket

**Error: Cannot connect to Docker daemon**

```bash
# Check socket exists
ls -la /var/run/docker.sock

# Check Docker is running
systemctl status docker

# Try with sudo
sudo docker ps
```

**Error: Permission denied**

The container needs root access to the Docker socket:

```yaml
# In docker-compose.replit-vm.yml
services:
  app:
    user: root  # Already configured
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```

## Kubernetes Deployment

For enterprise multi-region deployments:

```bash
# Enable Kubernetes mode
export DEPLOYMENT_MODE=kubernetes
export KUBERNETES_ENABLED=true

# Apply manifests (example)
kubectl apply -f k8s/
```

See `server/kubernetes/` for orchestration code.

## Health Checks

| Endpoint | Purpose |
|----------|---------|
| `/health/liveness` | K8s liveness probe |
| `/health/readiness` | K8s readiness probe |
| `/health/startup` | K8s startup probe |
| `/health/deep` | Full system check |

## SSL/TLS Configuration

For production, use a reverse proxy (nginx, Traefik, Caddy):

```nginx
server {
    listen 443 ssl http2;
    server_name e-code.ai;
    
    ssl_certificate /etc/ssl/e-code.ai.crt;
    ssl_certificate_key /etc/ssl/e-code.ai.key;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Monitoring

- **Prometheus metrics**: `/metrics`
- **API documentation**: `/api/docs`
- **Logs**: `./logs/` directory

## Backup & Recovery

### Database Backup

```bash
# Backup
docker exec ecode-postgres pg_dump -U ecode_user ecode > backup.sql

# Restore
docker exec -i ecode-postgres psql -U ecode_user ecode < backup.sql
```

### Redis Backup

Redis uses AOF persistence by default. Data is in the `redis-data` volume.

## Scaling

### Horizontal Scaling

For multiple app instances, use a load balancer and shared Redis for sessions:

```yaml
services:
  app:
    deploy:
      replicas: 3
```

### Vertical Scaling

Adjust container resources:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
```

## Support

- Documentation: https://docs.e-code.ai
- Issues: https://github.com/e-code/issues
- Community: https://community.e-code.ai
