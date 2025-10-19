import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

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
  filePath?: string;
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

const extractFilePathFromStack = (): string | undefined => {
  const stack = new Error().stack;
  if (!stack) {
    return undefined;
  }

  const frames = stack.split('\n').slice(1);
  for (const rawFrame of frames) {
    const frame = rawFrame.trim();
    const match =
      frame.match(/\((.*?):\d+:\d+\)$/) ?? frame.match(/at (.*?):\d+:\d+$/);
    if (!match) {
      continue;
    }

    let candidate = match[1];
    if (candidate.startsWith('file://')) {
      try {
        candidate = fileURLToPath(candidate);
      } catch {
        // ignore parsing errors and fall back to the raw value
      }
    }

    if (candidate.includes('test/setup/test-runner')) {
      continue;
    }

    return candidate;
  }

  return undefined;
};

const hasFocusedTests = (): boolean =>
  registeredSuites.some((entry) => entry.suite.tests.some((test) => test.only));

const formatDuration = (ms: number): string => `${ms.toFixed(0)}ms`;

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
    const filePath = extractFilePathFromStack();
    registeredSuites.push({ name, suite, filePath });
  },

  async run(pattern?: string): Promise<{ failed: number; passed: number }> {
    let failed = 0;
    let passed = 0;
    const focused = hasFocusedTests();

    for (const { name: suiteName, suite, filePath } of registeredSuites) {
      const tests = suite.tests.filter((test) => {
        if (focused && !test.only) {
          return false;
        }

        if (test.skip) {
          return false;
        }

        if (matchesPattern(`${suiteName} ${test.name}`, pattern)) {
          return true;
        }

        if (filePath) {
          return matchesPattern(filePath, pattern);
        }

        return false;
      });

      if (tests.length === 0) {
        continue;
      }

      console.log(`\nSuite: ${suiteName}`);

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
