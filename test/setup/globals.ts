import util from 'node:util';

import { deepEqual, matchObject } from './utils';

declare global {
  // eslint-disable-next-line no-var
  var expect: ReturnType<typeof createExpect>;
}

type Primitive = string | number | boolean | bigint | symbol | null | undefined;

type Matcher = {
  toBe(expected: Primitive): void;
  toEqual(expected: unknown): void;
  toBeDefined(): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toContain(expected: unknown): void;
  toHaveLength(expected: number): void;
  toMatchObject(expected: Record<string, unknown>): void;
  toBeInstanceOf(expected: new (...args: any[]) => any): void;
  toBeGreaterThan(expected: number): void;
  toBeGreaterThanOrEqual(expected: number): void;
  toBeLessThan(expected: number): void;
  toBeLessThanOrEqual(expected: number): void;
  toThrow(message?: string | RegExp): void;
};

const formatValue = (value: unknown): string =>
  typeof value === 'string' ? `"${value}"` : util.inspect(value, { depth: 4, colors: false });

function createExpect() {
  const expectFn = (actual: unknown): Matcher => {
    const assert = (condition: boolean, message: string): void => {
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
      toBeDefined() {
        assert(actual !== undefined, 'Expected value to be defined');
      },
      toBeTruthy() {
        assert(Boolean(actual), `Expected ${formatValue(actual)} to be truthy`);
      },
      toBeFalsy() {
        assert(!actual, `Expected ${formatValue(actual)} to be falsy`);
      },
      toContain(expected) {
        if (typeof actual === 'string') {
          assert(actual.includes(String(expected)), `Expected ${formatValue(actual)} to contain ${formatValue(expected)}`);
          return;
        }

        if (Array.isArray(actual)) {
          assert(
            actual.some((item) => deepEqual(item, expected)),
            `Expected ${formatValue(actual)} to contain ${formatValue(expected)}`,
          );
          return;
        }

        throw new Error('toContain is only supported for strings and arrays');
      },
      toHaveLength(expectedLength) {
        const length = (actual as { length?: number })?.length;
        assert(
          typeof length === 'number' && length === expectedLength,
          `Expected length ${expectedLength}, got ${length}`,
        );
      },
      toMatchObject(expected) {
        if (typeof actual !== 'object' || actual === null) {
          throw new Error('toMatchObject requires an object value');
        }

        assert(
          matchObject(actual as Record<string, unknown>, expected),
          `Expected object to match ${formatValue(expected)}, got ${formatValue(actual)}`,
        );
      },
      toBeInstanceOf(expected) {
        assert(actual instanceof expected, `Expected value to be instance of ${expected?.name ?? 'constructor'}`);
      },
      toBeGreaterThan(expected) {
        assert(typeof actual === 'number', 'toBeGreaterThan matcher requires a numeric actual value');
        assert((actual as number) > expected, `Expected ${formatValue(actual)} to be greater than ${formatValue(expected)}`);
      },
      toBeGreaterThanOrEqual(expected) {
        assert(typeof actual === 'number', 'toBeGreaterThanOrEqual matcher requires a numeric actual value');
        assert(
          (actual as number) >= expected,
          `Expected ${formatValue(actual)} to be greater than or equal to ${formatValue(expected)}`,
        );
      },
      toBeLessThan(expected) {
        assert(typeof actual === 'number', 'toBeLessThan matcher requires a numeric actual value');
        assert((actual as number) < expected, `Expected ${formatValue(actual)} to be less than ${formatValue(expected)}`);
      },
      toBeLessThanOrEqual(expected) {
        assert(typeof actual === 'number', 'toBeLessThanOrEqual matcher requires a numeric actual value');
        assert(
          (actual as number) <= expected,
          `Expected ${formatValue(actual)} to be less than or equal to ${formatValue(expected)}`,
        );
      },
      toThrow(message) {
        if (typeof actual !== 'function') {
          throw new Error('toThrow expects a function');
        }

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
    } satisfies Matcher;
  };

  return expectFn;
}

export function setupTestGlobals(): void {
  if (!(globalThis as { expect?: ReturnType<typeof createExpect> }).expect) {
    (globalThis as any).expect = createExpect();
  }
}

export type ExpectFn = ReturnType<typeof createExpect>;
export type { Matcher };
