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

const toStringTag = (value: unknown): string => Object.prototype.toString.call(value);

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
    const tagA = toStringTag(a);
    const tagB = toStringTag(b);

    if (tagA !== tagB) {
      return false;
    }

    if (tagA === '[object Date]') {
      return Object.is((a as Date).getTime(), (b as Date).getTime());
    }

    if (tagA === '[object RegExp]') {
      const regexA = a as RegExp;
      const regexB = b as RegExp;
      return regexA.source === regexB.source && regexA.flags === regexB.flags;
    }

    if (tagA === '[object Map]') {
      const mapA = a as Map<unknown, unknown>;
      const mapB = b as Map<unknown, unknown>;

      if (mapA.size !== mapB.size) {
        return false;
      }

      if (seen.get(mapA as unknown as object) === (mapB as unknown as object)) {
        return true;
      }
      seen.set(mapA as unknown as object, mapB as unknown as object);

      const entriesA = Array.from(mapA.entries());
      const remaining = Array.from(mapB.entries());

      return entriesA.every(([keyA, valueA]) => {
        const matchIndex = remaining.findIndex(([keyB, valueB]) =>
          deepEqual(keyA, keyB, seen) && deepEqual(valueA, valueB, seen),
        );

        if (matchIndex === -1) {
          return false;
        }

        remaining.splice(matchIndex, 1);
        return true;
      });
    }

    if (tagA === '[object Set]') {
      const setA = a as Set<unknown>;
      const setB = b as Set<unknown>;

      if (setA.size !== setB.size) {
        return false;
      }

      if (seen.get(setA as unknown as object) === (setB as unknown as object)) {
        return true;
      }
      seen.set(setA as unknown as object, setB as unknown as object);

      const remaining = Array.from(setB.values());

      return Array.from(setA.values()).every((valueA) => {
        const matchIndex = remaining.findIndex((valueB) => deepEqual(valueA, valueB, seen));
        if (matchIndex === -1) {
          return false;
        }

        remaining.splice(matchIndex, 1);
        return true;
      });
    }

    if (ArrayBuffer.isView(a) && ArrayBuffer.isView(b)) {
      const viewA = a as ArrayBufferView;
      const viewB = b as ArrayBufferView;

      if (viewA.byteLength !== viewB.byteLength) {
        return false;
      }

      const bytesA = new Uint8Array(viewA.buffer, viewA.byteOffset, viewA.byteLength);
      const bytesB = new Uint8Array(viewB.buffer, viewB.byteOffset, viewB.byteLength);

      for (let i = 0; i < bytesA.length; i += 1) {
        if (bytesA[i] !== bytesB[i]) {
          return false;
        }
      }

      return true;
    }

    const objA = a as Record<string | symbol, unknown>;
    const objB = b as Record<string | symbol, unknown>;

    const protoA = Object.getPrototypeOf(objA);
    const protoB = Object.getPrototypeOf(objB);

    if (protoA !== protoB) {
      return false;
    }

    if (seen.get(objA) === objB) {
      return true;
    }
    seen.set(objA, objB);

    const keysA = Reflect.ownKeys(objA);
    const keysB = Reflect.ownKeys(objB);

    if (keysA.length !== keysB.length) {
      return false;
    }

    return keysA.every((key) => Reflect.has(objB, key) && deepEqual(objA[key], objB[key], seen));
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
