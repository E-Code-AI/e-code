# E-Code Platform Documentation

## Overview
E-Code is a comprehensive web-based Integrated Development Environment (IDE) that provides a complete development experience with AI-powered features, real-time collaboration, and seamless deployment capabilities.

## Getting Started

### Creating Your First Project
1. Sign up for an E-Code account at [e-code.com](https://e-code.com)
2. Click "Create New Project" from your dashboard
3. Choose a template or start from scratch
4. Your project workspace will open with all necessary tools

### Workspace Overview
The E-Code workspace consists of:
- **File Explorer**: Navigate and manage your project files
- **Code Editor**: Full-featured editor with syntax highlighting and AI assistance
- **Console**: View output and interact with your application
- **Preview**: See your app running in real-time
- **AI Agent**: Your intelligent coding assistant

## AI Features

### AI Agent
Our AI Agent (powered by Claude Sonnet 4.0) can:
- Build complete applications from natural language descriptions
- Debug and fix errors
- Explain code and suggest improvements
- Install packages and manage dependencies
- Create and modify database schemas

#### Using AI Agent
1. Open the Agent panel in your workspace
2. Describe what you want to build or the help you need
3. Agent will work autonomously, creating files and installing packages
4. Watch the progress in real-time as your app is built

#### Advanced AI Modes
- **Extended Thinking**: For complex problem-solving requiring deeper analysis
- **High Power Mode**: Maximum computational resources for demanding tasks
- **Build Templates**: Quick-start templates for common app types

### Checkpoints
Checkpoints are comprehensive snapshots of your project state, including:
- All code files
- AI conversation context
- Database state
- Configuration settings

#### Creating Checkpoints
- Automatic: Created during AI Agent work
- Manual: Click "Create Checkpoint" to save current state

#### Restoring from Checkpoints
1. Click "View Checkpoints" button
2. Select the checkpoint you want to restore
3. Click "Restore" to revert your project

## Import Features

### Import from GitHub
Two methods available:
1. **Rapid Import**: Combine `replit.com/` with your GitHub URL
2. **Guided Import**: Use the import wizard for more control

### Import from Figma
1. Connect your Figma account
2. Select the design frame in Figma
3. Copy the frame URL
4. Paste into E-Code's Figma import interface
5. AI converts designs to React components

### Import from Bolt
1. Export your Bolt project to GitHub
2. Use GitHub import to bring it into E-Code
3. Only Vite + React apps currently supported

### Import from Lovable
1. Export your Lovable app
2. E-Code migrates:
   - Code and styles
   - Backend functionality
   - Database schema to PostgreSQL

## Collaboration

### Real-time Multiplayer
- Up to 4 users can code together simultaneously
- See live cursors and edits
- Shared console and shell access
- Inline code comments and threads

### Sharing Projects
- **Join Links**: Share edit access with team members
- **Public Projects**: Allow others to view and fork
- **Private Projects**: Available with Core membership

## Database & Storage

### PostgreSQL Database
- Fully managed PostgreSQL instances
- Automatic backups
- Visual database browser
- SQL query interface

### Object Storage
- Cloud-based file storage
- Persistent across deployments
- Programmatic access via API
- Pay-per-use pricing

## Deployment

### One-Click Deploy
1. Click the "Deploy" button in your workspace
2. Choose deployment type
3. Configure domain (optional)
4. Your app goes live instantly

### Deployment Options
- **Static Sites**: For frontend-only projects
- **Dynamic Apps**: Full-stack applications
- **Scheduled Jobs**: Cron-based tasks
- **API Services**: RESTful APIs

## Billing & Pricing

### Subscription Plans

#### Core ($20/month)
- Private projects
- $25 monthly credits
- AI Agent access
- Priority support
- Advanced workspace features

#### Teams ($40/user/month)
- Everything in Core
- $40 monthly credits per user
- Team management
- Shared workspaces
- Admin controls

### Usage-Based Pricing
Credits cover:
- AI Agent usage (based on complexity)
- Deployment compute and bandwidth
- Database active hours and storage
- Object Storage operations

### Monitoring Usage
- View real-time usage in account settings
- Set up usage alerts
- Configure spending budgets

## Teams & Organizations

### Team Management
- Invite members via email
- Assign roles and permissions
- Share projects and workspaces
- Centralized billing

### Workspace Features
- Shared projects
- Team templates
- Access controls
- Activity logs

## Security & Privacy

### Project Security
- Private projects with Core membership
- Encrypted secrets storage
- SSL certificates for deployments
- Regular security updates

### Data Protection
- Your code is your own
- No training on user data
- GDPR compliant
- Regular backups

## API & Integrations

### REST API
Access E-Code features programmatically:
- Project management
- File operations
- Deployment control
- Usage metrics

### Webhooks
Receive notifications for:
- Deployment status
- Collaborator actions
- Usage alerts
- Project events

## Keyboard Shortcuts

### Essential Shortcuts
- `Cmd/Ctrl + S`: Save file
- `Cmd/Ctrl + P`: Quick file open
- `Cmd/Ctrl + Shift + P`: Command palette
- `Cmd/Ctrl + /`: Toggle comment
- `Cmd/Ctrl + Enter`: Run project

### AI Shortcuts
- `Cmd/Ctrl + K`: Open AI Agent
- `Cmd/Ctrl + I`: Quick AI assist
- `Cmd/Ctrl + Shift + K`: AI explain code

## Troubleshooting

### Common Issues

#### Project Won't Run
1. Check console for errors
2. Verify all dependencies are installed
3. Ensure correct start command in workflow
4. Try refreshing the workspace

#### Import Failed
1. Verify source permissions
2. Check file size limits
3. Ensure compatible project type
4. Contact support if issues persist

#### Collaboration Issues
1. Check internet connection
2. Verify project permissions
3. Try generating new Join Link
4. Ensure browser compatibility

## Support

### Getting Help
- Documentation: [docs.e-code.com](https://docs.e-code.com)
- Community Forum: [forum.e-code.com](https://forum.e-code.com)
- Email Support: support@e-code.com
- Core Members: Priority support channel

### Feedback
We'd love to hear from you:
- Feature requests: [feedback.e-code.com](https://feedback.e-code.com)
- Bug reports: Use in-app reporting
- Twitter: [@ecode](https://twitter.com/ecode)

## Coming Soon
- Native mobile apps (iOS & Android)
- Advanced deployment options
- Enterprise features (SSO, SCIM)
- GPU instances for ML workloads
- Expanded language support

---

Last updated: August 4, 2025