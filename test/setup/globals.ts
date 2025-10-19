import util from 'node:util';
import { deepEqual, matchObject } from './utils';

type Expectation<T> = {
  toBe(expected: T): void;
  toEqual(expected: unknown): void;
  toBeDefined(): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toContain(expected: unknown): void;
  toHaveLength(expected: number): void;
  toMatchObject(expected: Record<string, unknown>): void;
  toBeInstanceOf(expected: new (...args: any[]) => any): void;
  toThrow(message?: string | RegExp): void;
  toBeGreaterThan(expected: number): void;
  toBeGreaterThanOrEqual(expected: number): void;
  toBeLessThan(expected: number): void;
  toBeLessThanOrEqual(expected: number): void;
};

type ExpectFn = <T>(actual: T) => Expectation<T>;

declare global {
  // eslint-disable-next-line no-var
  var expect: ExpectFn | undefined;
}

const formatValue = (value: unknown): string =>
  typeof value === 'string' ? `'${value}'` : util.inspect(value, { depth: 4, colors: false });

function ensureNumber(actual: unknown, matcher: string): asserts actual is number {
  if (typeof actual !== 'number') {
    throw new Error(`${matcher} matcher requires a numeric actual value`);
  }
}

function createExpect(): ExpectFn {
  return <T>(actual: T): Expectation<T> => ({
    toBe(expected) {
      if (!Object.is(actual, expected)) {
        throw new Error(`Expected ${formatValue(actual)} to be ${formatValue(expected)}`);
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
        throw new Error(`Expected ${formatValue(actual)} to be truthy`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`Expected ${formatValue(actual)} to be falsy`);
      }
    },
    toContain(expected) {
      if (typeof (actual as unknown as { includes?: (item: unknown) => boolean }).includes === 'function') {
        if (!(actual as unknown as { includes: (item: unknown) => boolean }).includes(expected)) {
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

      throw new Error('toContain matcher requires an array or value supporting includes');
    },
    toHaveLength(expected) {
      const { length } = actual as unknown as { length?: number };
      if (length !== expected) {
        throw new Error(`Expected length ${expected}, got ${length}`);
      }
    },
    toMatchObject(expected) {
      if (typeof actual !== 'object' || actual === null) {
        throw new Error('toMatchObject requires an object value');
      }

      if (!matchObject(actual as Record<string, unknown>, expected)) {
        throw new Error(`Expected object to match ${formatValue(expected)}, got ${formatValue(actual)}`);
      }
    },
    toBeInstanceOf(expected) {
      if (!(actual instanceof expected)) {
        const name = expected?.name ?? 'constructor';
        throw new Error(`Expected value to be instance of ${name}`);
      }
    },
    toThrow(message) {
      if (typeof actual !== 'function') {
        throw new Error('toThrow expects a function');
      }

      let didThrow = false;
      try {
        (actual as unknown as () => unknown)();
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
      ensureNumber(actual, 'toBeGreaterThan');
      if (!(actual > expected)) {
        throw new Error(`Expected ${formatValue(actual)} to be greater than ${formatValue(expected)}`);
      }
    },
    toBeGreaterThanOrEqual(expected) {
      ensureNumber(actual, 'toBeGreaterThanOrEqual');
      if (!(actual >= expected)) {
        throw new Error(`Expected ${formatValue(actual)} to be greater than or equal to ${formatValue(expected)}`);
      }
    },
    toBeLessThan(expected) {
      ensureNumber(actual, 'toBeLessThan');
      if (!(actual < expected)) {
        throw new Error(`Expected ${formatValue(actual)} to be less than ${formatValue(expected)}`);
      }
    },
    toBeLessThanOrEqual(expected) {
      ensureNumber(actual, 'toBeLessThanOrEqual');
      if (!(actual <= expected)) {
        throw new Error(`Expected ${formatValue(actual)} to be less than or equal to ${formatValue(expected)}`);
      }
    },
  });
}

export type { Expectation, ExpectFn };

export function setupTestGlobals(): void {
  if (!(globalThis as any).expect) {
    (globalThis as any).expect = createExpect();
  }
}
