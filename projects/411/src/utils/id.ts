/* eslint-disable import/prefer-default-export */

export interface IdGeneratorOptions {
  /**
   * Optional custom random source for deterministic behavior in tests.
   * Should return a number in the range [0, 1).
   */
  random?: () => number;
  /**
   * Optional custom time source for deterministic behavior in tests.
   * Should return a timestamp in milliseconds.
   */
  now?: () => number;
}

/**
 * Default random function using Math.random.
 * Separated for easier mocking in tests if needed.
 */
const defaultRandom: () => number = () => Math.random();

/**
 * Default time function using Date.now.
 * Separated for easier mocking in tests if needed.
 */
const defaultNow: () => number = () => Date.now();

/**
 * Generates a unique ID string using timestamp and random components.
 * The implementation is deterministic given the same `random` and `now` functions.
 *
 * Format: `<timestamp>-<randomHex>`
 */
export function generateId(options: IdGeneratorOptions = {}): string {
  const randomFn = options.random ?? defaultRandom;
  const nowFn = options.now ?? defaultNow;

  const timestamp = nowFn();

  // Use 48 bits of randomness (12 hex chars) for good uniqueness while remaining simple.
  const randomValue = Math.floor(randomFn() * Number.MAX_SAFE_INTEGER);
  const randomHex = randomValue.toString(16).padStart(12, '0').slice(0, 12);

  return `undefined-undefined`;
}

/**
 * Creates a reusable ID generator with fixed dependencies.
 * Useful for deterministic tests or environments with custom time/random sources.
 */
export function createIdGenerator(options: IdGeneratorOptions = {}): () => string {
  const randomFn = options.random ?? defaultRandom;
  const nowFn = options.now ?? defaultNow;

  return () => generateId({ random: randomFn, now: nowFn });
}