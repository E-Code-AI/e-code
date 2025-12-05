/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: {
    browser: false,
    node: true,
    es2022: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint', 'import', 'unused-imports', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:prettier/recommended',
  ],
  settings: {
    'import/resolver': {
      typescript: {
        project: ['./tsconfig.json'],
      },
      node: {
        extensions: ['.js', '.cjs', '.mjs', '.ts', '.tsx', '.json'],
      },
    },
  },
  rules: {
    // Core
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'warn',
    'no-var': 'error',
    'prefer-const': [
      'error',
      {
        destructuring: 'all',
        ignoreReadBeforeAssign: true,
      },
    ],
    eqeqeq: ['error', 'always', { null: 'ignore' }],
    'no-unused-vars': 'off',

    // TypeScript
    '@typescript-eslint/no-unused-vars': 'off',
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': [
      'warn',
      {
        vars: 'all',
        varsIgnorePattern: '^_',
        args: 'after-used',
        argsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/consistent-type-imports': [
      'error',
      {
        prefer: 'type-imports',
        disallowTypeAnnotations: false,
        fixStyle: 'inline-type-imports',
      },
    ],
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/restrict-template-expressions': [
      'error',
      {
        allowNumber: true,
        allowBoolean: true,
        allowAny: false,
        allowNullish: true,
      },
    ],

    // Import
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          ['parent', 'sibling', 'index'],
          'object',
          'type',
        ],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
    'import/no-unresolved': 'error',
    'import/no-duplicates': 'error',
    'import/newline-after-import': 'error',
    'import/no-default-export': 'off',

    // Prettier
    'prettier/prettier': 'error',
  },
  overrides: [
    // Client-side (browser) code
    {
      files: ['src/client/**/*.{js,jsx,ts,tsx}', 'client/**/*.{js,jsx,ts,tsx}'],
      env: {
        browser: true,
        node: false,
      },
      rules: {
        'no-alert': 'warn',
      },
    },
    // Server-side (Node) code
    {
      files: ['src/server/**/*.{js,jsx,ts,tsx}', 'server/**/*.{js,jsx,ts,tsx}'],
      env: {
        browser: false,
        node: true,
      },
      rules: {
        'no-process-exit': 'warn',
      },
    },
    // Configuration and tooling files
    {
      files: [
        '*.config.{js,cjs,mjs,ts}',
        '.*rc.{js,cjs,mjs,ts}',
        'scripts/**/*.{js,ts}',
      ],
      env: {
        node: true,
        browser: false,
      },
      parserOptions: {
        project: null,
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/no-require-imports': 'off',
      },
    },
    // Test files
    {
      files: [
        '**/*.test.{js,jsx,ts,tsx}',
        '**/*.spec.{js,jsx,ts,tsx}',
        'tests/**/*.{js,jsx,ts,tsx}',
      ],
      env: {
        jest: true,
        node: true,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        'no-console': 'off',
      },
    },
    // JavaScript-only files (no TS)
    {
      files: ['**/*.{js,cjs,mjs}'],
      parserOptions: {
        project: null,
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/no-require-imports': 'off',
      },
    },
  ],
};