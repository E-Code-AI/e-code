# E-Code Platform - Replit Production Deployment

## 🚀 Deployment Status
**Platform**: E-Code Platform  
**Target Domain**: https://e-code.ai  
**Deployment Type**: Autoscale (supports custom domains)  
**Status**: Ready for deployment

## ✅ Pre-Deployment Checklist
- ✅ Build scripts configured (`npm run build`)
- ✅ Start scripts configured (`npm run start`)
- ✅ Deployment type set to `autoscale` in .replit
- ✅ Port configuration (5000 → 80)
- ✅ Database configured (PostgreSQL)
- ✅ MCP server integrated and ready
- ✅ All core features functional

## 📋 Deployment Configuration
```
Type: Autoscale
Build Command: npm run build
Start Command: npm run start
Primary Port: 5000 → 80
```

## 🌐 Custom Domain Setup

After deployment, to connect https://e-code.ai:

1. **In Replit Deployments**:
   - Go to Deployments tab
   - Click Settings → Link a domain
   - Enter: `e-code.ai`

2. **At Your Domain Registrar**:
   Add these DNS records:
   ```
   Type: CNAME
   Name: @ (or root)
   Value: [Will be provided by Replit]
   
   Type: CNAME
   Name: www
   Value: [Will be provided by Replit]
   ```

3. **SSL Certificate**:
   - Automatically provisioned by Replit
   - HTTPS enabled by default

## 🔑 Required Environment Variables

Before deploying, ensure these are set in Replit Secrets:

### Core (Required)
- `SESSION_SECRET` - Generate a secure random string (minimum 32 characters)
- `DATABASE_URL` - Already configured by Replit PostgreSQL
- `NODE_ENV` - Set to "production"
- `PORT` - Set to 5000 (Replit will map to external port 80/443)

### CORS Configuration (Critical for Production)
- `ALLOWED_ORIGINS` - **Required** for production security. Set to:
  ```
  https://f4d2485e-81a7-4595-9868-17903ab251f3-00-ngx9sxwfcs19.riker.replit.dev,https://replit-clone-henri45.replit.app,https://e-code.ai
  ```
  This allows your dev, published, and custom domain URLs to access the API.

### AI Integration
- `ANTHROPIC_API_KEY` - For AI agent functionality (Claude Sonnet)

### MCP Server
- `MCP_API_KEY` - For MCP authentication
- `MCP_JWT_SECRET` - For JWT token signing (minimum 32 characters)
- `MCP_OAUTH_SECRET` - For OAuth flows (minimum 32 characters)

### Payment Processing (Optional)
- `STRIPE_SECRET_KEY` - For subscription billing
- `STRIPE_WEBHOOK_SECRET` - For webhook signature verification (see Stripe Webhook Setup below)
- `STRIPE_PUBLISHABLE_KEY` - For client-side Stripe integration

### Email Service (Optional)
- `SENDGRID_API_KEY` - For transactional emails

