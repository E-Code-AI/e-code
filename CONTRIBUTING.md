# Contributing to E-Code Platform

Thank you for your interest in contributing to E-Code. This document provides guidelines and instructions for contributing.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Mobile Development](#mobile-development)
- [Desktop Development](#desktop-development)
- [Pull Request Process](#pull-request-process)

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- PostgreSQL 15.x or higher
- Git 2.x or higher

### Environment Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/e-code/platform.git
   cd platform
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Initialize the database:
   ```bash
   npm run db:push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`.

## Development Workflow

### Branch Naming

Use the following prefixes for branch names:

- `feature/` - New features (e.g., `feature/add-user-auth`)
- `bugfix/` - Bug fixes (e.g., `bugfix/fix-login-redirect`)
- `hotfix/` - Critical production fixes (e.g., `hotfix/security-patch`)
- `refactor/` - Code refactoring (e.g., `refactor/optimize-queries`)
- `docs/` - Documentation updates (e.g., `docs/update-api-guide`)

### Commit Messages

Follow the Conventional Commits specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, semicolons)
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

Examples:
```
feat(auth): add OAuth2 support for GitHub
fix(ide): resolve file save race condition
docs(api): update endpoint documentation
```

## Code Standards

### TypeScript

- Use strict mode (`"strict": true` in tsconfig.json)
- Prefer interfaces over type aliases for object shapes
- Use explicit return types for public functions
- Avoid `any` - use `unknown` or proper types

### ESLint Configuration

The project uses ESLint with TypeScript and React plugins. Configuration is in `.eslintrc.cjs`:

```bash
npm run lint        # Check for linting errors
npm run lint:fix    # Auto-fix linting errors
```

Key rules enforced:
- No unused variables or imports
- Consistent React hooks usage
- TypeScript strict type checking

### React

- All React hooks must be called before any early returns
- Use functional components with hooks
- Keep components focused and small (under 300 lines)
- Use `instrumentedLazy()` for lazy loading pages

### Styling

- Use Tailwind CSS utility classes
- Use shadcn/ui components where possible
- Follow the design system in `theme.json`

### Security

- Never commit secrets or API keys
- Use environment variables for configuration
- Validate all user input on both client and server

### Performance Guidelines

- Use `instrumentedLazy()` instead of `React.lazy()` for pages (adds retry logic for Vite HMR failures)
- Wrap development-only console.log statements with `if (import.meta.env.DEV)`
- Use TanStack Query for data fetching and caching
- Implement proper loading states for async operations
- Compress images and use appropriate formats (WebP, SVG)
- Minimize bundle size by avoiding unnecessary dependencies

## Testing

All code changes must pass tests before merging.

### Running Tests

```bash
# Run all tests (required before PR)
npm test

# Run specific test file
npm test -- client/src/__tests__/components.test.tsx

# Run with coverage
npm test -- --coverage

# Run E2E tests with Playwright
npx playwright test
```

### Writing Tests

- Place tests in `__tests__` directories next to source files
- Use descriptive test names
- Test both success and error cases
- Mock external dependencies
- Always import and test actual production code, not mock implementations

## Mobile Development

The mobile app is built with React Native and Expo.

### Prerequisites

- EAS CLI installed globally: `npm install -g eas-cli`
- Expo account configured

### Important: yarn.lock Requirement

EAS Build requires a lockfile. Before pushing changes:

```bash
cd mobile
yarn install
git add yarn.lock
git commit -m "chore: update yarn.lock"
```

The GitHub Actions workflow will fail if `yarn.lock` is missing.

### Building

```bash
cd mobile

# Development build
eas build --platform android --profile development

# Preview build (internal testing)
eas build --platform android --profile preview

# Production build
eas build --platform android --profile production
```

## Desktop Development

The desktop app is built with Electron.

### Building

```bash
cd desktop

# Development
npm run dev

# Build for current platform
npm run build

# Verify build
node scripts/verify-build.js
```

### Build Verification

The `verify-build.js` script runs 36 automated checks including:
- Binary size validation
- Code signing verification
- Dependency integrity
- Security configuration

All checks must pass before merging.

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with appropriate commits
3. Run tests and linting: `npm test && npm run lint`
4. Push your branch and create a Pull Request
5. Fill out the PR template completely
6. Request review from maintainers
7. Address any feedback
8. Squash and merge when approved

### Code Review Checklist

Reviewers will check:

- [ ] Code follows project conventions
- [ ] Tests are included and passing
- [ ] Documentation is updated if needed
- [ ] No security vulnerabilities introduced
- [ ] Performance impact considered
- [ ] Accessibility requirements met

## Questions

For questions about contributing, please open a GitHub Discussion or contact the maintainers.
