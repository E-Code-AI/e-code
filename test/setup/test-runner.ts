import path from 'node:path';
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
  file?: string;
};

const escapeRegex = (value: string) => value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

const matchesPattern = (suite: RegisteredSuite, test: TestCase, pattern?: string): boolean => {
  if (!pattern) {
    return true;
  }

  const matcher = new RegExp(escapeRegex(pattern), 'i');
  if (matcher.test(suite.name) || matcher.test(test.name)) {
    return true;
  }

  return suite.file ? matcher.test(suite.file) : false;
};

const getCallingTestFile = (): string | undefined => {
  const stack = new Error().stack?.split('\n') ?? [];
  for (const line of stack) {
    const match = line.match(/((?:[A-Za-z]:)?[\\/][^:]+?\.(?:test|spec)\.[tj]sx?)/i);
    if (match) {
      const resolved = match[1];
      const relative = path.relative(process.cwd(), resolved);
      return relative || resolved;
    }
  }
  return undefined;
};

const formatDuration = (durationMs: number): string => {
  if (durationMs >= 1000) {
    return `${(durationMs / 1000).toFixed(2)}s`;
  }
  return `${durationMs.toFixed(2)}ms`;
};

class TestRunnerImpl {
  private suites: RegisteredSuite[] = [];

  registerSuite(name: string, suite: TestSuite): void {
    this.suites.push({ name, suite, file: getCallingTestFile() });
  }

  async run(pattern?: string): Promise<{ failed: number; passed: number }> {
    const hasFocusedTests = this.suites.some((entry) => entry.suite.tests.some((test) => test.only));
    let passed = 0;
    let failed = 0;

    for (const entry of this.suites) {
      const runnableTests: TestCase[] = [];
      for (const test of entry.suite.tests) {
        if (test.skip || (hasFocusedTests && !test.only) || !matchesPattern(entry, test, pattern)) {
          continue;
        }
        runnableTests.push(test);
      }

      if (runnableTests.length === 0) {
        continue;
      }

      console.log(`\nSuite: ${entry.name}`);
      const { beforeAll, afterAll, beforeEach, afterEach } = entry.suite;

      if (beforeAll) {
        await beforeAll();
      }

      for (const test of runnableTests) {
        if (beforeEach) {
          await beforeEach();
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
          logError(error);
        } finally {
          if (afterEach) {
            await afterEach();
          }
        }
      }

      if (afterAll) {
        await afterAll();
      }
    }

    console.log(`\nTest Results: ${passed} passed, ${failed} failed`);

    return { failed, passed };
  }
}

const logError = (error: unknown) => {
  if (error instanceof Error) {
    console.error(error.stack ?? error.message);
  } else {
    console.error(error);
  }
};

export const testRunner = new TestRunnerImpl();

export type TestRunner = typeof testRunner;
