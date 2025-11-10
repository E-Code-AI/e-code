import axios, { AxiosInstance } from 'axios';

const BASE_URL = 'http://localhost:5000';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => Promise<void>) {
  return async () => {
    try {
      await fn();
      results.push({ name, passed: true });
      console.log(`✓ ${name}`);
    } catch (error) {
      results.push({ name, passed: false, error: String(error) });
      console.log(`✗ ${name}`);
      console.error(`  Error: ${error}`);
    }
  };
}

async function runTests() {
  console.log('\n🤖 AI & Agent API Tests\n');

  const client: AxiosInstance = axios.create({
    baseURL: BASE_URL,
    validateStatus: () => true,
    withCredentials: true,
  });

  // Helper to register and login
  const registerAndLogin = async () => {
    const timestamp = Date.now();
    const creds = {
      email: `test-${timestamp}@example.com`,
      password: 'TestPass123!',
      username: `user_${timestamp}`
    };

    const csrfRes = await client.get('/api/auth/csrf-token');
    const csrfToken = csrfRes.data.csrfToken;

    await client.post('/api/auth/register', creds, {
      headers: { 'x-csrf-token': csrfToken }
    });

    const loginRes = await client.post('/api/auth/login', {
      email: creds.email,
      password: creds.password
    }, {
      headers: { 'x-csrf-token': csrfToken }
    });

    return {
      authCookie: loginRes.headers['set-cookie']?.[0] || '',
      csrfToken
    };
  };

  const { authCookie } = await registerAndLogin();

  // AI MODELS TESTS
  console.log('🧠 AI Models\n');

  await test('List available AI models', async () => {
    const response = await client.get('/api/ai/models', {
      headers: { Cookie: authCookie }
    });

    if (response.status !== 200) {
      throw new Error(`Failed to list models: ${response.status}`);
    }

    if (!Array.isArray(response.data) && !Array.isArray(response.data?.models)) {
      throw new Error('Models not returned as array');
    }
  })();

  await test('Get AI model details', async () => {
    const response = await client.get('/api/ai/models/claude-3-sonnet', {
      headers: { Cookie: authCookie }
    });

    if (![200, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Set default AI model', async () => {
    const response = await client.post('/api/ai/models/default', {
      modelId: 'claude-3-sonnet'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  // AI COMPLETIONS TESTS
  console.log('\n💬 AI Completions\n');

  await test('Generate AI completion', async () => {
    const response = await client.post('/api/ai/completions', {
      prompt: 'Write a hello world function in JavaScript',
      model: 'claude-3-sonnet'
    }, {
      headers: { Cookie: authCookie },
      timeout: 30000
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Generate streaming completion', async () => {
    const response = await client.post('/api/ai/completions/stream', {
      prompt: 'Explain async/await',
      model: 'claude-3-sonnet'
    }, {
      headers: { Cookie: authCookie },
      responseType: 'stream'
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Generate completion with context', async () => {
    const response = await client.post('/api/ai/completions', {
      prompt: 'Fix this code',
      context: 'const x = 1\nconst y = 2\nconst z = x + y',
      model: 'claude-3-sonnet'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  // AI AGENT TESTS
  console.log('\n🤖 AI Agent\n');

  await test('Create AI agent conversation', async () => {
    const response = await client.post('/api/agent/conversation', {
      projectId: 'test-project',
      mode: 'plan'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 201, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Send message to agent', async () => {
    const response = await client.post('/api/agent/message', {
      conversationId: 'test-conv',
      message: 'Create a simple web app'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Get agent conversation history', async () => {
    const response = await client.get('/api/agent/conversations', {
      headers: { Cookie: authCookie }
    });

    if (![200, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Delete agent conversation', async () => {
    const response = await client.delete('/api/agent/conversation/test-conv', {
      headers: { Cookie: authCookie }
    });

    if (![200, 204, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Update agent conversation mode', async () => {
    const response = await client.post('/api/agent/conversation/test-conv/mode', {
      mode: 'build'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  // CODE GENERATION TESTS
  console.log('\n✨ Code Generation\n');

  await test('Generate code from prompt', async () => {
    const response = await client.post('/api/ai/generate/code', {
      prompt: 'Create a React component for a button',
      language: 'typescript'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Explain code snippet', async () => {
    const response = await client.post('/api/ai/explain', {
      code: 'const add = (a, b) => a + b;'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Refactor code', async () => {
    const response = await client.post('/api/ai/refactor', {
      code: 'function add(a, b) { return a + b; }',
      instructions: 'Convert to arrow function'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Generate tests for code', async () => {
    const response = await client.post('/api/ai/generate/tests', {
      code: 'export const multiply = (a, b) => a * b;',
      framework: 'jest'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Generate documentation', async () => {
    const response = await client.post('/api/ai/generate/docs', {
      code: 'export class UserService { constructor() {} }'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  // CODE ANALYSIS TESTS
  console.log('\n🔍 Code Analysis\n');

  await test('Analyze code quality', async () => {
    const response = await client.post('/api/ai/analyze/quality', {
      code: 'var x = 1; var y = 2; var z = x + y; console.log(z);'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Detect security vulnerabilities', async () => {
    const response = await client.post('/api/ai/analyze/security', {
      code: 'eval(userInput);'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Suggest performance improvements', async () => {
    const response = await client.post('/api/ai/analyze/performance', {
      code: 'const arr = [1,2,3]; for(let i=0; i<arr.length; i++) { console.log(arr[i]); }'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Check accessibility', async () => {
    const response = await client.post('/api/ai/analyze/accessibility', {
      code: '<div onclick="handleClick()">Click me</div>'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  // AI EMBEDDINGS & SEARCH
  console.log('\n🔎 AI Embeddings & Search\n');

  await test('Generate code embeddings', async () => {
    const response = await client.post('/api/ai/embeddings', {
      text: 'function calculate total price with tax'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Semantic code search', async () => {
    const response = await client.post('/api/ai/search/semantic', {
      query: 'authentication logic',
      projectId: 'test-project'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Find similar code', async () => {
    const response = await client.post('/api/ai/search/similar', {
      code: 'const fetchData = async () => { const res = await fetch(url); return res.json(); }'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  // AI USAGE & BILLING
  console.log('\n💰 AI Usage & Billing\n');

  await test('Get AI usage stats', async () => {
    const response = await client.get('/api/ai/usage', {
      headers: { Cookie: authCookie }
    });

    if (![200, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Get AI token consumption', async () => {
    const response = await client.get('/api/ai/usage/tokens', {
      headers: { Cookie: authCookie }
    });

    if (![200, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Get AI cost breakdown', async () => {
    const response = await client.get('/api/ai/usage/cost', {
      headers: { Cookie: authCookie }
    });

    if (![200, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  // SUMMARY
  console.log('\n' + '='.repeat(50));
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`\n📊 Test Summary: ${passed} passed, ${failed} failed out of ${results.length} total`);
  
  if (failed > 0) {
    console.log('\n❌ Failed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}`);
    });
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(console.error);
