import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { ensureSeedProjects, login, openWorkspace, type SeedProject } from '../helpers/ide-test-helpers';

type PanelDefinition = {
  id: string;
  title: string;
  projectKind: SeedProject['kind'];
  surface: 'left-tab' | 'activity' | 'add-tab' | 'files';
  trigger: string;
  tabId?: string;
  scopeTestId: string;
  readySelector: string;
};

const panels: PanelDefinition[] = [
  { id: 'agent', title: 'Agent', surface: 'left-tab', trigger: 'tab-agent', scopeTestId: 'desktop-left-panel', projectKind: 'fresh', readySelector: '[data-testid="replit-agent-panel-v3"]' },
  { id: 'actions', title: 'Actions', surface: 'left-tab', trigger: 'tab-actions', scopeTestId: 'desktop-left-panel', projectKind: 'fresh', readySelector: 'text=Actions' },
  { id: 'tools', title: 'Tools', surface: 'left-tab', trigger: 'tab-tools', scopeTestId: 'desktop-left-panel', projectKind: 'fresh', readySelector: 'text=Tools' },
  { id: 'deployment-left', title: 'Deploy Left Panel', surface: 'left-tab', trigger: 'tab-deployment', scopeTestId: 'desktop-left-panel', projectKind: 'fresh', readySelector: 'text=Deploy' },
  { id: 'files', title: 'Files', surface: 'files', trigger: 'activity-files', scopeTestId: 'desktop-right-panel', projectKind: 'with-files', readySelector: '[data-testid="file-explorer"]' },
  { id: 'search', title: 'Search', surface: 'activity', trigger: 'activity-search', tabId: 'search', scopeTestId: 'desktop-main-panel', projectKind: 'with-files', readySelector: 'text=Search' },
  { id: 'git', title: 'Git', surface: 'activity', trigger: 'activity-git', tabId: 'git', scopeTestId: 'desktop-main-panel', projectKind: 'with-files', readySelector: '[data-testid="git-panel"], [data-testid="git-error-state"], [data-testid="git-no-project-state"]' },
  { id: 'packages', title: 'Packages', surface: 'activity', trigger: 'activity-packages', tabId: 'packages', scopeTestId: 'desktop-main-panel', projectKind: 'with-files', readySelector: 'text=Packages' },
  { id: 'debugger', title: 'Debugger', surface: 'activity', trigger: 'activity-debug', tabId: 'debugger', scopeTestId: 'desktop-main-panel', projectKind: 'with-files', readySelector: '[data-testid="button-debug-start"], [data-testid="button-empty-state-action"]' },
  { id: 'terminal', title: 'Terminal', surface: 'add-tab', trigger: 'shell', tabId: 'shell', scopeTestId: 'desktop-main-panel', projectKind: 'with-files', readySelector: '[data-testid="tab-shell"]' },
  { id: 'deployment', title: 'Deployment', surface: 'activity', trigger: 'activity-deploy', tabId: 'deployment', scopeTestId: 'desktop-main-panel', projectKind: 'fresh', readySelector: 'text=Deploy' },
  { id: 'secrets', title: 'Secrets', surface: 'activity', trigger: 'activity-secrets', tabId: 'secrets', scopeTestId: 'desktop-main-panel', projectKind: 'fresh', readySelector: '[data-testid="secrets-panel"], [data-testid="secrets-panel-no-project"]' },
  { id: 'database', title: 'Database', surface: 'activity', trigger: 'activity-database', tabId: 'database', scopeTestId: 'desktop-main-panel', projectKind: 'fresh', readySelector: 'text=Database' },
  { id: 'mcp-suite', title: 'MCP Suite', surface: 'activity', trigger: 'activity-mcp-suite', tabId: 'mcp-suite', scopeTestId: 'desktop-main-panel', projectKind: 'fresh', readySelector: 'text=MCP' },
  { id: 'preview', title: 'Preview', surface: 'activity', trigger: 'activity-preview', tabId: 'preview', scopeTestId: 'desktop-main-panel', projectKind: 'with-files', readySelector: '[data-testid="tab-preview"], [data-testid="preview-content"], [data-testid="preview-skeleton"], [data-testid="preview-iframe"]' },
  { id: 'workflows', title: 'Workflows', surface: 'activity', trigger: 'activity-workflows', tabId: 'workflows', scopeTestId: 'desktop-main-panel', projectKind: 'fresh', readySelector: 'text=Workflows' },
  { id: 'extensions', title: 'Extensions', surface: 'activity', trigger: 'activity-extensions', tabId: 'extensions', scopeTestId: 'desktop-main-panel', projectKind: 'fresh', readySelector: 'text=Extensions' },
  { id: 'settings', title: 'Settings', surface: 'activity', trigger: 'activity-settings', tabId: 'settings', scopeTestId: 'desktop-main-panel', projectKind: 'fresh', readySelector: 'text=Settings' },
  { id: 'testing', title: 'Testing', surface: 'add-tab', trigger: 'testing', scopeTestId: 'desktop-main-panel', projectKind: 'with-files', readySelector: '[data-testid="button-run-tests"], [data-testid="input-search-tests"]' },
  { id: 'problems', title: 'Problems', surface: 'add-tab', trigger: 'problems', scopeTestId: 'desktop-main-panel', projectKind: 'with-files', readySelector: 'text=Problems' },
  { id: 'output', title: 'Output', surface: 'add-tab', trigger: 'output', scopeTestId: 'desktop-main-panel', projectKind: 'with-files', readySelector: '[data-testid="button-clear-output"], [data-testid="input-search-output"]' },
  { id: 'history', title: 'History', surface: 'add-tab', trigger: 'history', scopeTestId: 'desktop-main-panel', projectKind: 'with-files', readySelector: 'text=History' },
  { id: 'console', title: 'Console', surface: 'add-tab', trigger: 'console', scopeTestId: 'desktop-main-panel', projectKind: 'with-files', readySelector: 'text=Console' },
];

