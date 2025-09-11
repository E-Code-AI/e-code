# Environment Variables

This document describes all environment variables used in the e-code application.

## Required Environment Variables

### Database Configuration
- **`DATABASE_URL`** - PostgreSQL connection string
  - Format: `postgresql://user:password@host:port/database`
  - Example: `postgresql://postgres:password@localhost:5432/ecodetemp`

### Authentication & Security
- **`JWT_SECRET`** - Secret key for JWT token signing
  - Minimum 32 characters recommended
  - Generate with: `openssl rand -base64 32`

- **`SESSION_SECRET`** - Secret for session encryption
  - Minimum 32 characters recommended
  - Generate with: `openssl rand -base64 32`

### External APIs
- **`OPENAI_API_KEY`** - OpenAI API key for AI features
  - Obtain from: https://platform.openai.com/api-keys

- **`ANTHROPIC_API_KEY`** - Anthropic API key for Claude integration
  - Obtain from: https://console.anthropic.com/

- **`GOOGLE_AI_API_KEY`** - Google AI/Gemini API key
  - Obtain from: https://makersuite.google.com/app/apikey

### Email Configuration (Optional)
- **`SENDGRID_API_KEY`** - SendGrid API key for email notifications
  - Obtain from: https://app.sendgrid.com/settings/api_keys

### Storage Configuration (Optional)
- **`GOOGLE_CLOUD_PROJECT_ID`** - GCP project ID for cloud storage
- **`GOOGLE_CLOUD_STORAGE_BUCKET`** - GCS bucket name for file uploads

### Payment Integration (Optional)
- **`STRIPE_SECRET_KEY`** - Stripe secret key for payment processing
- **`STRIPE_PUBLISHABLE_KEY`** - Stripe publishable key
- **`STRIPE_WEBHOOK_SECRET`** - Stripe webhook endpoint secret

## Optional Environment Variables

### Development
- **`NODE_ENV`** - Runtime environment
  - Values: `development`, `production`, `test`
  - Default: `development`

- **`PORT`** - Server port
  - Default: `3000`

- **`LOG_LEVEL`** - Logging level
  - Values: `error`, `warn`, `info`, `debug`
  - Default: `info`

### Redis Configuration (Optional)
- **`REDIS_URL`** - Redis connection string for caching
  - Format: `redis://user:password@host:port/database`
  - Default: Uses in-memory store if not provided

### GitHub Integration (Optional)
- **`GITHUB_CLIENT_ID`** - GitHub OAuth app client ID
- **`GITHUB_CLIENT_SECRET`** - GitHub OAuth app client secret

### Monitoring & Analytics (Optional)
- **`SENTRY_DSN`** - Sentry DSN for error tracking
- **`GOOGLE_ANALYTICS_ID`** - Google Analytics tracking ID

## Environment Files

### Development (.env.local)
Create a `.env.local` file in the project root with your development variables:

```bash
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/ecodetemp

# Security
JWT_SECRET=your-super-secret-jwt-key-here-min-32-chars
SESSION_SECRET=your-super-secret-session-key-here-min-32-chars

# AI APIs
OPENAI_API_KEY=sk-your-openai-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here
GOOGLE_AI_API_KEY=your-google-ai-key-here

# Development
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
```

### Production
For production deployment, set these variables in your hosting platform:
- Vercel: Use the Vercel dashboard or `vercel env`
- Netlify: Use the Netlify dashboard
- Railway: Use `railway variables set`
- Docker: Use environment files or container orchestration secrets

### Testing (.env.test)
For testing environments, create a `.env.test` file:

```bash
NODE_ENV=test
DATABASE_URL=postgresql://postgres:password@localhost:5433/ecodetemp_test
JWT_SECRET=test-jwt-secret-min-32-chars-for-testing
SESSION_SECRET=test-session-secret-min-32-chars-for-testing
```

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use different secrets** for each environment
3. **Rotate secrets regularly** in production
4. **Use a secret management service** for production (AWS Secrets Manager, HashiCorp Vault, etc.)
5. **Limit API key permissions** to minimum required scope
6. **Monitor API key usage** for unusual activity

## Validation

The application validates required environment variables on startup. Missing critical variables will prevent the application from starting with clear error messages.

To validate your environment setup:
```bash
npm run dev
```

Check the console output for any environment variable errors.