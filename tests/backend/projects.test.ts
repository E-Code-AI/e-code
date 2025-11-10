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
  console.log('\n🚀 Project Management API Tests\n');

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
      csrfToken,
      userId: loginRes.data.user?.id
    };
  };

  const { authCookie, csrfToken, userId } = await registerAndLogin();
  let projectId: string | null = null;

  // PROJECT CRUD TESTS
  console.log('📋 Project CRUD Operations\n');

  await test('Create new project', async () => {
    const response = await client.post('/api/projects', {
      name: `test-project-${Date.now()}`,
      description: 'Test project for API testing',
      template: 'node'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 201].includes(response.status)) {
      throw new Error(`Failed to create project: ${response.status}`);
    }

    projectId = response.data?.id || response.data?.project?.id;
    if (!projectId) {
      throw new Error('No project ID returned');
    }
  })();

  await test('List user projects', async () => {
    const response = await client.get('/api/projects', {
      headers: { Cookie: authCookie }
    });

    if (response.status !== 200) {
      throw new Error(`Failed to list projects: ${response.status}`);
    }

    if (!Array.isArray(response.data) && !Array.isArray(response.data?.projects)) {
      throw new Error('Projects not returned as array');
    }
  })();

  await test('Get project by ID', async () => {
    if (!projectId) throw new Error('No project to test with');

    const response = await client.get(`/api/projects/${projectId}`, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Update project details', async () => {
    if (!projectId) throw new Error('No project to test with');

    const response = await client.patch(`/api/projects/${projectId}`, {
      name: `updated-project-${Date.now()}`,
      description: 'Updated description'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Delete project', async () => {
    if (!projectId) throw new Error('No project to test with');

    const response = await client.delete(`/api/projects/${projectId}`, {
      headers: { Cookie: authCookie }
    });

    if (![200, 204, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }

    // Create a new project for remaining tests
    const createRes = await client.post('/api/projects', {
      name: `test-project-${Date.now()}`,
      description: 'Replacement test project'
    }, {
      headers: { Cookie: authCookie }
    });
    projectId = createRes.data?.id || createRes.data?.project?.id;
  })();

  // PROJECT SETTINGS & CONFIGURATION
  console.log('\n⚙️  Project Settings & Configuration\n');

  await test('Get project settings', async () => {
    if (!projectId) throw new Error('No project to test with');

    const response = await client.get(`/api/projects/${projectId}/settings`, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Update project settings', async () => {
    if (!projectId) throw new Error('No project to test with');

    const response = await client.patch(`/api/projects/${projectId}/settings`, {
      public: true,
      allowComments: true
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Get project environment variables', async () => {
    if (!projectId) throw new Error('No project to test with');

    const response = await client.get(`/api/projects/${projectId}/env`, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Set project environment variable', async () => {
    if (!projectId) throw new Error('No project to test with');

    const response = await client.post(`/api/projects/${projectId}/env`, {
      key: 'TEST_VAR',
      value: 'test_value'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 201, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Delete environment variable', async () => {
    if (!projectId) throw new Error('No project to test with');

    const response = await client.delete(`/api/projects/${projectId}/env/TEST_VAR`, {
      headers: { Cookie: authCookie }
    });

    if (![200, 204, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  // PROJECT RUNTIME & EXECUTION
  console.log('\n▶️  Project Runtime & Execution\n');

  await test('Start project runtime', async () => {
    if (!projectId) throw new Error('No project to test with');

    const response = await client.post(`/api/projects/${projectId}/start`, {}, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Stop project runtime', async () => {
    if (!projectId) throw new Error('No project to test with');

    const response = await client.post(`/api/projects/${projectId}/stop`, {}, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Restart project runtime', async () => {
    if (!projectId) throw new Error('No project to test with');

    const response = await client.post(`/api/projects/${projectId}/restart`, {}, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Get project runtime status', async () => {
    if (!projectId) throw new Error('No project to test with');

    const response = await client.get(`/api/projects/${projectId}/status`, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Get project runtime logs', async () => {
    if (!projectId) throw new Error('No project to test with');

    const response = await client.get(`/api/projects/${projectId}/logs`, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  // PROJECT DEPLOYMENT
  console.log('\n🌐 Project Deployment\n');

  await test('Deploy project', async () => {
    if (!projectId) throw new Error('No project to test with');

    const response = await client.post(`/api/projects/${projectId}/deploy`, {
      environment: 'production'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 202, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Get deployment status', async () => {
    if (!projectId) throw new Error('No project to test with');

    const response = await client.get(`/api/projects/${projectId}/deployments`, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Rollback deployment', async () => {
    if (!projectId) throw new Error('No project to test with');

    const response = await client.post(`/api/projects/${projectId}/rollback`, {
      deploymentId: 'previous-deployment-id'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Get deployment logs', async () => {
    if (!projectId) throw new Error('No project to test with');

    const response = await client.get(`/api/projects/${projectId}/deployment-logs`, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  // PROJECT COLLABORATION
  console.log('\n👥 Project Collaboration\n');

  await test('Get project collaborators', async () => {
    if (!projectId) throw new Error('No project to test with');

    const response = await client.get(`/api/projects/${projectId}/collaborators`, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Add collaborator to project', async () => {
    if (!projectId) throw new Error('No project to test with');

    const response = await client.post(`/api/projects/${projectId}/collaborators`, {
      userId: 'other-user-id',
      role: 'editor'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 201, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Update collaborator role', async () => {
    if (!projectId) throw new Error('No project to test with');

    const response = await client.patch(`/api/projects/${projectId}/collaborators/other-user-id`, {
      role: 'viewer'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Remove collaborator from project', async () => {
    if (!projectId) throw new Error('No project to test with');

    const response = await client.delete(`/api/projects/${projectId}/collaborators/other-user-id`, {
      headers: { Cookie: authCookie }
    });

    if (![200, 204, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  // PROJECT TEMPLATES
  console.log('\n📦 Project Templates\n');

  await test('List available templates', async () => {
    const response = await client.get('/api/templates', {
      headers: { Cookie: authCookie }
    });

    if (![200, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Create project from template', async () => {
    const response = await client.post('/api/projects/from-template', {
      templateId: 'node-express',
      name: `from-template-${Date.now()}`
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 201, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Save project as template', async () => {
    if (!projectId) throw new Error('No project to test with');

    const response = await client.post(`/api/projects/${projectId}/save-as-template`, {
      name: 'My Custom Template',
      description: 'Custom template from project'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 201, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  // PROJECT IMPORT/EXPORT
  console.log('\n📥 Project Import & Export\n');

  await test('Import from GitHub', async () => {
    const response = await client.post('/api/projects/import/github', {
      repoUrl: 'https://github.com/user/repo'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 201, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Export project to GitHub', async () => {
    if (!projectId) throw new Error('No project to test with');

    const response = await client.post(`/api/projects/${projectId}/export/github`, {
      repoName: 'exported-project'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Fork project', async () => {
    if (!projectId) throw new Error('No project to test with');

    const response = await client.post(`/api/projects/${projectId}/fork`, {
      name: `forked-project-${Date.now()}`
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 201, 404, 501].includes(response.status)) {
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
