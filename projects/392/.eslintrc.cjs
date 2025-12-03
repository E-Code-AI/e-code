/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.d.ts'],
      },
      typescript: {
        alwaysTryTypes: true,
        project: ['./tsconfig.json'],
      },
    },
  },
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'jsx-a11y',
    'import',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier',
  ],
  rules: {
    // General JS rules
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'warn',
    'no-alert': 'warn',
    'no-var': 'error',
    'prefer-const': [
      'error',
      {
        destructuring: 'all',
        ignoreReadBeforeAssign: true,
      },
    ],
    eqeqeq: ['error', 'always', { null: 'ignore' }],
    'no-unused-vars': 'off', // handled by @typescript-eslint/no-unused-vars
    'no-undef': 'off', // handled by TypeScript

    // Import rules
    'import/order': [
      'warn',
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
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],
    'import/no-unresolved': 'off', // handled by TS
    'import/named': 'off', // handled by TS
    'import/no-extraneous-dependencies': [
      'warn',
      {
        devDependencies: [
          '**/*.test.{js,jsx,ts,tsx}',
          '**/*.spec.{js,jsx,ts,tsx}',
          '**/setupTests.{js,jsx,ts,tsx}',
          '**/vite.config.{js,ts}',
          '**/vitest.config.{js,ts}',
          '**/jest.config.{js,ts}',
          '**/webpack.config.{js,ts}',
          '**/rollup.config.{js,ts}',
          '**/eslint.config.{js,cjs}',
          '**/.eslintrc.{js,cjs}',
        ],
        optionalDependencies: false,
      },
    ],

    // TypeScript rules
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/consistent-type-imports': [
      'warn',
      {
        prefer: 'type-imports',
        disallowTypeAnnotations: false,
        fixStyle: 'inline-type-imports',
      },
    ],
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-misused-promises': [
      'error',
      {
        checksVoidReturn: {
          attributes: false,
        },
      },
    ],

    // React rules
    'react/react-in-jsx-scope': 'off', // not needed with React 17+
    'react/prop-types': 'off', // using TypeScript for type checking
    'react/jsx-uses-react': 'off',
    'react/jsx-uses-vars': 'warn',
    'react/self-closing-comp': [
      'warn',
      {
        component: true,
        html: true,
      },
    ],

    // React Hooks rules
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // JSX a11y rules
    'jsx-a11y/anchor-is-valid': 'warn',
  },
  overrides: [
    {
      files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: null,
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/no-require-imports': 'off',
      },
    },
    {
      files: ['**/*.test.{js,jsx,ts,tsx}', '**/*.spec.{js,jsx,ts,tsx}'],
      env: {
        jest: true,
        'jest/globals': true,
      },
      plugins: ['jest'],
      extends: ['plugin:jest/recommended'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
      },
    },
    {
      files: ['**/*.d.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
  ],
  ignorePatterns: [
    'dist',
    'build',
    'coverage',
    'node_modules',
    '*.config.js',
    '*.config.cjs',
    '*.config.mjs',
    'vite.config.*',
    'webpack.config.*',
    'rollup.config.*',
    'jest.config.*',
  ],
};