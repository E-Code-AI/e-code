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
      const match = line.match(/(\/[^:]+\.(?:test|spec)\.[tj]sx?)/i);
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
