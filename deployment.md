# E-Code Production Deployment Guide

## Overview
This guide covers the production deployment configuration for E-Code platform.

## Environment Variables Required

### Core Configuration
- `NODE_ENV=production`
- `SESSION_SECRET` - Random 64+ character string for session encryption
- `DATABASE_URL` - PostgreSQL connection string

### API Keys
- `OPENAI_API_KEY` - For AI assistant functionality
- `STRIPE_SECRET_KEY` - For payment processing (optional)
- `SENDGRID_API_KEY` - For email notifications (optional)
- `GANDI_SMTP_USERNAME` - For newsletter emails (optional)
- `GANDI_SMTP_PASSWORD` - For newsletter emails (optional)
- `NEWSLETTER_ADMIN_EMAILS` - Comma-separated list of addresses that receive subscription and campaign alerts (optional)
- `NEWSLETTER_SEND_BATCH_SIZE` - Max recipients processed concurrently during campaign sends (optional, default 50)
- `NEWSLETTER_SEND_BATCH_DELAY_MS` - Delay in milliseconds between email batches to respect provider throttles (optional, default 250)
- `NEWSLETTER_SEND_MAX_RETRIES` - Number of retry attempts for failed deliveries (optional, default 2)
- `NEWSLETTER_SEND_RETRY_BASE_MS` - Base delay in milliseconds for exponential backoff when retrying deliveries (optional, default 500)

### Monitoring
- `SENTRY_DSN` - Enables centralized error and performance monitoring (optional but recommended)
- `LOG_AGGREGATION_ENABLED` - Disable to turn off in-process log aggregation (optional)

### Performance & Caching
- `CDN_BASE_URL` - Fully qualified URL for serving static assets via CDN (optional)
- `ASSET_BASE_URL` - Legacy alias for CDN asset prefix (optional)
- `CDN_HTML_BROWSER_CACHE_SECONDS` - Override browser cache TTL for HTML (optional, default 3600)
- `CDN_HTML_CDN_CACHE_SECONDS` - Override CDN edge cache TTL for HTML (optional, default 86400)
- `CDN_API_CACHE_CONTROL` - Override default no-cache directive applied to API responses (optional)
- `REDIS_URL` - Connection string for Redis caching layer (optional but recommended for production)
- `DB_SLOW_QUERY_THRESHOLD_MS` - Override default slow-query threshold used for instrumentation (optional)

### OAuth Configuration (Optional)
- `GITHUB_CLIENT_ID` - For GitHub import/integration
- `GITHUB_CLIENT_SECRET` - For GitHub integration

## Production Checklist

### Security
- [x] Environment variables configured
- [x] Session management with secure cookies
- [x] Rate limiting implemented
- [x] CORS configured appropriately
- [x] SQL injection protection via parameterized queries
- [x] XSS protection via React's built-in escaping
- [x] Authentication and authorization middleware

### Performance
- [x] Code splitting implemented
- [x] Lazy loading for pages
- [x] Asset optimization (minification)
- [x] Gzip compression enabled
- [x] CDN configuration for static assets
- [x] Database query optimization
- [x] Redis caching layer (optional)

### Monitoring
- [x] Error tracking (Sentry or similar)
- [x] Performance monitoring
- [x] Uptime monitoring
- [x] Log aggregation
- [x] Analytics tracking

### Database
- [x] Production database configured
- [x] Database migrations ready
- [x] Backup strategy defined
- [x] Connection pooling optimized

### Deployment Process
1. Build the production bundle: `npm run build`
2. Run database migrations: `npm run db:push`
3. Start the production server: `npm start`

## Recommended Hosting Platforms

### Option 1: Vercel + Supabase
- Frontend: Deploy to Vercel
- Database: Use Supabase PostgreSQL
- Benefits: Serverless, auto-scaling, free tier available

### Option 2: Railway
- Full-stack deployment
- PostgreSQL included
- Simple deployment via GitHub integration

### Option 3: Fly.io
- Container-based deployment
- Global distribution
- PostgreSQL available

### Option 4: Traditional VPS
- Full control over environment
- Nginx reverse proxy
- PM2 for process management
- Let's Encrypt for SSL

## Production Build Commands

```bash
# Install dependencies
npm install --production

# Build the application
npm run build

# Start production server
NODE_ENV=production npm start
```

## Health Check Endpoints
- `/api/health` - Basic health check
- `/api/health/db` - Database connectivity check

## Scaling Considerations
- Horizontal scaling via load balancer
- Database read replicas for heavy read loads
- Redis for session storage in multi-instance setup
- WebSocket scaling with Redis adapter

## Security Headers
Ensure the following headers are set:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`
- `Content-Security-Policy: default-src 'self'`