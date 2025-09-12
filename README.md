# E-Code Platform 🚀

A complete Replit-like development platform with AI-powered code generation, real-time collaboration, and container orchestration.

## ✨ Features

- **🤖 AI Code Generation**: Autonomous code generation with Claude 4 Sonnet and GPT-4
- **🔥 Real-time Collaboration**: Multi-user editing with WebSocket-based collaboration
- **📦 Container Orchestration**: Full Kubernetes-based container management
- **🖥️ Live Preview System**: Real-time preview with multiple device modes
- **🗄️ Database Management**: PostgreSQL hosting with web interface
- **🔧 Multi-language Support**: JavaScript, Python, Go, and 50+ languages
- **⚡ Terminal Access**: Full WebSocket-based terminal with command history
- **📁 File Management**: Complete file system with Git integration
- **🎯 Deployment System**: One-click deployment with SSL and custom domains
- **🛒 Templates & Marketplace**: Pre-built templates and extensions

## 🚀 Quick Start

### Development

```bash
# 1. Clone the repository
git clone https://github.com/E-Code-AI/e-code.git
cd e-code

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.production.example .env
# Edit .env with your database and API keys

# 4. Database Setup Options:
# Option A: Use Neon PostgreSQL (Recommended for production)
# - Sign up at https://neon.tech
# - Create a new project and get your connection string
# - Update DATABASE_URL in .env

# Option B: Local PostgreSQL for development
docker run --name ecode-postgres -e POSTGRES_DB=ecode_dev -e POSTGRES_USER=ecode -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:15

# 5. Validate database configuration
npm run db:validate

# 6. Set up database schema
npm run db:push

# 7. Start development server
npm run dev
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

## 🏗️ Architecture & Database

### Database Architecture
The E-Code platform uses a **hybrid database approach** for optimal performance:

- **🎯 Primary Database: Neon PostgreSQL** (Recommended)
  - All relational data (users, projects, files, billing)
  - ACID compliance and complex queries
  - Automatic scaling and backups
  - Get started at [neon.tech](https://neon.tech)

- **🔑 Key-Value Store: ReplitDB Emulation**
  - Simple settings and cache data
  - Replit compatibility layer
  - File-based storage for development

### System Architecture

- **Main Server**: Express.js + React (Port 5000)
- **Preview Server**: Live preview system (Port 3100)
- **MCP Server**: AI tools and automation (Port 3200)
- **Go Runtime**: Container & file operations (Port 8080)
- **Python ML**: AI/ML processing (Port 8081)
- **Database**: PostgreSQL with connection pooling

📚 **Read the complete guide**: [DATABASE_ARCHITECTURE_GUIDE.md](./DATABASE_ARCHITECTURE_GUIDE.md)

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
npm run db:push        # Push schema to database
npm run db:validate    # Validate database configuration

# Test platform features
npm run dev
```

## 🌟 Test Users

- **Username**: `testuser`
- **Password**: `testpass123`
- **Email**: `test@example.com`

## 📚 Documentation

See the following files for detailed information:
- `REPLIT_PARITY_AUDIT_FINAL.md` - Feature parity analysis
- `test-platform-features.md` - Operational status
- `DEPLOYMENT.md` - Production deployment guide

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details
