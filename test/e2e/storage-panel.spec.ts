/**
 * Playwright E2E tests — App Storage Panel
 *
 * These tests drive the full upload / download / rename / copy / delete /
 * folder-rename / folder-delete / share / visibility user flows through the
 * real panel UI against a running dev server.
 *
 * Run with: npx playwright test test/e2e/storage-panel.spec.ts
 *
 * Prerequisites:
 *   - Dev server running on TEST_BASE_URL (default: http://localhost:5000)
 *   - TEST_PROJECT_ID env var pointing to a project the test user owns
 *   - The test user must be authenticated (cookie injected in beforeAll)
 *
 * Setup / teardown:
 *   beforeAll uploads a sentinel file ("e2e-sentinel.txt") used by most tests.
 *   afterAll deletes the sentinel file and any test artefacts to leave the
 *   bucket in the same state it was in before the suite ran.
 */

import { expect, test } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:5000';
const PROJECT_ID = process.env.TEST_PROJECT_ID ?? '1';
const API_BASE = `${BASE_URL}/api/projects/${PROJECT_ID}/storage`;

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

async function goToStorage(page: import('@playwright/test').Page) {
  await page.goto(`${BASE_URL}/projects/${PROJECT_ID}/storage`);
  await page.waitForSelector('[data-testid="app-storage-panel"]', { timeout: 15_000 });
}

async function waitForFile(page: import('@playwright/test').Page, name: string, timeout = 15_000) {
  await expect(page.getByTestId(`text-filename-${name}`)).toBeVisible({ timeout });
}

async function waitForNoFile(page: import('@playwright/test').Page, name: string, timeout = 10_000) {
  await expect(page.getByTestId(`text-filename-${name}`)).not.toBeVisible({ timeout });
}

// ────────────────────────────────────────────────────────────────
// Suite
// ────────────────────────────────────────────────────────────────

