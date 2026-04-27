import { expect, test, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test';

async function getCsrf(request: APIRequestContext) {
  const response = await request.get('/api/csrf-token');
  expect(response.status(), await response.text()).toBe(200);
  const body = await response.json();
  return body.csrfToken || body.token || response.headers()['x-csrf-token'];
}

async function login(request: APIRequestContext) {
  const csrf = await getCsrf(request);
  const response = await request.post('/api/login', {
    headers: { 'X-CSRF-Token': csrf },
    data: {
      email: process.env.TEST_USER_EMAIL || 'testuser@test.com',
      password: process.env.TEST_USER_PASSWORD || 'testpass123',
    },
  });
  expect(response.status(), await response.text()).toBe(200);
}

async function openAuthenticatedPage(context: BrowserContext, path: string, page?: Page) {
  const target = page || await context.newPage();
  await target.goto(path, { waitUntil: 'domcontentloaded' });
  return target;
}

test.describe('apps creation and preview regression', () => {
  test.setTimeout(180_000);

  test('creates an app from /apps and opens preview on desktop and mobile', async ({ browser, request }) => {
    await login(request);

    const context = await browser.newContext({
      storageState: await request.storageState(),
      viewport: { width: 1440, height: 900 },
    });

    let projectId: string | undefined;

    try {
      const page = await openAuthenticatedPage(context, '/apps');

      await expect(page.getByTestId('button-create-project')).toBeVisible({ timeout: 60_000 });
      await page.getByTestId('button-create-project').click();

      const projectName = `apps-preview-${Date.now()}`;
      await page.getByTestId('input-project-name').fill(projectName);
      await page.getByTestId('button-save').click();

      await page.waitForURL(/\/ide\/\d+/, { timeout: 90_000 });
      projectId = page.url().match(/\/ide\/(\d+)/)?.[1];
      expect(projectId).toBeTruthy();

      await page
        .locator('[data-testid="activity-preview"], [data-testid="tab-preview"], button[aria-label*="Preview" i], button[title*="Preview" i]')
        .first()
        .click();

      await expect(
        page.locator('[data-testid="preview-content"], [data-testid="preview-iframe"], [data-testid="preview-frame"]').first()
      ).toBeVisible({ timeout: 90_000 });

      const mobile = await context.newPage();
      await mobile.setViewportSize({ width: 390, height: 844 });
      await openAuthenticatedPage(context, `/mobile-workspace/${projectId}`, mobile);

      await expect(mobile.getByTestId('tab-preview')).toBeVisible({ timeout: 60_000 });
      await mobile.getByTestId('tab-preview').click();
      await expect(mobile.getByTestId('mobile-preview-panel')).toBeVisible({ timeout: 60_000 });
      await expect(mobile.getByTestId('preview-bootstrap-splash')).toHaveCount(0);
    } finally {
      await context.close();
      if (projectId) {
        const csrf = await getCsrf(request);
        await request.delete(`/api/projects/${projectId}`, {
          headers: { 'X-CSRF-Token': csrf },
        }).catch(() => undefined);
      }
    }
  });
});
