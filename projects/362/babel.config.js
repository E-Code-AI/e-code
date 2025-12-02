/**
 * Babel configuration for transpiling modern JavaScript/TypeScript and React JSX
 * into browser-compatible JavaScript.
 *
 * This configuration is suitable for:
 * - TypeScript and JavaScript
 * - React (including automatic JSX runtime)
 * - Modern language features (class properties, optional chaining, etc.)
 * - Environment-based optimizations (development vs production)
 */

/** @type {import('@babel/core').TransformOptions} */
const config = {
  presets: [
    [
      '@babel/preset-env',
      {
        // Adjust targets as needed for your supported browsers
        targets: {
          browsers: ['>0.25%', 'not dead', 'not op_mini all'],
        },
        useBuiltIns: 'usage',
        corejs: 3,
        modules: process.env.BABEL_ENV === 'test' ? 'commonjs' : false,
        bugfixes: true,
      },
    ],
    [
      '@babel/preset-react',
      {
        runtime: 'automatic',
        development:
          process.env.BABEL_ENV === 'development' ||
          process.env.NODE_ENV === 'development',
        useBuiltIns: true,
      },
    ],
    [
      '@babel/preset-typescript',
      {
        allowDeclareFields: true,
        allExtensions: true,
        isTSX: true,
      },
    ],
  ],
  plugins: [
    // Class properties and private fields
    ['@babel/plugin-proposal-class-properties', { loose: false }],
    ['@babel/plugin-proposal-private-methods', { loose: false }],
    ['@babel/plugin-proposal-private-property-in-object', { loose: false }],

    // Optional chaining, nullish coalescing, etc. (usually covered by preset-env, but explicit for clarity)
    '@babel/plugin-proposal-optional-chaining',
    '@babel/plugin-proposal-nullish-coalescing-operator',

    // Transform runtime to avoid polluting global scope and reduce bundle size
    [
      '@babel/plugin-transform-runtime',
      {
        corejs: false,
        helpers: true,
        regenerator: true,
        useESModules:
          process.env.BABEL_ENV !== 'test' &&
          process.env.NODE_ENV !== 'test',
      },
    ],

    // React optimizations
    process.env.NODE_ENV === 'production' && 'babel-plugin-transform-react-remove-prop-types',
  ].filter(Boolean),
  env: {
    test: {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: { node: 'current' },
            modules: 'commonjs',
          },
        ],
      ],
      plugins: [
        // Additional plugins for test environment can be added here
      ],
    },
  },
};

module.exports = config;