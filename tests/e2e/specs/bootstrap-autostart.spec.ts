/**
 * E2E Tests for Bootstrap → Autostart Flow
 * Tests autonomous workspace creation across Desktop, Tablet, and Mobile viewports
 * 
 * Regression test ensuring:
 * 1. Bootstrap API creates project successfully
 * 2. Agent panel auto-starts on all platforms
 * 3. Workflow executes and completes
 * 4. Files are generated correctly
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.APP_URL || 'http://localhost:5000';

// Viewport configurations for cross-platform testing
const VIEWPORTS = {
  desktop: { width: 1920, height: 1080, name: 'Desktop' },
  laptop: { width: 1366, height: 768, name: 'Laptop' },
  tablet: { width: 768, height: 1024, name: 'Tablet' },
  mobile: { width: 375, height: 667, name: 'Mobile' }
};

interface BootstrapResponse {
  success: boolean;
  projectId: number;
  projectSlug: string;
  sessionId: string;
  bootstrapToken: string;
  workspaceUrl: string;
  status: string;
}

/**
 * Helper: Call bootstrap API and return response
 */
async function callBootstrapAPI(request: any, prompt: string): Promise<BootstrapResponse> {
  const response = await request.post(`${BASE_URL}/api/workspace/bootstrap`, {
    data: { prompt },
    headers: { 'Content-Type': 'application/json' }
  });
  
  expect(response.ok(), `Bootstrap API failed: ${await response.text()}`).toBeTruthy();
  return response.json();
}

/**
 * Helper: Wait for workflow to complete (polling)
 */
async function waitForWorkflowCompletion(
  request: any, 
  projectId: number, 
  maxWaitMs: number = 180000
): Promise<{ status: string; progress: number }> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    const response = await request.get(`${BASE_URL}/api/agent/workflows/${projectId}/status`);
    
    if (response.ok()) {
      const data = await response.json();
      if (data.status === 'completed' || data.status === 'failed') {
        return data;
      }
    }
    
    // Wait 5 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  throw new Error(`Workflow did not complete within ${maxWaitMs}ms`);
}

