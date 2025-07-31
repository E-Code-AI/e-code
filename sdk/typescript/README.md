# E-Code TypeScript SDK

Official TypeScript/JavaScript SDK for the E-Code development platform.

## Installation

```bash
npm install @e-code/sdk
```

## Quick Start

```typescript
import { ECodeSDK } from '@e-code/sdk';

// Initialize the SDK
const sdk = new ECodeSDK({
  apiKey: 'your-api-key',
  baseURL: 'https://e-code.dev/api' // Optional, defaults to production
});

// Create a new project
const project = await sdk.projects.create({
  name: 'My Awesome Project',
  language: 'javascript',
  description: 'A sample project using E-Code SDK'
});

console.log('Project created:', project.id);
```

## Authentication

You can authenticate in several ways:

### API Key
```typescript
const sdk = new ECodeSDK({
  apiKey: 'your-api-key'
});
```

### Set API Key Later
```typescript
const sdk = new ECodeSDK();
sdk.setApiKey('your-api-key');
```

## Core Features

### Projects

```typescript
// Create a project
const project = await sdk.projects.create({
  name: 'My Project',
  language: 'python',
  visibility: 'public'
});

// Get project
const project = await sdk.projects.get(123);

// Update project
await sdk.projects.update(123, {
  description: 'Updated description'
});

// List projects
const { items } = await sdk.projects.list({
  page: 1,
  pageSize: 20,
  language: 'javascript'
});

// Fork project
const forkedProject = await sdk.projects.fork(123, 'My Fork');
```

### Files

```typescript
// Create a file
const file = await sdk.files.create(projectId, {
  name: 'index.js',
  content: 'console.log("Hello, World!");',
  path: '/src'
});

// Get file
const file = await sdk.files.get(456);

// Update file content
await sdk.files.update(456, {
  content: 'console.log("Updated!");'
});

// Upload file
const uploadedFile = await sdk.files.upload(
  projectId,
  'package.json',
  JSON.stringify({ name: 'my-app' })
);

// Get file tree
const tree = await sdk.files.getTree(projectId);
```

### Deployments

```typescript
// Create deployment
const deployment = await sdk.deployments.create({
  projectId: 123,
  type: 'autoscale',
  name: 'production',
  environment: {
    NODE_ENV: 'production'
  },
  scaling: {
    minInstances: 1,
    maxInstances: 10
  }
});

// Deploy
const build = await sdk.deployments.deploy(deployment.id);

// Get logs
const { logs } = await sdk.deployments.getLogs(deployment.id, {
  limit: 100,
  since: '2024-01-01T00:00:00Z'
});

// Scale deployment
await sdk.deployments.scale(deployment.id, 5);
```

### AI Integration

```typescript
// Chat with AI
const response = await sdk.ai.chat({
  message: 'Generate a React component for a todo list',
  provider: 'openai',
  context: {
    projectId: 123,
    mode: 'assistant'
  }
});

// Generate code completion
const { completions } = await sdk.ai.complete(
  'function calculateSum(',
  'javascript'
);

// Explain code
const explanation = await sdk.ai.explain(
  'const result = array.reduce((acc, val) => acc + val, 0);',
  'javascript'
);

// Generate tests
const tests = await sdk.ai.generateTests(
  'function add(a, b) { return a + b; }',
  'javascript',
  'jest'
);

// Review code
const review = await sdk.ai.reviewCode(
  'function buggyFunction() { var x = 1; return x == "1"; }',
  'javascript'
);
```

### Collaboration

```typescript
// Start collaboration session
const session = await sdk.collaboration.startSession(projectId, {
  permissions: {
    read: true,
    write: true,
    admin: false
  }
});

// Send invite
const invite = await sdk.collaboration.sendInvite(projectId, {
  email: 'collaborator@example.com',
  role: 'editor',
  message: 'Join my project!'
});

// Update presence
await sdk.collaboration.updatePresence(session.id, {
  cursor: { line: 42, column: 10, fileId: 123 },
  status: 'active'
});

// Send message
await sdk.collaboration.sendMessage(session.id, 'Hello team!');
```

### Teams

