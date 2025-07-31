# E-Code VSCode Extension

Official Visual Studio Code extension for E-Code - the cloud development platform.

## Features

- **Quick Project Creation**: Create new E-Code projects directly from VS Code
- **Seamless Deployment**: Deploy your projects with a single command
- **Live Collaboration**: See live cursors and edits from team members
- **AI Assistant**: Get AI-powered code suggestions and improvements
- **Package Management**: Install packages without leaving VS Code
- **Secret Management**: Manage environment variables securely
- **Real-time Sync**: Automatically sync your local changes to E-Code

## Getting Started

1. Install the extension from the VS Code marketplace
2. Click the E-Code icon in the status bar
3. Select "Login" and enter your API token
4. Start creating and deploying projects!

## Commands

- `E-Code: Login` - Authenticate with your E-Code account
- `E-Code: Create New Project` - Create a new project on E-Code
- `E-Code: Open Project` - Open an existing project in the browser
- `E-Code: Deploy Current Project` - Deploy the current project
- `E-Code: Run Code` - Run the current file on E-Code
- `E-Code: AI Assistant` - Open the AI assistant panel
- `E-Code: Install Package` - Install npm packages
- `E-Code: Share Project` - Get a shareable link
- `E-Code: View Deployment Logs` - View logs from deployments
- `E-Code: Manage Secrets` - Manage environment variables

## Requirements

- VS Code 1.85.0 or higher
- E-Code account and API token

## Extension Settings

- `ecode.apiToken`: Your E-Code API token
- `ecode.apiUrl`: E-Code API URL (default: https://e-code.app)
- `ecode.autoSync`: Automatically sync changes (default: true)
- `ecode.showNotifications`: Show deployment notifications (default: true)