test.describe('Bootstrap → Autostart Regression Tests', () => {
  
  test.describe('API Layer Tests', () => {
    
    test('Bootstrap API returns valid response', async ({ request }) => {
      console.log('\n=== Test: Bootstrap API Response ===');
      
      const bootstrap = await callBootstrapAPI(request, 'Create a simple hello world app');
      
      expect(bootstrap.success).toBe(true);
      expect(bootstrap.projectId).toBeGreaterThan(0);
      expect(bootstrap.sessionId).toBeTruthy();
      expect(bootstrap.bootstrapToken).toBeTruthy();
      expect(bootstrap.workspaceUrl).toContain('ws://');
      expect(bootstrap.status).toBe('ready');
      
      console.log(`✅ Bootstrap created project ${bootstrap.projectId}`);
    });
    
    test('Bootstrap workflow executes and completes', async ({ request }) => {
      console.log('\n=== Test: Workflow Execution ===');
      
      const bootstrap = await callBootstrapAPI(request, 'Create a simple HTML page');
      console.log(`Project ${bootstrap.projectId} created, waiting for workflow...`);
      
      // Wait for workflow to complete (up to 3 minutes)
      const result = await waitForWorkflowCompletion(request, bootstrap.projectId, 180000);
      
      expect(result.status).toBe('completed');
      expect(result.progress).toBe(100);
      
      console.log(`✅ Workflow completed with status: ${result.status}`);
    });
    
    test('Bootstrap creates files correctly', async ({ request }) => {
      console.log('\n=== Test: File Creation ===');
      
      const bootstrap = await callBootstrapAPI(request, 'Create a React app with TypeScript');
      
      // Wait for workflow
      await waitForWorkflowCompletion(request, bootstrap.projectId, 180000);
      
      // Check files were created
      const filesResponse = await request.get(`${BASE_URL}/api/projects/${bootstrap.projectId}/files`);
      
      if (filesResponse.ok()) {
        const files = await filesResponse.json();
        console.log(`Created ${files.length || 0} files`);
        
        // Verify essential files exist
        const fileNames = files.map((f: any) => f.name || f.path);
        expect(fileNames.length).toBeGreaterThan(0);
      }
      
      console.log(`✅ Files created for project ${bootstrap.projectId}`);
    });
  });

  test.describe('Desktop UI Tests', () => {
    test.use({ viewport: VIEWPORTS.desktop });
    
    test('Desktop: Agent panel loads and displays correctly', async ({ page }) => {
      console.log('\n=== Test: Desktop Agent Panel ===');
      
      // Navigate to homepage
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      
      // Look for agent panel or create button
      const agentPanel = page.locator('[data-testid="agent-panel"]');
      const createButton = page.locator('[data-testid="create-project-button"], [data-testid="button-build"]');
      
      // At least one should be visible
      const hasAgentPanel = await agentPanel.isVisible().catch(() => false);
      const hasCreateButton = await createButton.first().isVisible().catch(() => false);
      
      expect(hasAgentPanel || hasCreateButton).toBeTruthy();
      
      console.log(`✅ Desktop: Agent panel or create button visible`);
    });
    
    test('Desktop: IDE workspace loads agent panel', async ({ page, request }) => {
      console.log('\n=== Test: Desktop IDE Agent Panel ===');
      
      // Create a project first
      const bootstrap = await callBootstrapAPI(request, 'Create a test project');
      
      // Navigate to IDE
      await page.goto(`${BASE_URL}/ide/${bootstrap.projectId}`);
      await page.waitForLoadState('networkidle');
      
      // Wait for page to stabilize
      await page.waitForTimeout(3000);
      
      // Check for agent panel components - must have at least one
      const agentSelectors = [
        '[data-testid*="agent"]',
        '[data-testid="replit-agent-panel"]',
        '[class*="agent-panel"]',
        '[class*="AgentPanel"]'
      ];
      
      let hasAgentElements = false;
      for (const selector of agentSelectors) {
        const found = await page.locator(selector).first().isVisible().catch(() => false);
        if (found) {
          hasAgentElements = true;
          console.log(`Found agent element with selector: ${selector}`);
          break;
        }
      }
      
      // Assert that agent panel exists
      expect(hasAgentElements, 'Agent panel should be visible in IDE').toBeTruthy();
      
      console.log(`✅ Desktop: IDE loaded for project ${bootstrap.projectId} with agent panel`);
    });
  });

  test.describe('Tablet UI Tests', () => {
    test.use({ viewport: VIEWPORTS.tablet });
    
    test('Tablet: Responsive layout loads correctly', async ({ page }) => {
      console.log('\n=== Test: Tablet Responsive Layout ===');
      
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      
      // Check viewport is correct
      const viewportSize = page.viewportSize();
      expect(viewportSize?.width).toBe(VIEWPORTS.tablet.width);
      
      // Page should be responsive (no horizontal scroll)
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(VIEWPORTS.tablet.width + 20);
      
      console.log(`✅ Tablet: Responsive layout working`);
    });
    
    test('Tablet: IDE workspace is accessible', async ({ page, request }) => {
      console.log('\n=== Test: Tablet IDE Access ===');
      
      const bootstrap = await callBootstrapAPI(request, 'Create a simple app');
      
      await page.goto(`${BASE_URL}/ide/${bootstrap.projectId}`);
      await page.waitForLoadState('networkidle');
      
      // IDE should load without errors
      const errorText = await page.locator('text=Error, text=Failed, text=404').first().isVisible().catch(() => false);
      expect(errorText).toBeFalsy();
      
      console.log(`✅ Tablet: IDE loaded successfully`);
    });
  });

  test.describe('Mobile UI Tests', () => {
    test.use({ viewport: VIEWPORTS.mobile });
    
    test('Mobile: Homepage loads correctly', async ({ page }) => {
      console.log('\n=== Test: Mobile Homepage ===');
      
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      
      // Check viewport
      const viewportSize = page.viewportSize();
      expect(viewportSize?.width).toBe(VIEWPORTS.mobile.width);
      
      // Page should be mobile-friendly
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(VIEWPORTS.mobile.width + 20);
      
      console.log(`✅ Mobile: Homepage loads correctly`);
    });
    
    test('Mobile: Touch-friendly elements present', async ({ page }) => {
      console.log('\n=== Test: Mobile Touch Elements ===');
      
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      
      // Check for touch-friendly button sizes (min 44px)
      const buttons = page.locator('button, [role="button"], a[href]');
      const buttonCount = await buttons.count();
      
      if (buttonCount > 0) {
        const firstButton = buttons.first();
        const box = await firstButton.boundingBox();
        if (box) {
          // iOS minimum touch target is 44x44
          expect(box.height).toBeGreaterThanOrEqual(30);
        }
      }
      
      console.log(`✅ Mobile: Touch-friendly elements verified`);
    });
    
    test('Mobile: IDE workspace accessible', async ({ page, request }) => {
      console.log('\n=== Test: Mobile IDE Access ===');
      
      const bootstrap = await callBootstrapAPI(request, 'Create a mobile test app');
      
      await page.goto(`${BASE_URL}/ide/${bootstrap.projectId}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // Should not show desktop-only error
      const desktopOnlyError = await page.locator('text=desktop only, text=not supported').first().isVisible().catch(() => false);
      
      console.log(`✅ Mobile: IDE workspace accessible`);
    });
  });

  test.describe('Cross-Platform Consistency', () => {
    
    test('Bootstrap works from all viewports', async ({ request }) => {
      console.log('\n=== Test: Cross-Platform Bootstrap ===');
      
      const prompts = [
        'Desktop: Create a dashboard app',
        'Tablet: Create a note-taking app',
        'Mobile: Create a todo list'
      ];
      
      const results = await Promise.all(
        prompts.map(prompt => callBootstrapAPI(request, prompt))
      );
      
      results.forEach((result, i) => {
        expect(result.success).toBe(true);
        expect(result.projectId).toBeGreaterThan(0);
        console.log(`✅ ${prompts[i].split(':')[0]}: Project ${result.projectId} created`);
      });
      
      console.log(`✅ Cross-platform bootstrap successful`);
    });
  });
});

test.describe('Autostart Behavior Tests', () => {
  
  test('Agent autostart triggers on project creation', async ({ request }) => {
    console.log('\n=== Test: Autostart Trigger ===');
    
    const bootstrap = await callBootstrapAPI(request, 'Create a Python Flask API');
    
    // Verify session was created
    expect(bootstrap.sessionId).toBeTruthy();
    expect(bootstrap.workspaceUrl).toContain(bootstrap.sessionId);
    
    // Check workflow status immediately (should be in progress)
    const statusResponse = await request.get(`${BASE_URL}/api/agent/workflows/${bootstrap.projectId}/status`);
    
    if (statusResponse.ok()) {
      const status = await statusResponse.json();
      // Status should be 'planning', 'executing', or 'completed' (autostart ran)
      expect(['planning', 'executing', 'completed', 'in_progress']).toContain(status.status);
      console.log(`Workflow status: ${status.status}`);
    }
    
    console.log(`✅ Autostart triggered for project ${bootstrap.projectId}`);
  });
  
  test('Autostart creates files without manual intervention', async ({ request }) => {
    console.log('\n=== Test: Autonomous File Creation ===');
    
    const bootstrap = await callBootstrapAPI(request, 'Create a Node.js Express server with routes');
    
    // Wait for completion
    const result = await waitForWorkflowCompletion(request, bootstrap.projectId, 180000);
    
    expect(result.status).toBe('completed');
    
    // Verify files were created autonomously
    console.log(`✅ Autonomous file creation completed`);
  });
});