const unsafeButtonPatterns = [
  /delete/i,
  /remove/i,
  /disconnect/i,
  /export/i,
  /upload/i,
  /attach/i,
  /voice/i,
  /send/i,
  /commit/i,
  /push/i,
  /pull/i,
  /sync/i,
  /fetch/i,
  /run/i,
  /start/i,
  /deploy/i,
  /publish/i,
  /share/i,
  /external/i,
  /account/i,
  /figma/i,
  /import/i,
  /billing/i,
  /ask-agent/i,
  /stop-all/i,
  /clear-past-runs/i,
  /show-latest/i,
  /branch-selector/i,
  /^tab-/i,
  /^activity-/i,
  /button-add-tab/i,
  /quick-action/i,
];

const neverClickButtonPatterns = [
  /clear-past-runs/i,
  /show-latest-toggle/i,
  /workflows-dropdown/i,
  /console-menu/i,
  /ask-agent/i,
  /stop-all/i,
  /^select-/i,
];

const allowedExplicitButtons = [
  /refresh/i,
  /clear/i,
  /toggle/i,
  /settings/i,
  /history/i,
  /new-chat/i,
  /new-file/i,
  /new-folder/i,
  /add-secret/i,
  /save-settings/i,
  /reset-settings/i,
  /terminal-new/i,
  /terminal-clear/i,
  /terminal-reset/i,
  /fullscreen/i,
  /retry/i,
  /model-selector/i,
  /fast/i,
];

