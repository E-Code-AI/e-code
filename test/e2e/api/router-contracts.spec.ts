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

test.describe('API router contracts', () => {
  test('static template routes are not swallowed by /:id', async ({ request }) => {
    const categories = await request.get('/api/templates/categories');
    expect(categories.status(), await categories.text()).toBe(200);
    expect(Array.isArray(await categories.json())).toBe(true);

    const collections = await request.get('/api/templates/collections');
    expect(collections.status(), await collections.text()).toBe(200);
    expect(Array.isArray(await collections.json())).toBe(true);

    const suggestions = await request.get('/api/templates/suggestions?q=re');
    expect(suggestions.status(), await suggestions.text()).toBe(200);
    expect(await suggestions.json()).toHaveProperty('suggestions');
  });

  test('public project slug route is not swallowed by /:projectId', async ({ request }) => {
    const response = await request.get('/api/projects/u/definitely-missing-user/definitely-missing-project');
    expect(response.status(), await response.text()).toBe(404);
    expect(await response.json()).toHaveProperty('code', 'USER_NOT_FOUND');
  });

  test('agent tools status has access to shared storage', async ({ request }) => {
    await login(request);
    const response = await request.get('/api/agent/tools/status');
    expect(response.status(), await response.text()).toBe(200);
    const body = await response.json();
    expect(body.webSearch.status).toBe('operational');
    expect(body.appTesting.status).toBe('operational');
  });
});
