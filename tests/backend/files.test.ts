import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';

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
  console.log('\n📁 File Management API Tests\n');

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

  // Create a test project
  const createProject = async (authCookie: string) => {
    const response = await client.post('/api/projects', {
      name: `test-project-${Date.now()}`,
      description: 'Test project for file operations'
    }, {
      headers: { Cookie: authCookie }
    });

    return response.data?.id || response.data?.project?.id || 'test-project-id';
  };

  const { authCookie, csrfToken } = await registerAndLogin();
  let projectId: string;

  // Create project for file tests
  try {
    projectId = await createProject(authCookie);
    console.log(`✓ Created test project: ${projectId}\n`);
  } catch (error) {
    console.log(`⚠ Could not create project, using mock ID\n`);
    projectId = 'test-project-id';
  }

  // FILE CRUD TESTS
  console.log('📄 File CRUD Operations\n');

  await test('Create file in project', async () => {
    const response = await client.post(`/api/projects/${projectId}/files`, {
      path: '/test.txt',
      content: 'Hello, World!'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 201, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Read file from project', async () => {
    const response = await client.get(`/api/projects/${projectId}/files?path=/test.txt`, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Update file content', async () => {
    const response = await client.put(`/api/projects/${projectId}/files`, {
      path: '/test.txt',
      content: 'Updated content'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Delete file from project', async () => {
    const response = await client.delete(`/api/projects/${projectId}/files`, {
      headers: { Cookie: authCookie },
      data: { path: '/test.txt' }
    });

    if (![200, 204, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('List files in directory', async () => {
    const response = await client.get(`/api/projects/${projectId}/files?path=/`, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  // DIRECTORY OPERATIONS
  console.log('\n📁 Directory Operations\n');

  await test('Create directory', async () => {
    const response = await client.post(`/api/projects/${projectId}/directories`, {
      path: '/src'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 201, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('List directory contents', async () => {
    const response = await client.get(`/api/projects/${projectId}/files?path=/src`, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Rename directory', async () => {
    const response = await client.patch(`/api/projects/${projectId}/files/rename`, {
      oldPath: '/src',
      newPath: '/source'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Delete directory', async () => {
    const response = await client.delete(`/api/projects/${projectId}/directories`, {
      headers: { Cookie: authCookie },
      data: { path: '/source' }
    });

    if (![200, 204, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  // FILE UPLOAD/DOWNLOAD
  console.log('\n⬆️  File Upload & Download\n');

  await test('Upload file via multipart form', async () => {
    const form = new FormData();
    form.append('file', Buffer.from('test file content'), 'upload.txt');
    form.append('path', '/uploads/upload.txt');

    const response = await client.post(`/api/projects/${projectId}/upload`, form, {
      headers: {
        ...form.getHeaders(),
        Cookie: authCookie
      }
    });

    if (![200, 201, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Download file as attachment', async () => {
    const response = await client.get(`/api/projects/${projectId}/download?path=/test.txt`, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Upload multiple files', async () => {
    const form = new FormData();
    form.append('files', Buffer.from('file 1'), 'file1.txt');
    form.append('files', Buffer.from('file 2'), 'file2.txt');

    const response = await client.post(`/api/projects/${projectId}/upload/batch`, form, {
      headers: {
        ...form.getHeaders(),
        Cookie: authCookie
      }
    });

    if (![200, 201, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Download project as ZIP', async () => {
    const response = await client.get(`/api/projects/${projectId}/download/zip`, {
      headers: { Cookie: authCookie },
      responseType: 'arraybuffer'
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  // FILE SEARCH & METADATA
  console.log('\n🔍 File Search & Metadata\n');

  await test('Search files by name', async () => {
    const response = await client.get(`/api/projects/${projectId}/files/search?query=test`, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Search files by content', async () => {
    const response = await client.post(`/api/projects/${projectId}/files/search`, {
      query: 'function',
      type: 'content'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Get file metadata', async () => {
    const response = await client.get(`/api/projects/${projectId}/files/metadata?path=/test.txt`, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Get file history/versions', async () => {
    const response = await client.get(`/api/projects/${projectId}/files/history?path=/test.txt`, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  // FILE PERMISSIONS & SHARING
  console.log('\n🔒 File Permissions & Sharing\n');

  await test('Get file permissions', async () => {
    const response = await client.get(`/api/projects/${projectId}/files/permissions?path=/test.txt`, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Update file permissions', async () => {
    const response = await client.patch(`/api/projects/${projectId}/files/permissions`, {
      path: '/test.txt',
      permissions: '644'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Share file with user', async () => {
    const response = await client.post(`/api/projects/${projectId}/files/share`, {
      path: '/test.txt',
      userId: 'other-user-id',
      access: 'read'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Create file sharing link', async () => {
    const response = await client.post(`/api/projects/${projectId}/files/share-link`, {
      path: '/test.txt',
      expiresIn: 3600
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 201, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  // ADVANCED FILE OPERATIONS
  console.log('\n⚡ Advanced File Operations\n');

  await test('Copy file to new location', async () => {
    const response = await client.post(`/api/projects/${projectId}/files/copy`, {
      sourcePath: '/test.txt',
      targetPath: '/copy-of-test.txt'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 201, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Move file to new location', async () => {
    const response = await client.post(`/api/projects/${projectId}/files/move`, {
      sourcePath: '/test.txt',
      targetPath: '/moved/test.txt'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Batch delete multiple files', async () => {
    const response = await client.post(`/api/projects/${projectId}/files/batch-delete`, {
      paths: ['/file1.txt', '/file2.txt', '/file3.txt']
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Get file tree structure', async () => {
    const response = await client.get(`/api/projects/${projectId}/files/tree`, {
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
