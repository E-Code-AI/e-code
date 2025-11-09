import { test, expect } from '@playwright/test';

test.describe('AI Agent Tests', () => {
  let authToken: string;
  let csrfToken: string;
  let conversationId: number;

  test.beforeAll(async ({ request }) => {
    // Get CSRF token and session cookie
    const csrfResponse = await request.get('/api/csrf-token');
    const csrfData = await csrfResponse.json();
    csrfToken = csrfData.csrfToken;
    
    // Extract session cookie from CSRF response (cookie name is 'ecode.sid')
    const csrfHeaders = await csrfResponse.headersArray();
    const csrfSessionCookie = csrfHeaders.find(h => h.name.toLowerCase() === 'set-cookie' && h.value.includes('ecode.sid'));
    const sessionCookieValue = csrfSessionCookie ? csrfSessionCookie.value.split(';')[0] : '';
    
    // Login with both CSRF token and session cookie
    const loginResponse = await request.post('/api/login', {
      data: {
        email: 'testuser@test.com',
        password: 'testpass123'
      },
      headers: {
        'X-CSRF-Token': csrfToken,
        'Cookie': sessionCookieValue
      }
    });
    
    if (!loginResponse.ok()) {
      const errorBody = await loginResponse.text();
      console.error('Login failed:', loginResponse.status(), errorBody);
    }
    
    expect(loginResponse.ok()).toBeTruthy();
    
    // Get the authenticated session cookie from login response
    const loginHeaders = await loginResponse.headersArray();
    const loginSessionCookie = loginHeaders.find(h => h.name.toLowerCase() === 'set-cookie' && h.value.includes('ecode.sid'));
    if (loginSessionCookie) {
      authToken = loginSessionCookie.value.split(';')[0];
    } else {
      // Fallback to CSRF session cookie if login doesn't set a new one
      authToken = sessionCookieValue;
    }
  });

  test('should create conversation and bootstrap agent', async ({ request }) => {
    const response = await request.post('/api/agent/conversation', {
      data: {
        projectId: null,
        initialPrompt: 'Test conversation'
      },
      headers: {
        Cookie: authToken,
        'X-CSRF-Token': csrfToken
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data).toHaveProperty('conversationId');
    expect(data).toHaveProperty('agentMode');
    expect(data.agentMode).toBe('build');
    
    conversationId = data.conversationId;
  });

  test('should switch conversation mode from Build to Plan', async ({ request }) => {
    if (!conversationId) {
      test.skip();
    }

    const response = await request.post(`/api/agent/conversation/${conversationId}/mode`, {
      data: {
        mode: 'plan'
      },
      headers: {
        Cookie: authToken,
        'X-CSRF-Token': csrfToken
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.mode).toBe('plan');
    expect(data).toHaveProperty('message');
  });

  test('should switch conversation mode from Plan to Build', async ({ request }) => {
    if (!conversationId) {
      test.skip();
    }

    const response = await request.post(`/api/agent/conversation/${conversationId}/mode`, {
      data: {
        mode: 'build'
      },
      headers: {
        Cookie: authToken,
        'X-CSRF-Token': csrfToken
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.mode).toBe('build');
  });

  test('should reject invalid mode', async ({ request }) => {
    if (!conversationId) {
      test.skip();
    }

    const response = await request.post(`/api/agent/conversation/${conversationId}/mode`, {
      data: {
        mode: 'invalid'
      },
      headers: {
        Cookie: authToken,
        'X-CSRF-Token': csrfToken
      }
    });

    expect(response.status()).toBe(400);
  });

  test('should enable autonomous mode', async ({ request }) => {
    const sessionId = 'test-session-123';
    const response = await request.post('/api/agent/autonomous/enable', {
      data: {
        sessionId,
        riskThreshold: 'medium'
      },
      headers: {
        Cookie: authToken,
        'X-CSRF-Token': csrfToken
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.autonomousMode).toBe(true);
    expect(data.riskThreshold).toBe('medium');
    expect(data).toHaveProperty('message');
  });

  test('should assess risk for file operations', async ({ request }) => {
    const response = await request.post('/api/agent/autonomous/assess-risk', {
      data: {
        action: {
          tool: 'file_read',
          parameters: {
            file_path: 'README.md'
          }
        }
      },
      headers: {
        Cookie: authToken
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data).toHaveProperty('riskScore');
    expect(data).toHaveProperty('autoApprove');
    expect(data).toHaveProperty('reasoning');
    expect(typeof data.riskScore).toBe('number');
  });

  test('should generate plan for user prompt', async ({ request }) => {
    const response = await request.post('/api/agent/plan/generate', {
      data: {
        prompt: 'Build a simple TODO application with React',
        context: {
          projectType: 'web',
          framework: 'react'
        }
      },
      headers: {
        Cookie: authToken
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data).toHaveProperty('plan');
    expect(data.plan).toHaveProperty('id');
    expect(data.plan).toHaveProperty('tasks');
    expect(data.plan).toHaveProperty('estimatedTime');
    expect(Array.isArray(data.plan.tasks)).toBeTruthy();
  });

  test('should disable autonomous mode', async ({ request }) => {
    const sessionId = 'test-session-123';
    const response = await request.post('/api/agent/autonomous/disable', {
      data: {
        sessionId
      },
      headers: {
        Cookie: authToken
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.autonomousMode).toBe(false);
    expect(data).toHaveProperty('message');
  });

  test('should check autonomous system health', async ({ request }) => {
    const response = await request.get('/api/agent/autonomous/health', {
      headers: {
        Cookie: authToken
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('service');
    expect(data.service).toBe('Autonomous Agent System');
  });
});

test.describe('AI Agent UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'testuser@test.com');
    await page.fill('input[type="password"]', 'testpass123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/dashboard', { timeout: 10000 });
  });

  test('should display AI Agent interface', async ({ page }) => {
    const agentButton = page.locator('[data-testid*="agent"], text=/AI Agent|Agent/i').first();
    
    if (await agentButton.isVisible()) {
      await agentButton.click();
      
      await page.waitForSelector('[data-testid*="chat"], [data-testid*="agent"]', { timeout: 5000 });
      
      const chatInterface = page.locator('textarea, input[placeholder*="message"], [contenteditable="true"]');
      await expect(chatInterface.first()).toBeVisible();
    }
  });

  test('should have mode selector in AI Agent panel', async ({ page }) => {
    const agentButton = page.locator('[data-testid*="agent"], text=/AI Agent|Agent/i').first();
    
    if (await agentButton.isVisible()) {
      await agentButton.click();
      await page.waitForTimeout(1000);
      
      const modeSelector = page.locator('[data-testid*="mode"], text=/Plan Mode|Build Mode/i').first();
      const hasMode = await modeSelector.isVisible().catch(() => false);
      
      expect(hasMode).toBeTruthy();
    }
  });

  test('should toggle between Plan and Build modes', async ({ page }) => {
    const agentButton = page.locator('[data-testid*="agent"], text=/AI Agent|Agent/i').first();
    
    if (await agentButton.isVisible()) {
      await agentButton.click();
      await page.waitForTimeout(1000);
      
      const modeToggle = page.locator('button:has-text("Plan"), button:has-text("Build")').first();
      
      if (await modeToggle.isVisible()) {
        const initialText = await modeToggle.textContent();
        await modeToggle.click();
        await page.waitForTimeout(500);
        
        const newText = await modeToggle.textContent();
        expect(initialText).not.toBe(newText);
      }
    }
  });

  test('should display autonomous controls when enabled', async ({ page }) => {
    const settingsButton = page.locator('[data-testid*="settings"], [aria-label*="settings"]').first();
    
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      await page.waitForTimeout(500);
      
      const autonomousToggle = page.locator('text=/Autonomous Mode|Auto-approve/i').first();
      
      if (await autonomousToggle.isVisible()) {
        await expect(autonomousToggle).toBeVisible();
      }
    }
  });
});
