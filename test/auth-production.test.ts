/**
 * Production Authentication Tests
 * Ensures authentication and auth bypass work correctly in production mode
 */

import { execSync } from 'child_process';

describe('Production Authentication Tests', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  
  beforeAll(() => {
    process.env.NODE_ENV = 'production';
  });
  
  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  test('Auth bypass should be completely disabled in production', () => {
    // Set environment variables that would enable auth bypass in development
    process.env.ENABLE_DEV_AUTH_BYPASS = 'true';
    process.env.DEV_AUTH_BYPASS_TOKEN = 'test-token-123';
    
    // Import the auth bypass module
    const { isAuthBypassEnabled } = require('../server/dev-auth-bypass');
    
    // In production, auth bypass should ALWAYS return false
    expect(isAuthBypassEnabled()).toBe(false);
  });

  test('Auth bypass function should work in development mode', () => {
    // Temporarily set to development
    process.env.NODE_ENV = 'development';
    process.env.ENABLE_DEV_AUTH_BYPASS = 'true';
    
    // Clear the module cache to force reimport
    delete require.cache[require.resolve('../server/dev-auth-bypass')];
    const { isBypassFeatureEnabled } = require('../server/dev-auth-bypass');
    
    // The bypass feature should be enabled in development when env var is set
    expect(isBypassFeatureEnabled()).toBe(true);
    
    // Reset to production
    process.env.NODE_ENV = 'production';
  });

  test('CORS should require configuration in production', () => {
    const verifyCorsProd = () => {
      // Import the CORS verification function
      const { verifyCorsConfiguration } = require('../server/middleware/cors-config');
      const result = verifyCorsConfiguration();
      
      // Without ALLOWED_ORIGINS or FRONTEND_URL, production CORS should fail
      if (!process.env.ALLOWED_ORIGINS && !process.env.FRONTEND_URL) {
        expect(result.isValid).toBe(false);
        expect(result.message).toContain('Production CORS requires');
      }
    };
    
    // Test without CORS configuration
    delete process.env.ALLOWED_ORIGINS;
    delete process.env.FRONTEND_URL;
    verifyCorsProd();
    
    // Test with ALLOWED_ORIGINS
    process.env.ALLOWED_ORIGINS = 'https://example.com,https://app.example.com';
    delete require.cache[require.resolve('../server/middleware/cors-config')];
    const { verifyCorsConfiguration: verifyCors2 } = require('../server/middleware/cors-config');
    const result2 = verifyCors2();
    expect(result2.isValid).toBe(true);
    
    // Test with FRONTEND_URL
    delete process.env.ALLOWED_ORIGINS;
    process.env.FRONTEND_URL = 'https://app.example.com';
    delete require.cache[require.resolve('../server/middleware/cors-config')];
    const { verifyCorsConfiguration: verifyCors3 } = require('../server/middleware/cors-config');
    const result3 = verifyCors3();
    expect(result3.isValid).toBe(true);
  });

  test('Package installer should validate inputs in production', () => {
    const { validateProjectId, validatePackageName } = require('../server/package-management/simple-package-installer');
    
    // Test valid inputs
    expect(validateProjectId('my-project-123')).toBe(true);
    expect(validatePackageName('express')).toBe(true);
    expect(validatePackageName('@types/node')).toBe(true);
    
    // Test invalid inputs (injection attempts)
    expect(validateProjectId('../../etc/passwd')).toBe(false);
    expect(validateProjectId('my-project; rm -rf /')).toBe(false);
    expect(validatePackageName('express && rm -rf /')).toBe(false);
    expect(validatePackageName('../../../malicious')).toBe(false);
  });

  test('Modular router system should be properly initialized', () => {
    // This test verifies that our modular router system exports are correct
    const { MainRouter } = require('../server/routes');
    expect(MainRouter).toBeDefined();
    expect(typeof MainRouter).toBe('function');
    
    // Test that storage exports the getStorage function
    const { getStorage } = require('../server/storage');
    expect(getStorage).toBeDefined();
    expect(typeof getStorage).toBe('function');
  });

  test('Critical authentication routes should be registered', () => {
    const { MainRouter } = require('../server/routes');
    const { getStorage } = require('../server/storage');
    
    // Create a mock Express app
    const mockApp = {
      use: jest.fn(),
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn()
    };
    
    // Initialize the router with storage
    const storage = getStorage();
    const mainRouter = new MainRouter(storage);
    
    // Register routes
    mainRouter.registerRoutes(mockApp);
    
    // Verify that route groups were registered
    expect(mockApp.use).toHaveBeenCalled();
  });
});

console.log('✅ Production authentication tests created successfully');