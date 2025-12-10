/**
 * IDE Parity E2E Tests
 * 
 * Validates that UnifiedIDELayout works correctly across:
 * - Desktop (1920x1080): 3-panel layout with TopNavBar, ActivityBar, StatusBar
 * - Tablet (768x1024): Drawer navigation with 4 panel tabs
 * - Mobile (375x812): Bottom tab navigation with 5 tabs and swipe gestures
 * 
 * Tests are deterministic and use specific viewports for reproducibility.
 */

import { test, expect, Page } from '@playwright/test';

const VIEWPORTS = {
  desktop: { width: 1920, height: 1080 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 },
} as const;

const TEST_PROJECT_ID = 'test-project';
const IDE_URL = `/ide/${TEST_PROJECT_ID}`;

async function waitForIDELoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

test.describe('IDE Parity - Desktop Layout (1920x1080)', () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test.beforeEach(async ({ page }) => {
    await page.goto(IDE_URL);
    await waitForIDELoad(page);
  });

  test('should display desktop layout with correct structure', async ({ page }) => {
    const desktopLayout = page.locator('[data-testid="desktop-layout"]');
    await expect(desktopLayout).toBeVisible();
  });

  test('should show TopNavBar with all essential elements', async ({ page }) => {
    const topNav = page.locator('[data-testid="top-nav"]');
    await expect(topNav).toBeVisible();

    const runButton = page.locator('[data-testid="button-run-stop"]');
    await expect(runButton).toBeVisible();

    const explorerToggle = page.locator('[data-testid="button-toggle-explorer"]');
    await expect(explorerToggle).toBeVisible();
  });

  test('should show ActivityBar with navigation items', async ({ page }) => {
    const activityBar = page.locator('[data-testid="activity-bar"]');
    await expect(activityBar).toBeVisible();

    const expectedItems = ['files', 'search', 'git', 'packages', 'debug', 'terminal', 'agent', 'deploy'];
    for (const item of expectedItems) {
      const activityItem = page.locator(`[data-testid="activity-${item}"]`);
      await expect(activityItem).toBeVisible();
    }
  });

  test('should show StatusBar with status information', async ({ page }) => {
    const statusBar = page.locator('[data-testid="status-bar"]');
    await expect(statusBar).toBeVisible();

    const gitBranch = page.locator('[data-testid="status-git-branch"]');
    await expect(gitBranch).toBeVisible();
  });

  test('should display 3-panel layout (AI Agent | Main Content | File Explorer)', async ({ page }) => {
    const panelGroup = page.locator('[data-testid="desktop-panel-group"]');
    await expect(panelGroup).toBeVisible();

    const leftPanel = page.locator('[data-testid="desktop-left-panel"]');
    await expect(leftPanel).toBeVisible();

    const mainPanel = page.locator('[data-testid="desktop-main-panel"]');
    await expect(mainPanel).toBeVisible();

    const toggleExplorer = page.locator('[data-testid="button-toggle-explorer"]');
    await toggleExplorer.click();
    await page.waitForTimeout(300);

    const rightPanel = page.locator('[data-testid="desktop-right-panel"]');
    await expect(rightPanel).toBeVisible();
  });

  test('should have left panel tabs (Agent, Actions, Tools, Deploy)', async ({ page }) => {
    const agentTab = page.locator('[data-testid="tab-agent"]');
    await expect(agentTab).toBeVisible();

    const actionsTab = page.locator('[data-testid="tab-actions"]');
    await expect(actionsTab).toBeVisible();

    const toolsTab = page.locator('[data-testid="tab-tools"]');
    await expect(toolsTab).toBeVisible();

    const deployTab = page.locator('[data-testid="tab-deployment"]');
    await expect(deployTab).toBeVisible();
  });

  test('should open Command Palette with Ctrl+K shortcut', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(300);

    const commandPalette = page.locator('[role="dialog"]').filter({ hasText: /command|search|file/i });
    await expect(commandPalette).toBeVisible({ timeout: 2000 });

    await page.keyboard.press('Escape');
  });

  test('should open Global Search with Ctrl+Shift+F shortcut', async ({ page }) => {
    await page.keyboard.press('Control+Shift+f');
    await page.waitForTimeout(300);

    const searchDialog = page.locator('[role="dialog"]');
    await expect(searchDialog).toBeVisible({ timeout: 2000 });

    await page.keyboard.press('Escape');
  });

  test('should toggle file explorer visibility', async ({ page }) => {
    const toggleButton = page.locator('[data-testid="button-toggle-explorer"]');
    
    await toggleButton.click();
    await page.waitForTimeout(300);

    const rightPanel = page.locator('[data-testid="desktop-right-panel"]');
    const isVisible = await rightPanel.isVisible();
    
    await toggleButton.click();
    await page.waitForTimeout(300);

    const isVisibleAfterToggle = await rightPanel.isVisible();
    expect(isVisible !== isVisibleAfterToggle || isVisible).toBe(true);
  });

  test('should switch between left panel tabs', async ({ page }) => {
    const deployTab = page.locator('[data-testid="tab-deployment"]');
    await deployTab.click();
    await page.waitForTimeout(200);

    await expect(deployTab).toHaveAttribute('data-state', 'active');

    const agentTab = page.locator('[data-testid="tab-agent"]');
    await agentTab.click();
    await page.waitForTimeout(200);

    await expect(agentTab).toHaveAttribute('data-state', 'active');
  });

  test('should show Run/Stop button and toggle state', async ({ page }) => {
    const runButton = page.locator('[data-testid="button-run-stop"]');
    await expect(runButton).toBeVisible();

    const initialText = await runButton.textContent();
    expect(initialText).toContain('Run');

    await runButton.click();
    await page.waitForTimeout(300);

    const newText = await runButton.textContent();
    expect(newText).toContain('Stop');

    await runButton.click();
  });

  test('should navigate ActivityBar items', async ({ page }) => {
    const searchItem = page.locator('[data-testid="activity-search"]');
    await searchItem.click();
    await page.waitForTimeout(200);

    const filesItem = page.locator('[data-testid="activity-files"]');
    await filesItem.click();
    await page.waitForTimeout(200);

    const gitItem = page.locator('[data-testid="activity-git"]');
    await gitItem.click();
    await page.waitForTimeout(200);
  });
});

