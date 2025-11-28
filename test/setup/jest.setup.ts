/**
 * Jest Setup File
 * Runs before all tests to configure global environment
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/ecode_test';

// Increase timeout for integration tests
jest.setTimeout(10000);

// Global test utilities
global.testUtils = {
    async waitFor(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

// Clean up after all tests
afterAll(async () => {
    // Close database connections, etc.
    await new Promise(resolve => setTimeout(resolve, 100));
});
