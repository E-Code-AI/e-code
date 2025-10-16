/**
 * Minimal testing globals providing expect/jest for custom test runner
 */

class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertionError';
  }
}

class Expectation<T> {
  constructor(private actual: T, private isNot = false) {}

  private format(value: unknown): string {
    if (typeof value === 'string') {
      return `"${value}"`;
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  private assert(pass: boolean, message: string) {
    const shouldThrow = this.isNot ? pass : !pass;
    if (shouldThrow) {
      throw new AssertionError(message);
    }
  }

  get not(): Expectation<T> {
    return new Expectation(this.actual, !this.isNot);
  }

  toBe(expected: unknown) {
    const pass = Object.is(this.actual, expected);
    this.assert(pass, `Expected ${this.format(this.actual)} ${this.isNot ? 'not ' : ''}to be ${this.format(expected)}`);
  }

  toEqual(expected: unknown) {
    const pass = JSON.stringify(this.actual) === JSON.stringify(expected);
    this.assert(pass, `Expected ${this.format(this.actual)} ${this.isNot ? 'not ' : ''}to equal ${this.format(expected)}`);
  }

  toContain(expected: unknown) {
    let pass = false;
    if (typeof this.actual === 'string' && typeof expected === 'string') {
      pass = this.actual.includes(expected);
    } else if (Array.isArray(this.actual)) {
      pass = this.actual.includes(expected as never);
    }
    this.assert(pass, `Expected ${this.format(this.actual)} ${this.isNot ? 'not ' : ''}to contain ${this.format(expected)}`);
  }

  toMatch(pattern: RegExp | string) {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    const pass = regex.test(String(this.actual));
    this.assert(pass, `Expected ${this.format(this.actual)} ${this.isNot ? 'not ' : ''}to match ${regex}`);
  }

  toBeDefined() {
    const pass = this.actual !== undefined;
    this.assert(pass, `Expected value ${this.isNot ? 'to be undefined' : 'to be defined'}`);
  }

  toBeTruthy() {
    this.assert(!!this.actual, `Expected ${this.format(this.actual)} ${this.isNot ? 'to be falsy' : 'to be truthy'}`);
  }

  toBeFalsy() {
    this.assert(!this.actual, `Expected ${this.format(this.actual)} ${this.isNot ? 'to be truthy' : 'to be falsy'}`);
  }

  toHaveBeenCalled() {
    const mock = this.actual as unknown as { mock?: { calls: unknown[][] } };
    const calls = mock?.mock?.calls?.length ?? 0;
    this.assert(calls > 0, 'Expected mock function to have been called');
  }

  toHaveBeenCalledTimes(expectedCalls: number) {
    const mock = this.actual as unknown as { mock?: { calls: unknown[][] } };
    const calls = mock?.mock?.calls?.length ?? 0;
    this.assert(calls === expectedCalls, `Expected mock to be called ${expectedCalls} times but was called ${calls} times`);
  }
}

const expectFn = <T>(actual: T) => new Expectation(actual);

type MockFunction<T extends (...args: any[]) => any> = ((...args: Parameters<T>) => ReturnType<T>) & {
  mock: { calls: Parameters<T>[] };
};

const jestLike = {
  fn<T extends (...args: any[]) => any>(implementation?: T): MockFunction<T> {
    const mockFn = ((...args: Parameters<T>) => {
      mockFn.mock.calls.push(args);
      if (implementation) {
        return implementation(...args);
      }
      return undefined as ReturnType<T>;
    }) as MockFunction<T>;

    mockFn.mock = { calls: [] };
    return mockFn;
  }
};

export function setupTestGlobals() {
  (globalThis as any).expect = expectFn;
  (globalThis as any).jest = jestLike;
}

declare global {
  // eslint-disable-next-line no-var
  var expect: typeof expectFn;
  // eslint-disable-next-line no-var
  var jest: typeof jestLike;
}

export {}; 
