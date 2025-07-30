# E-Code Platform Production Deployment Guide

## Prerequisites

1. **Environment Variables**: Copy `.env.production.example` to `.env.production` and fill in all required values
2. **Database**: PostgreSQL 14+ with SSL enabled
3. **Redis**: For caching and session storage  
4. **Node.js**: v18+ installed
5. **SSL Certificate**: For HTTPS
6. **Domain**: Configured with proper DNS

## Deployment Steps

### 1. Database Setup

```bash
# Create production database
createdb ecode_production

# Run migrations
NODE_ENV=production npm run db:push
```

### 2. Build Application

```bash
# Install dependencies
npm install --production

# Build frontend and backend
npm run build

# Verify build
ls -la dist/
```

### 3. Security Checklist

- [ ] All environment variables set
- [ ] SESSION_SECRET is unique and random
- [ ] Database has SSL enabled
- [ ] HTTPS configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] CSP headers configured

### 4. Start Application

```bash
# Using PM2 (recommended)
pm2 start ecosystem.config.js --env production

# Or directly
NODE_ENV=production npm start
```

### 5. Health Checks

```bash
# Check application health
curl https://your-domain.com/api/health

# Check database connection
curl https://your-domain.com/api/monitoring/health
```

### 6. Monitoring Setup

1. Configure Sentry for error tracking
2. Set up CloudWatch/DataDog for metrics
3. Enable application logs
4. Configure uptime monitoring

### 7. Backup Strategy

- Database: Daily automated backups
- User uploads: S3 with versioning
- Code: Git repository backups

## Production Configuration

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name e-code.com www.e-code.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name e-code.com www.e-code.com;

    ssl_certificate /etc/ssl/certs/e-code.com.crt;
    ssl_certificate_key /etc/ssl/private/e-code.com.key;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### PM2 Ecosystem File

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'e-code-platform',
    script: './dist/server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

## Post-Deployment

1. **Verify All Services**
   - Authentication flow
   - Database connections
   - File uploads
   - WebSocket connections
   - AI integrations

2. **Performance Testing**
   - Load testing with k6 or Apache Bench
   - Monitor response times
   - Check memory usage

3. **Security Scan**
   - Run OWASP ZAP scan
   - Check for exposed endpoints
   - Verify authentication on all routes

## Rollback Plan

1. Keep previous build artifacts
2. Database migration rollback scripts ready
3. DNS failover configured
4. Blue-green deployment for zero downtime

## Support

For deployment issues:
- Check logs: `pm2 logs`
- Monitor health endpoint: `/api/health`
- Database status: `/api/monitoring/health`