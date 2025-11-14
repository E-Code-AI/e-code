/**
 * Jest Global Setup
 * Initializes test environment with proper configuration
 */

import { config } from 'dotenv';
import path from 'path';

// Load test environment variables
config({ path: path.resolve(__dirname, '../../.env.test') });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/ecode_test';
process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379/1';

// Disable external API calls in tests
process.env.OPENAI_API_KEY = 'test-key-openai';
process.env.ANTHROPIC_API_KEY = 'test-key-anthropic';
process.env.GOOGLE_AI_API_KEY = 'test-key-google';

// Session secrets for tests
process.env.SESSION_SECRET = 'test-session-secret-key-for-jest';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-jest';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-jest';

// Disable rate limiting in tests
process.env.DISABLE_RATE_LIMITING = 'true';

// Mock console methods to reduce noise
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Suppress expected error logs in tests
  console.error = jest.fn((message, ...args) => {
    if (
      typeof message === 'string' &&
      (message.includes('Test error') ||
       message.includes('Expected error'))
    ) {
      return;
    }
    originalConsoleError(message, ...args);
  });

  console.warn = jest.fn((message, ...args) => {
    if (
      typeof message === 'string' &&
      (message.includes('Test warning') ||
       message.includes('[CORS]'))
    ) {
      return;
    }
    originalConsoleWarn(message, ...args);
  });
});

afterAll(() => {
  // Restore console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global test timeout
jest.setTimeout(10000);

// Mock timers utilities
global.flushPromises = () => new Promise(resolve => setImmediate(resolve));

// Test database utilities
export const clearDatabase = async () => {
  // Implementation will depend on your database setup
  // This is a placeholder for cleaning test database
};

export const seedTestData = async () => {
  // Implementation for seeding test data
  // This is a placeholder
};
