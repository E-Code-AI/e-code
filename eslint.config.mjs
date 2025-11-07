import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import globals from 'globals';

export default [
  {
    ignores: [
      // Type definitions and generated files
      '**/*.d.ts',
      '**/*.js.map',
      
      // Dependencies
      'node_modules/',
      '**/node_modules/',
      
      // Build outputs
      '**/dist/',
      '**/dist/**',
      'dist/',
      'build/',
      '**/build/',
      
      // Test coverage
      'coverage/',
      
      // Reports
      'reports/',
      
      // Static assets
      'client/public/',
      
      // Known problematic file (TODO: fix this file)
      'client/src/pages/admin/FormRequests.tsx',
    ],
  },
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-undef': 'off',
      'no-case-declarations': 'off',
      'no-useless-escape': 'off',
      'no-unused-vars': 'off',
      'no-useless-catch': 'off',
      'no-async-promise-executor': 'off',
      'no-empty': 'off',
      'no-cond-assign': 'off',
      'no-redeclare': 'off',
      'no-self-assign': 'off',
      'no-dupe-keys': 'off',
      'no-dupe-class-members': 'off',
      'no-import-assign': 'off',
      // CRITICAL: Block TypeScript safety bypasses to enforce type safety
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true, // Block @ts-ignore completely
          'ts-nocheck': true, // Block @ts-nocheck completely
          'ts-check': false,
          'minimumDescriptionLength': 10,
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_|^e$|^error$',
          varsIgnorePattern: '^_|^error$',
          caughtErrorsIgnorePattern: '^_|^e$|^error$',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      // Prevent use of @ts-nocheck in critical files
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false,
          minimumDescriptionLength: 10
        }
      ],
    },
  },
];
