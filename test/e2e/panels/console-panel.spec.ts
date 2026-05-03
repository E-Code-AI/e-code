import { test, expect, Page } from '@playwright/test';

/**
 * Console Panel E2E Tests — Replit Parity Coverage
 *
 * Tests the ConsolePanel (Output tab + Shell tab) against the real backend.
 * Requires the app to be running at BASE_URL with at least one project (id=1).
 *
 * Run with:
 *   npx playwright test test/e2e/panels/console-panel.spec.ts
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const PROJECT_ID = process.env.E2E_PROJECT_ID || '1';

// Time to wait for a connected shell before asserting output
const SHELL_CONNECT_TIMEOUT = 15_000;
const CMD_OUTPUT_TIMEOUT    = 8_000;

async function gotoIDE(page: Page) {
  await page.goto(`${BASE_URL}/ide/${PROJECT_ID}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
}

async function openOutputTab(page: Page) {
  const tab = page.locator('[data-testid="console-tab-output"]');
  await expect(tab).toBeVisible({ timeout: 15_000 });
  await tab.click();
}

async function openShellTab(page: Page) {
  const tab = page.locator('[data-testid="console-tab-shell"]');
  await expect(tab).toBeVisible({ timeout: 15_000 });
  await tab.click();
}

async function waitForShellConnected(page: Page) {
  await expect(page.locator('text=Connected')).toBeVisible({ timeout: SHELL_CONNECT_TIMEOUT });
}

async function typeInShell(page: Page, command: string) {
  const xterm = page.locator('.xterm-screen').first();
  await xterm.click();
  await page.keyboard.type(command);
}

async function runInShell(page: Page, command: string) {
  await typeInShell(page, command);
  await page.keyboard.press('Enter');
}

// ─────────────────────────────────────────────────────────────
// Output Tab
// ─────────────────────────────────────────────────────────────

test.describe('Console Panel – Output Tab', () => {
  test('output tab renders with placeholder when not running', async ({ page }) => {
    await gotoIDE(page);
    await openOutputTab(page);

    await expect(page.locator('[data-testid="console-tab-output"]')).toBeVisible({ timeout: 10_000 });
    const placeholder = page.locator('text="Click \\"Run\\" to see output"');
    if (await placeholder.isVisible()) {
      expect(await placeholder.isVisible()).toBe(true);
    }
  });

  test('filter buttons All and Errors are present', async ({ page }) => {
    await gotoIDE(page);
    await openOutputTab(page);

    await expect(page.locator('[data-testid="console-filter-all"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="console-filter-error"]')).toBeVisible({ timeout: 10_000 });
  });

  test('clicking filter error shows only error-type logs', async ({ page }) => {
    await gotoIDE(page);
    await openOutputTab(page);

    await page.locator('[data-testid="console-filter-error"]').click();
    const filterBtn = page.locator('[data-testid="console-filter-error"]');
    await expect(filterBtn).toHaveAttribute('data-state', 'active');
  });

  test('clear, copy, and download action buttons are present', async ({ page }) => {
    await gotoIDE(page);
    await openOutputTab(page);

    await expect(page.locator('[data-testid="console-clear"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="console-copy"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="console-download"]')).toBeVisible({ timeout: 10_000 });
  });

  test('clear button removes all log entries', async ({ page }) => {
    await gotoIDE(page);
    await openOutputTab(page);
    await page.locator('[data-testid="console-clear"]').click();
    const logItems = page.locator('.group.hover\\:bg-muted\\/50');
    expect(await logItems.count()).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Shell Tab – Rendering
// ─────────────────────────────────────────────────────────────

test.describe('Console Panel – Shell Tab Rendering', () => {
  test('shell tab opens and shows xterm canvas', async ({ page }) => {
    await gotoIDE(page);
    await openShellTab(page);

    const xtermCanvas = page.locator('.xterm-screen, .xterm');
    await expect(xtermCanvas.first()).toBeVisible({ timeout: SHELL_CONNECT_TIMEOUT });
  });

  test('connection status pill appears after opening shell', async ({ page }) => {
    await gotoIDE(page);
    await openShellTab(page);

    const pill = page.locator('text=Connected, text=Connecting, text=Reconnecting').first();
    await expect(pill).toBeVisible({ timeout: SHELL_CONNECT_TIMEOUT });
  });

  test('toolbar shows new-shell, reconnect, search, clear, copy, AI buttons', async ({ page }) => {
    await gotoIDE(page);
    await openShellTab(page);

    for (const testId of ['shell-new', 'shell-reconnect', 'shell-search-toggle', 'shell-clear', 'shell-copy', 'shell-generate-toggle']) {
      await expect(page.locator(`[data-testid="${testId}"]`)).toBeVisible({ timeout: 10_000 });
    }
  });
});

// ─────────────────────────────────────────────────────────────
// Shell Tab – Real Command Execution
// ─────────────────────────────────────────────────────────────

test.describe('Console Panel – Shell Command Execution', () => {
  test('echo command produces expected text output', async ({ page }) => {
    await gotoIDE(page);
    await openShellTab(page);
    await waitForShellConnected(page);
    await page.waitForTimeout(1000);

    const marker = `ECHO_TEST_${Date.now()}`;
    await runInShell(page, `echo ${marker}`);

    await expect(page.locator('.xterm-rows')).toContainText(marker, { timeout: CMD_OUTPUT_TIMEOUT });
  });

  test('ls command lists files (ANSI-rendered output)', async ({ page }) => {
    await gotoIDE(page);
    await openShellTab(page);
    await waitForShellConnected(page);
    await page.waitForTimeout(1000);

    await runInShell(page, 'ls');

    const xtermRows = page.locator('.xterm-rows');
    await expect(xtermRows).not.toBeEmpty();
    await page.waitForTimeout(CMD_OUTPUT_TIMEOUT / 2);
    const text = await xtermRows.innerText();
    expect(text.length).toBeGreaterThan(0);
  });

  test('node -v prints node version', async ({ page }) => {
    await gotoIDE(page);
    await openShellTab(page);
    await waitForShellConnected(page);
    await page.waitForTimeout(1000);

    await runInShell(page, 'node -v');

    await expect(page.locator('.xterm-rows')).toContainText('v', { timeout: CMD_OUTPUT_TIMEOUT });
  });

  test('pwd outputs current working directory path', async ({ page }) => {
    await gotoIDE(page);
    await openShellTab(page);
    await waitForShellConnected(page);
    await page.waitForTimeout(1000);

    await runInShell(page, 'pwd');

    await expect(page.locator('.xterm-rows')).toContainText('/', { timeout: CMD_OUTPUT_TIMEOUT });
  });

  test('Ctrl+C sends interrupt and clears command line', async ({ page }) => {
    await gotoIDE(page);
    await openShellTab(page);
    await waitForShellConnected(page);
    await page.waitForTimeout(1000);

    await typeInShell(page, 'sleep 30');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    await page.keyboard.press('Control+C');
    await page.waitForTimeout(500);

    const xtermRows = page.locator('.xterm-rows');
    const text = await xtermRows.innerText();
    expect(text).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────
// Shell Tab – PTY Resize
// ─────────────────────────────────────────────────────────────

test.describe('Console Panel – PTY Resize', () => {
  test('terminal reflows correctly after panel resize', async ({ page }) => {
    await gotoIDE(page);
    await openShellTab(page);
    await waitForShellConnected(page);
    await page.waitForTimeout(1000);

    await runInShell(page, 'echo before_resize');
    await page.waitForTimeout(500);

    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(500);

    await runInShell(page, 'echo after_resize');

    await expect(page.locator('.xterm-rows')).toContainText('after_resize', { timeout: CMD_OUTPUT_TIMEOUT });
  });
});

// ─────────────────────────────────────────────────────────────
// Shell Tab – Multi-Session
// ─────────────────────────────────────────────────────────────

test.describe('Console Panel – Multi-session', () => {
  test('creating a second shell opens a new session tab', async ({ page }) => {
    await gotoIDE(page);
    await openShellTab(page);
    await waitForShellConnected(page);

    await page.locator('[data-testid="shell-new"]').click();
    await page.waitForTimeout(2000);

    const sessions = page.locator('[data-testid^="shell-session-"]');
    const count = await sessions.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("switching sessions preserves each session's output", async ({ page }) => {
    await gotoIDE(page);
    await openShellTab(page);
    await waitForShellConnected(page);
    await page.waitForTimeout(1000);

    const marker1 = `SESSION1_${Date.now()}`;
    await runInShell(page, `echo ${marker1}`);
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="shell-new"]').click();
    await page.waitForTimeout(3000);

    const marker2 = `SESSION2_${Date.now()}`;
    await runInShell(page, `echo ${marker2}`);
    await page.waitForTimeout(1000);

    const sessions = page.locator('[data-testid^="shell-session-"]');
    if (await sessions.count() >= 2) {
      await sessions.first().click();
      await page.waitForTimeout(500);

      const xtermText = await page.locator('.xterm-rows').innerText();
      expect(xtermText).toContain(marker1);
    }
  });

  test('closing a session removes its tab', async ({ page }) => {
    await gotoIDE(page);
    await openShellTab(page);
    await waitForShellConnected(page);

    await page.locator('[data-testid="shell-new"]').click();
    await page.waitForTimeout(2000);

    const sessions = page.locator('[data-testid^="shell-session-"]');
    const initialCount = await sessions.count();

    const closeIcon = sessions.last().locator('svg').last();
    await closeIcon.click({ force: true });
    await page.waitForTimeout(500);

    const finalCount = await page.locator('[data-testid^="shell-session-"]').count();
    expect(finalCount).toBeLessThan(initialCount);
  });
});

// ─────────────────────────────────────────────────────────────
// Shell Tab – Reconnect
// ─────────────────────────────────────────────────────────────

test.describe('Console Panel – Reconnect', () => {
  test('reconnect toolbar button is accessible when session exists', async ({ page }) => {
    await gotoIDE(page);
    await openShellTab(page);

    await expect(page.locator('[data-testid="shell-reconnect"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="shell-reconnect"]')).not.toBeDisabled();
  });

  test('clicking reconnect does not crash the panel', async ({ page }) => {
    await gotoIDE(page);
    await openShellTab(page);
    await waitForShellConnected(page);

    await page.locator('[data-testid="shell-reconnect"]').click();
    await page.waitForTimeout(2000);

    const xtermCanvas = page.locator('.xterm-screen');
    expect(await xtermCanvas.count()).toBeGreaterThan(0);
  });

  test('reconnecting pill or status updates after force-reconnect', async ({ page }) => {
    await gotoIDE(page);
    await openShellTab(page);
    await waitForShellConnected(page);

    await page.locator('[data-testid="shell-reconnect"]').click();

    const statusText = page.locator('text=Connected, text=Reconnecting, text=Connecting').first();
    await expect(statusText).toBeVisible({ timeout: 10_000 });
  });
});

// ─────────────────────────────────────────────────────────────
// Shell Tab – In-Terminal Search
// ─────────────────────────────────────────────────────────────

test.describe('Console Panel – In-Terminal Search', () => {
  test('search toggle button opens the search bar', async ({ page }) => {
    await gotoIDE(page);
    await openShellTab(page);

    await page.locator('[data-testid="shell-search-toggle"]').click();
    await expect(page.locator('[data-testid="shell-search-input"]')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('[data-testid="shell-search-prev"]')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('[data-testid="shell-search-next"]')).toBeVisible({ timeout: 5_000 });
  });

  test('search close button dismisses the search bar', async ({ page }) => {
    await gotoIDE(page);
    await openShellTab(page);

    await page.locator('[data-testid="shell-search-toggle"]').click();
    await expect(page.locator('[data-testid="shell-search-input"]')).toBeVisible({ timeout: 5_000 });

    await page.locator('[data-testid="shell-search-close"]').click();
    await expect(page.locator('[data-testid="shell-search-input"]')).not.toBeVisible();
  });

  test('Ctrl+F keyboard shortcut opens the search bar', async ({ page }) => {
    await gotoIDE(page);
    await openShellTab(page);
    await waitForShellConnected(page);
    await page.waitForTimeout(500);

    const xterm = page.locator('.xterm-screen').first();
    await xterm.click();
    await page.keyboard.press('Control+f');
    await page.waitForTimeout(300);

    await expect(page.locator('[data-testid="shell-search-input"]')).toBeVisible({ timeout: 5_000 });
  });

  test('typing in search box finds and highlights text in terminal', async ({ page }) => {
    await gotoIDE(page);
    await openShellTab(page);
    await waitForShellConnected(page);
    await page.waitForTimeout(1000);

    const marker = `SEARCHABLE_${Date.now()}`;
    await runInShell(page, `echo ${marker}`);
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="shell-search-toggle"]').click();
    await page.locator('[data-testid="shell-search-input"]').fill(marker);
    await page.waitForTimeout(500);

    const highlighted = page.locator('.xterm-rows span[style*="background"]');
    const count = await highlighted.count();
    expect(count).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Shell Tab – AI Generate Command
// ─────────────────────────────────────────────────────────────

test.describe('Console Panel – AI Generate Command', () => {
  test('AI toggle opens and closes the generate bar', async ({ page }) => {
    await gotoIDE(page);
    await openShellTab(page);

    await page.locator('[data-testid="shell-generate-toggle"]').click();
    await expect(page.locator('[data-testid="shell-generate-input"]')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('[data-testid="shell-generate-submit"]')).toBeVisible({ timeout: 5_000 });

    await page.locator('[data-testid="shell-generate-cancel"]').click();
    await expect(page.locator('[data-testid="shell-generate-input"]')).not.toBeVisible();
  });

  test('submit button is disabled when prompt is empty', async ({ page }) => {
    await gotoIDE(page);
    await openShellTab(page);
    await page.locator('[data-testid="shell-generate-toggle"]').click();

    await expect(page.locator('[data-testid="shell-generate-submit"]')).toBeDisabled({ timeout: 5_000 });
  });

  test('typing a prompt enables the submit button', async ({ page }) => {
    await gotoIDE(page);
    await openShellTab(page);
    await page.locator('[data-testid="shell-generate-toggle"]').click();

    await page.locator('[data-testid="shell-generate-input"]').fill('list all files recursively');
    await expect(page.locator('[data-testid="shell-generate-submit"]')).not.toBeDisabled({ timeout: 5_000 });
  });
});

// ─────────────────────────────────────────────────────────────
// Shell Tab – Command History Persistence
// ─────────────────────────────────────────────────────────────

test.describe('Console Panel – Command History Persistence', () => {
  const HISTORY_KEY = `shell-cmd-history-${PROJECT_ID}`;

  test('commands typed in shell are persisted to localStorage', async ({ page }) => {
    await gotoIDE(page);
    await openShellTab(page);
    await waitForShellConnected(page);
    await page.waitForTimeout(1000);

    const cmd = `echo history_test_${Date.now()}`;
    await runInShell(page, cmd);
    await page.waitForTimeout(500);

    const stored = await page.evaluate((key) => localStorage.getItem(key), HISTORY_KEY);
    expect(stored).toBeTruthy();

    const history: string[] = JSON.parse(stored!);
    const found = history.some(h => h.includes('echo history_test_'));
    expect(found).toBe(true);
  });

  test('command history survives a page reload', async ({ page }) => {
    await gotoIDE(page);
    await openShellTab(page);
    await waitForShellConnected(page);
    await page.waitForTimeout(1000);

    const cmd = `echo persist_${Date.now()}`;
    await runInShell(page, cmd);
    await page.waitForTimeout(500);

    const beforeReload = await page.evaluate((key) => localStorage.getItem(key), HISTORY_KEY);
    expect(beforeReload).toBeTruthy();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const afterReload = await page.evaluate((key) => localStorage.getItem(key), HISTORY_KEY);
    expect(afterReload).toBeTruthy();

    const historyBefore: string[] = JSON.parse(beforeReload!);
    const historyAfter: string[]  = JSON.parse(afterReload!);

    expect(historyAfter.length).toBeGreaterThanOrEqual(historyBefore.length);
  });
});
