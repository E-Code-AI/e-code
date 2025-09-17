# E-Code Platform 🚀

A complete Replit-like development platform with AI-powered code generation, real-time collaboration, and secure code execution.

## ✨ Features

- **🤖 AI Code Generation**: Autonomous code generation with Claude 4 Sonnet and GPT-4
- **🔥 Real-time Collaboration**: Multi-user editing with WebSocket-based collaboration
- **📦 Container Orchestration**: Full Kubernetes-based container management with secure sandboxing
- **🖥️ Live Preview System**: Real-time preview with multiple device modes
- **🗄️ Database Management**: PostgreSQL hosting with web interface
- **🔧 Multi-language Support**: JavaScript, Python, Go, Java, Rust, and 50+ languages
- **⚡ Terminal Access**: Full WebSocket-based terminal with command history
- **📁 File Management**: Complete file system with Git integration
- **🎯 Deployment System**: One-click deployment with SSL and custom domains
- **🛒 Templates & Marketplace**: Pre-built templates and extensions
- **🔒 Secure Sandbox**: Docker-based execution with seccomp profiles and resource limits

## 🚀 Quick Start

### Development Setup

```bash
# 1. Clone and setup environment
git clone https://github.com/E-Code-AI/e-code.git
cd e-code
cp .env.example .env
# Edit .env with your configuration

# 2. Install dependencies
npm install

# 3. Start services with Docker Compose
docker-compose up -d postgres redis

# 4. Setup database
npm run db:push

# 5. Build sandbox image
docker build -f sandbox/Dockerfile -t ecode-sandbox:latest ./sandbox

# 6. Build and start executor service
cd server/execution
go mod tidy
go build -o docker-runner docker-runner.go
EXECUTOR_API_KEY=development-key-change-in-production ./docker-runner &
cd ../..

# 7. Start the main application
npm run dev

# 8. Run tests
npm run check  # TypeScript compilation
./tests/smoke/run_executor_smoke_test.sh  # Executor smoke tests
```

### Using GitHub Actions Locally

```bash
# Install act (GitHub Actions runner)
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Run CI pipeline locally
act push

# Run specific job
act -j lint
act -j sandbox-smoke-test
```

### Monaco Editor Integration

Check out the example integration:

```bash
cd examples/monaco-integration
# Open index.html in your browser
# Make sure the executor service is running on localhost:8080
```

### Production Deployment

```bash
# 1. Set environment variables
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"
export SESSION_SECRET="your-secret-key"
export OPENAI_API_KEY="your-openai-key"
export ANTHROPIC_API_KEY="your-anthropic-key"

# 2. Run deployment script
./deploy-production.sh

# 3. Start production server
NODE_ENV=production npm start
```

## 🏗️ Architecture

- **Main Server**: Express.js + React (Port 5000)
- **Preview Server**: Live preview system (Port 3100)
- **MCP Server**: AI tools and automation (Port 3200)
- **Go Runtime**: Container & file operations (Port 8080)
- **Python ML**: AI/ML processing (Port 8081)
- **Database**: PostgreSQL with connection pooling

## 🧪 Platform Status

✅ **100% Functional** - Ready for production use like Replit.com

- All core features implemented and tested
- Container orchestration with UI integration
- AI agent system with 70+ tools
- Real-time collaboration and terminal
- Deployment system with SSL support
- Multi-language runtime support
- Authentication and billing systems

## 🔧 Development

```bash
# Build the application
npm run build

# Type checking
NODE_OPTIONS="--max-old-space-size=8192" npm run check

# Database operations
npm run db:push

# Test platform features
npm run dev
```

## 🌟 Test Users

- **Username**: `testuser`
- **Password**: `testpass123`
- **Email**: `test@example.com`

## 📚 Documentation

### Core Documentation
- [Production Deployment Guide](./DEPLOYMENT_ENHANCED.md) - Complete deployment instructions
- [Production Checklist](./PRODUCTION_CHECKLIST_ENHANCED.md) - Security and readiness checklist
- [Monaco Editor Integration Example](./examples/monaco-integration/README.md) - Frontend integration guide
- [Environment Variables](./.env.example) - Configuration reference

### Security & Configuration
- [Seccomp Security Profile](./sandbox/seccomp.json) - Container security configuration
- [Sandbox Dockerfile](./sandbox/Dockerfile) - Secure execution environment
- [CI/CD Pipeline](./.github/workflows/ci.yml) - Automated testing and deployment

### API & Services
- [Executor Service](./server/execution/docker-runner.go) - Go-based code execution service
- [Smoke Tests](./tests/smoke/run_executor_smoke_test.sh) - Service validation tests

### Legacy Documentation
- `REPLIT_PARITY_AUDIT_FINAL.md` - Feature parity analysis
- `test-platform-features.md` - Operational status
- `DEPLOYMENT.md` - Legacy deployment guide

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details
