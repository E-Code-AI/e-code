/**
 * Comprehensive tests for mobile API configuration
 * 
 * These tests ensure that:
 * 1. Development environment allows localhost
 * 2. Production environment REQUIRES explicit URL configuration
 * 3. Production environment REJECTS localhost URLs
 * 4. Configuration fails fast with clear error messages
 */

import Constants from 'expo-constants';

// Store original __DEV__ value
const originalDev = (global as any).__DEV__;

// Helper to reset module cache and __DEV__ flag
function resetConfig(isDev: boolean = false) {
  // Set __DEV__ flag
  (global as any).__DEV__ = isDev;
  
  // Clear the module cache to force re-evaluation
  jest.resetModules();
}

// Helper to set Expo config
function setExpoConfig(extra: Record<string, any>) {
  (Constants as any).expoConfig = { extra };
}

describe('Mobile API Configuration', () => {
  beforeEach(() => {
    // Reset console mocks
    jest.clearAllMocks();
    
    // Reset Expo constants
    setExpoConfig({});
  });

  afterAll(() => {
    // Restore original __DEV__
    (global as any).__DEV__ = originalDev;
  });

  describe('Development Environment', () => {
    it('should allow localhost in development when __DEV__ is true', () => {
      resetConfig(true);
      setExpoConfig({});
      
      const { config } = require('../config');
      
      expect(config.environment).toBe('development');
      expect(config.apiBaseUrl).toBe('http://localhost:5000/api');
      expect(config.isDevelopment).toBe(true);
      expect(config.isProduction).toBe(false);
    });

    it('should use configured URL over default in development', () => {
      resetConfig(true);
      setExpoConfig({
        apiBaseUrl: 'http://192.168.1.100:5000/api'
      });
      
      const { config } = require('../config');
      
      expect(config.apiBaseUrl).toBe('http://192.168.1.100:5000/api');
    });

    it('should detect explicit development environment from config', () => {
      resetConfig(false);
      setExpoConfig({
        environment: 'development'
      });
      
      const { config } = require('../config');
      
      expect(config.environment).toBe('development');
      expect(config.apiBaseUrl).toBe('http://localhost:5000/api');
    });
  });

  describe('Production Environment', () => {
    it('should throw error if production has no configured URL', () => {
      resetConfig(false); // __DEV__ = false = production
      setExpoConfig({});
      
      expect(() => {
        require('../config');
      }).toThrow(/No API base URL configured for PRODUCTION/);
    });

    it('should throw error if production URL is localhost', () => {
      resetConfig(false);
      setExpoConfig({
        apiBaseUrl: 'http://localhost:5000/api'
      });
      
      expect(() => {
        require('../config');
      }).toThrow(/PRODUCTION environment cannot use localhost URL/);
    });

    it('should throw error if production URL is 127.0.0.1', () => {
      resetConfig(false);
      setExpoConfig({
        apiBaseUrl: 'http://127.0.0.1:5000/api'
      });
      
      expect(() => {
        require('../config');
      }).toThrow(/PRODUCTION environment cannot use localhost URL/);
    });

    it('should throw error if production URL is Android emulator localhost', () => {
      resetConfig(false);
      setExpoConfig({
        apiBaseUrl: 'http://10.0.2.2:5000/api'
      });
      
      expect(() => {
        require('../config');
      }).toThrow(/PRODUCTION environment cannot use localhost URL/);
    });

    it('should accept valid production URL', () => {
      resetConfig(false);
      setExpoConfig({
        apiBaseUrl: 'https://api.e-code.app/api'
      });
      
      const { config } = require('../config');
      
      expect(config.environment).toBe('production');
      expect(config.apiBaseUrl).toBe('https://api.e-code.app/api');
      expect(config.isProduction).toBe(true);
      expect(config.isDevelopment).toBe(false);
    });

    it('should accept production URL with custom domain', () => {
      resetConfig(false);
      setExpoConfig({
        apiBaseUrl: 'https://mycompany.com/api'
      });
      
      const { config } = require('../config');
      
      expect(config.apiBaseUrl).toBe('https://mycompany.com/api');
    });
  });

  describe('Staging Environment', () => {
    it('should require explicit URL for staging', () => {
      resetConfig(false);
      setExpoConfig({
        environment: 'staging'
      });
      
      expect(() => {
        require('../config');
      }).toThrow(/No API base URL configured for STAGING/);
    });

    it('should accept valid staging URL', () => {
      resetConfig(false);
      setExpoConfig({
        environment: 'staging',
        apiBaseUrl: 'https://staging.e-code.app/api'
      });
      
      const { config } = require('../config');
      
      expect(config.environment).toBe('staging');
      expect(config.apiBaseUrl).toBe('https://staging.e-code.app/api');
      expect(config.isStaging).toBe(true);
      expect(config.isProduction).toBe(false);
    });

    it('should reject localhost in staging', () => {
      resetConfig(false);
      setExpoConfig({
        environment: 'staging',
        apiBaseUrl: 'http://localhost:5000/api'
      });
      
      expect(() => {
        require('../config');
      }).toThrow(/STAGING environment cannot use localhost URL/);
    });

    it('should detect staging from release channel', () => {
      resetConfig(false);
      setExpoConfig({
        releaseChannel: 'staging',
        apiBaseUrl: 'https://staging.e-code.app/api'
      });
      
      const { config } = require('../config');
      
      expect(config.environment).toBe('staging');
    });
  });

  describe('Runtime Validation', () => {
    it('should pass validation for valid development config', () => {
      resetConfig(true);
      setExpoConfig({});
      
      const { validateConfig } = require('../config');
      
      expect(() => {
        validateConfig();
      }).not.toThrow();
    });

    it('should pass validation for valid production config', () => {
      resetConfig(false);
      setExpoConfig({
        apiBaseUrl: 'https://api.e-code.app/api'
      });
      
      const { validateConfig } = require('../config');
      
      expect(() => {
        validateConfig();
      }).not.toThrow();
    });

    it('should fail validation if production uses localhost', () => {
      resetConfig(false);
      setExpoConfig({
        environment: 'production',
        apiBaseUrl: 'http://localhost:5000/api'
      });
      
      expect(() => {
        const { validateConfig } = require('../config');
        validateConfig();
      }).toThrow(/Production build is configured with localhost URL/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing expoConfig gracefully', () => {
      resetConfig(true);
      (Constants as any).expoConfig = undefined;
      
      const { config } = require('../config');
      
      expect(config.environment).toBe('development');
      expect(config.apiBaseUrl).toBe('http://localhost:5000/api');
    });

    it('should handle missing extra object gracefully', () => {
      resetConfig(true);
      (Constants as any).expoConfig = {};
      
      const { config } = require('../config');
      
      expect(config.apiBaseUrl).toBe('http://localhost:5000/api');
    });

    it('should detect localhost in URLs with ports', () => {
      resetConfig(false);
      setExpoConfig({
        apiBaseUrl: 'http://localhost:3000/api'
      });
      
      expect(() => {
        require('../config');
      }).toThrow(/localhost URL/);
    });

    it('should detect localhost in HTTPS URLs', () => {
      resetConfig(false);
      setExpoConfig({
        apiBaseUrl: 'https://localhost:5000/api'
      });
      
      expect(() => {
        require('../config');
      }).toThrow(/localhost URL/);
    });

    it('should be case-insensitive for localhost detection', () => {
      resetConfig(false);
      setExpoConfig({
        apiBaseUrl: 'http://LOCALHOST:5000/api'
      });
      
      expect(() => {
        require('../config');
      }).toThrow(/localhost URL/);
    });
  });

  describe('Backward Compatibility', () => {
    it('should export API_BASE_URL for legacy code', () => {
      resetConfig(true);
      setExpoConfig({});
      
      const { API_BASE_URL, config } = require('../config');
      
      expect(API_BASE_URL).toBe(config.apiBaseUrl);
    });
  });

  describe('Error Messages', () => {
    it('should provide helpful error message for missing production URL', () => {
      resetConfig(false);
      setExpoConfig({});
      
      try {
        require('../config');
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('No API base URL configured');
        expect(error.message).toContain('EXPO_PUBLIC_API_BASE');
        expect(error.message).toContain('https://your-api.example.com/api');
      }
    });

    it('should provide helpful error message for localhost in production', () => {
      resetConfig(false);
      setExpoConfig({
        apiBaseUrl: 'http://localhost:5000/api'
      });
      
      try {
        require('../config');
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('PRODUCTION environment cannot use localhost URL');
        expect(error.message).toContain('http://localhost:5000/api');
      }
    });
  });
});