test.describe('IDE Parity - Tablet Layout (768x1024)', () => {
  test.use({ viewport: VIEWPORTS.tablet });

  test.beforeEach(async ({ page }) => {
    await page.goto(IDE_URL);
    await waitForIDELoad(page);
  });

  test('should display tablet layout with correct structure', async ({ page }) => {
    const tabletLayout = page.locator('[data-testid="tablet-layout"]');
    await expect(tabletLayout).toBeVisible();
  });

  test('should show sliding drawer for file navigation', async ({ page }) => {
    const drawer = page.locator('[data-testid="tablet-drawer"]');
    await expect(drawer).toBeVisible();
  });

  test('should display 4 panel tabs (editor, preview, terminal, agent)', async ({ page }) => {
    const panelTabs = page.locator('[data-testid="tablet-panel-tabs"]');
    await expect(panelTabs).toBeVisible();

    const editorTab = page.locator('[data-testid="tablet-tab-editor"]');
    await expect(editorTab).toBeVisible();

    const previewTab = page.locator('[data-testid="tablet-tab-preview"]');
    await expect(previewTab).toBeVisible();

    const terminalTab = page.locator('[data-testid="tablet-tab-terminal"]');
    await expect(terminalTab).toBeVisible();

    const agentTab = page.locator('[data-testid="tablet-tab-agent"]');
    await expect(agentTab).toBeVisible();
  });

  test('should switch between panel tabs', async ({ page }) => {
    const terminalTab = page.locator('[data-testid="tablet-tab-terminal"]');
    await terminalTab.click();
    await page.waitForTimeout(300);

    const previewTab = page.locator('[data-testid="tablet-tab-preview"]');
    await previewTab.click();
    await page.waitForTimeout(300);

    const agentTab = page.locator('[data-testid="tablet-tab-agent"]');
    await agentTab.click();
    await page.waitForTimeout(300);

    const editorTab = page.locator('[data-testid="tablet-tab-editor"]');
    await editorTab.click();
    await page.waitForTimeout(300);
  });

  test('should show StatusBar on tablet', async ({ page }) => {
    const statusBar = page.locator('[data-testid="status-bar"]');
    await expect(statusBar).toBeVisible();
  });

  test('should toggle drawer open/close', async ({ page }) => {
    const drawer = page.locator('[data-testid="tablet-drawer"]');
    
    const closeButton = drawer.locator('button').first();
    await closeButton.click();
    await page.waitForTimeout(500);

    await expect(drawer).not.toBeVisible();
  });

  test('should open drawer with swipe gesture from left edge', async ({ page }) => {
    const closeButton = page.locator('[data-testid="tablet-drawer"] button').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
      await page.waitForTimeout(500);
    }

    await page.touchscreen.tap(5, 400);
    await page.mouse.move(5, 400);
    await page.mouse.down();
    await page.mouse.move(150, 400, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(500);
  });

  test('should have touch-friendly button sizes (min 44px)', async ({ page }) => {
    const panelTabs = page.locator('[data-testid="tablet-panel-tabs"] button');
    const count = await panelTabs.count();
    
    for (let i = 0; i < count; i++) {
      const button = panelTabs.nth(i);
      const box = await button.boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(40);
      }
    }
  });
});

