import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const STACK_PATH_PATTERN =
  /((?:file:\/\/\/|file:\/\/)?(?:[A-Za-z]:)?[\\/]?[^()\r\n:]+?(?:[\\/][^()\r\n:]+)*\.(?:test|spec)\.[tj]sx?)/i;

export interface TestCase {
  name: string;
  fn: () => void | Promise<void>;
  timeoutMs?: number;
  skip?: boolean;
  only?: boolean;
}

export interface SuiteLifecycle {
  beforeAll?: () => void | Promise<void>;
  afterAll?: () => void | Promise<void>;
  beforeEach?: () => void | Promise<void>;
  afterEach?: () => void | Promise<void>;
}

export interface TestSuite extends SuiteLifecycle {
  tests: TestCase[];
}

interface RegisteredSuite {
  name: string;
  suite: TestSuite;
  file?: string;
}

export interface TestResults {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}

const escapeRegex = (value: string) => value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

class TestRunner {
  private suites: RegisteredSuite[] = [];

  private inferSuiteFile(): string | undefined {
    const stackLines = new Error().stack?.split('\n') ?? [];

    for (const line of stackLines) {
      const match = line.match(STACK_PATH_PATTERN);
      if (!match) {
        continue;
      }

      let rawPath = match[1];
      if (/^file:\/\//i.test(rawPath)) {
        try {
          rawPath = fileURLToPath(rawPath);
        } catch (error) {
          console.error('Failed to normalize file URL from stack trace:', error);
          continue;
        }
      }

      const absolute = path.isAbsolute(rawPath)
        ? rawPath
        : path.resolve(process.cwd(), rawPath);
      const normalized = path.normalize(absolute);
      const relative = path.relative(process.cwd(), normalized);

      return relative || normalized;
    }

    return undefined;
  }

  registerSuite(name: string, suite: TestSuite): void {
    const file = this.inferSuiteFile();
    this.suites.push({ name, suite, file });
  }

  async run(pattern?: string): Promise<TestResults> {
    const matcher = pattern ? new RegExp(escapeRegex(pattern), 'i') : null;
    const matchesPattern = (value?: string) => {
      if (!matcher || !value) {
        return false;
      }

      return new RegExp(matcher.source, matcher.flags).test(value);
    };
    const hasFocusedTests = this.suites.some((entry) =>
      entry.suite.tests.some((test) => test.only),
    );

    let total = 0;
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    for (const entry of this.suites) {
      const { name, suite, file } = entry;
      const suiteMatches = matcher ? matchesPattern(name) || matchesPattern(file) : true;

      const runnableTests: TestCase[] = [];

      for (const test of suite.tests) {
        if (test.skip) {
          skipped += 1;
          continue;
        }

        if (hasFocusedTests && !test.only) {
          skipped += 1;
          continue;
        }

        const shouldRun = !matcher || matchesPattern(test.name) || suiteMatches;

        if (!shouldRun) {
          skipped += 1;
          continue;
        }

        runnableTests.push(test);
      }

      if (runnableTests.length === 0) {
        continue;
      }

      console.log(`\nSuite: ${name}`);

      if (suite.beforeAll) {
        await suite.beforeAll();
      }

      for (const test of runnableTests) {
        total += 1;
        const start = performance.now();
        const timeout = test.timeoutMs ?? 5000;
        let timer: NodeJS.Timeout | undefined;

        try {
          await Promise.race([
            (async () => {
              if (suite.beforeEach) {
                await suite.beforeEach();
              }

              await test.fn();

              if (suite.afterEach) {
                await suite.afterEach();
              }
            })(),
            new Promise<never>((_, reject) => {
              timer = setTimeout(() => {
                reject(new Error(`Test timed out after ${timeout}ms`));
              }, timeout);
            }),
          ]);

          passed += 1;
          const duration = performance.now() - start;
          console.log(`  ✓ ${test.name} (${duration.toFixed(2)}ms)`);
        } catch (error) {
          failed += 1;
          const duration = performance.now() - start;
          console.error(`  ✗ ${test.name} (${duration.toFixed(2)}ms)`);
          if (error instanceof Error) {
            console.error(`    ${error.stack ?? error.message}`);
          } else {
            console.error(`    ${String(error)}`);
          }
        } finally {
          if (timer) {
            clearTimeout(timer);
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

    console.log(`\nTest Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);

    return { total, passed, failed, skipped };
  }
}

export const testRunner = new TestRunner();
