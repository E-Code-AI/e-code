/**
 * Test helpers for unit tests
 * Provides Jest-compatible testing utilities
 */

export const describe = (name: string, fn: () => void) => {
  console.log(`\n📦 Test Suite: ${name}`);
  fn();
};

export const it = async (name: string, fn: () => void | Promise<void>) => {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
  } catch (error: any) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${error.message}`);
    throw error;
  }
};

export const beforeEach = (fn: () => void | Promise<void>) => {
  // Store for execution before each test
  if (!(global as any).__beforeEachHooks) {
    (global as any).__beforeEachHooks = [];
  }
  (global as any).__beforeEachHooks.push(fn);
};

export const afterEach = (fn: () => void | Promise<void>) => {
  // Store for execution after each test
  if (!(global as any).__afterEachHooks) {
    (global as any).__afterEachHooks = [];
  }
  (global as any).__afterEachHooks.push(fn);
};

export const expect = (actual: any) => ({
  toBe: (expected: any) => {
    if (actual !== expected) {
      throw new Error(`Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
    }
  },
  toEqual: (expected: any) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
    }
  },
  toBeUndefined: () => {
    if (actual !== undefined) {
      throw new Error(`Expected ${JSON.stringify(actual)} to be undefined`);
    }
  },
  toBeInstanceOf: (constructor: any) => {
    if (!(actual instanceof constructor)) {
      throw new Error(`Expected ${actual} to be instance of ${constructor.name}`);
    }
  },
  toContain: (substring: string) => {
    if (typeof actual !== 'string' || !actual.includes(substring)) {
      throw new Error(`Expected "${actual}" to contain "${substring}"`);
    }
  },
});
