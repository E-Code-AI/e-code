/**
 * Enterprise-Grade Jest Configuration
 * Fortune 500 Testing Standards
 *
 * Coverage Requirements:
 * - Statements: 80%
 * - Branches: 75%
 * - Functions: 80%
 * - Lines: 80%
 */

export default {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Test directories
  roots: [
    '<rootDir>/server',
    '<rootDir>/test/unit',
    '<rootDir>/test/integration'
  ],

  // Test patterns
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.spec.ts',
    '**/test/unit/**/*.test.ts',
    '**/test/integration/**/*.test.ts'
  ],

  // Coverage configuration (FORTUNE 500 STANDARDS)
  collectCoverageFrom: [
    'server/**/*.{ts,tsx}',
    '!server/**/*.d.ts',
    '!server/**/__tests__/**',
    '!server/**/node_modules/**',
    '!server/index.ts', // Entry point
    '!server/**/types/**'
  ],

  coverageThresholds: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80
    },
    // Critical paths require 90% coverage
    './server/auth.ts': {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90
    },
    './server/middleware/security.ts': {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90
    },
    './server/services/agent-*.ts': {
      statements: 85,
      branches: 80,
      functions: 85,
      lines: 85
    }
  },

  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json-summary',
    'cobertura' // For CI/CD integration
  ],

  coverageDirectory: '<rootDir>/coverage',

  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/server/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@test/(.*)$': '<rootDir>/test/$1'
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/test/setup/jest.setup.ts'],

  // Globals
  globals: {
    'ts-jest': {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }
  },

  // Timeout for async tests
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Detect open handles
  detectOpenHandles: true,

  // Force exit after tests
  forceExit: true,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './test-results',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ],

  // Max workers for parallel execution
  maxWorkers: '50%',

  // Bail on first failure in CI
  bail: process.env.CI ? 1 : 0
};
