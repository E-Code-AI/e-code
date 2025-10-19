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
