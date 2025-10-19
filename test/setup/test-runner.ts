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

class TestRunner {
  private suites: RegisteredSuite[] = [];

const logError = (error: unknown) => {
  if (error instanceof Error) {
    console.error(error.stack ?? error.message);
  } else {
    console.error(error);
  }
};

const logError = (error: unknown): void => {
  if (error instanceof Error) {
    console.error(error.stack ?? error.message);
  } else {
    console.error(error);
  }
};

type PhaseError = {
  phase: 'beforeEach' | 'test' | 'afterEach';
  error: unknown;
};

export const testRunner = {
  registerSuite(name: string, suite: TestSuite): void {
    this.suites.push({ name, suite, file: getCallingTestFile() });
  }

  async run(pattern?: string) {
    const hasFocusedTests = this.suites.some((entry) => entry.suite.tests.some((test) => test.only));
    let total = 0;
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    for (const entry of this.suites) {
      const runnableTests: TestCase[] = [];
      for (const test of entry.suite.tests) {
        total += 1;
        if (test.skip || (hasFocusedTests && !test.only) || !matchesPattern(entry, test, pattern)) {
          skipped += 1;
          continue;
        }
        runnableTests.push(test);
      }

      if (runnableTests.length === 0) {
        continue;
      }

      console.log(`\nSuite: ${entry.name}`);
      const { beforeAll, afterAll, beforeEach, afterEach } = entry.suite;

      if (suite.beforeAll) {
        try {
          await suite.beforeAll();
        } catch (error) {
          for (const test of tests) {
            failed += 1;
            console.error(`  ✗ ${test.name} (0ms)`);
            console.error('    beforeAll failed:');
            logError(error);
          }

          if (suite.afterAll) {
            try {
              await suite.afterAll();
            } catch (afterAllError) {
              console.error('    afterAll cleanup also failed:');
              logError(afterAllError);
            }
          }

          continue;
        }
      }

      const runPhase = async (
        phase: PhaseError['phase'],
        fn: () => MaybePromise<void>,
        errors: PhaseError[],
      ): Promise<boolean> => {
        try {
          await fn();
          return true;
        } catch (error) {
          errors.push({ phase, error });
          return false;
        }
      };

      for (const test of tests) {
        const started = performance.now();
        const errors: PhaseError[] = [];
        const beforeEachSucceeded = !suite.beforeEach
          || (await runPhase('beforeEach', suite.beforeEach, errors));

        try {
          if (beforeEachSucceeded) {
            await runPhase('test', test.fn, errors);
          }
        } finally {
          if (suite.afterEach) {
            await runPhase('afterEach', suite.afterEach, errors);
          }
        }

        const duration = performance.now() - started;

        if (errors.length === 0) {
          passed += 1;
          console.log(`  ✓ ${test.name} (${formatDuration(duration)})`);
        } else {
          failed += 1;
          console.error(`  ✗ ${test.name} (${formatDuration(duration)})`);
          for (const { phase, error } of errors) {
            console.error(`    ${phase} failed:`);
            logError(error);
          }
        }
      }

      if (suite.afterAll) {
        try {
          await suite.afterAll();
        } catch (error) {
          failed += 1;
          console.error('  ✗ afterAll failed:');
          logError(error);
        }
      }
    }

    console.log(`\nTest Results: ${passed} passed, ${failed} failed`);

    return { failed, passed };
  },
};

export type TestRunner = typeof testRunner;
