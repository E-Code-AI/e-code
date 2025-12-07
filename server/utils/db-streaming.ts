/**
 * Database Streaming Utilities
 * Fortune 500-grade memory optimization using generators
 * 
 * Implements Replit-style lazy evaluation patterns to prevent
 * loading entire result sets into memory.
 * 
 * Date: December 7, 2025
 * Status: Production-ready
 */

import { createLogger } from './logger';

const logger = createLogger('db-streaming');

/**
 * Configuration for cursor-based pagination
 */
export interface CursorPaginationConfig {
  /** Number of items per batch (default: 100) */
  batchSize: number;
  /** Maximum total items to return (default: 10000) */
  maxItems: number;
  /** Cursor field name (default: 'id') */
  cursorField: string;
}

const DEFAULT_CONFIG: CursorPaginationConfig = {
  batchSize: 100,
  maxItems: 10000,
  cursorField: 'id'
};

/**
 * Async generator that streams database results in batches
 * Prevents loading entire result sets into memory
 * 
 * @example
 * ```typescript
 * const stream = streamDbResults(
 *   async (cursor, limit) => db.query.logs.findMany({
 *     where: cursor ? gt(logs.id, cursor) : undefined,
 *     limit,
 *     orderBy: [asc(logs.id)]
 *   }),
 *   { batchSize: 100, maxItems: 1000 }
 * );
 * 
 * for await (const item of stream) {
 *   process(item);
 * }
 * ```
 */
export async function* streamDbResults<T extends Record<string, any>>(
  fetchBatch: (cursor: any, limit: number) => Promise<T[]>,
  config: Partial<CursorPaginationConfig> = {}
): AsyncGenerator<T, void, unknown> {
  const opts = { ...DEFAULT_CONFIG, ...config };
  let cursor: any = null;
  let totalYielded = 0;
  let batchNumber = 0;

  while (totalYielded < opts.maxItems) {
    batchNumber++;
    const remainingItems = opts.maxItems - totalYielded;
    const batchLimit = Math.min(opts.batchSize, remainingItems);

    const batch = await fetchBatch(cursor, batchLimit);
    
    if (batch.length === 0) {
      logger.debug(`[Stream] Completed after ${batchNumber} batches, ${totalYielded} items`);
      break;
    }

    for (const item of batch) {
      yield item;
      totalYielded++;
    }

    // Update cursor for next batch
    const lastItem = batch[batch.length - 1];
    cursor = lastItem[opts.cursorField];

    // If we got fewer than requested, we've reached the end
    if (batch.length < batchLimit) {
      logger.debug(`[Stream] End of results after ${batchNumber} batches, ${totalYielded} items`);
      break;
    }
  }

  if (totalYielded >= opts.maxItems) {
    logger.warn(`[Stream] Hit max items limit: ${opts.maxItems}`);
  }
}

/**
 * Transform generator - applies a transformation to each item lazily
 * Memory-efficient alternative to .map() on large arrays
 */
export async function* transformStream<T, R>(
  source: AsyncGenerator<T>,
  transform: (item: T) => R | Promise<R>
): AsyncGenerator<R, void, unknown> {
  for await (const item of source) {
    yield await transform(item);
  }
}

/**
 * Filter generator - filters items lazily without loading all into memory
 * Memory-efficient alternative to .filter() on large arrays
 */
export async function* filterStream<T>(
  source: AsyncGenerator<T>,
  predicate: (item: T) => boolean | Promise<boolean>
): AsyncGenerator<T, void, unknown> {
  for await (const item of source) {
    if (await predicate(item)) {
      yield item;
    }
  }
}

/**
 * Take generator - takes first N items from a stream
 * Stops iteration early for efficiency
 */
export async function* takeStream<T>(
  source: AsyncGenerator<T>,
  count: number
): AsyncGenerator<T, void, unknown> {
  let taken = 0;
  for await (const item of source) {
    if (taken >= count) break;
    yield item;
    taken++;
  }
}

/**
 * Skip generator - skips first N items from a stream
 */
export async function* skipStream<T>(
  source: AsyncGenerator<T>,
  count: number
): AsyncGenerator<T, void, unknown> {
  let skipped = 0;
  for await (const item of source) {
    if (skipped < count) {
      skipped++;
      continue;
    }
    yield item;
  }
}

/**
 * Collect generator results into an array
 * Use sparingly - only when you actually need the full array
 */
export async function collectStream<T>(
  source: AsyncGenerator<T>,
  maxItems: number = 10000
): Promise<T[]> {
  const results: T[] = [];
  let count = 0;
  
  for await (const item of source) {
    if (count >= maxItems) {
      logger.warn(`[collectStream] Hit max items limit: ${maxItems}`);
      break;
    }
    results.push(item);
    count++;
  }
  
  return results;
}

/**
 * Stream file lines lazily using async generators
 * Memory-efficient alternative to reading entire file
 */
export async function* streamFileLines(
  filePath: string,
  encoding: BufferEncoding = 'utf-8'
): AsyncGenerator<string, void, unknown> {
  const fs = await import('fs');
  const readline = await import('readline');
  
  const fileStream = fs.createReadStream(filePath, { encoding });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    yield line;
  }
}

/**
 * Batch generator - groups items into batches for bulk processing
 */
export async function* batchStream<T>(
  source: AsyncGenerator<T>,
  batchSize: number
): AsyncGenerator<T[], void, unknown> {
  let batch: T[] = [];
  
  for await (const item of source) {
    batch.push(item);
    if (batch.length >= batchSize) {
      yield batch;
      batch = [];
    }
  }
  
  // Yield remaining items
  if (batch.length > 0) {
    yield batch;
  }
}

/**
 * SSE (Server-Sent Events) streaming helper
 * Converts async generator to SSE format for real-time responses
 */
export async function* toSSEStream<T>(
  source: AsyncGenerator<T>,
  eventType: string = 'message'
): AsyncGenerator<string, void, unknown> {
  for await (const item of source) {
    const data = typeof item === 'string' ? item : JSON.stringify(item);
    yield `event: ${eventType}\ndata: ${data}\n\n`;
  }
  yield `event: done\ndata: {"completed": true}\n\n`;
}

/**
 * Pipeline helper - compose multiple stream transformations
 */
export function pipelineStream<T, R>(
  source: AsyncGenerator<T>,
  ...transforms: Array<(gen: AsyncGenerator<any>) => AsyncGenerator<any>>
): AsyncGenerator<R> {
  let current: AsyncGenerator<any> = source;
  for (const transform of transforms) {
    current = transform(current);
  }
  return current as AsyncGenerator<R>;
}
