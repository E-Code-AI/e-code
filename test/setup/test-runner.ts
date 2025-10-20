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
  filePath?: string;
}

export interface TestResults {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}

const escapeRegex = (value: string) => value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

const logError = (error: unknown) => {
  if (error instanceof Error) {
    if (error.stack) {
      console.error(`    ${error.stack}`);
    } else {
      console.error(`    ${error.message}`);
    }
    return;
  }

  console.error(`    ${String(error)}`);
};

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

  private extractFilePathFromStack(): string | undefined {
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
          continue;
        }
      }

      if (candidate.includes('test/setup/test-runner')) {
        continue;
      }

      return candidate;
    }

    return undefined;
  }

  private matchesPattern(matcher: RegExp | null, value?: string): boolean {
    if (!matcher || !value) {
      return false;
    }

    return matcher.test(value);
  }

  registerSuite(name: string, suite: TestSuite): void {
    const filePath = this.extractFilePathFromStack() ?? this.inferSuiteFile();
    this.suites.push({ name, suite, filePath });
  }

  async run(pattern?: string): Promise<TestResults> {
    const matcher = pattern ? new RegExp(escapeRegex(pattern), 'i') : null;
    const hasFocusedTests = this.suites.some((entry) =>
      entry.suite.tests.some((test) => test.only),
    );

    let total = 0;
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    for (const { name, suite, filePath } of this.suites) {
      const suiteMatches =
        !matcher ||
        this.matchesPattern(matcher, name) ||
        this.matchesPattern(matcher, filePath);

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

        const testMatches =
          !matcher ||
          suiteMatches ||
          this.matchesPattern(matcher, test.name) ||
          this.matchesPattern(matcher, `${name} ${test.name}`);

        if (!testMatches) {
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
          logError(error);
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
