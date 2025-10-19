import { performance } from 'node:perf_hooks';

type MaybePromise<T> = T | Promise<T>;

export type TestCase = {
  name: string;
  fn: () => MaybePromise<void>;
  skip?: boolean;
  only?: boolean;
};

export type SuiteLifecycle = {
  beforeAll?: () => MaybePromise<void>;
  afterAll?: () => MaybePromise<void>;
  beforeEach?: () => MaybePromise<void>;
  afterEach?: () => MaybePromise<void>;
};

export type TestSuite = SuiteLifecycle & {
  tests: TestCase[];
};

type RegisteredSuite = {
  name: string;
  suite: TestSuite;
};

const registeredSuites: RegisteredSuite[] = [];

const matchesPattern = (name: string, pattern?: string): boolean => {
  if (!pattern) {
    return true;
  }

  const normalized = pattern.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return name.toLowerCase().includes(normalized);
};

const hasFocusedTests = (): boolean =>
  registeredSuites.some((entry) => entry.suite.tests.some((test) => test.only));

const formatDuration = (ms: number): string => `${ms.toFixed(0)}ms`;

export const testRunner = {
  registerSuite(name: string, suite: TestSuite): void {
    registeredSuites.push({ name, suite });
  },

  async run(pattern?: string): Promise<{ failed: number; passed: number }> {
    let failed = 0;
    let passed = 0;
    const focused = hasFocusedTests();

    for (const { name: suiteName, suite } of registeredSuites) {
      const tests = suite.tests.filter((test) => {
        if (focused && !test.only) {
          return false;
        }

        if (test.skip) {
          return false;
        }

        return matchesPattern(`${suiteName} ${test.name}`, pattern);
      });

      if (tests.length === 0) {
        continue;
      }

      console.log(`\nSuite: ${suiteName}`);

      if (suite.beforeAll) {
        await suite.beforeAll();
      }

      for (const test of tests) {
        if (suite.beforeEach) {
          await suite.beforeEach();
        }

        const started = performance.now();

        try {
          await test.fn();
          passed += 1;
          const duration = performance.now() - started;
          console.log(`  ✓ ${test.name} (${formatDuration(duration)})`);
        } catch (error) {
          failed += 1;
          const duration = performance.now() - started;
          console.error(`  ✗ ${test.name} (${formatDuration(duration)})`);
          if (error instanceof Error) {
            console.error(error.stack ?? error.message);
          } else {
            console.error(error);
          }
        }

        if (suite.afterEach) {
          await suite.afterEach();
        }
      }

      if (suite.afterAll) {
        await suite.afterAll();
      }
    }

    console.log(`\nTest Results: ${passed} passed, ${failed} failed`);

    return { failed, passed };
  },
};

export type TestRunner = typeof testRunner;
