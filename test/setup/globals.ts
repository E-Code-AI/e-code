

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
      toBeGreaterThan(expected: number) {
        if (typeof actual !== 'number' || (actual as number) <= expected) {
          assertionError(`Expected ${actual} to be greater than ${expected}`);
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
