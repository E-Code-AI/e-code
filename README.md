# e-code

[![CI](https://github.com/E-Code-AI/e-code/actions/workflows/ci.yml/badge.svg)](https://github.com/E-Code-AI/e-code/actions/workflows/ci.yml)

A modern code collaboration platform with AI assistance, real-time editing, and integrated development tools.

## 🚀 Quick Start

### Development with GitHub Codespaces

1. Click "Code" → "Open with Codespaces" on GitHub
2. Wait for the container to build and dependencies to install
3. Start developing immediately with all tools pre-configured

### Local Development

#### Prerequisites
- Node.js 18.x or 20.x
- npm 9.x or later

#### Setup
```bash
# Clone the repository
git clone https://github.com/E-Code-AI/e-code.git
cd e-code

# Install dependencies
npm install

# Set up environment variables
cp .env.production.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev
```

#### Using Dev Container (Local)
1. Install Docker and VS Code with Dev Containers extension
2. Open project in VS Code
3. Press `Ctrl+Shift+P` → "Dev Containers: Reopen in Container"
4. Wait for container setup to complete

## 📚 Documentation

- [**Environment Variables**](./docs/environment-variables.md) - Complete guide to environment configuration
- [**Dev Container Guide**](./docs/devcontainer.md) - Using Codespaces and local containers
- [**Cleanup Guide**](./docs/cleanup-guide.md) - Maintenance and troubleshooting

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Code Quality
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint issues
npm run format          # Format code with Prettier
npm run format:check    # Check code formatting
npm run check           # TypeScript type checking

# Storybook
npm run storybook       # Start Storybook dev server
npm run build-storybook # Build Storybook for production

# Testing & Auditing
npm run test            # Run tests
npm run audit:deps      # Comprehensive dependency audit
npm run audit:security  # Security vulnerability check

# Maintenance
npm run cleanup         # Complete cleanup (deps, build, cache)
npm run cleanup:deps    # Clean and reinstall dependencies
npm run cleanup:build   # Remove build artifacts
```

### Project Structure

```
e-code/
├── .devcontainer/          # Development container configuration
├── .github/workflows/      # CI/CD workflows
├── .storybook/            # Storybook configuration
├── client/                # Frontend React application
│   └── src/
│       ├── components/    # React components
│       ├── pages/        # Application pages
│       └── ...
├── server/               # Backend Express server
├── shared/              # Shared utilities and types
├── docs/               # Documentation
├── scripts/           # Build and maintenance scripts
└── ...
```

## 🎨 Storybook

View and interact with UI components in isolation:

```bash
npm run storybook
```

Visit http://localhost:6006 to explore the component library.

## 🔍 Code Quality

The project includes comprehensive code quality tools:

- **ESLint** - JavaScript/TypeScript linting
- **Prettier** - Code formatting
- **TypeScript** - Type checking
- **Dependency Auditing** - Security and maintenance

All tools are configured to work together and can be run individually or as part of the CI pipeline.

## 🚦 CI/CD

Continuous Integration runs on every push and pull request:

- ✅ Dependency installation and caching
- ✅ Code linting and formatting checks
- ✅ TypeScript type checking
- ✅ Test execution
- ✅ Production build verification
- ✅ Multi-Node.js version testing (18.x, 20.x)

## 🌟 Features

- **AI-Powered Code Assistance** - Integrated AI for code generation and debugging
- **Real-time Collaboration** - Multi-user editing with live presence
- **Component Library** - Comprehensive UI components with Storybook
- **Type-Safe Development** - Full TypeScript support
- **Modern Build System** - Vite for fast development and builds
- **Container Support** - Ready for local containers and Codespaces

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Run code quality checks: `npm run lint && npm run format:check`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
