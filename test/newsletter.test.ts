import { testRunner } from './setup/test-runner';
import { chunkArray, executeWithBackoff } from '../server/newsletter/dispatch-helpers';

const noopDelay = async () => {};

testRunner.registerSuite('Newsletter Dispatch Helpers', {
  tests: [
    {
      name: 'chunkArray splits collections into even batches',
      fn: async () => {
        const data = Array.from({ length: 23 }, (_, index) => index + 1);
        const batches = chunkArray(data, 5);

        expect(batches.length).toBe(5);
        expect(batches[0]).toEqual([1, 2, 3, 4, 5]);
        expect(batches[4]).toEqual([21, 22, 23]);
      },
    },
    {
      name: 'executeWithBackoff retries until success and records attempts',
      fn: async () => {
        let attempts = 0;
        const result = await executeWithBackoff(
          async () => {
            attempts += 1;
            if (attempts < 3) {
              return { success: false, error: 'temporary' };
            }

            return { success: true };
          },
          { maxRetries: 5, baseDelayMs: 10, delayFn: noopDelay }
        );

        expect(result.success).toBe(true);
        expect(result.attempts).toBe(3);
      },
    },
    {
      name: 'executeWithBackoff honors max retries for persistent failures',
      fn: async () => {
        let attempts = 0;
        const result = await executeWithBackoff(
          async () => {
            attempts += 1;
            return { success: false, error: 'permanent failure' };
          },
          { maxRetries: 2, baseDelayMs: 5, delayFn: noopDelay }
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('permanent failure');
        expect(result.attempts).toBe(3);
      },
    },
  ],
});
