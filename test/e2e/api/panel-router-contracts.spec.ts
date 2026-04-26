import { expect, test, type APIRequestContext } from '@playwright/test';

async function getCsrf(request: APIRequestContext) {
  const response = await request.get('/api/csrf-token');
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  return body.csrfToken || body.token || response.headers()['x-csrf-token'];
}

async function login(request: APIRequestContext) {
  const csrf = await getCsrf(request);
  const response = await request.post('/api/login', {
    headers: { 'X-CSRF-Token': csrf },
    data: {
      email: 'testuser@test.com',
      password: process.env.TEST_USER_PASSWORD || 'testpass123',
    },
  });
  expect(response.status(), await response.text()).toBe(200);
}

async function createProject(request: APIRequestContext) {
  const csrf = await getCsrf(request);
  const response = await request.post('/api/projects', {
    headers: { 'X-CSRF-Token': csrf },
    data: {
      name: `panel-router-${Date.now()}`,
      description: 'Panel router contract smoke workspace',
      language: 'html',
      visibility: 'private',
    },
  });
  expect(response.status(), await response.text()).toBe(200);
  const body = await response.json();
  return body.project || body;
}

async function expectOk(request: APIRequestContext, method: 'GET' | 'POST', url: string, data?: unknown) {
  const csrf = method === 'POST' ? await getCsrf(request) : undefined;
  const response = method === 'GET'
    ? await request.get(url)
    : await request.post(url, { headers: { 'X-CSRF-Token': csrf! }, data: data ?? {} });
  expect(response.status(), `${method} ${url}\n${await response.text()}`).toBe(200);
}

test.describe('Mounted IDE panels route contracts', () => {
  test('primary IDE panels have live backend routers', async ({ request }) => {
    await login(request);
    const project = await createProject(request);
    const projectId = Number(project.id);
    expect(projectId).toBeGreaterThan(0);

    const filesResponse = await request.get(`/api/projects/${projectId}/files`);
    expect(filesResponse.status(), await filesResponse.text()).toBe(200);
    const files = await filesResponse.json();
    const firstFile = files.find((file: any) => !file.isDirectory && file.type !== 'folder');
    expect(firstFile?.id).toBeTruthy();

    await expectOk(request, 'GET', `/api/projects/${projectId}/files/${firstFile.id}/history`);
    await expectOk(request, 'POST', '/api/search/global', {
      query: 'html',
      projectId,
      searchType: 'files',
      caseSensitive: false,
      wholeWord: false,
      useRegex: false,
    });

    await expectOk(request, 'GET', `/api/git/${projectId}/status`);
    await expectOk(request, 'GET', `/api/git/${projectId}/branches`);
    await expectOk(request, 'GET', `/api/git/${projectId}/commits`);
    await expectOk(request, 'GET', `/api/git/${projectId}/remotes`);
    await expectOk(request, 'GET', '/api/git/github/status');

    await expectOk(request, 'GET', `/api/debug/session/${projectId}`);
    await expectOk(request, 'GET', `/api/workspace/projects/${projectId}/tests/detect`);
    await expectOk(request, 'GET', `/api/workspace/projects/${projectId}/test-runs`);
    await expectOk(request, 'GET', `/api/workspace/projects/${projectId}/diagnostics`);
    await expectOk(request, 'GET', `/api/workspace/projects/${projectId}/build-logs`);

    await expectOk(request, 'GET', `/api/database/project/${projectId}`);
    await expectOk(request, 'GET', `/api/packages/installed?projectId=${projectId}`);
    await expectOk(request, 'GET', `/api/packages/${projectId}/audit`);
    await expectOk(request, 'GET', `/api/packages/${projectId}/outdated`);
    await expectOk(request, 'GET', `/api/packages/${projectId}/dependencies`);

    await expectOk(request, 'GET', `/api/projects/${projectId}/checkpoints`);
    await expectOk(request, 'GET', `/api/projects/${projectId}/files-with-history`);
    await expectOk(request, 'GET', `/api/env-vars/${projectId}`);
    await expectOk(request, 'GET', `/api/projects/${projectId}/settings`);
    await expectOk(request, 'GET', '/api/notifications/settings');
    await expectOk(request, 'GET', `/api/preview/url?projectId=${projectId}`);
    await expectOk(request, 'GET', `/api/preview/projects/${projectId}/preview/status`);
    await expectOk(request, 'POST', `/api/shell/${projectId}/shell/create`);
  });
});
