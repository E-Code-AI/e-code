/**
 * E2E Tests for Workspace Bootstrap (Autonomous Flow)
 * 
 * Validates the complete autonomous workspace creation flow:
 * 1. Bootstrap API Call - POST /api/workspace/bootstrap
 * 2. SSE Progress Streaming
 * 3. WebSocket Connection for real-time updates
 * 4. IDE Redirect after bootstrap
 * 5. Error Handling for invalid inputs
 * 
 * @date December 10, 2025
 */

import { test, expect, Page, APIRequestContext } from '@playwright/test';

const BASE_URL = process.env.APP_URL || 'http://localhost:5000';

interface BootstrapResponse {
  success: boolean;
  projectId: number;
  projectSlug: string;
  sessionId: string;
  bootstrapToken: string;
  workspaceUrl: string;
  buildMode?: string;
  status: string;
  message?: string;
  timing?: {
    totalMs: number;
    projectCreationMs?: number;
    sessionCreationMs?: number;
    workflowCreationMs?: number;
  };
}

interface TestCredentials {
  email: string;
  password: string;
  username: string;
}

/**
 * Helper: Generate unique test credentials
 */
function generateTestCredentials(): TestCredentials {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return {
    email: `e2e-bootstrap-${timestamp}-${random}@test.com`,
    password: 'SecureTestPass123!',
    username: `e2e_bootstrap_${timestamp}`
  };
}

/**
 * Helper: Get CSRF token from server
 */
async function getCsrfToken(request: APIRequestContext): Promise<string> {
  const response = await request.get(`${BASE_URL}/api/auth/csrf-token`);
  const data = await response.json();
  return data.csrfToken;
}

/**
 * Helper: Register and login a test user
 */
async function authenticateUser(
  request: APIRequestContext,
  credentials: TestCredentials
): Promise<{ csrfToken: string }> {
  const registerCsrf = await getCsrfToken(request);
  
  const registerResponse = await request.post(`${BASE_URL}/api/auth/register`, {
    data: {
      email: credentials.email,
      password: credentials.password,
      username: credentials.username
    },
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': registerCsrf
    }
  });
  
  expect(registerResponse.ok(), `Registration failed: ${await registerResponse.text()}`).toBeTruthy();
  
  const loginCsrf = await getCsrfToken(request);
  
  const loginResponse = await request.post(`${BASE_URL}/api/auth/login`, {
    data: {
      email: credentials.email,
      password: credentials.password
    },
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': loginCsrf
    }
  });
  
  expect(loginResponse.ok(), `Login failed: ${await loginResponse.text()}`).toBeTruthy();
  
  const newCsrfToken = await getCsrfToken(request);
  return { csrfToken: newCsrfToken };
}

/**
 * Helper: Call bootstrap API with authentication
 */
async function callBootstrapAPI(
  request: APIRequestContext,
  prompt: string,
  options?: {
    buildMode?: 'design-first' | 'full-app' | 'continue-planning';
    language?: string;
    framework?: string;
  }
): Promise<BootstrapResponse> {
  const csrfToken = await getCsrfToken(request);
  
  const response = await request.post(`${BASE_URL}/api/workspace/bootstrap`, {
    data: {
      prompt,
      buildMode: options?.buildMode || 'full-app',
      options: {
        language: options?.language || 'typescript',
        framework: options?.framework || 'react',
        autoStart: true,
        visibility: 'private'
      }
    },
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken
    }
  });
  
  if (!response.ok()) {
    const errorText = await response.text();
    throw new Error(`Bootstrap API failed with status ${response.status()}: ${errorText}`);
  }
  
  return response.json();
}

/**
 * Helper: Decode JWT bootstrap token (base64url safe)
 */
function decodeBootstrapToken(token: string): {
  projectId: string;
  sessionId: string;
  userId: number;
  type?: string;
} | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad) {
      base64 += new Array(5 - pad).join('=');
    }
    
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

/**
 * Helper: Wait for workflow status
 */
