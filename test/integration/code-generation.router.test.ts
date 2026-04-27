// Route-level integration tests for /api/code-generation/*.
//
// Mounts the real router on a throwaway express app and drives it with
// supertest. The AI provider, rate limiter, and SSE-header guard are
// mocked at module level so the tests run hermetically — no Redis, no
// network, no real provider.

import express from 'express';
import request from 'supertest';

// --- Mocks must be set up *before* importing the router. ---
type StreamChatImpl = (
  model: string,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options: Record<string, unknown>,
) => AsyncIterable<string>;

const streamChatMock = jest.fn<AsyncIterable<string>, [string, unknown, unknown]>();
const getAvailableModelsMock = jest.fn();

jest.mock('../../server/ai/ai-provider-manager', () => ({
  aiProviderManager: {
    streamChat: (...args: Parameters<StreamChatImpl>) => streamChatMock(...args as unknown as [string, unknown, unknown]),
    getAvailableModels: () => getAvailableModelsMock(),
  },
}));

jest.mock('../../server/middleware/tier-rate-limiter', () => ({
  tierRateLimiters: {
    api: (_req: unknown, _res: unknown, next: () => void) => next(),
  },
}));

jest.mock('../../server/utils/sse-headers', () => ({
  validateAndSetSSEHeaders: (res: { setHeader: (k: string, v: string) => void }) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    return true;
  },
}));

// Heavy prompt strings — keep them out of the test surface.
jest.mock('../../server/ai/prompts/design-system', () => ({ DESIGN_SYSTEM_PROMPT: '' }));
jest.mock('../../server/ai/prompts/modern-design-system', () => ({ MODERN_DESIGN_SYSTEM_PROMPT: '' }));

// Tighten retry options so the test doesn't actually wait 1+ seconds.
jest.mock('../../server/routes/code-generation-retry', () => {
  const actual = jest.requireActual('../../server/routes/code-generation-retry') as typeof import('../../server/routes/code-generation-retry');
  return {
    ...actual,
    streamWithRetry: (
      factory: () => AsyncIterable<string>,
      deps: Parameters<typeof actual.streamWithRetry>[1],
      _options: unknown,
      onRetry?: Parameters<typeof actual.streamWithRetry>[3],
    ) => actual.streamWithRetry(
      factory,
      { ...deps, sleep: () => Promise.resolve(), random: () => 0.5 },
      { maxAttempts: 3, baseDelayMs: 1, factor: 2, jitter: 0 },
      onRetry,
    ),
  };
});

const router = require('../../server/routes/code-generation.router').default;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/code-generation', router);
  return app;
}

async function* iterFromArray(parts: string[]): AsyncGenerator<string> {
  for (const p of parts) yield p;
}

function iterThrowing(beforeYield: unknown): AsyncIterable<string> {
  return {
    [Symbol.asyncIterator]() {
      return {
        async next(): Promise<IteratorResult<string>> {
          throw beforeYield;
        },
      };
    },
  };
}

function parseSSE(body: string): Array<Record<string, unknown>> {
  return body
    .split('\n\n')
    .map((block) => block.trim())
    .filter((b) => b.startsWith('data:'))
    .map((b) => JSON.parse(b.slice(5).trim()));
}

beforeEach(() => {
  streamChatMock.mockReset();
  getAvailableModelsMock.mockReset();
});

