# E-Code Platform - Production Deployment Quick Start 🚀

## Pre-Deployment Checklist ✅

1. **Environment Setup**
   ```bash
   cp .env.production.example .env.production
   nano .env.production  # Fill in all values
   ```

2. **Required Environment Variables**
   - `DATABASE_URL` - PostgreSQL connection string
   - `SESSION_SECRET` - Generate with: `openssl rand -base64 32`
   - `ANTHROPIC_API_KEY` - Your Anthropic API key
   - `SENDGRID_API_KEY` - Your SendGrid API key
   - All other API keys as needed

## Deployment Options

### Option 1: PM2 (Recommended for VPS) 🔧

```bash
# Install PM2 globally
npm install -g pm2

# Run deployment script
./scripts/deploy-production.sh pm2

# Monitor application
pm2 monit
```

### Option 2: Docker (Recommended for Cloud) 🐳

```bash
# Run deployment script
./scripts/deploy-production.sh docker

# Check status
docker-compose ps
docker-compose logs -f
```

### Option 3: Manual Deployment 📦

```bash
# Prepare deployment
./scripts/prepare-deployment.sh

# Build and start
npm run build
NODE_ENV=production npm start
```

## Post-Deployment Steps

1. **SSL Certificate Setup**
   ```bash
   # Install Certbot
   sudo apt install certbot python3-certbot-nginx
   
   # Get SSL certificate
   sudo certbot --nginx -d e-code.com -d www.e-code.com
   ```

2. **Verify Deployment**
   - Health Check: `https://your-domain.com/api/monitoring/health`
   - Login Test: Access site and login with admin/admin
   - Create Test Project: Ensure all features work

3. **Setup Monitoring**
   - Configure external monitoring (UptimeRobot, Pingdom)
   - Setup error tracking (Sentry)
   - Configure log aggregation

## Quick Commands

```bash
# Check application health
curl https://your-domain.com/api/monitoring/health

# View logs (PM2)
pm2 logs

# View logs (Docker)
docker-compose logs -f

# Restart application (PM2)
pm2 restart ecosystem.config.js

# Restart application (Docker)
docker-compose restart

# Update deployment
git pull origin main
npm ci --only=production
npm run build
pm2 reload ecosystem.config.js  # or docker-compose up -d --build
```

## Troubleshooting

- **Database Connection Failed**: Check DATABASE_URL and firewall rules
- **Health Check Failed**: Check logs for errors, verify all services running
- **SSL Issues**: Ensure domain points to server, ports 80/443 open
- **Memory Issues**: Increase server RAM or adjust PM2 max_memory_restart

## Production URLs

- Application: `https://e-code.com`
- Health Check: `https://e-code.com/api/monitoring/health`
- Admin Login: `https://e-code.com/login` (username: admin, password: admin)

## Support

- Documentation: `/DEPLOYMENT.md`
- Checklist: `/PRODUCTION_CHECKLIST.md`
- Issues: Check logs first, then application health endpoint

🎉 **Your E-Code Platform is Ready for Production!**