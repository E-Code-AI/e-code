import path from 'node:path';

export interface TestCase {
  name: string;
  fn: () => void | Promise<void>;
}

export interface TestSuite {
  tests: TestCase[];
  beforeAll?: () => void | Promise<void>;
  afterAll?: () => void | Promise<void>;
}

interface RegisteredSuite extends TestSuite {
  name: string;
  file?: string;
}

interface TestResults {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}

class TestRunner {
  private suites: RegisteredSuite[] = [];

  registerSuite(name: string, suite: TestSuite): void {
    let file: string | undefined;

    const stack = new Error().stack?.split('\n') ?? [];
    for (const line of stack) {
      const match = line.match(/((?:[A-Za-z]:)?[\\/][^:]+?\.(?:test|spec)\.[tj]sx?)/i);
      if (match) {
        const resolved = match[1];
        const relative = path.relative(process.cwd(), resolved);
        file = relative || resolved;
        break;
      }
    }

    this.suites.push({ name, file, ...suite });
  }

  async run(pattern?: string): Promise<TestResults> {
    const escapeRegex = (value: string) =>
      value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const matcher = pattern ? new RegExp(escapeRegex(pattern), 'i') : null;
    let total = 0;
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    for (const suite of this.suites) {
      const suiteMatches = matcher
        ? matcher.test(suite.name) || (suite.file ? matcher.test(suite.file) : false)
        : true;

      if (matcher && !suiteMatches) {
        const hasMatchingTest = suite.tests.some(test => matcher.test(test.name));
        if (!hasMatchingTest) {
          skipped += suite.tests.length;
          continue;
        }
      }

      console.log(`\nSuite: ${suite.name}`);
import { performance } from 'node:perf_hooks';

type TestFn = () => void | Promise<void>;

type HookFn = () => void | Promise<void>;

interface TestCase {
  name: string;
  fn: TestFn;
  timeoutMs?: number;
}

interface SuiteDefinition {
  tests: TestCase[];
  beforeAll?: HookFn;
  afterAll?: HookFn;
  beforeEach?: HookFn;
  afterEach?: HookFn;
}

interface SuiteRegistration {
  name: string;
  definition: SuiteDefinition;
}

interface TestResultSummary {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
}

class TestRunner {
  private suites: SuiteRegistration[] = [];

  registerSuite(name: string, definition: SuiteDefinition) {
    this.suites.push({ name, definition });
  }

  async run(pattern?: string): Promise<TestResultSummary> {
    const startTime = performance.now();
    const matcher = pattern ? new RegExp(pattern, 'i') : null;

    let total = 0;
    let passed = 0;
    let failed = 0;

    for (const suite of this.suites) {
      const { name, definition } = suite;
      const testsToRun = definition.tests.filter((test) => {
        if (!matcher) return true;
        return matcher.test(name) || matcher.test(test.name);
      });

      if (testsToRun.length === 0) {
        continue;
      }

      console.log(`\nSuite: ${name}`);

      if (definition.beforeAll) {
        await definition.beforeAll();
      }

      for (const test of testsToRun) {
        total += 1;
        const testStart = performance.now();
        const timeout = test.timeoutMs ?? 5000;
        let timer: NodeJS.Timeout | undefined;

        try {
          await Promise.race([
            (async () => {
              if (definition.beforeEach) {
                await definition.beforeEach();
              }

              await test.fn();

              if (definition.afterEach) {
                await definition.afterEach();
              }
            })(),
            new Promise<never>((_, reject) => {
              timer = setTimeout(() => {
                reject(new Error(`Test timed out after ${timeout}ms`));
              }, timeout);
            }),
          ]);

          passed += 1;
          const testDuration = performance.now() - testStart;
          console.log(`  ✓ ${test.name} (${testDuration.toFixed(2)}ms)`);
        } catch (error) {
          failed += 1;
          const testDuration = performance.now() - testStart;
          console.error(`  ✗ ${test.name} (${testDuration.toFixed(2)}ms)`);
          console.error(`    ${error instanceof Error ? error.stack ?? error.message : error}`);
        } finally {
          if (timer) {
            clearTimeout(timer);
          }
        }
      }

      if (definition.afterAll) {
        await definition.afterAll();
      }
    }

    const durationMs = performance.now() - startTime;
    console.log(`\nTest Summary: ${passed}/${total} passed${failed ? `, ${failed} failed` : ''}. (${durationMs.toFixed(2)}ms)`);

    return { total, passed, failed, durationMs };
  }
}

export const testRunner = new TestRunner();
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

      for (const test of suite.tests) {
        if (
          matcher &&
          !matcher.test(test.name) &&
          !matcher.test(suite.name) &&
          !(suite.file && matcher.test(suite.file))
        ) {
          skipped += 1;
          continue;
        }

        total += 1;
        const start = Date.now();
      for (const test of tests) {
        if (suite.beforeEach) {
          await suite.beforeEach();
        }

        const started = performance.now();

        try {
          await test.fn();
          passed += 1;
          console.log(`  ✓ ${test.name} (${Date.now() - start}ms)`);
        } catch (error) {
          failed += 1;
          console.error(`  ✗ ${test.name}`);
          if (error instanceof Error) {
            console.error(`    ${error.message}`);
            if (error.stack) {
              console.error(error.stack.split('\n').slice(1).map(line => `    ${line.trim()}`).join('\n'));
            }
          } else {
            console.error(`    ${String(error)}`);
          }
        }
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

    console.log(`\nTest Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);

    return { total, passed, failed, skipped };
  }
}

export const testRunner = new TestRunner();
    console.log(`\nTest Results: ${passed} passed, ${failed} failed`);

    return { failed, passed };
  },
};

export type TestRunner = typeof testRunner;
