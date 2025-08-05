/**
 * Test Runner
 * Orchestrates test execution
 */

import { testDb } from './test-database';
import { testConfig } from './test-config';
import { createLogger } from '../../server/utils/logger';

const logger = createLogger('test-runner');

export class TestRunner {
  private suites: Map<string, TestSuite> = new Map();

  registerSuite(name: string, suite: TestSuite) {
    this.suites.set(name, suite);
  }

  async run(pattern?: string) {
    logger.info('Starting test run...');
    
    // Setup
    await this.globalSetup();
    
    const results: TestResults = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      suites: []
    };
    
    const startTime = Date.now();
    
    // Run test suites
    for (const [name, suite] of this.suites) {
      if (pattern && !name.includes(pattern)) continue;
      
      const suiteResult = await this.runSuite(name, suite);
      results.suites.push(suiteResult);
      results.total += suiteResult.total;
      results.passed += suiteResult.passed;
      results.failed += suiteResult.failed;
      results.skipped += suiteResult.skipped;
    }
    
    results.duration = Date.now() - startTime;
    
    // Teardown
    await this.globalTeardown();
    
    // Report results
    this.reportResults(results);
    
    return results;
  }

  private async globalSetup() {
    await testDb.setup();
  }

  private async globalTeardown() {
    await testDb.teardown();
  }

  private async runSuite(name: string, suite: TestSuite): Promise<SuiteResult> {
    logger.info(`Running suite: ${name}`);
    
    const result: SuiteResult = {
      name,
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      tests: []
    };
    
    const startTime = Date.now();
    
    // Run suite setup
    if (suite.setup) {
      await suite.setup();
    }
    
    // Run tests
    for (const test of suite.tests) {
      const testResult = await this.runTest(test);
      result.tests.push(testResult);
      result.total++;
      
      if (testResult.status === 'passed') result.passed++;
      else if (testResult.status === 'failed') result.failed++;
      else if (testResult.status === 'skipped') result.skipped++;
    }
    
    // Run suite teardown
    if (suite.teardown) {
      await suite.teardown();
    }
    
    result.duration = Date.now() - startTime;
    
    return result;
  }

  private async runTest(test: Test): Promise<TestResult> {
    const result: TestResult = {
      name: test.name,
      status: 'pending',
      duration: 0,
      error: undefined
    };
    
    if (test.skip) {
      result.status = 'skipped';
      return result;
    }
    
    const startTime = Date.now();
    
    try {
      const timeout = test.timeout || testConfig.timeouts.unit;
      await this.runWithTimeout(test.fn(), timeout);
      result.status = 'passed';
    } catch (error) {
      result.status = 'failed';
      result.error = error as Error;
      logger.error(`Test failed: ${test.name}`, error);
    }
    
    result.duration = Date.now() - startTime;
    
    return result;
  }

  private async runWithTimeout(promise: Promise<any>, timeout: number) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Test timeout')), timeout)
      )
    ]);
  }

  private reportResults(results: TestResults) {
    logger.info('Test Results:');
    logger.info(`Total: ${results.total}`);
    logger.info(`Passed: ${results.passed}`);
    logger.info(`Failed: ${results.failed}`);
    logger.info(`Skipped: ${results.skipped}`);
    logger.info(`Duration: ${results.duration}ms`);
    
    if (results.failed > 0) {
      logger.error('Failed tests:');
      for (const suite of results.suites) {
        for (const test of suite.tests) {
          if (test.status === 'failed') {
            logger.error(`  ${suite.name} > ${test.name}: ${test.error?.message}`);
          }
        }
      }
    }
  }
}

// Test interfaces
interface TestSuite {
  tests: Test[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}

interface Test {
  name: string;
  fn: () => Promise<void>;
  timeout?: number;
  skip?: boolean;
}

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped' | 'pending';
  duration: number;
  error?: Error;
}

interface SuiteResult {
  name: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  tests: TestResult[];
}

interface TestResults {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  suites: SuiteResult[];
}

// Global test runner instance
export const testRunner = new TestRunner();