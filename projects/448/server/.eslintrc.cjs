/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: false,
  env: {
    node: true,
    es2021: true,
  },
  extends: ['../.eslintrc.cjs'],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'script',
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'script',
        project: ['./tsconfig.json'],
        tsconfigRootDir: __dirname,
      },
      plugins: ['@typescript-eslint'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
      },
    },
    {
      files: ['**/*.js', '**/*.cjs'],
      env: {
        node: true,
      },
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'script',
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    'import/no-commonjs': 'off',
    'import/extensions': [
      'error',
      'ignorePackages',
      {
        js: 'never',
        cjs: 'never',
        ts: 'never',
      },
    ],
  },
};