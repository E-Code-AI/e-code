/**
 * Jest Setup Configuration
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://localhost:5432/ecode_test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.SESSION_SECRET = 'test-session-secret';

// Increase test timeout for slower operations
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Silence console during tests unless DEBUG is set
  if (!process.env.DEBUG_TESTS) {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  }
});

afterAll(() => {
  // Restore console methods
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Clean up database connections after tests
afterAll(async () => {
  // Close any open database connections
  if (global.db) {
    await global.db.end();
  }
});

// Mock SendGrid for tests
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue([{ statusCode: 202 }]),
  sendMultiple: jest.fn().mockResolvedValue([{ statusCode: 202 }])
}));

// Global test helpers
global.testHelpers = {
  generateTestUser: () => ({
    id: Math.floor(Math.random() * 10000),
    username: `testuser${Date.now()}`,
    email: `test${Date.now()}@example.com`,
    displayName: 'Test User'
  }),
  
  generateTestProject: () => ({
    id: Math.floor(Math.random() * 10000),
    name: `Test Project ${Date.now()}`,
    slug: `test-project-${Date.now()}`,
    description: 'Test project description'
  })
};