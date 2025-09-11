# Development Container Guide

This repository includes a devcontainer configuration that provides a consistent development environment for all contributors.

## Using GitHub Codespaces

1. **Open in Codespaces**: Click the "Code" button on the GitHub repository page and select "Open with Codespaces"
2. **Create new codespace**: If you don't have an existing codespace, create a new one
3. **Wait for setup**: The container will automatically install dependencies and run initial checks
4. **Start developing**: The development server will be available on port 3000, and Storybook on port 6006

## Using Local Dev Container

### Prerequisites
- [Docker](https://www.docker.com/get-started)
- [VS Code](https://code.visualstudio.com/)
- [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

### Setup Steps
1. Clone the repository
2. Open VS Code
3. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
4. Type "Dev Containers: Open Folder in Container"
5. Select your project folder
6. VS Code will build and start the container

## Container Features

### Pre-installed Extensions
- **Tailwind CSS IntelliSense**: Auto-completion and syntax highlighting for Tailwind
- **ESLint**: JavaScript/TypeScript linting
- **Prettier**: Code formatting
- **GitLens**: Enhanced Git capabilities
- **TypeScript**: Advanced TypeScript support
- **EditorConfig**: Consistent editor settings
- **Markdown All in One**: Markdown editing support

### Port Forwarding
- **Port 3000**: Main application development server
- **Port 6006**: Storybook development server

### Automatic Setup
The container automatically:
- Installs Node.js dependencies with `npm install`
- Runs TypeScript type checking with `npm run check`
- Configures VS Code settings for the project

## Troubleshooting

### Container Build Issues
If the container fails to build:
1. Ensure Docker is running
2. Check that you have sufficient disk space
3. Try rebuilding the container: `Dev Containers: Rebuild Container`

### Port Conflicts
If ports 3000 or 6006 are in use:
- The container will automatically forward to alternative ports
- Check the "Ports" tab in VS Code to see the actual forwarded ports

### Performance Issues
- Ensure your Docker has sufficient memory allocated (recommend 4GB+)
- Consider using Docker's volume mounts for better performance on Windows/Mac