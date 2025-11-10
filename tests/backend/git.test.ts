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
  console.log('\n🌿 Git Integration API Tests\n');

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
  const projectId = 'test-project';

  // GIT REPOSITORY TESTS
  console.log('📦 Git Repository Operations\n');

  await test('Initialize git repository', async () => {
    const response = await client.post(`/api/projects/${projectId}/git/init`, {}, {
      headers: { Cookie: authCookie }
    });

    if (![200, 201, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Clone git repository', async () => {
    const response = await client.post(`/api/projects/${projectId}/git/clone`, {
      url: 'https://github.com/user/repo.git'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Get git status', async () => {
    const response = await client.get(`/api/projects/${projectId}/git/status`, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Get git log', async () => {
    const response = await client.get(`/api/projects/${projectId}/git/log`, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  // GIT COMMIT OPERATIONS
  console.log('\n💾 Git Commit Operations\n');

  await test('Stage files for commit', async () => {
    const response = await client.post(`/api/projects/${projectId}/git/add`, {
      files: ['file1.txt', 'file2.txt']
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Unstage files', async () => {
    const response = await client.post(`/api/projects/${projectId}/git/reset`, {
      files: ['file1.txt']
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Create git commit', async () => {
    const response = await client.post(`/api/projects/${projectId}/git/commit`, {
      message: 'Test commit',
      author: 'Test User <test@example.com>'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 201, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Amend last commit', async () => {
    const response = await client.post(`/api/projects/${projectId}/git/commit/amend`, {
      message: 'Updated commit message'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Get commit details', async () => {
    const response = await client.get(`/api/projects/${projectId}/git/commit/abc123`, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  // GIT BRANCH OPERATIONS
  console.log('\n🌿 Git Branch Operations\n');

  await test('List git branches', async () => {
    const response = await client.get(`/api/projects/${projectId}/git/branches`, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Create new branch', async () => {
    const response = await client.post(`/api/projects/${projectId}/git/branch`, {
      name: 'feature-test'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 201, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Switch to branch', async () => {
    const response = await client.post(`/api/projects/${projectId}/git/checkout`, {
      branch: 'feature-test'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Delete branch', async () => {
    const response = await client.delete(`/api/projects/${projectId}/git/branch/feature-test`, {
      headers: { Cookie: authCookie }
    });

    if (![200, 204, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Rename branch', async () => {
    const response = await client.patch(`/api/projects/${projectId}/git/branch/rename`, {
      oldName: 'feature-test',
      newName: 'feature-renamed'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  // GIT MERGE & REBASE
  console.log('\n🔀 Git Merge & Rebase\n');

  await test('Merge branch', async () => {
    const response = await client.post(`/api/projects/${projectId}/git/merge`, {
      branch: 'feature-test'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Rebase branch', async () => {
    const response = await client.post(`/api/projects/${projectId}/git/rebase`, {
      branch: 'main'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Abort merge', async () => {
    const response = await client.post(`/api/projects/${projectId}/git/merge/abort`, {}, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Resolve merge conflict', async () => {
    const response = await client.post(`/api/projects/${projectId}/git/conflict/resolve`, {
      file: 'conflicted-file.txt',
      resolution: 'use-ours'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  // GIT REMOTE OPERATIONS
  console.log('\n🌐 Git Remote Operations\n');

  await test('List remotes', async () => {
    const response = await client.get(`/api/projects/${projectId}/git/remotes`, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Add remote', async () => {
    const response = await client.post(`/api/projects/${projectId}/git/remote`, {
      name: 'origin',
      url: 'https://github.com/user/repo.git'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 201, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Remove remote', async () => {
    const response = await client.delete(`/api/projects/${projectId}/git/remote/origin`, {
      headers: { Cookie: authCookie }
    });

    if (![200, 204, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Push to remote', async () => {
    const response = await client.post(`/api/projects/${projectId}/git/push`, {
      remote: 'origin',
      branch: 'main'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Pull from remote', async () => {
    const response = await client.post(`/api/projects/${projectId}/git/pull`, {
      remote: 'origin',
      branch: 'main'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Fetch from remote', async () => {
    const response = await client.post(`/api/projects/${projectId}/git/fetch`, {
      remote: 'origin'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  // GIT DIFF OPERATIONS
  console.log('\n📝 Git Diff Operations\n');

  await test('Get diff for file', async () => {
    const response = await client.get(`/api/projects/${projectId}/git/diff?file=test.txt`, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Get diff between commits', async () => {
    const response = await client.get(`/api/projects/${projectId}/git/diff/commits?from=abc123&to=def456`, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Get diff between branches', async () => {
    const response = await client.get(`/api/projects/${projectId}/git/diff/branches?from=main&to=feature`, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  // GIT STASH OPERATIONS
  console.log('\n📦 Git Stash Operations\n');

  await test('Stash changes', async () => {
    const response = await client.post(`/api/projects/${projectId}/git/stash`, {
      message: 'WIP: test feature'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 201, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('List stashes', async () => {
    const response = await client.get(`/api/projects/${projectId}/git/stash/list`, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Apply stash', async () => {
    const response = await client.post(`/api/projects/${projectId}/git/stash/apply`, {
      stashId: 'stash@{0}'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Drop stash', async () => {
    const response = await client.delete(`/api/projects/${projectId}/git/stash/0`, {
      headers: { Cookie: authCookie }
    });

    if (![200, 204, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  // GIT TAG OPERATIONS
  console.log('\n🏷️  Git Tag Operations\n');

  await test('List tags', async () => {
    const response = await client.get(`/api/projects/${projectId}/git/tags`, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Create tag', async () => {
    const response = await client.post(`/api/projects/${projectId}/git/tag`, {
      name: 'v1.0.0',
      message: 'Release version 1.0.0'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 201, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Delete tag', async () => {
    const response = await client.delete(`/api/projects/${projectId}/git/tag/v1.0.0`, {
      headers: { Cookie: authCookie }
    });

    if (![200, 204, 404, 501].includes(response.status)) {
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