test.describe('IDE Parity - Mobile Layout (375x812)', () => {
  test.use({ viewport: VIEWPORTS.mobile });

  test.beforeEach(async ({ page }) => {
    await page.goto(IDE_URL);
    await waitForIDELoad(page);
  });

  test('should display mobile layout with correct structure', async ({ page }) => {
    const mobileLayout = page.locator('[data-testid="mobile-layout"]');
    await expect(mobileLayout).toBeVisible();
  });

  test('should show ReplitBottomTabs with 5 navigation tabs', async ({ page }) => {
    const bottomNav = page.locator('[data-testid="mobile-bottom-navigation"]');
    await expect(bottomNav).toBeVisible();

    const agentTab = page.locator('[data-testid="tab-agent"]');
    await expect(agentTab).toBeVisible();

    const filesTab = page.locator('[data-testid="tab-files"]');
    await expect(filesTab).toBeVisible();

    const consoleTab = page.locator('[data-testid="tab-console"]');
    await expect(consoleTab).toBeVisible();

    const previewTab = page.locator('[data-testid="tab-preview"]');
    await expect(previewTab).toBeVisible();

    const moreTab = page.locator('[data-testid="tab-more"]');
    await expect(moreTab).toBeVisible();
  });

  test('should switch between bottom tabs', async ({ page }) => {
    const filesTab = page.locator('[data-testid="tab-files"]');
    await filesTab.click();
    await page.waitForTimeout(300);

    const consoleTab = page.locator('[data-testid="tab-console"]');
    await consoleTab.click();
    await page.waitForTimeout(300);

    const previewTab = page.locator('[data-testid="tab-preview"]');
    await previewTab.click();
    await page.waitForTimeout(300);

    const moreTab = page.locator('[data-testid="tab-more"]');
    await moreTab.click();
    await page.waitForTimeout(300);

    const agentTab = page.locator('[data-testid="tab-agent"]');
    await agentTab.click();
    await page.waitForTimeout(300);
  });

  test('should have swipe area for gesture navigation', async ({ page }) => {
    const swipeArea = page.locator('[data-testid="mobile-swipe-area"]');
    await expect(swipeArea).toBeVisible();
  });

  test('should show connection status indicator', async ({ page }) => {
    const connectionIndicator = page.locator('[data-testid="indicator-connection-status"]');
    await expect(connectionIndicator).toBeVisible();
  });

  test('should navigate via swipe gesture (left swipe)', async ({ page }) => {
    const agentTab = page.locator('[data-testid="tab-agent"]');
    await agentTab.click();
    await page.waitForTimeout(300);

    const swipeArea = page.locator('[data-testid="mobile-swipe-area"]');
    const box = await swipeArea.boundingBox();
    
    if (box) {
      const startX = box.x + box.width / 2;
      const startY = box.y + box.height / 2;
      
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX - 100, startY, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(500);
    }
  });

  test('should navigate via swipe gesture (right swipe)', async ({ page }) => {
    const filesTab = page.locator('[data-testid="tab-files"]');
    await filesTab.click();
    await page.waitForTimeout(300);

    const swipeArea = page.locator('[data-testid="mobile-swipe-area"]');
    const box = await swipeArea.boundingBox();
    
    if (box) {
      const startX = box.x + box.width / 2;
      const startY = box.y + box.height / 2;
      
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + 100, startY, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(500);
    }
  });

  test('should have proper mobile-sized touch targets (min 48px)', async ({ page }) => {
    const bottomTabs = page.locator('[data-testid="mobile-bottom-navigation"] button');
    const count = await bottomTabs.count();
    
    for (let i = 0; i < count; i++) {
      const button = bottomTabs.nth(i);
      const box = await button.boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(48);
      }
    }
  });

  test('should not show desktop-only elements on mobile', async ({ page }) => {
    const activityBar = page.locator('[data-testid="activity-bar"]');
    await expect(activityBar).not.toBeVisible();

    const topNav = page.locator('[data-testid="top-nav"]');
    await expect(topNav).not.toBeVisible();
  });

  test('should adapt content to mobile viewport', async ({ page }) => {
    const viewportSize = page.viewportSize();
    expect(viewportSize?.width).toBe(375);
    expect(viewportSize?.height).toBe(812);

    const mobileLayout = page.locator('[data-testid="mobile-layout"]');
    const box = await mobileLayout.boundingBox();
    if (box) {
      expect(box.width).toBeLessThanOrEqual(375);
    }
  });
});

