/**
 * Test Configuration
 * Fortune 500-grade testing infrastructure
 */

import { config } from 'dotenv';
import path from 'path';

// Load test environment variables
config({ path: path.join(__dirname, '../../.env.test') });

// Test database configuration
export const testConfig = {
  database: {
    url: process.env.TEST_DATABASE_URL || 'postgresql://localhost/ecode_test',
    poolSize: 5,
    timeout: 30000
  },
  
  redis: {
    url: process.env.TEST_REDIS_URL || 'redis://localhost:6379/1',
    prefix: 'test:'
  },
  
  server: {
    port: process.env.TEST_PORT || 5001,
    host: 'localhost'
  },
  
  auth: {
    secret: 'test-secret-key-for-testing-only',
    jwtSecret: 'test-jwt-secret'
  },
  
  features: {
    enableMocking: true,
    enableCoverage: process.env.COVERAGE === 'true',
    verbose: process.env.VERBOSE === 'true'
  },
  
  timeouts: {
    unit: 5000,
    integration: 30000,
    e2e: 60000
  },
  
  retries: {
    flaky: 3,
    network: 5
  }
};

// Test utilities
export const testUtils = {
  // Generate random test data
  randomId: () => Math.random().toString(36).substring(7),
  randomEmail: () => `test-${Date.now()}@example.com`,
  randomUsername: () => `user_${Date.now()}`,
  
  // Wait utilities
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Retry helper
  retry: async <T>(
    fn: () => Promise<T>,
    options: { retries?: number; delay?: number } = {}
  ): Promise<T> => {
    const { retries = 3, delay = 1000 } = options;
    let lastError: Error | null = null;
    
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (i < retries - 1) {
          await testUtils.wait(delay * Math.pow(2, i));
        }
      }
    }
    
    throw lastError;
  }
};

// Mock services configuration
export const mockServices = {
  stripe: {
    enabled: true,
    publicKey: 'pk_test_mock',
    secretKey: 'sk_test_mock'
  },
  
  anthropic: {
    enabled: true,
    apiKey: 'mock-anthropic-key'
  },
  
  email: {
    enabled: true,
    provider: 'mock'
  },
  
  storage: {
    enabled: true,
    provider: 'memory'
  }
};

// Test categories
export const testCategories = {
  unit: {
    pattern: '**/*.unit.test.ts',
    timeout: testConfig.timeouts.unit
  },
  
  integration: {
    pattern: '**/*.integration.test.ts',
    timeout: testConfig.timeouts.integration
  },
  
  e2e: {
    pattern: '**/*.e2e.test.ts',
    timeout: testConfig.timeouts.e2e
  },
  
  performance: {
    pattern: '**/*.perf.test.ts',
    timeout: testConfig.timeouts.e2e
  },
  
  security: {
    pattern: '**/*.security.test.ts',
    timeout: testConfig.timeouts.integration
  }
};