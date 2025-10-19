import { isDeepStrictEqual } from 'node:util';

class AssertionError extends Error {
  constructor(message: string, readonly expected?: unknown, readonly received?: unknown) {
    super(message);
    this.name = 'AssertionError';
  }
}

type Primitive = string | number | boolean | bigint | symbol | null | undefined;

type Expectation<T> = {
  toBe(expected: T): void;
  toEqual(expected: unknown): void;
  toBeDefined(): void;
  toBeUndefined(): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toBeGreaterThan(expected: number): void;
  toBeLessThan(expected: number): void;
  toContain(expected: unknown): void;
  toMatch(regex: RegExp): void;
  toThrow(expected?: RegExp | string): void;
};

type ExpectFunction = {
  <T>(received: T): Expectation<T>;
};

function formatValue(value: unknown): string {
  if (typeof value === 'string') {
    return `"${value}"`;
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (error) {
      return Object.prototype.toString.call(value);
    }
  }

  return String(value);
}

function ensureFunction(value: unknown): asserts value is () => unknown {
  if (typeof value !== 'function') {
    throw new AssertionError('Expected value to be a function', 'function', typeof value);
  }
}

export const expect: ExpectFunction = <T>(received: T): Expectation<T> => ({
  toBe(expected: T) {
    if (received !== expected) {
      throw new AssertionError(
        `Expected ${formatValue(received)} to be ${formatValue(expected)}`,
        expected,
        received
      );
    }
  },

  toEqual(expected: unknown) {
    if (!isDeepStrictEqual(received, expected)) {
      throw new AssertionError(
        `Expected ${formatValue(received)} to deeply equal ${formatValue(expected)}`,
        expected,
        received
      );
    }
  },

  toBeDefined() {
    if (received === undefined) {
      throw new AssertionError('Expected value to be defined', 'defined', received);
    }
  },

  toBeUndefined() {
    if (received !== undefined) {
      throw new AssertionError('Expected value to be undefined', 'undefined', received);
    }
  },

  toBeTruthy() {
    if (!received) {
      throw new AssertionError('Expected value to be truthy', true, received);
    }
  },

  toBeFalsy() {
    if (received) {
      throw new AssertionError('Expected value to be falsy', false, received);
    }
  },

  toBeGreaterThan(expected: number) {
    if (typeof (received as Primitive) !== 'number' || (received as number) <= expected) {
      throw new AssertionError(
        `Expected ${formatValue(received)} to be greater than ${formatValue(expected)}`,
        expected,
        received
      );
    }
  },

  toBeLessThan(expected: number) {
    if (typeof (received as Primitive) !== 'number' || (received as number) >= expected) {
      throw new AssertionError(
        `Expected ${formatValue(received)} to be less than ${formatValue(expected)}`,
        expected,
        received
      );
    }
  },

  toContain(expected: unknown) {
    if (
      typeof received === 'string' && !received.includes(String(expected))
    ) {
      throw new AssertionError(
        `Expected string ${formatValue(received)} to contain ${formatValue(expected)}`,
        expected,
        received
      );
    }

    if (Array.isArray(received) && !received.some((item) => isDeepStrictEqual(item, expected))) {
      throw new AssertionError(
        `Expected array ${formatValue(received)} to contain ${formatValue(expected)}`,
        expected,
        received
      );
    }

    if (typeof received !== 'string' && !Array.isArray(received)) {
      throw new AssertionError('Expected value to be a string or array for toContain');
    }
  },

  toMatch(regex: RegExp) {
    if (typeof received !== 'string') {
      throw new AssertionError('Expected value to be a string for toMatch', regex, received);
    }

    if (!regex.test(received)) {
      throw new AssertionError(
        `Expected string ${formatValue(received)} to match ${regex.toString()}`,
        regex,
        received
      );
    }
  },

  toThrow(expected?: RegExp | string) {
    ensureFunction(received);
    let didThrow = false;
    let thrownError: unknown;

    try {
      (received as () => unknown)();
    } catch (error) {
      didThrow = true;
      thrownError = error;
    }

    if (!didThrow) {
      throw new AssertionError('Expected function to throw an error');
    }

    if (expected) {
      if (typeof expected === 'string') {
        if (!(thrownError instanceof Error) || thrownError.message !== expected) {
          throw new AssertionError(
            `Expected error message ${formatValue(thrownError)} to equal ${formatValue(expected)}`,
            expected,
            thrownError
          );
        }
      } else if (!(thrownError instanceof Error) || !expected.test(thrownError.message)) {
        throw new AssertionError(
          `Expected error message ${formatValue(thrownError)} to match ${expected.toString()}`,
          expected,
          thrownError
        );
      }
    }
  }
});

export function setupTestGlobals(): void {
  if (!(globalThis as Record<string, unknown>).expect) {
    (globalThis as Record<string, unknown>).expect = expect;
  }
}

declare global {
  var expect: ExpectFunction;
}


