import { deepEqual, matchObject } from './utils';

type Matcher = {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toContain(expected: unknown): void;
  toHaveLength(expected: number): void;
  toMatchObject(expected: Record<string, unknown>): void;
  toBeInstanceOf(expected: new (...args: any[]) => any): void;
  toBeDefined(): void;
  toThrow(message?: string | RegExp): void;
  toBeGreaterThan(expected: number): void;
  toBeGreaterThanOrEqual(expected: number): void;
  toBeLessThan(expected: number): void;
  toBeLessThanOrEqual(expected: number): void;
};

const formatValue = (value: unknown) => {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const ensureNumber = (value: unknown, matcherName: string): number => {
  if (typeof value !== 'number') {
    throw new Error(`${matcherName} requires the actual value to be a number`);
  }

  return value;
};

function createExpectation(actual: unknown): Matcher {
  const assertionError = (message: string): never => {
    throw new Error(message);
  };

  return {
    toBe(expected) {
      if (!Object.is(actual, expected)) {
        assertionError(`Expected ${formatValue(actual)} to be ${formatValue(expected)}`);
      }
    },
    toEqual(expected) {
      if (!deepEqual(actual, expected)) {
        assertionError(`Expected ${formatValue(actual)} to deeply equal ${formatValue(expected)}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        assertionError(`Expected value to be truthy but received ${formatValue(actual)}`);
      }
    },
    toBeFalsy() {
      if (actual) {
        assertionError(`Expected value to be falsy but received ${formatValue(actual)}`);
      }
    },
    toContain(expected) {
      if (typeof actual === 'string') {
        if (!actual.includes(String(expected))) {
          assertionError(`Expected string to contain ${String(expected)}, got ${actual}`);
        }
        return;
      }

      if (Array.isArray(actual)) {
        if (!actual.some(item => deepEqual(item, expected))) {
          assertionError(`Expected array to contain ${formatValue(expected)}, got ${formatValue(actual)}`);
        }
        return;
      }

      assertionError('toContain is only supported for strings and arrays');
    },
    toHaveLength(expectedLength) {
      const length = (actual as { length?: number })?.length;
      if (length !== expectedLength) {
        assertionError(`Expected length ${expectedLength}, got ${length}`);
      }
    },
    toMatchObject(expected) {
      if (typeof actual !== 'object' || actual === null) {
        assertionError('toMatchObject requires an object value');
      }

      if (!matchObject(actual as Record<string, unknown>, expected)) {
        assertionError(`Expected object to match ${formatValue(expected)}, got ${formatValue(actual)}`);
      }
    },
    toBeInstanceOf(expected) {
      if (!(actual instanceof expected)) {
        const name = expected?.name ?? 'constructor';
        assertionError(`Expected value to be instance of ${name}`);
      }
    },
    toBeDefined() {
      if (typeof actual === 'undefined') {
        assertionError('Expected value to be defined');
      }
    },
    toThrow(message) {
      if (typeof actual !== 'function') {
        assertionError('toThrow expects a function');
      }

      let didThrow = false;
      try {
        (actual as () => unknown)();
      } catch (error) {
        didThrow = true;
        if (message) {
          const text = error instanceof Error ? error.message : String(error);
          if (message instanceof RegExp) {
            if (!message.test(text)) {
              assertionError(`Expected error message to match ${message}, got ${text}`);
            }
          } else if (text !== message) {
            assertionError(`Expected error message to be ${message}, got ${text}`);
          }
        }
      }

      if (!didThrow) {
        assertionError('Expected function to throw');
      }
    },
    toBeGreaterThan(expected) {
      if (!(ensureNumber(actual, 'toBeGreaterThan') > expected)) {
        assertionError(`Expected ${formatValue(actual)} to be greater than ${formatValue(expected)}`);
      }
    },
    toBeGreaterThanOrEqual(expected) {
      if (!(ensureNumber(actual, 'toBeGreaterThanOrEqual') >= expected)) {
        assertionError(`Expected ${formatValue(actual)} to be >= ${formatValue(expected)}`);
      }
    },
    toBeLessThan(expected) {
      if (!(ensureNumber(actual, 'toBeLessThan') < expected)) {
        assertionError(`Expected ${formatValue(actual)} to be less than ${formatValue(expected)}`);
      }
    },
    toBeLessThanOrEqual(expected) {
      if (!(ensureNumber(actual, 'toBeLessThanOrEqual') <= expected)) {
        assertionError(`Expected ${formatValue(actual)} to be <= ${formatValue(expected)}`);
      }
    },
  };
}

export function setupTestGlobals(): void {
  if (!(globalThis as any).expect) {
    (globalThis as any).expect = (received: unknown): Matcher => createExpectation(received);
  }
}

export type { Matcher };
