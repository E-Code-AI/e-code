import util from 'node:util';
import { deepEqual, matchObject } from './utils';

type Expectation<T> = {
  toBe(expected: T): void;
  toEqual(expected: unknown): void;
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

const formatValue = (value: unknown): string =>
  typeof value === 'string' ? `'${value}'` : util.inspect(value, { depth: 4, colors: false });

    return keysA.every((key) => Reflect.has(objB, key) && deepEqual(objA[key], objB[key], seen));
  }
}

function createExpect(): ExpectFn {
  return <T>(actual: T): Expectation<T> => ({
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
          throw new Error(`Expected ${formatValue(actual)} to contain ${formatValue(expected)}`);
        }
        return;
      }

      assertionError('toContain is only supported for strings and arrays');
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