### Caching (Optional)
- `REDIS_URL` - For Redis caching (format: redis://user:password@host:port)

## 🔧 Stripe Webhook Setup

If you're using Stripe for payments, configure the webhook endpoint:

1. **Go to Stripe Dashboard** → Developers → Webhooks
2. **Add endpoint** with URL:
   - Production: `https://e-code.ai/api/stripe/webhook`
   - Or Replit URL: `https://replit-clone-henri45.replit.app/api/stripe/webhook`
3. **Select events to listen to**:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. **Copy the signing secret** and add it to Replit Secrets as `STRIPE_WEBHOOK_SECRET`

## 🔍 Live Preview System

### Preview Access on Replit

Replit deploys expose a **single external port** (80/443). All preview URLs are accessed via path-based routing:

- **HTTP Preview**: `https://e-code.ai/preview/:projectId/:port/`
- **WebSocket Preview**: `wss://e-code.ai/ws/preview/:projectId/:port/`

Example:
- Frontend on port 3000: `https://e-code.ai/preview/123/3000/`
- API on port 8000: `https://e-code.ai/preview/123/8000/`
- WebSocket: `wss://e-code.ai/ws/preview/123/3000/`

**Note**: Replit does **not** support wildcard subdomains for previews. All previews are accessed through the main domain using path-based routing.

### Multi-Port Support

Projects can expose multiple services simultaneously:
- The preview service automatically detects and manages multiple ports
- Users can switch between ports in the preview UI
- Each service is health-checked independently

## 📦 What Gets Deployed

### Frontend
- React application with TypeScript
- Tailwind CSS styling
- shadcn/ui components
- Monaco Editor for code editing
- Real-time collaboration features

### Backend
- Express.js API server
- PostgreSQL database
- MCP server integration
- WebSocket support
- Authentication system
- AI agent system

### Features
- ✅ AI-powered code generation
- ✅ Project management
- ✅ Real-time collaboration
- ✅ Database hosting
- ✅ Container deployment
- ✅ User authentication
- ✅ Template system
- ✅ File management
- ✅ Terminal access
- ✅ Version control

## 🚀 Deployment Steps

1. **Click Deploy Button**
   - The deployment button will appear after this message
   - Click it to start the deployment process

2. **Build Process**
   - Replit will run `npm run build`
   - Frontend assets will be compiled
   - Backend will be bundled

3. **Deployment**
   - Autoscale deployment will be created
   - Your app will be available at a temporary Replit URL
   - Then connect your custom domain

4. **Domain Connection**
   - Add e-code.ai as custom domain
   - Update DNS records at your registrar
   - Wait for DNS propagation (5-30 minutes)

## 📊 Autoscale Benefits

- **Automatic scaling**: Handles traffic spikes
- **Zero downtime deploys**: Seamless updates
- **Global CDN**: Fast worldwide access
- **DDoS protection**: Built-in security
- **SSL certificates**: Automatic HTTPS
- **Custom domains**: Professional URLs

## 🔍 Post-Deployment

After deployment:
1. Test at the Replit URL first
2. Connect custom domain
3. Test all features:
   - User registration/login
   - AI agent
   - Project creation
   - File editing
   - Database connections

## 📈 Monitoring

Monitor your deployment:
- Deployment logs in Replit console
- Health endpoint: `https://e-code.ai/api/monitoring/health`
- Database status: Check PostgreSQL logs
- Error tracking: View server logs

## 🔧 Troubleshooting

### PORT Not Ready
**Issue**: Application fails to start or times out
**Solutions**:
1. Ensure `PORT=5000` is set in Replit Secrets
2. Verify server binds to `0.0.0.0` not `localhost`
3. Check startup logs for port binding errors
4. Confirm `start-production.js` or `npm start` uses correct port

### WebSocket Proxy Issues
**Issue**: WebSocket connections fail or disconnect
**Solutions**:
1. Verify WebSocket endpoints use correct path: `/ws/preview/:project/:port/`
2. Check CORS settings include all three URLs in `ALLOWED_ORIGINS`
3. Ensure WebSocket upgrade headers are forwarded correctly
4. Test with: `wscat -c wss://e-code.ai/ws/preview/123/3000/`

### Database SSL Errors
**Issue**: `SSL connection required` or certificate errors
**Solutions**:
1. Ensure `DATABASE_URL` includes `?sslmode=require` parameter
2. Verify Replit PostgreSQL is configured with SSL enabled
3. Check database connection pool settings in deployment.config.ts
4. Add `ssl: { rejectUnauthorized: true }` to database config

### Preview Not Loading
**Issue**: Preview shows 404 or connection error
**Solutions**:
1. Check project preview service is running: `/api/projects/:id/preview/status`
2. Verify port is exposed in preview configuration
3. Ensure health checks are passing for the port
4. Test direct access: `https://e-code.ai/preview/:projectId/:port/`

### CORS Errors
**Issue**: `Access-Control-Allow-Origin` errors in browser console
**Solutions**:
1. Verify `ALLOWED_ORIGINS` environment variable is set correctly
2. Check all three URLs are comma-separated without spaces
3. Ensure credentials are included in CORS config
4. Test from each origin (dev, published, custom domain)

## 🎯 Ready to Deploy!

Your E-Code platform is fully configured and ready for production deployment on Replit with the custom domain https://e-code.ai.

Click the deployment button below to start the process!