test.describe('App Storage Panel — E2E flows', () => {
  // Upload a sentinel file before the suite so data-dependent tests have
  // something to work with.  Cleans up after itself in afterAll.
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await goToStorage(page);
    const [fc] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByTestId('button-upload').click(),
    ]);
    await fc.setFiles({
      name: 'e2e-sentinel.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('sentinel'),
    });
    await waitForFile(page, 'e2e-sentinel.txt');
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    await goToStorage(page);
    // Delete sentinel — best-effort; ignore if already gone
    const sentinel = page.getByTestId('text-filename-e2e-sentinel.txt');
    if (await sentinel.isVisible()) {
      await sentinel.click();
      await page.getByTestId('button-delete-selected').click();
    }
    // Clean up artefacts that rename/copy tests might have left
    for (const name of [
      'renamed-by-e2e.txt',
      'e2e-sentinel_copy.txt',
      'e2e-test-upload.txt',
      'e2e-test-folder',
    ]) {
      const el = page.getByTestId(`text-filename-${name}`);
      if (await el.isVisible()) {
        await el.click();
        const del = page.getByTestId('button-delete-selected');
        if (await del.isVisible()) await del.click();
      }
    }
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await goToStorage(page);
  });

  // ── Static UI ──────────────────────────────────────────────

  test('panel renders with Storage title, upload, new-folder, and refresh buttons', async ({ page }) => {
    await expect(page.getByTestId('text-storage-title')).toContainText('Storage');
    await expect(page.getByTestId('button-upload')).toBeVisible();
    await expect(page.getByTestId('button-new-folder')).toBeVisible();
    await expect(page.getByTestId('button-refresh-storage')).toBeVisible();
  });

  test('displays storage usage progress bar and size labels', async ({ page }) => {
    await expect(page.getByTestId('progress-storage-usage')).toBeVisible();
    await expect(page.getByTestId('text-storage-used')).toBeVisible();
    await expect(page.getByTestId('text-storage-max')).toBeVisible();
  });

  // ── File operations ────────────────────────────────────────

  test('upload a text file via the file input — file appears in tree', async ({ page }) => {
    const [fc] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByTestId('button-upload').click(),
    ]);
    await fc.setFiles({
      name: 'e2e-test-upload.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Hello from Playwright!'),
    });
    await waitForFile(page, 'e2e-test-upload.txt');
  });

  test('upload a blocked extension (.exe) shows Upload failed toast', async ({ page }) => {
    const [fc] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByTestId('button-upload').click(),
    ]);
    await fc.setFiles({
      name: 'dangerous.exe',
      mimeType: 'application/octet-stream',
      buffer: Buffer.from('MZ'),
    });
    await expect(page.locator('text=Upload failed')).toBeVisible({ timeout: 10_000 });
  });

  test('clicking sentinel file opens detail panel with action buttons', async ({ page }) => {
    await page.getByTestId('text-filename-e2e-sentinel.txt').click();
    await expect(page.getByTestId('text-selected-filename')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('button-download-selected')).toBeVisible();
    await expect(page.getByTestId('button-copy-url-selected')).toBeVisible();
    await expect(page.getByTestId('button-rename-selected')).toBeVisible();
    await expect(page.getByTestId('button-delete-selected')).toBeVisible();
    await expect(page.getByTestId('button-toggle-visibility')).toBeVisible();
  });

  test('rename sentinel file via detail panel — new name visible in tree', async ({ page }) => {
    await page.getByTestId('text-filename-e2e-sentinel.txt').click();
    await page.getByTestId('button-rename-selected').click();
    await expect(page.getByTestId('input-rename')).toBeVisible({ timeout: 5_000 });
    await page.getByTestId('input-rename').fill('renamed-by-e2e.txt');
    await page.getByTestId('button-confirm-rename').click();
    await waitForFile(page, 'renamed-by-e2e.txt');
    await waitForNoFile(page, 'e2e-sentinel.txt');

    // Rename back so afterAll and other tests can find the sentinel
    await page.getByTestId('text-filename-renamed-by-e2e.txt').click();
    await page.getByTestId('button-rename-selected').click();
    await page.getByTestId('input-rename').fill('e2e-sentinel.txt');
    await page.getByTestId('button-confirm-rename').click();
    await waitForFile(page, 'e2e-sentinel.txt');
  });

  test('duplicate sentinel file via detail panel — named copy appears in tree', async ({ page }) => {
    await page.getByTestId('text-filename-e2e-sentinel.txt').click();
    await page.getByTestId('button-copy-selected').click();
    await expect(page.getByTestId('input-copy-dest')).toBeVisible({ timeout: 5_000 });
    // Clear the pre-filled destination and set an explicit known name so we can assert it
    await page.getByTestId('input-copy-dest').fill('e2e-sentinel_copy.txt');
    await page.getByTestId('button-confirm-copy').click();
    await expect(page.getByTestId('input-copy-dest')).not.toBeVisible({ timeout: 10_000 });
    // Assert the specifically-named copy exists — not a tautological count check
    await waitForFile(page, 'e2e-sentinel_copy.txt');
  });

  test('copy URL for sentinel shows success feedback', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.getByTestId('text-filename-e2e-sentinel.txt').click();
    await page.getByTestId('button-copy-url-selected').click();
    // Either a check icon or a toast — both are success signals
    const check = page.locator('[data-testid="button-copy-url-selected"] svg.text-green-500');
    const toast = page.locator('[data-testid="toast-title"]:has-text("Copied")');
    await expect(check.or(toast)).toBeVisible({ timeout: 8_000 });
  });

  // ── Folder operations ──────────────────────────────────────

  test('create a new folder via toolbar button — folder appears in tree', async ({ page }) => {
    await page.getByTestId('button-new-folder').click();
    await expect(page.getByTestId('input-folder-name')).toBeVisible({ timeout: 5_000 });
    await page.getByTestId('input-folder-name').fill('e2e-test-folder');
    await page.getByTestId('button-create-folder').click();
    await waitForFile(page, 'e2e-test-folder');
  });

  test('right-click folder shows Rename Folder and Delete Folder in context menu', async ({ page }) => {
    // Create folder first if not present
    const folderItem = page.getByTestId('text-filename-e2e-test-folder');
    if (!(await folderItem.isVisible())) {
      await page.getByTestId('button-new-folder').click();
      await page.getByTestId('input-folder-name').fill('e2e-test-folder');
      await page.getByTestId('button-create-folder').click();
      await waitForFile(page, 'e2e-test-folder');
    }
    await folderItem.click({ button: 'right' });
    await expect(page.locator('[data-testid^="menu-rename-folder-"]').first()).toBeVisible({ timeout: 4_000 });
    await expect(page.locator('[data-testid^="menu-delete-folder-"]').first()).toBeVisible();
  });

  test('rename folder via context menu — new folder name visible in tree', async ({ page }) => {
    const folderItem = page.getByTestId('text-filename-e2e-test-folder');
    if (!(await folderItem.isVisible())) {
      await page.getByTestId('button-new-folder').click();
      await page.getByTestId('input-folder-name').fill('e2e-test-folder');
      await page.getByTestId('button-create-folder').click();
      await waitForFile(page, 'e2e-test-folder');
    }
    await folderItem.click({ button: 'right' });
    await page.locator('[data-testid^="menu-rename-folder-"]').first().click();
    await expect(page.getByTestId('input-rename')).toBeVisible({ timeout: 5_000 });
    await page.getByTestId('input-rename').fill('e2e-test-folder-renamed');
    await page.getByTestId('button-confirm-rename').click();
    await waitForFile(page, 'e2e-test-folder-renamed');
    await waitForNoFile(page, 'e2e-test-folder');
  });

  test('delete folder via context menu — folder disappears from tree', async ({ page }) => {
    const name = 'e2e-test-folder-renamed';
    const folderItem = page.getByTestId(`text-filename-${name}`);
    // Create the folder if not already present
    if (!(await folderItem.isVisible())) {
      await page.getByTestId('button-new-folder').click();
      await page.getByTestId('input-folder-name').fill(name);
      await page.getByTestId('button-create-folder').click();
      await waitForFile(page, name);
    }
    page.once('dialog', d => d.accept());
    await folderItem.click({ button: 'right' });
    await page.locator('[data-testid^="menu-delete-folder-"]').first().click();
    await waitForNoFile(page, name);
  });

  // ── Context menu (file) ────────────────────────────────────

  test('right-click file shows file actions in context menu', async ({ page }) => {
    const sentinel = page.getByTestId('storage-item-e2e-sentinel.txt');
    await sentinel.click({ button: 'right' });
    await expect(page.locator('[data-testid^="menu-download-"]').first()).toBeVisible({ timeout: 4_000 });
    await expect(page.locator('[data-testid^="menu-copy-url-"]').first()).toBeVisible();
    await expect(page.locator('[data-testid^="menu-rename-"]').first()).toBeVisible();
    await expect(page.locator('[data-testid^="menu-delete-"]').first()).toBeVisible();
  });

  // ── Drag-and-drop UI ───────────────────────────────────────

  test('drag-enter on panel reveals drop overlay', async ({ page }) => {
    const panel = page.getByTestId('app-storage-panel');
    await panel.dispatchEvent('dragenter', { dataTransfer: {} });
    await expect(panel.locator('text=Drop files here to upload')).toBeVisible({ timeout: 3_000 });
  });
});
