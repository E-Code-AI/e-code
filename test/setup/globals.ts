import { deepEqual, matchObject } from './utils';

declare global {
  // eslint-disable-next-line no-var
  var expect: ReturnType<typeof createExpect>;
}

function createExpect() {
  const expectFn = (actual: unknown) => {
    const assertionError = (message: string): never => {
      throw new Error(message);
    };

    const api = {
      toBe(expected: unknown) {
        if (!Object.is(actual, expected)) {
          assertionError(`Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
        }
      },
      toEqual(expected: unknown) {
        if (!deepEqual(actual, expected)) {
          assertionError(`Expected ${JSON.stringify(actual)} to deeply equal ${JSON.stringify(expected)}`);
        }
      },
      toBeTruthy() {
        if (!actual) {
          assertionError(`Expected value to be truthy but received ${JSON.stringify(actual)}`);
        }
      },
      toBeFalsy() {
        if (actual) {
          assertionError(`Expected value to be falsy but received ${JSON.stringify(actual)}`);
        }
      },
      toContain(expected: unknown) {
        if (typeof actual === 'string') {
          if (!actual.includes(String(expected))) {
            assertionError(`Expected string to contain ${String(expected)}, got ${actual}`);
          }
          return;
        }

        if (Array.isArray(actual)) {
          if (!actual.some(item => deepEqual(item, expected))) {
            assertionError(`Expected array to contain ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
          }
          return;
        }

        assertionError('toContain is only supported for strings and arrays');
      },
      toHaveLength(expected: number) {
        const length = (actual as any)?.length;
        if (length !== expected) {
          assertionError(`Expected length ${expected}, got ${length}`);
        }
      },
      toMatchObject(expected: Record<string, unknown>) {
        if (typeof actual !== 'object' || actual === null) {
          assertionError('toMatchObject requires an object value');
        }

        if (!matchObject(actual as Record<string, unknown>, expected)) {
          assertionError(`Expected object to match ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        }
      },
      toBeInstanceOf(expected: new (...args: any[]) => any) {
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
      toThrow(message?: string | RegExp) {
        if (typeof actual !== 'function') {
          assertionError('toThrow expects a function');
        }

        let didThrow = false;
        try {
          actual();
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
    } as const;

    return api;
  };

  return expectFn;
}

export function setupTestGlobals(): void {
  if (!(globalThis as any).expect) {
    (globalThis as any).expect = createExpect();
  }
}
import assert from 'node:assert/strict';

type Primitive = string | number | boolean | bigint | symbol | null | undefined;

type Matcher = {
  toBe: (expected: Primitive) => void;
  toEqual: (expected: unknown) => void;
  toBeTruthy: () => void;
  toBeFalsy: () => void;
  toContain: (expected: unknown) => void;
  toBeGreaterThan: (expected: number) => void;
  toBeGreaterThanOrEqual: (expected: number) => void;
  toBeLessThan: (expected: number) => void;
  toBeLessThanOrEqual: (expected: number) => void;
};

class Expectation implements Matcher {
  constructor(private readonly received: unknown) {}

  toBe(expected: Primitive) {
    assert.strictEqual(this.received as Primitive, expected);
  }

  toEqual(expected: unknown) {
    assert.deepStrictEqual(this.received, expected);
  }

  toBeTruthy() {
    assert.ok(this.received, `Expected value to be truthy but received ${this.received}`);
  }

  toBeFalsy() {
    assert.ok(!this.received, `Expected value to be falsy but received ${this.received}`);
  }

  toContain(expected: unknown) {
    if (typeof this.received === 'string' && typeof expected === 'string') {
      assert.ok(this.received.includes(expected), `Expected "${this.received}" to contain "${expected}"`);
      return;
    }

    if (Array.isArray(this.received)) {
      assert.ok(this.received.some((item) => Object.is(item, expected)), 'Expected array to contain value');
      return;
    }

    throw new TypeError('toContain matcher expects a string or array received value');
  }

  toBeGreaterThan(expected: number) {
    assert.ok((this.received as number) > expected, `Expected value to be greater than ${expected}`);
  }

  toBeGreaterThanOrEqual(expected: number) {
    assert.ok((this.received as number) >= expected, `Expected value to be >= ${expected}`);
  }

  toBeLessThan(expected: number) {
    assert.ok((this.received as number) < expected, `Expected value to be less than ${expected}`);
  }

  toBeLessThanOrEqual(expected: number) {
    assert.ok((this.received as number) <= expected, `Expected value to be <= ${expected}`);
  }
}

export function setupTestGlobals() {
  (globalThis as any).expect = (received: unknown): Matcher => new Expectation(received);
}

export type { Matcher };
import util from 'node:util';

type Primitive = string | number | boolean | bigint | symbol | null | undefined;

type Expectation<T> = {
  toBe(expected: T): void;
  toEqual(expected: unknown): void;
  toBeDefined(): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toContain(expected: unknown): void;
};

const isPrimitive = (value: unknown): value is Primitive =>
  (value !== Object(value)) || typeof value === 'symbol';

const deepEqual = (a: unknown, b: unknown, seen = new WeakMap<object, object>()): boolean => {
  if (Object.is(a, b)) {
    return true;
  }

  if (typeof a !== typeof b) {
    return false;
  }

  if (a === null || b === null) {
    return a === b;
  }

  if (isPrimitive(a) || isPrimitive(b)) {
    return a === b;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }

    return a.every((item, index) => deepEqual(item, b[index], seen));
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const objA = a as Record<string | symbol, unknown>;
    const objB = b as Record<string | symbol, unknown>;

    if (seen.get(objA) === objB) {
      return true;
    }
    seen.set(objA, objB);

    const keysA = Reflect.ownKeys(objA);
    const keysB = Reflect.ownKeys(objB);

    if (keysA.length !== keysB.length) {
      return false;
    }

    return keysA.every((key) => deepEqual(objA[key], objB[key], seen));
  }

  return false;
};

function createExpectation<T>(actual: T): Expectation<T> {
  return {
    toBe(expected) {
      if (!Object.is(actual, expected)) {
        throw new Error(`Expected ${formatValue(actual)} to be ${formatValue(expected)}`);
      }
    },
    toEqual(expected) {
      if (!deepEqual(actual, expected)) {
        throw new Error(`Expected ${formatValue(actual)} to equal ${formatValue(expected)}`);
      }
    },
    toBeDefined() {
      if (actual === undefined) {
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
        if (!actual.some((item) => deepEqual(item, expected))) {
          throw new Error(`Expected ${formatValue(actual)} to contain ${formatValue(expected)}`);
        }
        return;
      }

      throw new Error('toContain matcher requires an array or value supporting includes');
    },
  };
}

const formatValue = (value: unknown): string =>
  typeof value === 'string' ? `'${value}'` : util.inspect(value, { depth: 4, colors: false });

export type ExpectFn = <T>(actual: T) => Expectation<T>;

export const setupTestGlobals = (): void => {
  const expectFn: ExpectFn = (actual) => createExpectation(actual);

  Object.assign(globalThis, {
    expect: expectFn,
  });
};

export type GlobalExpect = typeof globalThis & {
  expect: ExpectFn;
};
