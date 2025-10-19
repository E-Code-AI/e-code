import util from 'node:util';

import { deepEqual, matchObject } from './utils';

declare global {
  // eslint-disable-next-line no-var
  var expect: ReturnType<typeof createExpect>;
}

type Primitive = string | number | boolean | bigint | symbol | null | undefined;

type Expectation<T> = {
  toBe(expected: Primitive | T): void;
  toEqual(expected: unknown): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toContain(expected: unknown): void;
  toHaveLength(expected: number): void;
  toMatchObject(expected: Record<string, unknown>): void;
  toBeInstanceOf(expected: new (...args: any[]) => unknown): void;
  toThrow(message?: string | RegExp): void;
  toBeGreaterThan(expected: number): void;
  toBeGreaterThanOrEqual(expected: number): void;
  toBeLessThan(expected: number): void;
  toBeLessThanOrEqual(expected: number): void;
};

type ExpectFn = <T>(actual: T) => Expectation<T>;

type GlobalExpect = typeof globalThis & { expect: ExpectFn };

function createExpect(): ExpectFn {
  return actual => createExpectation(actual);
}

function createExpectation<T>(actual: T): Expectation<T> {
  const formatValue = (value: unknown): string =>
    typeof value === 'string' ? `'${value}'` : util.inspect(value, { depth: 4, colors: false });

  const ensureFunction = (value: unknown): asserts value is () => unknown => {
    if (typeof value !== 'function') {
      throw new TypeError('toThrow expects a function');
    }
  };

  return {
    toBe(expected) {
      if (!Object.is(actual, expected)) {
        assertionError(`Expected ${formatValue(actual)} to be ${formatValue(expected)}`);
      }
    },
    toEqual(expected) {
      if (!deepEqual(actual, expected)) {
        throw new Error(`Expected ${formatValue(actual)} to deeply equal ${formatValue(expected)}`);
      }
    },
    toBeDefined() {
      if (typeof actual === 'undefined') {
        throw new Error('Expected value to be defined');
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error('Expected value to be truthy');
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error('Expected value to be falsy');
      }
    },
    toContain(expected) {
      if (typeof actual === 'string') {
        if (!actual.includes(String(expected))) {
          throw new Error(`Expected ${formatValue(actual)} to contain ${formatValue(expected)}`);
        }
        return;
      }

      if (Array.isArray(actual)) {
        if (!actual.some(item => deepEqual(item, expected))) {
          throw new Error(`Expected ${formatValue(actual)} to contain ${formatValue(expected)}`);
        }
        return;
      }

      throw new TypeError('toContain is only supported for strings and arrays');
    },
    toHaveLength(expected) {
      const length = (actual as { length?: number })?.length;
      if (length !== expected) {
        throw new Error(`Expected length ${expected}, got ${length}`);
      }
    },
    toMatchObject(expected) {
      if (typeof actual !== 'object' || actual === null) {
        throw new Error('toMatchObject requires an object value');
      }

      if (!matchObject(actual as Record<string, unknown>, expected)) {
        throw new Error(`Expected object to match ${formatValue(expected)} but received ${formatValue(actual)}`);
      }
    },
    toBeInstanceOf(expected) {
      if (!(actual instanceof expected)) {
        const name = expected?.name ?? 'constructor';
        throw new Error(`Expected value to be instance of ${name}`);
      }
    },
    toThrow(message) {
      ensureFunction(actual);

      let didThrow = false;
      try {
        actual();
      } catch (error) {
        didThrow = true;
        if (message) {
          const text = error instanceof Error ? error.message : String(error);
          if (message instanceof RegExp) {
            if (!message.test(text)) {
              throw new Error(`Expected error message to match ${message}, got ${text}`);
            }
          } else if (text !== message) {
            throw new Error(`Expected error message to be ${message}, got ${text}`);
          }
        }
      }

      if (!didThrow) {
        throw new Error('Expected function to throw');
      }
    },
    toBeGreaterThan(expected) {
      if (typeof actual !== 'number') {
        throw new TypeError('toBeGreaterThan requires a numeric value');
      }
    },
    toBeGreaterThan(expected) {
      ensureNumber(actual, 'toBeGreaterThan');
      if (!(actual > expected)) {
        throw new Error(`Expected ${formatValue(actual)} to be greater than ${formatValue(expected)}`);
      }
    },
    toBeGreaterThanOrEqual(expected) {
      if (typeof actual !== 'number') {
        throw new TypeError('toBeGreaterThanOrEqual requires a numeric value');
      }
      if (!(actual >= expected)) {
        throw new Error(`Expected ${formatValue(actual)} to be greater than or equal to ${formatValue(expected)}`);
      }
    },
    toBeLessThan(expected) {
      if (typeof actual !== 'number') {
        throw new TypeError('toBeLessThan requires a numeric value');
      }
      if (!(actual < expected)) {
        throw new Error(`Expected ${formatValue(actual)} to be less than ${formatValue(expected)}`);
      }
    },
    toBeLessThanOrEqual(expected) {
      if (typeof actual !== 'number') {
        throw new TypeError('toBeLessThanOrEqual requires a numeric value');
      }
      if (!(actual <= expected)) {
        throw new Error(`Expected ${formatValue(actual)} to be less than or equal to ${formatValue(expected)}`);
      }
    },
  });
}

export function setupTestGlobals(): void {
  const expectFn = createExpect();
  (globalThis as GlobalExpect).expect = expectFn;
}

export type { ExpectFn, GlobalExpect };
