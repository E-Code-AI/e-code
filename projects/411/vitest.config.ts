import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx,js,jsx}'],
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
      '**/coverage/**',
      '**/.next/**',
      '**/cypress/**',
    ],
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'vitest.config.{ts,js}',
        'vite.config.{ts,js}',
        '**/*.d.ts',
        '**/node_modules/**',
        '**/dist/**',
        '**/coverage/**',
        '**/tests/**',
        '**/__tests__/**',
        '**/__mocks__/**',
      ],
    },
    setupFiles: [],
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    passWithNoTests: true,
    testTimeout: 10000,
    hookTimeout: 10000,
    logHeapUsage: false,
  },
  resolve: {
    alias: {},
  },
});