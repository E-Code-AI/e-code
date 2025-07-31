# E-Code SDK for JavaScript/TypeScript

Official SDK for interacting with the E-Code platform.

## Installation

```bash
npm install @ecode/sdk
# or
yarn add @ecode/sdk
```

## Quick Start

```javascript
import ECode from '@ecode/sdk';

// Initialize the SDK
const ecode = new ECode({
  apiKey: 'your-api-key' // or set ECODE_API_KEY env var
});

// Create and deploy a project
async function quickStart() {
  const { project, deployment, url } = await ecode.quickStart('my-app', 'nodejs');
  console.log(`Project deployed at: ${url}`);
}
```

## Authentication

```javascript
// Using API key
const ecode = new ECode({ apiKey: 'your-api-key' });

// Using username/password
const ecode = new ECode();
await ecode.login('username', 'password');
```

## Projects

```javascript
// Create a project
const project = await ecode.projects.create({
  name: 'my-project',
  template: 'react',
  visibility: 'private'
});

// List projects
const projects = await ecode.projects.list();

// Get project by ID or slug
const project = await ecode.projects.get('project-id');
const project = await ecode.projects.getBySlug('@username/project-name');

// Update project
await ecode.projects.update(project.id, {
  description: 'Updated description'
});

// Fork a project
const forked = await ecode.projects.fork(project.id, 'my-fork');
```

## Files

```javascript
// Get project files
const files = await ecode.projects.getFiles(project.id);

// Create a file
const file = await ecode.projects.createFile(
  project.id, 
  'src/index.js', 
  'console.log("Hello World");'
);

// Update a file
await ecode.projects.updateFile(file.id, 'console.log("Updated!");');

// Delete a file
await ecode.projects.deleteFile(file.id);
```

## Deployments

```javascript
// Deploy a project
const deployment = await ecode.deployments.deploy(project.id, {
  strategy: 'autoscale',
  region: 'us-east-1'
});

// Get deployment status
const status = await ecode.deployments.getStatus(deployment.id);

// List deployments
const deployments = await ecode.deployments.list(project.id);

// Rollback
await ecode.deployments.rollback(deployment.id);
```

## AI Assistant

```javascript
// Chat with AI
const response = await ecode.ai.chat([
  { role: 'user', content: 'Help me create a REST API' }
]);

// Get code completion
const completion = await ecode.ai.complete({
  code: 'function hello() {',
  language: 'javascript'
});

// Explain code
const explanation = await ecode.ai.explain(
  'const sum = arr.reduce((a, b) => a + b, 0);',
  'javascript'
);

// Generate tests
const tests = await ecode.ai.generateTests(
  'function add(a, b) { return a + b; }',
  'javascript'
);
```

## Real-time Collaboration

```javascript
// Connect to project collaboration
const session = await ecode.realtime.connect(project.id);

// Listen for collaborators
session.on('collaborator:joined', (user) => {
  console.log(`${user.name} joined`);
});

// Share cursor position
session.shareCursor({ line: 10, column: 5 });

// Listen for changes
session.on('document:change', (change) => {
  console.log('Document changed:', change);
});

// Disconnect
session.disconnect();
```

## Secrets Management

```javascript
// Add a secret
await ecode.secrets.add(project.id, 'API_KEY', 'secret-value');

// List secrets (values not shown)
const secrets = await ecode.secrets.list(project.id);

// Delete a secret
await ecode.secrets.delete(project.id, 'API_KEY');
```

## Package Management

```javascript
// Install packages
await ecode.packages.install(project.id, ['express', 'cors']);

// List installed packages
const packages = await ecode.packages.list(project.id);

// Update packages
await ecode.packages.update(project.id, ['express@latest']);

// Remove packages
await ecode.packages.remove(project.id, ['cors']);
```

## Analytics

```javascript
// Track custom events
await ecode.analytics.track('button_clicked', {
  button: 'deploy',
  projectId: project.id
});

// Get project analytics
const analytics = await ecode.analytics.getProjectAnalytics(project.id, {
  startDate: '2025-01-01',
  endDate: '2025-01-31'
});
```

## Webhooks

```javascript
// Create a webhook
const webhook = await ecode.webhooks.create({
  url: 'https://your-server.com/webhook',
  events: ['deployment.success', 'deployment.failed'],
  secret: 'webhook-secret'
});

// List webhooks
const webhooks = await ecode.webhooks.list();

// Delete webhook
await ecode.webhooks.delete(webhook.id);
```

## Error Handling

```javascript
try {
  const project = await ecode.projects.create({ name: 'test' });
} catch (error) {
  if (error.response?.status === 401) {
    console.error('Authentication failed');
  } else {
    console.error('Error:', error.message);
  }
}
```

## TypeScript Support

The SDK is written in TypeScript and provides full type definitions:

```typescript
import ECode, { Project, Deployment } from '@ecode/sdk';

const ecode = new ECode({ apiKey: 'key' });

const project: Project = await ecode.projects.create({
  name: 'my-project',
  template: 'typescript'
});
```

## License

MIT