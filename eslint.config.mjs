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
      // Allow @ts-nocheck on legacy files (306+ files currently depend on it);
      // still block @ts-ignore and require descriptions on @ts-expect-error.
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          'ts-nocheck': false,
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
    },
  },
];