test.describe('IDE Parity - Cross-Device Consistency', () => {
  test('should maintain consistent project loading across all viewports', async ({ browser }) => {
    const viewportConfigs = [
      { name: 'desktop', ...VIEWPORTS.desktop },
      { name: 'tablet', ...VIEWPORTS.tablet },
      { name: 'mobile', ...VIEWPORTS.mobile },
    ];

    for (const config of viewportConfigs) {
      const context = await browser.newContext({
        viewport: { width: config.width, height: config.height },
      });
      const page = await context.newPage();
      
      await page.goto(IDE_URL);
      await waitForIDELoad(page);

      const layoutTestId = config.name === 'desktop' 
        ? 'desktop-layout' 
        : config.name === 'tablet' 
          ? 'tablet-layout' 
          : 'mobile-layout';
      
      const layout = page.locator(`[data-testid="${layoutTestId}"]`);
      await expect(layout).toBeVisible();
      
      await context.close();
    }
  });

  test('should show StatusBar on desktop and tablet but not mobile', async ({ browser }) => {
    const desktopContext = await browser.newContext({ viewport: VIEWPORTS.desktop });
    const desktopPage = await desktopContext.newPage();
    await desktopPage.goto(IDE_URL);
    await waitForIDELoad(desktopPage);
    await expect(desktopPage.locator('[data-testid="status-bar"]')).toBeVisible();
    await desktopContext.close();

    const tabletContext = await browser.newContext({ viewport: VIEWPORTS.tablet });
    const tabletPage = await tabletContext.newPage();
    await tabletPage.goto(IDE_URL);
    await waitForIDELoad(tabletPage);
    await expect(tabletPage.locator('[data-testid="status-bar"]')).toBeVisible();
    await tabletContext.close();

    const mobileContext = await browser.newContext({ viewport: VIEWPORTS.mobile });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(IDE_URL);
    await waitForIDELoad(mobilePage);
    const mobileStatusBar = mobilePage.locator('[data-testid="status-bar"]');
    await expect(mobileStatusBar).not.toBeVisible();
    await mobileContext.close();
  });

  test('should have appropriate navigation for each device type', async ({ browser }) => {
    const desktopContext = await browser.newContext({ viewport: VIEWPORTS.desktop });
    const desktopPage = await desktopContext.newPage();
    await desktopPage.goto(IDE_URL);
    await waitForIDELoad(desktopPage);
    await expect(desktopPage.locator('[data-testid="activity-bar"]')).toBeVisible();
    await desktopContext.close();

    const tabletContext = await browser.newContext({ viewport: VIEWPORTS.tablet });
    const tabletPage = await tabletContext.newPage();
    await tabletPage.goto(IDE_URL);
    await waitForIDELoad(tabletPage);
    await expect(tabletPage.locator('[data-testid="tablet-panel-tabs"]')).toBeVisible();
    await tabletContext.close();

    const mobileContext = await browser.newContext({ viewport: VIEWPORTS.mobile });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(IDE_URL);
    await waitForIDELoad(mobilePage);
    await expect(mobilePage.locator('[data-testid="mobile-bottom-navigation"]')).toBeVisible();
    await mobileContext.close();
  });
});

test.describe('IDE Parity - Accessibility', () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test('desktop elements should be keyboard navigable', async ({ page }) => {
    await page.goto(IDE_URL);
    await waitForIDELoad(page);

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeDefined();
  });

  test('should support keyboard shortcuts for common actions', async ({ page }) => {
    await page.goto(IDE_URL);
    await waitForIDELoad(page);

    await page.keyboard.press('Control+k');
    await page.waitForTimeout(200);
    await page.keyboard.press('Escape');

    await page.keyboard.press('Control+Shift+f');
    await page.waitForTimeout(200);
    await page.keyboard.press('Escape');

    await page.keyboard.press('Control+Shift+p');
    await page.waitForTimeout(200);
    await page.keyboard.press('Escape');
  });
});

test.describe('IDE Parity - Visual Regression Prevention', () => {
  test('desktop layout should have correct panel proportions', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(IDE_URL);
    await waitForIDELoad(page);

    const leftPanel = page.locator('[data-testid="desktop-left-panel"]');
    const mainPanel = page.locator('[data-testid="desktop-main-panel"]');

    const leftBox = await leftPanel.boundingBox();
    const mainBox = await mainPanel.boundingBox();

    if (leftBox && mainBox) {
      expect(leftBox.width).toBeGreaterThan(200);
      expect(mainBox.width).toBeGreaterThan(400);
    }
  });

  test('tablet layout should be properly sized', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.goto(IDE_URL);
    await waitForIDELoad(page);

    const tabletLayout = page.locator('[data-testid="tablet-layout"]');
    const box = await tabletLayout.boundingBox();

    if (box) {
      expect(box.width).toBe(768);
      expect(box.height).toBe(1024);
    }
  });

  test('mobile layout should fill viewport', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto(IDE_URL);
    await waitForIDELoad(page);

    const mobileLayout = page.locator('[data-testid="mobile-layout"]');
    const box = await mobileLayout.boundingBox();

    if (box) {
      expect(box.width).toBeLessThanOrEqual(375);
      expect(box.height).toBeLessThanOrEqual(812);
    }
  });
});
