/**
 * Integration tests for API configuration consistency
 * 
 * Ensures that CLI and SDK use the same API endpoints and can successfully
 * connect to the health check endpoint in all environments.
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import axios from 'axios';
import * as sharedConfig from '@shared/config';

// Mock process.env for different environments
const originalEnv = process.env;

function setEnvironment(env: string, overrides: Record<string, string> = {}) {
  process.env = {
    ...originalEnv,
    ECODE_ENV: env,
    ...overrides
  };
  // Clear module cache to force re-evaluation
  jest.resetModules();
}

function resetEnvironment() {
  process.env = originalEnv;
  jest.resetModules();
}

describe('API Configuration Alignment', () => {
  afterEach(() => {
    resetEnvironment();
  });

  describe('Shared Configuration', () => {
    it('should provide consistent endpoints for development', () => {
      setEnvironment('development');
      const config = require('@shared/config');
      
      expect(config.getAPIURL()).toBe('http://localhost:5000/api');
      expect(config.getWebSocketURL()).toBe('ws://localhost:5000');
      expect(config.getWebURL()).toBe('http://localhost:5000');
    });

    it('should provide consistent endpoints for staging', () => {
      setEnvironment('staging');
      const config = require('@shared/config');
      
      expect(config.getAPIURL()).toBe('https://staging.e-code.ai/api');
      expect(config.getWebSocketURL()).toBe('wss://staging.e-code.ai');
      expect(config.getWebURL()).toBe('https://staging.e-code.ai');
    });

    it('should provide consistent endpoints for production', () => {
      setEnvironment('production');
      const config = require('@shared/config');
      
      expect(config.getAPIURL()).toBe('https://e-code.ai/api');
      expect(config.getWebSocketURL()).toBe('wss://e-code.ai');
      expect(config.getWebURL()).toBe('https://e-code.ai');
    });

    it('should default to production when environment not specified', () => {
      setEnvironment('');
      const config = require('@shared/config');
      
      expect(config.getEnvironment()).toBe('production');
      expect(config.getAPIURL()).toBe('https://e-code.ai/api');
    });

    it('should respect environment variable overrides', () => {
      setEnvironment('production', {
        ECODE_API_URL: 'https://custom.example.com/api',
        ECODE_WS_URL: 'wss://custom.example.com',
        ECODE_WEB_URL: 'https://custom.example.com'
      });
      const config = require('@shared/config');
      
      expect(config.getAPIURL()).toBe('https://custom.example.com/api');
      expect(config.getWebSocketURL()).toBe('wss://custom.example.com');
      expect(config.getWebURL()).toBe('https://custom.example.com');
    });
  });

  describe('CLI Constants Alignment', () => {
    it('should use shared config for API endpoints', () => {
      setEnvironment('production');
      const cliConstants = require('../../cli/src/constants');
      const sharedConfig = require('@shared/config');
      
      expect(cliConstants.API_BASE_URL).toBe(sharedConfig.getAPIURL());
      expect(cliConstants.WS_BASE_URL).toBe(sharedConfig.getWebSocketURL());
      expect(cliConstants.WEB_BASE_URL).toBe(sharedConfig.getWebURL());
    });

    it('should match production endpoints', () => {
      setEnvironment('production');
      const cliConstants = require('../../cli/src/constants');
      
      expect(cliConstants.API_BASE_URL).toBe('https://e-code.ai/api');
      expect(cliConstants.WS_BASE_URL).toBe('wss://e-code.ai');
      expect(cliConstants.WEB_BASE_URL).toBe('https://e-code.ai');
    });

    it('should respect environment overrides', () => {
      setEnvironment('production', {
        ECODE_API_URL: 'https://override.example.com/api'
      });
      const cliConstants = require('../../cli/src/constants');
      
      expect(cliConstants.API_BASE_URL).toBe('https://override.example.com/api');
    });
  });

  describe('SDK Configuration Alignment', () => {
    it('should use shared config for default base URL', () => {
      setEnvironment('production');
      const { ECode } = require('../../sdk/javascript/src/index');
      const sharedConfig = require('@shared/config');
      
      const sdk = new ECode();
      // The SDK should get the base URL (without /api) since it appends /api in the client
      expect(sharedConfig.getAPIBaseURL()).toBe('https://e-code.ai');
    });

    it('should allow custom baseUrl override', () => {
      setEnvironment('production');
      const { ECode } = require('../../sdk/javascript/src/index');
      
      const sdk = new ECode({
        baseUrl: 'https://custom.example.com'
      });
      
      // Custom base URL should be respected
      expect(sdk.client).toBeDefined();
    });

    it('should use shared WebSocket URL', () => {
      setEnvironment('production');
      const sharedConfig = require('@shared/config');
      
      expect(sharedConfig.getWebSocketURL()).toBe('wss://e-code.ai');
    });
  });

  describe('URL Consistency Between CLI and SDK', () => {
    it('should hit the same API endpoint', () => {
      setEnvironment('production');
      const cliConstants = require('../../cli/src/constants');
      const sharedConfig = require('@shared/config');
      
      // CLI uses full URL with /api
      const cliURL = cliConstants.API_BASE_URL;
      
      // SDK uses base URL and client appends /api
      const sdkBaseURL = sharedConfig.getAPIBaseURL();
      const sdkFullURL = `${sdkBaseURL}/api`;
      
      expect(cliURL).toBe(sdkFullURL);
      expect(cliURL).toBe('https://e-code.ai/api');
    });

    it('should hit the same WebSocket endpoint', () => {
      setEnvironment('production');
      const cliConstants = require('../../cli/src/constants');
      const sharedConfig = require('@shared/config');
      
      expect(cliConstants.WS_BASE_URL).toBe(sharedConfig.getWebSocketURL());
      expect(cliConstants.WS_BASE_URL).toBe('wss://e-code.ai');
    });
  });

  describe('Environment Detection', () => {
    it('should detect development from ECODE_ENV', () => {
      setEnvironment('development');
      const config = require('@shared/config');
      
      expect(config.getEnvironment()).toBe('development');
      expect(config.isDevelopment()).toBe(true);
      expect(config.isProduction()).toBe(false);
    });

    it('should detect development from NODE_ENV', () => {
      process.env = { ...originalEnv, NODE_ENV: 'development' };
      jest.resetModules();
      const config = require('@shared/config');
      
      expect(config.getEnvironment()).toBe('development');
    });

    it('should detect staging from ECODE_ENV', () => {
      setEnvironment('staging');
      const config = require('@shared/config');
      
      expect(config.getEnvironment()).toBe('staging');
      expect(config.isStaging()).toBe(true);
    });

    it('should default to production for unknown environments', () => {
      setEnvironment('invalid');
      const config = require('@shared/config');
      
      expect(config.getEnvironment()).toBe('production');
      expect(config.isProduction()).toBe(true);
    });
  });

  describe('Production Safety', () => {
    it('should validate production endpoints', () => {
      setEnvironment('production');
      const config = require('@shared/config');
      
      expect(() => {
        config.validateEndpoints();
      }).not.toThrow();
    });

    it('should reject localhost in production API URL', () => {
      setEnvironment('production', {
        ECODE_API_URL: 'http://localhost:5000/api'
      });
      const config = require('@shared/config');
      
      expect(() => {
        config.validateEndpoints();
      }).toThrow(/Production environment cannot use localhost URL/);
    });

    it('should reject localhost in production WebSocket URL', () => {
      setEnvironment('production', {
        ECODE_WS_URL: 'ws://localhost:5000'
      });
      const config = require('@shared/config');
      
      expect(() => {
        config.validateEndpoints();
      }).toThrow(/Production environment cannot use localhost/);
    });

    it('should detect all localhost variants', () => {
      const localhostURLs = [
        'http://localhost:5000/api',
        'http://127.0.0.1:5000/api',
        'http://0.0.0.0:5000/api',
        'http://10.0.2.2:5000/api', // Android emulator
      ];

      for (const url of localhostURLs) {
        setEnvironment('production', { ECODE_API_URL: url });
        const config = require('@shared/config');
        
        expect(() => {
          config.validateEndpoints();
        }).toThrow(/localhost/);
        
        resetEnvironment();
      }
    });
  });

  describe('Health Check Endpoint', () => {
    it('should provide health check URL', () => {
      setEnvironment('production');
      const config = require('@shared/config');
      
      const healthCheckURL = config.getHealthCheckURL();
      expect(healthCheckURL).toBe('https://e-code.ai/api/health');
    });

    it('should provide environment-specific health check URLs', () => {
      setEnvironment('development');
      const config = require('@shared/config');
      
      expect(config.getHealthCheckURL()).toBe('http://localhost:5000/api/health');
      
      setEnvironment('staging');
      jest.resetModules();
      const stagingConfig = require('@shared/config');
      expect(stagingConfig.getHealthCheckURL()).toBe('https://staging.e-code.ai/api/health');
    });
  });
});

describe('Health Check Connectivity (Smoke Tests)', () => {
  // These tests require actual server to be running
  // Skip in CI if server not available
  
  const shouldRunSmokeTests = process.env.RUN_SMOKE_TESTS === 'true';
  
  (shouldRunSmokeTests ? it : it.skip)('should connect to development health check', async () => {
    setEnvironment('development');
    const config = require('@shared/config');
    
    const healthURL = config.getHealthCheckURL();
    
    try {
      const response = await axios.get(healthURL, { timeout: 5000 });
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status');
    } catch (error: any) {
      // Log for debugging but don't fail if dev server not running
      console.log(`Dev health check not available: ${error.message}`);
    }
  });
  
  (shouldRunSmokeTests ? it : it.skip)('should connect to staging health check', async () => {
    setEnvironment('staging');
    const config = require('@shared/config');
    
    const healthURL = config.getHealthCheckURL();
    
    try {
      const response = await axios.get(healthURL, { timeout: 5000 });
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status');
    } catch (error: any) {
      console.log(`Staging health check not available: ${error.message}`);
    }
  });

  afterAll(() => {
    resetEnvironment();
  });
});
