# E-Code Platform - Replit Setup Guide

This guide will help you set up and run the E-Code platform on Replit.

## 🚀 Quick Start

1. **Fork this Repl** or import the repository
2. **Configure secrets** (see below)
3. **Click the Run button** - the platform will automatically build and start

## 🔧 Required Configuration

### Replit Secrets

You **must** configure the following secrets in your Replit environment:

#### 🎯 Essential Secrets

```bash
# Code Execution Service (Required for code execution to work)
SANDBOX_SERVICE_URL=https://your-sandbox-service.com

# Database (Required for user data and projects)
DATABASE_URL=postgresql://username:password@hostname:port/database

# Session Security (Required for authentication)
SESSION_SECRET=your-super-secret-session-key-here

# Environment
NODE_ENV=production
```

#### 🤖 AI Integration (Optional but recommended)

```bash
# Choose one or more AI providers
ANTHROPIC_API_KEY=your-anthropic-api-key
OPENAI_API_KEY=your-openai-api-key
GOOGLE_AI_API_KEY=your-google-ai-api-key
```

#### 📧 Additional Services (Optional)

```bash
# Email service
SENDGRID_API_KEY=your-sendgrid-api-key

# Payment processing
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key

# Redis cache (optional)
REDIS_URL=redis://your-redis-instance
```

### Setting Up Secrets in Replit

1. Open your Repl
2. Click on the **🔒 Secrets** tab in the left sidebar (under Tools)
3. Add each secret by clicking **+ New Secret**:
   - **Key**: Enter the variable name (e.g., `SANDBOX_SERVICE_URL`)
   - **Value**: Enter the secret value
   - Click **Add Secret**

## 🏗️ How It Works

### Architecture on Replit

Since Replit cannot run Docker containers directly, this setup uses a **remote execution approach**:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   Replit IDE    │    │   E-Code Web     │    │  External Sandbox   │
│                 │───▶│    Platform      │───▶│     Service         │
│  (Frontend)     │    │  (Node.js/React) │    │  (Code Execution)   │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
```

1. **Frontend**: React application served by Replit
2. **Backend**: Node.js server handling APIs, file management, AI integration
3. **Remote Runner**: Go service that forwards code execution requests to external sandbox
4. **External Sandbox**: Secure environment for running user code (you need to provide this)

### Files Added for Replit Support

- **`.replit`**: Replit configuration (already exists, may be updated)
- **`replit.nix`**: Nix environment with Go, Node.js, Python, and PostgreSQL
- **`run-replit.sh`**: Startup script that builds and launches the platform
- **`server/execution/remote-runner.go`**: Go forwarder for code execution
- **`README_REPLIT.md`**: This setup guide

## 🚦 Running the Platform

### Automatic Start

Simply click the **▶️ Run** button in Replit. The platform will:

1. Install Node.js dependencies
2. Build the Go remote runner
3. Build the React frontend
4. Start the backend server
5. Start the remote runner (if configured)

### Manual Start

If you prefer to start manually:

```bash
# Run the startup script
./run-replit.sh

# Or start components individually:
npm install
npm run build
npm start
```

### Accessing Your Platform

Once running, your platform will be available at:
```
https://[repl-name].[username].repl.co
```

## 🔍 Troubleshooting

### Common Issues

#### 1. "SANDBOX_SERVICE_URL not set" Warning

**Problem**: Code execution isn't working
**Solution**: Add `SANDBOX_SERVICE_URL` to your Replit secrets pointing to an external sandbox service

#### 2. Database Connection Errors

**Problem**: "Database connection failed"
**Solution**: 
- Ensure `DATABASE_URL` is set in secrets
- Verify your PostgreSQL instance is accessible from Replit
- Check the database URL format: `postgresql://user:password@host:port/dbname`

#### 3. Build Failures

**Problem**: "npm run build failed"
**Solution**:
- Check the console output for specific errors
- Try running `npm install` manually
- Ensure you have sufficient storage space

#### 4. Port Already in Use

**Problem**: "Port 5000 already in use"
**Solution**: 
- Stop and restart your Repl
- The startup script will handle port conflicts automatically

### Debug Commands

```bash
# Check if services are running
ps aux | grep -E "(node|remote-runner)"

# Check ports
netstat -tlnp

# View logs
tail -f /tmp/remote-runner.log

# Test remote runner
curl http://localhost:8080/health
```

## 🌟 Features Available on Replit

✅ **Working Features:**
- Full web-based IDE
- File management and editing
- AI-powered code generation
- User authentication and projects
- Real-time collaboration
- Database integration
- Custom themes and settings

⚠️ **Limitations:**
- Code execution requires external sandbox service
- No direct Docker support
- Limited to Replit's resource constraints
- Dependent on external services for full functionality

## 🔗 External Services Setup

### Sandbox Service Options

Since Replit cannot execute arbitrary code safely, you'll need an external sandbox service:

1. **Self-hosted**: Deploy a sandbox service on a cloud provider
2. **Third-party**: Use services like Judge0, Sphere Engine, or similar
3. **Cloud Functions**: AWS Lambda, Google Cloud Functions, etc.

Your sandbox service should accept POST requests to `/run` with this format:
```json
{
  "language": "python",
  "code": "print('Hello, World!')",
  "input": "",
  "files": {}
}
```

And return:
```json
{
  "success": true,
  "output": "Hello, World!\n",
  "error": "",
  "exitCode": 0,
  "runtime": 150
}
```

## 📚 Additional Resources

- [E-Code Platform Documentation](../README.md)
- [Replit Documentation](https://docs.replit.com/)
- [Nix Package Manager](https://nixos.org/manual/nix/stable/)

## 🆘 Support

If you encounter issues:

1. Check the **Console** tab in Replit for error messages
2. Verify all required secrets are configured
3. Test your external sandbox service independently
4. Check the [main README](../README.md) for general platform documentation

---

**Happy coding! 🎉**