```typescript
// Create team
const team = await sdk.teams.create({
  name: 'My Development Team',
  description: 'A team of awesome developers',
  visibility: 'private'
});

// Add member
await sdk.teams.addMember(team.id, 'user-id', 'admin');

// Create workspace
const workspace = await sdk.teams.createWorkspace(team.id, {
  name: 'Frontend Projects',
  projectIds: [123, 456]
});
```

### Integrations

```typescript
// Configure Slack
await sdk.integrations.configureSlack(projectId, {
  botToken: 'xoxb-your-token',
  channelId: 'C1234567890',
  notifications: ['deployments', 'builds']
});

// Send Slack message
await sdk.integrations.sendSlackMessage(projectId, {
  text: 'Deployment successful! 🚀',
  channel: '#general'
});

// Configure Datadog
await sdk.integrations.configureDatadog(projectId, {
  apiKey: 'your-datadog-key',
  appKey: 'your-app-key'
});

// Send metrics
await sdk.integrations.sendDatadogMetrics(projectId, [
  {
    timestamp: new Date().toISOString(),
    value: 42,
    labels: { environment: 'production' }
  }
]);
```

### Webhooks

```typescript
// Create webhook
const webhook = await sdk.webhooks.create({
  name: 'Deployment Webhook',
  url: 'https://myapp.com/webhook',
  events: ['deployment.created', 'deployment.failed'],
  projectId: '123'
});

// Get webhook statistics
const stats = await sdk.webhooks.getStats(projectId, webhook.id);

// Test webhook
const testResult = await sdk.webhooks.test(projectId, webhook.id, {
  test: 'payload'
});
```

## Error Handling

The SDK provides specific error types for different scenarios:

```typescript
import { APIError, AuthenticationError, ValidationError } from '@e-code/sdk';

try {
  const project = await sdk.projects.create({
    name: 'Test Project',
    language: 'javascript'
  });
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Authentication failed:', error.message);
  } else if (error instanceof ValidationError) {
    console.error('Validation error:', error.message, error.violations);
  } else if (error instanceof APIError) {
    console.error('API error:', error.status, error.message);
  }
}
```

## Configuration

### Base URL
```typescript
const sdk = new ECodeSDK({
  baseURL: 'https://your-custom-domain.com/api'
});
```

### Timeout
```typescript
const sdk = new ECodeSDK({
  timeout: 60000 // 60 seconds
});
```

### Update Configuration
```typescript
sdk.updateConfig({
  timeout: 30000,
  baseURL: 'https://staging.e-code.dev/api'
});
```

## Streaming Responses

For real-time AI responses:

```typescript
await sdk.ai.streamChat({
  message: 'Write a complex algorithm',
  provider: 'anthropic'
}, (chunk) => {
  process.stdout.write(chunk);
});
```

## TypeScript Support

The SDK is fully typed with TypeScript:

```typescript
import type { Project, User, DeploymentConfig } from '@e-code/sdk';

const project: Project = await sdk.projects.get(123);
const user: User = await sdk.users.getCurrentUser();

const deploymentConfig: DeploymentConfig = {
  type: 'autoscale',
  name: 'production',
  scaling: {
    minInstances: 1,
    maxInstances: 10
  }
};
```

## Testing Connection

```typescript
// Test if SDK can connect to E-Code API
const isConnected = await sdk.testConnection();
console.log('Connected:', isConnected);

// Get API status
const status = await sdk.getStatus();
console.log('API Status:', status);
```

## Examples

Check out the [examples directory](./examples/) for complete working examples:

- [Basic Project Management](./examples/basic-project.js)
- [AI-Powered Development](./examples/ai-development.js)
- [Team Collaboration](./examples/collaboration.js)
- [Deployment Automation](./examples/deployment.js)
- [Integration Setup](./examples/integrations.js)

## API Reference

For detailed API documentation, visit [https://docs.e-code.dev/sdk](https://docs.e-code.dev/sdk)

## Support

- Documentation: [https://docs.e-code.dev](https://docs.e-code.dev)
- Issues: [https://github.com/e-code/sdk-typescript/issues](https://github.com/e-code/sdk-typescript/issues)
- Community: [https://discord.gg/e-code](https://discord.gg/e-code)

## License

MIT © E-Code Team