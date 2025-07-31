# E-Code CLI

The official command-line interface for E-Code, enabling developers to create, manage, and deploy projects directly from their terminal.

## Installation

```bash
npm install -g @ecode/cli
```

## Getting Started

### Authentication

```bash
# Login to your E-Code account
ecode login

# Check who you're logged in as
ecode whoami

# Logout
ecode logout
```

### Project Management

```bash
# Create a new project
ecode project create my-app

# Create with specific language/template
ecode project create my-app --language typescript --template react

# List your projects
ecode project list

# Open a project in browser
ecode project open my-app

# Fork a project
ecode project fork existing-app --new-name my-fork

# Delete a project
ecode project delete my-app
```

### Development

```bash
# Initialize E-Code in current directory
ecode init

# Run your project
ecode run

# Watch for changes
ecode run --watch
```

### Package Management

```bash
# Add packages
ecode package add express axios

# Add dev dependencies
ecode package add --dev typescript @types/node

# Remove packages
ecode package remove express

# List installed packages
ecode package list
```

### Secrets Management

```bash
# Add a secret
ecode secret add API_KEY

# Remove a secret
ecode secret remove API_KEY

# List secrets (names only)
ecode secret list
```

### Deployment

```bash
# Deploy your project
ecode deploy create

# List deployments
ecode deploy list

# Check deployment status
ecode deploy status my-app-prod

# Rollback a deployment
ecode deploy rollback my-app-prod
```

### Logs

```bash
# View recent logs
ecode logs

# View specific number of lines
ecode logs --lines 50

# Follow logs in real-time
ecode logs --follow

# View logs for specific project
ecode logs --project my-app
```

### Export

```bash
# Export as ZIP
ecode export

# Export as Docker container
ecode export --format docker

# Export for GitHub
ecode export --format github --output ./my-export
```

### Interactive Mode

For a guided experience:

```bash
ecode interactive
# or
ecode i
```

## Configuration

The CLI stores configuration in `~/.ecode/config.json`. Project-specific configuration is stored in `.ecode/config.json` within your project directory.

## Environment Variables

- `ECODE_API_URL`: Override the API endpoint (default: https://api.e-code.com)
- `ECODE_WEB_URL`: Override the web URL (default: https://e-code.com)

## Features

- **Authentication**: Multiple login methods (browser, API token, credentials)
- **Project Management**: Create, list, fork, and delete projects
- **Real-time Logs**: Stream logs from your running applications
- **Package Management**: Install and manage dependencies
- **Deployment**: Deploy with various strategies (static, autoscale, VM)
- **Secrets**: Securely manage environment variables
- **Export**: Export projects in multiple formats
- **Interactive Mode**: Guided CLI experience for beginners

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT © E-Code