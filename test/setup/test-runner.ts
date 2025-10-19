export type TestFunction = () => void | Promise<void>;

export interface TestCase {
  name: string;
  fn: TestFunction;
}

export interface TestSuite {
  tests: TestCase[];
  beforeAll?: () => void | Promise<void>;
  afterAll?: () => void | Promise<void>;
  beforeEach?: () => void | Promise<void>;
  afterEach?: () => void | Promise<void>;
}

interface TestSummary {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  durationMs: number;
  error?: Error;
}

interface SuiteSummary {
  name: string;
  tests: TestSummary[];
  durationMs: number;
}

export interface RunnerResult {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  suites: SuiteSummary[];
}

interface RegisteredSuite extends TestSuite {
  name: string;
}

function matchesPattern(name: string, pattern?: string): boolean {
  if (!pattern) {
    return true;
  }

  return name.toLowerCase().includes(pattern.toLowerCase());
}

class TestRunnerImpl {
  private suites: RegisteredSuite[] = [];

  registerSuite(name: string, suite: TestSuite): void {
    this.suites.push({ name, ...suite });
  }

  async run(pattern?: string): Promise<RunnerResult> {
    const startTime = Date.now();
    const summaries: SuiteSummary[] = [];
    let total = 0;
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    for (const suite of this.suites) {
      const suiteStart = Date.now();
      const matchingTests = suite.tests.filter((test) =>
        matchesPattern(`${suite.name} ${test.name}`, pattern)
      );

      if (matchingTests.length === 0) {
        continue;
      }

      const testSummaries: TestSummary[] = [];

      if (suite.beforeAll) {
        await suite.beforeAll();
      }

      for (const test of matchingTests) {
        const testStart = Date.now();
        total += 1;

        try {
          if (suite.beforeEach) {
            await suite.beforeEach();
          }

          await test.fn();
          passed += 1;

          testSummaries.push({
            name: test.name,
            status: 'passed',
            durationMs: Date.now() - testStart,
          });
        } catch (error) {
          failed += 1;

          testSummaries.push({
            name: test.name,
            status: 'failed',
            durationMs: Date.now() - testStart,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        } finally {
          if (suite.afterEach) {
            await suite.afterEach();
          }
        }
      }

      if (suite.afterAll) {
        await suite.afterAll();
      }

      summaries.push({
        name: suite.name,
        tests: testSummaries,
        durationMs: Date.now() - suiteStart,
      });
    }

    // Any suites without matching tests are considered skipped
    if (pattern) {
      for (const suite of this.suites) {
        const hasMatchingTests = suite.tests.some((test) =>
          matchesPattern(`${suite.name} ${test.name}`, pattern)
        );

        if (!hasMatchingTests) {
          skipped += suite.tests.length;
        }
      }
    }

    const durationMs = Date.now() - startTime;

    this.printReport({ total, passed, failed, skipped, durationMs, suites: summaries });

    return { total, passed, failed, skipped, durationMs, suites: summaries };
  }

  private printReport(result: RunnerResult): void {
    const lines = [
      '',
      'Test Results',
      '------------',
      `Total:   ${result.total}`,
      `Passed:  ${result.passed}`,
      `Failed:  ${result.failed}`,
      `Skipped: ${result.skipped}`,
      `Duration: ${result.durationMs}ms`,
    ];

    for (const suite of result.suites) {
      lines.push('', `Suite: ${suite.name} (${suite.durationMs}ms)`);

      for (const test of suite.tests) {
        const statusIcon = test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⏭️';
        lines.push(`  ${statusIcon} ${test.name} (${test.durationMs}ms)`);

        if (test.error) {
          lines.push(`    Error: ${test.error.message}`);
        }
      }
    }

    console.log(lines.join('\n'));
  }
}

export const testRunner = new TestRunnerImpl();


