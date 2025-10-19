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
