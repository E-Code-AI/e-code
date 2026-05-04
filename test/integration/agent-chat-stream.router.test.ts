import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';

const streamChatMock = jest.fn<AsyncIterable<string>, [string, unknown, unknown]>();

jest.mock('../../server/middleware/auth', () => ({
  ensureAuthenticated: (req: Request, _res: Response, next: NextFunction) => {
    (req as unknown as { user: { id: number } }).user = { id: 42 };
    next();
  },
}));

jest.mock('../../server/middleware/upload-validation', () => ({
  createSecureUpload: () => ({
    single: () => (_req: Request, _res: Response, next: NextFunction) => next(),
    array: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  }),
  sanitizeFilename: (value: string) => value,
  validateUpload: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

jest.mock('../../server/middleware/admin-auth', () => ({
  ensureAdmin: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

jest.mock('../../server/services/agent-command-execution.service', () => ({
  agentCommandExecution: {},
}));

jest.mock('../../server/services/agent-file-operations.service', () => ({
  agentFileOperations: {},
}));

jest.mock('../../server/services/agent-orchestrator.service', () => ({
  agentOrchestrator: {},
}));

jest.mock('../../server/services/agent-preferences.service', () => ({
  AgentPreferencesService: class {
    getAvailableModels() { return []; }
    getUserPreferences() { return null; }
    updateUserPreferences() { return {}; }
    getRecommendedModel() { return 'gpt-4.1'; }
  },
}));

jest.mock('../../server/services/agent-tool-framework.service', () => ({
  agentToolFramework: {},
}));

jest.mock('../../server/services/agent-workflow-engine.service', () => ({
  agentWorkflowEngine: {},
}));

jest.mock('../../server/services/persistence-engine', () => ({
  withScopedTransaction: jest.fn(),
}));

jest.mock('../../server/services/schema-warming.service', () => ({
  schemaWarming: {},
}));

jest.mock('../../server/db', () => ({
  db: {},
}));

jest.mock('../../server/services/redis-cache.service', () => ({
  redisCache: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
    del: jest.fn().mockResolvedValue(true),
    sadd: jest.fn().mockResolvedValue(true),
    expire: jest.fn().mockResolvedValue(true),
    smembers: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../../server/ai/ai-provider-manager', () => ({
  aiProviderManager: {
    getDefaultProvider: () => ({ modelId: 'gpt-4.1', name: 'GPT-4.1' }),
    getModel: (modelId: string) => ({ id: modelId, provider: 'openai', name: modelId }),
    streamChat: (...args: [string, unknown, unknown]) => streamChatMock(...args),
  },
}));

jest.mock('../../server/utils/sse-headers', () => ({
  validateAndSetSSEHeaders: (res: { setHeader: (key: string, value: string) => void }) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    return true;
  },
}));

const router = require('../../server/routes/agent.router').default;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/agent', router);
  return app;
}

async function* iterFromArray(parts: string[]): AsyncGenerator<string> {
  for (const part of parts) yield part;
}

describe('POST /api/agent/chat/stream', () => {
  beforeEach(() => {
    streamChatMock.mockReset();
  });

  it('streams provider chunks directly with metadata and done sentinel', async () => {
    streamChatMock.mockImplementation(() => iterFromArray(['Fortune ', '500 ', 'CRM']));

    const res = await request(buildApp())
      .post('/api/agent/chat/stream')
      .set('Accept', 'text/event-stream')
      .send({
        projectId: 'crm-project',
        message: 'Create a Salesforce clone CRM website.',
        capabilities: { extendedThinking: true, appTesting: true, maxAutonomy: true },
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');
    expect(streamChatMock).toHaveBeenCalledTimes(1);
    expect(streamChatMock.mock.calls[0][0]).toBe('gpt-4.1');
    expect(res.text).toContain('"type":"thinking"');
    expect(res.text).toContain('"content":"Fortune "');
    expect(res.text).toContain('"content":"500 "');
    expect(res.text).toContain('"content":"CRM"');
    expect(res.text).toContain('"type":"metadata"');
    expect(res.text).toContain('data: [DONE]');
  });
});
