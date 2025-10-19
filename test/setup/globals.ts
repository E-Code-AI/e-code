import util from 'node:util';

type Primitive = string | number | boolean | bigint | symbol | null | undefined;

type Expectation<T> = {
  toBe(expected: T): void;
  toEqual(expected: unknown): void;
  toBeDefined(): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toContain(expected: unknown): void;
  toBeGreaterThan(expected: number): void;
  toBeGreaterThanOrEqual(expected: number): void;
  toBeLessThan(expected: number): void;
  toBeLessThanOrEqual(expected: number): void;
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
    toBeGreaterThan(expected) {
      if (typeof actual !== 'number') {
        throw new Error('toBeGreaterThan matcher requires a numeric actual value');
      }
      if (!(actual > expected)) {
        throw new Error(`Expected ${formatValue(actual)} to be greater than ${formatValue(expected)}`);
      }
    },
    toBeGreaterThanOrEqual(expected) {
      if (typeof actual !== 'number') {
        throw new Error('toBeGreaterThanOrEqual matcher requires a numeric actual value');
      }
      if (!(actual >= expected)) {
        throw new Error(`Expected ${formatValue(actual)} to be greater than or equal to ${formatValue(expected)}`);
      }
    },
    toBeLessThan(expected) {
      if (typeof actual !== 'number') {
        throw new Error('toBeLessThan matcher requires a numeric actual value');
      }
      if (!(actual < expected)) {
        throw new Error(`Expected ${formatValue(actual)} to be less than ${formatValue(expected)}`);
      }
    },
    toBeLessThanOrEqual(expected) {
      if (typeof actual !== 'number') {
        throw new Error('toBeLessThanOrEqual matcher requires a numeric actual value');
      }
      if (!(actual <= expected)) {
        throw new Error(`Expected ${formatValue(actual)} to be less than or equal to ${formatValue(expected)}`);
      }
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