describe('POST /api/code-generation/generate', () => {
  it('rejects an invalid payload with structured 400 (no SSE headers)', async () => {
    streamChatMock.mockImplementation(() => iterFromArray([]));
    const res = await request(buildApp())
      .post('/api/code-generation/generate')
      .send({ prompt: 'too short' }); // < 10 chars
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      error: 'VALIDATION_FAILED',
      retryable: false,
    });
    // Crucially: did NOT commit SSE headers.
    expect(res.headers['content-type']).toMatch(/json/);
  });

  it('streams a successful multi-file generation and ends with a complete event', async () => {
    streamChatMock.mockImplementation(() => iterFromArray([
      'Here is the project:\n\n',
      '--- src/App.tsx ---\n',
      '```tsx\nexport default function App(){return null}\n```\n\n',
      '--- tailwind.config.ts ---\n',
      '```ts\nexport default {};\n```\n',
    ]));
    const res = await request(buildApp())
      .post('/api/code-generation/generate')
      .send({ prompt: 'build me a tiny app please', language: 'typescript' });
    expect(res.status).toBe(200);
    const events = parseSSE(res.text);
    const types = events.map((e) => e.type);
    expect(types[0]).toBe('chunk');
    expect(types[types.length - 1]).toBe('complete');
    const completeEvent = events[events.length - 1];
    expect(completeEvent.filePaths).toEqual(
      expect.arrayContaining(['src/App.tsx', 'tailwind.config.ts']),
    );
  });

  it('emits a retry event then succeeds on a transient 503', async () => {
    let calls = 0;
    streamChatMock.mockImplementation(() => {
      calls++;
      if (calls === 1) return iterThrowing({ status: 503, message: 'unavailable' });
      return iterFromArray(['ok!\n']);
    });
    const res = await request(buildApp())
      .post('/api/code-generation/generate')
      .send({ prompt: 'small request please' });
    expect(res.status).toBe(200);
    const events = parseSSE(res.text);
    expect(events.find((e) => e.type === 'retry')).toMatchObject({
      attempt: 2,
      code: 'PROVIDER_UNAVAILABLE',
    });
    expect(events[events.length - 1].type).toBe('complete');
    expect(calls).toBe(2);
  });

  it('emits a structured error event when retries exhaust', async () => {
    streamChatMock.mockImplementation(() => iterThrowing({ status: 429, message: 'rate limit' }));
    const res = await request(buildApp())
      .post('/api/code-generation/generate')
      .send({ prompt: 'small request please' });
    // Headers were committed (SSE), so transport completes 200 with an error event in the stream.
    expect(res.status).toBe(200);
    const events = parseSSE(res.text);
    const errEvent = events.find((e) => e.type === 'error');
    expect(errEvent).toMatchObject({
      code: 'PROVIDER_RATE_LIMIT',
      retryable: true,
    });
  });

  it('rejects an absolute-path emission via the OutputGuard', async () => {
    streamChatMock.mockImplementation(() => iterFromArray([
      'preamble\n',
      '--- /etc/passwd ---\n', // absolute path → guard fails
      '```\nbad\n```\n',
    ]));
    const res = await request(buildApp())
      .post('/api/code-generation/generate')
      .send({ prompt: 'small request please' });
    expect(res.status).toBe(200);
    const events = parseSSE(res.text);
    const errEvent = events.find((e) => e.type === 'error');
    expect(errEvent).toMatchObject({
      code: 'GENERATION_FAILED',
      retryable: false,
    });
  });
});

describe('GET /api/code-generation/models', () => {
  it('returns models filtered to streaming-capable, with defaultModel', async () => {
    getAvailableModelsMock.mockReturnValue([
      { id: 'a', name: 'A', provider: 'p', description: 'd', maxTokens: 1000, costPer1kTokens: 1, supportsStreaming: true },
      { id: 'b', name: 'B', provider: 'p', description: 'd', maxTokens: 1000, costPer1kTokens: 1, supportsStreaming: false },
    ]);
    const res = await request(buildApp()).get('/api/code-generation/models');
    expect(res.status).toBe(200);
    expect(res.body.defaultModel).toBe('claude-opus-4-7');
    expect(res.body.models).toHaveLength(1);
    expect(res.body.models[0].id).toBe('a');
  });

  it('returns 500 with a sanitized error if the provider lookup throws', async () => {
    getAvailableModelsMock.mockImplementation(() => {
      throw new Error('provider crashed');
    });
    const res = await request(buildApp()).get('/api/code-generation/models');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to get available models' });
  });
});

describe('GET /api/code-generation/languages', () => {
  it('returns the static language list', async () => {
    const res = await request(buildApp()).get('/api/code-generation/languages');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.languages)).toBe(true);
    expect(res.body.languages.find((l: { id: string }) => l.id === 'typescript')).toBeTruthy();
  });
});
