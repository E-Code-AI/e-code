# Testing Guide

This guide documents the lightweight TypeScript testing harness that validates the critical behaviors of the E‑Code platform.

## Quick Start

```bash
npm install
npm test
```

Running `npm test` executes `test/run-tests.ts`, which registers global assertions, imports every suite under `test/`, and prints a condensed report.

## Targeted Execution

The runner accepts an optional filter argument that matches against suite and test names (case-insensitive substring matching).

```bash
# Run only the security scanner suites
npm test -- "Security"

# Execute newsletter helper scenarios
npm test -- "Newsletter"
```

When no matches are found the runner marks the affected suites as skipped, helping catch typos in filter strings.

## Writing Tests

1. Import `testRunner` from `test/setup/test-runner`.
2. Register a suite with a descriptive name and an array of test cases.
3. Use the global `expect` helpers provided by `test/setup/globals` for assertions.
4. Export nothing—suites are executed as a side effect when the file is imported by `test/run-tests.ts`.

Example:

```ts
import { testRunner } from './setup/test-runner';

testRunner.registerSuite('Example Suite', {
  tests: [
    {
      name: 'performs a basic assertion',
      fn: () => {
        expect(1 + 1).toBe(2);
      },
    },
  ],
});
```

## Asynchronous Helpers

- Attach `beforeAll`, `afterAll`, `beforeEach`, or `afterEach` callbacks to manage shared setup/teardown.
- Return a `Promise` from a test case to await asynchronous operations.
- Throw (or `expect` failures) to mark a test as failed.

## CI Recommendations

- Wire `npm test` into the build pipeline alongside `npm run typecheck` and `npm run build`.
- Use filters for smoke checks in pre-commit hooks while keeping the default command for full coverage in CI.

_For additional workflow details, pair this guide with the [Testing & Quality Gates](../README.md#testing--quality-gates) section of the project README._
