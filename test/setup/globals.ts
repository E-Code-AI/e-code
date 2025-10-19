import util from 'node:util';

import { deepEqual, matchObject } from './utils';

declare global {
  // eslint-disable-next-line no-var
  var expect: ReturnType<typeof createExpect>;
}

type Constructor = new (...args: any[]) => unknown;

type ExpectApi = {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toContain(expected: unknown): void;
  toHaveLength(expected: number): void;
  toMatchObject(expected: Record<string, unknown>): void;
  toBeInstanceOf(expected: Constructor): void;
  toBeDefined(): void;
  toThrow(message?: string | RegExp): void;
  toBeGreaterThan(expected: number): void;
  toBeGreaterThanOrEqual(expected: number): void;
  toBeLessThan(expected: number): void;
  toBeLessThanOrEqual(expected: number): void;
};

const formatValue = (value: unknown): string =>
  typeof value === 'string' ? `'${value}'` : util.inspect(value, { depth: 4, colors: false });

function createExpect() {
  const expectFn = (actual: unknown): ExpectApi => {
    const assert = (condition: unknown, message: string): asserts condition => {
      if (!condition) {
        throw new Error(message);
      }
    };

    return {
      toBe(expected) {
        assert(Object.is(actual, expected), `Expected ${formatValue(actual)} to be ${formatValue(expected)}`);
      },
      toEqual(expected) {
        assert(
          deepEqual(actual, expected),
          `Expected ${formatValue(actual)} to deeply equal ${formatValue(expected)}`,
        );
      },
      toBeTruthy() {
        assert(Boolean(actual), `Expected value to be truthy but received ${formatValue(actual)}`);
      },
      toBeFalsy() {
        assert(!actual, `Expected value to be falsy but received ${formatValue(actual)}`);
      },
      toContain(expected) {
        if (typeof actual === 'string') {
          assert(
            actual.includes(String(expected)),
            `Expected string ${formatValue(actual)} to contain ${formatValue(expected)}`,
          );
          return;
        }

        if (Array.isArray(actual)) {
          assert(
            actual.some(item => deepEqual(item, expected)),
            `Expected array ${formatValue(actual)} to contain ${formatValue(expected)}`,
          );
          return;
        }

        throw new Error('toContain is only supported for strings and arrays');
      },
      toHaveLength(expected) {
        const length = (actual as { length?: unknown })?.length;
        assert(typeof length === 'number', 'toHaveLength matcher expects a value with a numeric length property');
        assert(length === expected, `Expected length ${expected}, got ${length}`);
      },
      toMatchObject(expected) {
        assert(typeof actual === 'object' && actual !== null, 'toMatchObject requires an object value');
        assert(
          matchObject(actual as Record<string, unknown>, expected),
          `Expected object to match ${formatValue(expected)}, got ${formatValue(actual)}`,
        );
      },
      toBeInstanceOf(expected) {
        assert(typeof expected === 'function', 'toBeInstanceOf requires a constructor function');
        assert(actual instanceof expected, `Expected value to be instance of ${expected.name || 'constructor'}`);
      },
      toBeDefined() {
        assert(typeof actual !== 'undefined', 'Expected value to be defined');
      },
      toThrow(message) {
        assert(typeof actual === 'function', 'toThrow expects a function');

        let didThrow = false;
        try {
          (actual as () => unknown)();
        } catch (error) {
          didThrow = true;
          if (message) {
            const text = error instanceof Error ? error.message : String(error);
            if (message instanceof RegExp) {
              assert(message.test(text), `Expected error message to match ${message}, got ${text}`);
            } else {
              assert(text === message, `Expected error message to be ${message}, got ${text}`);
            }
          }
        }

        assert(didThrow, 'Expected function to throw');
      },
      toBeGreaterThan(expected) {
        assert(typeof actual === 'number', 'toBeGreaterThan expects a number');
        assert((actual as number) > expected, `Expected ${actual} to be greater than ${expected}`);
      },
      toBeGreaterThanOrEqual(expected) {
        assert(typeof actual === 'number', 'toBeGreaterThanOrEqual expects a number');
        assert((actual as number) >= expected, `Expected ${actual} to be greater than or equal to ${expected}`);
      },
      toBeLessThan(expected) {
        assert(typeof actual === 'number', 'toBeLessThan expects a number');
        assert((actual as number) < expected, `Expected ${actual} to be less than ${expected}`);
      },
      toBeLessThanOrEqual(expected) {
        assert(typeof actual === 'number', 'toBeLessThanOrEqual expects a number');
        assert((actual as number) <= expected, `Expected ${actual} to be less than or equal to ${expected}`);
      },
    };
  };

  return expectFn;
}

export function setupTestGlobals(): void {
  if (!(globalThis as any).expect) {
    (globalThis as any).expect = createExpect();
  }
}

export type ExpectFn = ReturnType<typeof createExpect>;