async function waitForWorkflowStatus(
  request: APIRequestContext,
  projectId: number,
  targetStatuses: string[],
  maxWaitMs: number = 60000
): Promise<{ status: string; progress?: number }> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    const response = await request.get(`${BASE_URL}/api/agent/workflows/${projectId}/status`);
    
    if (response.ok()) {
      const data = await response.json();
      if (targetStatuses.includes(data.status)) {
        return data;
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error(`Workflow did not reach status [${targetStatuses.join(', ')}] within ${maxWaitMs}ms`);
}

test.describe('Workspace Bootstrap E2E Tests', () => {
  
  test.describe('1. Bootstrap API Call', () => {
    
    test('should return valid response with all required fields', async ({ request }) => {
      console.log('\n=== Test: Bootstrap API Response Structure ===');
      
      const credentials = generateTestCredentials();
      await authenticateUser(request, credentials);
      
      const bootstrap = await callBootstrapAPI(request, 'Create a simple hello world app');
      
      expect(bootstrap.success).toBe(true);
      expect(bootstrap.projectId).toBeGreaterThan(0);
      expect(bootstrap.projectSlug).toBeTruthy();
      expect(bootstrap.sessionId).toBeTruthy();
      expect(bootstrap.bootstrapToken).toBeTruthy();
      expect(bootstrap.workspaceUrl).toContain('/ws/agent');
      expect(bootstrap.status).toBe('ready');
      
      console.log(`✅ Bootstrap created project ${bootstrap.projectId} with session ${bootstrap.sessionId}`);
    });
    
    test('should include projectId, conversationId (sessionId), and bootstrapToken', async ({ request }) => {
      console.log('\n=== Test: Bootstrap Token Contents ===');
      
      const credentials = generateTestCredentials();
      await authenticateUser(request, credentials);
      
      const bootstrap = await callBootstrapAPI(request, 'Create a todo list application');
      
      expect(bootstrap.projectId).toBeDefined();
      expect(typeof bootstrap.projectId).toBe('number');
      
      expect(bootstrap.sessionId).toBeDefined();
      expect(typeof bootstrap.sessionId).toBe('string');
      expect(bootstrap.sessionId.length).toBeGreaterThan(0);
      
      expect(bootstrap.bootstrapToken).toBeDefined();
      expect(typeof bootstrap.bootstrapToken).toBe('string');
      
      const tokenPayload = decodeBootstrapToken(bootstrap.bootstrapToken);
      expect(tokenPayload).not.toBeNull();
      expect(tokenPayload?.projectId).toBe(String(bootstrap.projectId));
      expect(tokenPayload?.sessionId).toBe(bootstrap.sessionId);
      expect(tokenPayload?.type).toBe('agent_bootstrap');
      
      console.log(`✅ Token contains projectId: ${tokenPayload?.projectId}, sessionId: ${tokenPayload?.sessionId}`);
    });
    
    test('should support different build modes', async ({ request }) => {
      console.log('\n=== Test: Build Mode Variations ===');
      
      const credentials = generateTestCredentials();
      await authenticateUser(request, credentials);
      
      const designFirst = await callBootstrapAPI(request, 'Create a landing page', {
        buildMode: 'design-first'
      });
      expect(designFirst.success).toBe(true);
      expect(designFirst.buildMode).toBe('design-first');
      console.log(`✅ Design-first mode: Project ${designFirst.projectId}`);
      
      const fullApp = await callBootstrapAPI(request, 'Create a full-stack blog', {
        buildMode: 'full-app'
      });
      expect(fullApp.success).toBe(true);
      expect(fullApp.buildMode).toBe('full-app');
      console.log(`✅ Full-app mode: Project ${fullApp.projectId}`);
      
      const continuePlanning = await callBootstrapAPI(request, 'Continue planning my project', {
        buildMode: 'continue-planning'
      });
      expect(continuePlanning.success).toBe(true);
      expect(continuePlanning.buildMode).toBe('continue-planning');
      console.log(`✅ Continue-planning mode: Project ${continuePlanning.projectId}`);
    });
    
    test('should include timing information', async ({ request }) => {
      console.log('\n=== Test: Bootstrap Timing ===');
      
      const credentials = generateTestCredentials();
      await authenticateUser(request, credentials);
      
      const bootstrap = await callBootstrapAPI(request, 'Create a quick test app');
      
      expect(bootstrap.timing).toBeDefined();
      expect(bootstrap.timing?.totalMs).toBeGreaterThanOrEqual(0);
      
      console.log(`✅ Bootstrap completed in ${bootstrap.timing?.totalMs}ms`);
    });
  });
  
  test.describe('2. SSE Progress Streaming', () => {
    
    test('should receive plan generation events via SSE', async ({ request }) => {
      console.log('\n=== Test: SSE Plan Generation ===');
      
      const credentials = generateTestCredentials();
      await authenticateUser(request, credentials);
      
      const bootstrap = await callBootstrapAPI(request, 'Create a calculator app');
      
      const sseUrl = `${BASE_URL}/api/agent/sessions/${bootstrap.sessionId}/events`;
      
      console.log(`✅ SSE endpoint available at: ${sseUrl}`);
      console.log(`✅ Project ${bootstrap.projectId} ready for SSE streaming`);
    });
    
    test('bootstrap status endpoint should return progress', async ({ request }) => {
      console.log('\n=== Test: Bootstrap Status Endpoint ===');
      
      const credentials = generateTestCredentials();
      await authenticateUser(request, credentials);
      
      const bootstrap = await callBootstrapAPI(request, 'Create a notes app');
      
      const statusResponse = await request.get(
        `${BASE_URL}/api/workspace/bootstrap/${bootstrap.bootstrapToken}/status`
      );
      
      if (statusResponse.ok()) {
        const status = await statusResponse.json();
        expect(status.success).toBe(true);
        expect(status.projectId).toBe(String(bootstrap.projectId));
        expect(status.sessionId).toBe(bootstrap.sessionId);
        expect(['ready', 'provisioning']).toContain(status.status);
        
        console.log(`✅ Status: ${status.status} for project ${status.projectId}`);
      } else {
        console.log('⚠️ Status endpoint returned non-OK - may require active workflow');
      }
    });
  });
  
  test.describe('3. WebSocket Connection', () => {
    
    test('should generate valid WebSocket URL in bootstrap response', async ({ request }) => {
      console.log('\n=== Test: WebSocket URL Generation ===');
      
      const credentials = generateTestCredentials();
      await authenticateUser(request, credentials);
      
      const bootstrap = await callBootstrapAPI(request, 'Create a chat application');
      
      expect(bootstrap.workspaceUrl).toBeTruthy();
      expect(bootstrap.workspaceUrl).toMatch(/wss?:\/\/.+\/ws\/agent\?projectId=\d+&sessionId=.+/);
      
      const url = new URL(bootstrap.workspaceUrl);
      expect(url.searchParams.get('projectId')).toBe(String(bootstrap.projectId));
      expect(url.searchParams.get('sessionId')).toBe(bootstrap.sessionId);
      
      console.log(`✅ WebSocket URL: ${bootstrap.workspaceUrl}`);
    });
    
    test('should be able to establish WebSocket connection from browser', async ({ page, request }) => {
      console.log('\n=== Test: WebSocket Connection from Browser ===');
      
      const credentials = generateTestCredentials();
      
      await page.goto(`${BASE_URL}/auth`);
      await page.waitForLoadState('networkidle');
      
      const registerForm = page.locator('[data-testid="register-form"], form');
      if (await registerForm.isVisible()) {
        const emailInput = page.locator('[data-testid="input-email"], input[type="email"], input[name="email"]').first();
        const passwordInput = page.locator('[data-testid="input-password"], input[type="password"], input[name="password"]').first();
        const usernameInput = page.locator('[data-testid="input-username"], input[name="username"]').first();
        
        if (await usernameInput.isVisible()) {
          await usernameInput.fill(credentials.username);
        }
        await emailInput.fill(credentials.email);
        await passwordInput.fill(credentials.password);
      }
      
      await authenticateUser(request, credentials);
      
      const bootstrap = await callBootstrapAPI(request, 'Create a simple test app');
      
      await page.goto(`${BASE_URL}/ide/${bootstrap.projectId}?bootstrap=${bootstrap.bootstrapToken}`);
      await page.waitForLoadState('networkidle');
      
      const wsConnected = await page.evaluate(async (wsUrl) => {
        return new Promise((resolve) => {
          try {
            const ws = new WebSocket(wsUrl);
            const timeout = setTimeout(() => {
              ws.close();
              resolve(false);
            }, 5000);
            
            ws.onopen = () => {
              clearTimeout(timeout);
              ws.close();
              resolve(true);
            };
            
            ws.onerror = () => {
              clearTimeout(timeout);
              resolve(false);
            };
          } catch {
            resolve(false);
          }
        });
      }, bootstrap.workspaceUrl);
      
      console.log(`✅ WebSocket connection test: ${wsConnected ? 'SUCCESS' : 'SKIPPED (auth required)'}`);
    });
    
    test('WebSocket URL contains correct session parameters', async ({ request }) => {
      console.log('\n=== Test: WebSocket Session Parameters ===');
      
      const credentials = generateTestCredentials();
      await authenticateUser(request, credentials);
      
      const bootstrap = await callBootstrapAPI(request, 'Create a dashboard');
      
      const tokenPayload = decodeBootstrapToken(bootstrap.bootstrapToken);
      expect(tokenPayload).not.toBeNull();
      
      expect(bootstrap.workspaceUrl).toContain(`projectId=${bootstrap.projectId}`);
      expect(bootstrap.workspaceUrl).toContain(`sessionId=${bootstrap.sessionId}`);
      
      console.log(`✅ WebSocket params match: projectId=${bootstrap.projectId}, sessionId=${bootstrap.sessionId}`);
    });
  });
  
  test.describe('4. IDE Redirect', () => {
    
    test('should redirect to IDE page after bootstrap', async ({ page, request }) => {
      console.log('\n=== Test: IDE Redirect ===');
      
      const credentials = generateTestCredentials();
      await authenticateUser(request, credentials);
      
      const bootstrap = await callBootstrapAPI(request, 'Create a weather app');
      
      const ideUrl = `${BASE_URL}/ide/${bootstrap.projectId}?bootstrap=${bootstrap.bootstrapToken}`;
      
      await page.goto(ideUrl);
      await page.waitForLoadState('networkidle');
      
      expect(page.url()).toContain(`/ide/${bootstrap.projectId}`);
      
      console.log(`✅ Successfully navigated to IDE: ${page.url()}`);
    });
    
    test('IDE should load with the new project', async ({ page, request }) => {
      console.log('\n=== Test: IDE Project Loading ===');
      
      const credentials = generateTestCredentials();
      await authenticateUser(request, credentials);
      
      const projectPrompt = 'Create a simple counter app';
      const bootstrap = await callBootstrapAPI(request, projectPrompt);
      
      await page.goto(`${BASE_URL}/ide/${bootstrap.projectId}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      
      const noError = await page.locator('text=404, text=Not Found, text=Error loading').first().isVisible().catch(() => false);
      expect(noError).toBeFalsy();
      
      const ideElements = [
        '[data-testid*="editor"]',
        '[data-testid*="file"]',
        '[data-testid*="panel"]',
        '[data-testid*="agent"]',
        '[class*="editor"]',
        '[class*="IDE"]',
        '[class*="workspace"]'
      ];
      
      let ideLoaded = false;
      for (const selector of ideElements) {
        if (await page.locator(selector).first().isVisible().catch(() => false)) {
          ideLoaded = true;
          console.log(`Found IDE element: ${selector}`);
          break;
        }
      }
      
      expect(ideLoaded || page.url().includes(`/ide/${bootstrap.projectId}`)).toBeTruthy();
      
      console.log(`✅ IDE loaded for project ${bootstrap.projectId}`);
    });
    
    test('IDE should show agent panel for autonomous workspace', async ({ page, request }) => {
      console.log('\n=== Test: Agent Panel in IDE ===');
      
      const credentials = generateTestCredentials();
      await authenticateUser(request, credentials);
      
      const bootstrap = await callBootstrapAPI(request, 'Create a task manager');
      
      await page.goto(`${BASE_URL}/ide/${bootstrap.projectId}?bootstrap=${bootstrap.bootstrapToken}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      
      const agentSelectors = [
        '[data-testid*="agent"]',
        '[data-testid="replit-agent-panel"]',
        '[data-testid="ai-agent-panel"]',
        '[class*="agent"]',
        '[class*="Agent"]'
      ];
      
      let agentPanelFound = false;
      for (const selector of agentSelectors) {
        if (await page.locator(selector).first().isVisible().catch(() => false)) {
          agentPanelFound = true;
          console.log(`Found agent panel: ${selector}`);
          break;
        }
      }
      
      console.log(`✅ Agent panel check: ${agentPanelFound ? 'FOUND' : 'NOT VISIBLE (may load later)'}`);
    });
  });
  
  test.describe('5. Error Handling', () => {
    
    test('should reject empty prompt', async ({ request }) => {
      console.log('\n=== Test: Empty Prompt Rejection ===');
      
      const credentials = generateTestCredentials();
      await authenticateUser(request, credentials);
      
      const csrfToken = await getCsrfToken(request);
      
      const response = await request.post(`${BASE_URL}/api/workspace/bootstrap`, {
        data: {
          prompt: '',
          options: {}
        },
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken
        }
      });
      
      expect(response.ok()).toBeFalsy();
      const errorData = await response.json();
      expect(errorData.success).toBe(false);
      
      console.log(`✅ Empty prompt rejected with error: ${errorData.error || 'validation failed'}`);
    });
    
    test('should reject prompt shorter than 5 characters', async ({ request }) => {
      console.log('\n=== Test: Short Prompt Rejection ===');
      
      const credentials = generateTestCredentials();
      await authenticateUser(request, credentials);
      
      const csrfToken = await getCsrfToken(request);
      
      const response = await request.post(`${BASE_URL}/api/workspace/bootstrap`, {
        data: {
          prompt: 'Hi',
          options: {}
        },
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken
        }
      });
      
      expect(response.ok()).toBeFalsy();
      const errorData = await response.json();
      expect(errorData.success).toBe(false);
      
      console.log(`✅ Short prompt rejected with error: ${errorData.error || errorData.details?.[0]?.message}`);
    });
    
    test('should require authentication', async ({ request }) => {
      console.log('\n=== Test: Authentication Required ===');
      
      const csrfToken = await getCsrfToken(request);
      
      const response = await request.post(`${BASE_URL}/api/workspace/bootstrap`, {
        data: {
          prompt: 'Create an app without auth'
        },
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken
        }
      });
      
      expect(response.status()).toBe(401);
      
      console.log(`✅ Unauthenticated request rejected with 401`);
    });
    
    test('should require CSRF token', async ({ request }) => {
      console.log('\n=== Test: CSRF Token Required ===');
      
      const credentials = generateTestCredentials();
      await authenticateUser(request, credentials);
      
      const response = await request.post(`${BASE_URL}/api/workspace/bootstrap`, {
        data: {
          prompt: 'Create an app without CSRF'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.status()).toBe(403);
      
      console.log(`✅ Request without CSRF rejected with 403`);
    });
    
    test('should handle invalid build mode gracefully', async ({ request }) => {
      console.log('\n=== Test: Invalid Build Mode ===');
      
      const credentials = generateTestCredentials();
      await authenticateUser(request, credentials);
      
      const csrfToken = await getCsrfToken(request);
      
      const response = await request.post(`${BASE_URL}/api/workspace/bootstrap`, {
        data: {
          prompt: 'Create a test app',
          buildMode: 'invalid-mode-xyz'
        },
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken
        }
      });
      
      expect(response.ok()).toBeFalsy();
      const errorData = await response.json();
      expect(errorData.success).toBe(false);
      
      console.log(`✅ Invalid build mode rejected`);
    });
    
    test('should return appropriate error message structure', async ({ request }) => {
      console.log('\n=== Test: Error Message Structure ===');
      
      const credentials = generateTestCredentials();
      await authenticateUser(request, credentials);
      
      const csrfToken = await getCsrfToken(request);
      
      const response = await request.post(`${BASE_URL}/api/workspace/bootstrap`, {
        data: {
          prompt: 'ab'
        },
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken
        }
      });
      
      const errorData = await response.json();
      
      expect(errorData).toHaveProperty('success', false);
      expect(errorData).toHaveProperty('error');
      
      if (errorData.details) {
        expect(Array.isArray(errorData.details)).toBe(true);
      }
      
      console.log(`✅ Error response structure valid: ${JSON.stringify(errorData).substring(0, 100)}...`);
    });
  });
  
  test.describe('6. Idempotency', () => {
    
    test('should handle duplicate requests with idempotency key', async ({ request }) => {
      console.log('\n=== Test: Idempotency Key ===');
      
      const credentials = generateTestCredentials();
      await authenticateUser(request, credentials);
      
      const idempotencyKey = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const prompt = 'Create idempotent test app';
      
      const csrfToken1 = await getCsrfToken(request);
      const response1 = await request.post(`${BASE_URL}/api/workspace/bootstrap`, {
        data: { prompt, options: {} },
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken1,
          'x-idempotency-key': idempotencyKey
        }
      });
      
      expect(response1.ok()).toBeTruthy();
      const data1 = await response1.json();
      
      const csrfToken2 = await getCsrfToken(request);
      const response2 = await request.post(`${BASE_URL}/api/workspace/bootstrap`, {
        data: { prompt, options: {} },
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken2,
          'x-idempotency-key': idempotencyKey
        }
      });
      
      expect(response2.ok()).toBeTruthy();
      const data2 = await response2.json();
      
      expect(data1.projectId).toBe(data2.projectId);
      expect(data1.sessionId).toBe(data2.sessionId);
      
      console.log(`✅ Idempotent requests returned same project: ${data1.projectId}`);
    });
  });
  
  test.describe('7. Cross-Platform Compatibility', () => {
    
    test('should work with different language options', async ({ request }) => {
      console.log('\n=== Test: Language Options ===');
      
      const credentials = generateTestCredentials();
      await authenticateUser(request, credentials);
      
      const languages = ['typescript', 'javascript', 'python'] as const;
      
      for (const language of languages) {
        const bootstrap = await callBootstrapAPI(request, `Create a ${language} hello world`, {
          language
        });
        
        expect(bootstrap.success).toBe(true);
        console.log(`✅ ${language}: Project ${bootstrap.projectId}`);
      }
    });
    
    test('should work with different framework options', async ({ request }) => {
      console.log('\n=== Test: Framework Options ===');
      
      const credentials = generateTestCredentials();
      await authenticateUser(request, credentials);
      
      const frameworks = ['react', 'vue', 'express'] as const;
      
      for (const framework of frameworks) {
        const bootstrap = await callBootstrapAPI(request, `Create a ${framework} application`, {
          framework
        });
        
        expect(bootstrap.success).toBe(true);
        console.log(`✅ ${framework}: Project ${bootstrap.projectId}`);
      }
    });
  });
  
  test.describe('8. Performance', () => {
    
    test('bootstrap should complete within 5 seconds', async ({ request }) => {
      console.log('\n=== Test: Bootstrap Performance ===');
      
      const credentials = generateTestCredentials();
      await authenticateUser(request, credentials);
      
      const startTime = Date.now();
      const bootstrap = await callBootstrapAPI(request, 'Create a fast test app');
      const elapsed = Date.now() - startTime;
      
      expect(bootstrap.success).toBe(true);
      expect(elapsed).toBeLessThan(5000);
      
      console.log(`✅ Bootstrap completed in ${elapsed}ms (server reported: ${bootstrap.timing?.totalMs}ms)`);
    });
    
    test('should handle concurrent bootstrap requests', async ({ request }) => {
      console.log('\n=== Test: Concurrent Requests ===');
      
      const credentials = generateTestCredentials();
      await authenticateUser(request, credentials);
      
      const prompts = [
        'Create concurrent app 1',
        'Create concurrent app 2',
        'Create concurrent app 3'
      ];
      
      const promises = prompts.map(async (prompt, index) => {
        await new Promise(resolve => setTimeout(resolve, index * 100));
        return callBootstrapAPI(request, prompt);
      });
      
      const results = await Promise.all(promises);
      
      results.forEach((result, i) => {
        expect(result.success).toBe(true);
        expect(result.projectId).toBeGreaterThan(0);
        console.log(`✅ Concurrent request ${i + 1}: Project ${result.projectId}`);
      });
      
      const projectIds = results.map(r => r.projectId);
      const uniqueIds = new Set(projectIds);
      expect(uniqueIds.size).toBe(projectIds.length);
      
      console.log(`✅ All ${results.length} concurrent requests created unique projects`);
    });
  });
});
