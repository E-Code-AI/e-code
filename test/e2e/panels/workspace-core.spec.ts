import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

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
  const name = `panel-smoke-${Date.now()}`;
  const response = await request.post('/api/projects', {
    headers: { 'X-CSRF-Token': csrf },
    data: {
      name,
      description: 'Panel smoke test workspace',
      language: 'html',
      visibility: 'private',
    },
  });
  expect(response.status(), await response.text()).toBe(200);
  const body = await response.json();
  return body.project || body;
}

async function openWorkspace(page: Page, projectId: number) {
  await page.goto(`/ide/${projectId}`);
  await expect(page.locator('[data-testid="ide-loading-auth"], [data-testid="ide-loading-layout"]')).toHaveCount(0, {
    timeout: 160_000,
  });
  await expect(page.locator('[data-testid="top-nav-bar"], [data-testid="status-bar"], [data-ide-layout="unified"]').first()).toBeVisible({
    timeout: 60_000,
  });
}

test.describe('IDE panel smoke: workspace core', () => {
  test('file explorer creates, renames, deletes a folder and preview resolves', async ({ page }) => {
    const request = page.context().request;
    await login(request);
    const project = await createProject(request);
    const projectId = Number(project.id);
    expect(projectId).toBeGreaterThan(0);

    await openWorkspace(page, projectId);

    const newFolderButton = page.locator('[data-testid="button-new-folder"]').first();
    await expect(newFolderButton).toBeVisible({ timeout: 60_000 });
    await newFolderButton.click();

    await page.locator('[data-testid="input-new-item-name"]').fill('smoke-folder');
    await page.locator('[data-testid="button-dialog-create-confirm"]').click();
    await expect(page.locator('text=smoke-folder').first()).toBeVisible({ timeout: 30_000 });

    const files = await request.get(`/api/projects/${projectId}/files`);
    expect(files.status(), await files.text()).toBe(200);
    const fileList = await files.json();
    const createdFolder = fileList.find((file: any) => file.name === 'smoke-folder' && (file.isDirectory || file.type === 'folder'));
    expect(createdFolder).toBeTruthy();

    let csrf = await getCsrf(request);
    const rename = await request.patch(`/api/projects/${projectId}/files/by-id/${createdFolder.id}`, {
      headers: { 'X-CSRF-Token': csrf },
      data: { name: 'smoke-folder-renamed' },
    });
    expect(rename.status(), await rename.text()).toBe(200);

    await page.locator('[data-testid="button-refresh-files"]').click();
    await expect(page.locator('text=smoke-folder-renamed').first()).toBeVisible({ timeout: 30_000 });
    const renamedFiles = await request.get(`/api/projects/${projectId}/files`);
    expect(renamedFiles.status(), await renamedFiles.text()).toBe(200);
    const renamedFileList = await renamedFiles.json();
    const renamedFolder = renamedFileList.find((file: any) => file.name === 'smoke-folder-renamed' && (file.isDirectory || file.type === 'folder'));
    expect(renamedFolder).toBeTruthy();

    csrf = await getCsrf(request);
    const deleted = await request.delete(`/api/projects/${projectId}/files/by-id/${renamedFolder.id}`, {
      headers: { 'X-CSRF-Token': csrf },
    });
    expect(deleted.status(), await deleted.text()).toBe(200);

    await page.locator('[data-testid="button-refresh-files"]').click();
    await expect(page.locator('text=smoke-folder-renamed').first()).toHaveCount(0, { timeout: 30_000 });

    csrf = await getCsrf(request);
    const startPreview = await request.post(`/api/preview/projects/${projectId}/preview/start`, {
      headers: { 'X-CSRF-Token': csrf },
      data: {},
    });
    expect([200, 202]).toContain(startPreview.status());

    const previewUrl = await request.get(`/api/preview/url?projectId=${projectId}`);
    expect(previewUrl.status(), await previewUrl.text()).toBe(200);
    const preview = await previewUrl.json();
    expect(preview.status).toMatch(/running|static|starting|stopped|no_runnable_files/);
  });
});
