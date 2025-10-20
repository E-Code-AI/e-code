import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import globals from 'globals';

export default [
  {
    ignores: [
      '**/*.d.ts',
      'node_modules/',
      'dist/',
      'build/',
      'coverage/',
      'reports/',
      'sdk/',
      'mobile/',
      'client/public/',
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
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
];