function installConsoleGuards(page: Page) {
  const failures: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      failures.push(`console.error: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    failures.push(`pageerror: ${error.message}`);
  });
  return failures;
}

async function visibleEnabledButtons(scope: Locator) {
  const buttons = scope.locator('button:visible, [role="button"]:visible');
  const count = await buttons.count();
  const result: Locator[] = [];
  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    if (await button.isEnabled().catch(() => false)) {
      result.push(button);
    }
  }
  return result;
}

async function buttonIdentity(button: Locator) {
  const metadata = await button.evaluate((element) => {
    const htmlElement = element as HTMLElement;
    return {
      testId: htmlElement.getAttribute('data-testid'),
      aria: htmlElement.getAttribute('aria-label'),
      title: htmlElement.getAttribute('title'),
      text: htmlElement.innerText || htmlElement.textContent || '',
    };
  }).catch(() => null);

  if (!metadata) {
    return 'anonymous-button';
  }

  return [
    metadata.testId,
    metadata.aria,
    metadata.title,
    metadata.text,
  ].filter(Boolean).join(' ').trim() || 'anonymous-button';
}

function shouldClickButton(identity: string) {
  if (identity === 'anonymous-button') {
    return false;
  }
  if (neverClickButtonPatterns.some((pattern) => pattern.test(identity))) {
    return false;
  }
  if (unsafeButtonPatterns.some((pattern) => pattern.test(identity))) {
    return allowedExplicitButtons.some((pattern) => pattern.test(identity));
  }
  return true;
}

async function closeTransientUi(page: Page) {
  await page.keyboard.press('Escape').catch(() => undefined);
  const closeButtons = page.locator('[data-testid*="cancel"]:visible, [aria-label="Close"]:visible, [data-testid*="close"]:visible');
  const count = Math.min(await closeButtons.count().catch(() => 0), 3);
  for (let index = 0; index < count; index += 1) {
    await closeButtons.nth(index).click({ timeout: 1_000 }).catch(() => undefined);
  }
}

async function openPanel(page: Page, panel: PanelDefinition) {
  if (panel.surface === 'files' && await page.getByTestId('desktop-right-panel').isVisible({ timeout: 5_000 }).catch(() => false)) {
    // Already open from the persisted workspace state.
  } else if (panel.surface === 'add-tab') {
    await page.getByTestId('tab-add').click({ timeout: 30_000 });
    await page.getByTestId(`tool-item-${panel.trigger}`).click({ timeout: 30_000 });
  } else {
    await page.getByTestId(panel.trigger).click({ timeout: 30_000 });
  }
  const mainTab = panel.tabId ? page.getByTestId(`tab-${panel.tabId}`) : null;
  if (mainTab && await mainTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await mainTab.click({ timeout: 10_000 });
  }
  await expect(page.getByTestId(panel.scopeTestId)).toBeVisible({ timeout: 60_000 });
  await expect(page.locator(panel.readySelector).first()).toBeVisible({ timeout: 60_000 });
}

async function exerciseVisibleButtons(page: Page, panel: PanelDefinition, testInfo: TestInfo) {
  const scope = page.getByTestId(panel.scopeTestId);
  const clicked: string[] = [];

  for (let iteration = 0; iteration < 8; iteration += 1) {
    const buttons = await visibleEnabledButtons(scope);
    let clickedThisRound = false;

    for (const button of buttons) {
      const identity = await buttonIdentity(button);
      if (!shouldClickButton(identity) || clicked.includes(identity)) continue;

      await button.scrollIntoViewIfNeeded().catch(() => undefined);
      await button.click({ timeout: 5_000 }).catch((error) => {
        testInfo.attach(`click-failed-${panel.id}-${clicked.length}`, {
          body: `${identity}\n${error.message}`,
          contentType: 'text/plain',
        });
      });
      clicked.push(identity);
      clickedThisRound = true;
      await page.waitForTimeout(150);
      await closeTransientUi(page);
      break;
    }

    if (!clickedThisRound) {
      break;
    }
  }

  testInfo.attach(`clicked-buttons-${panel.id}`, {
    body: clicked.length ? clicked.join('\n') : 'No safe visible buttons clicked',
    contentType: 'text/plain',
  });
}

test.describe('IDE panels systematic coverage', () => {
  test.beforeEach(async ({ page }) => {
    await login(page.context().request);
  });

  for (const panel of panels) {
    test(`${panel.title} panel opens, safe buttons work, console stays clean`, async ({ page }, testInfo) => {
      const projects = await ensureSeedProjects(page.context().request);
      const project = projects.find((item) => item.kind === panel.projectKind) || projects[0];
      expect(project?.id).toBeGreaterThan(0);

      await openWorkspace(page, project.id);
      await expect(page.getByTestId('desktop-layout')).toBeVisible({ timeout: 60_000 });
      await openPanel(page, panel);
      const consoleFailures = installConsoleGuards(page);
      await exerciseVisibleButtons(page, panel, testInfo);
      await page.screenshot({
        path: testInfo.outputPath(`${panel.id}-${testInfo.project.name}.png`),
        fullPage: false,
      });

      expect(consoleFailures, consoleFailures.join('\n')).toEqual([]);
    });
  }
});
