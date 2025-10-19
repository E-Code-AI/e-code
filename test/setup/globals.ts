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
