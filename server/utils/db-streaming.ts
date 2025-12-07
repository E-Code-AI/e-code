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

import * as fs from 'fs/promises';
import * as path from 'path';
import type { Readable } from 'stream';
import type Archiver from 'archiver';
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
 * Uses fs/promises for Replit-style memory optimization
 */
export async function* streamFileLines(
  filePath: string
): AsyncGenerator<string, void, unknown> {
  let fileHandle: fs.FileHandle | null = null;
  
  try {
    fileHandle = await fs.open(filePath, 'r');
    const stream = fileHandle.createReadStream({ encoding: 'utf-8' });
    let buffer = '';
    
    for await (const chunk of stream) {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        yield line;
      }
    }
    
    if (buffer) {
      yield buffer;
    }
  } catch (error) {
    logger.error(`[streamFileLines] Error reading file ${filePath}:`, error);
    throw error;
  } finally {
    if (fileHandle) {
      await fileHandle.close();
    }
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

/**
 * Options for streaming directory files
 */
export interface StreamDirectoryOptions {
  /** Whether to recursively traverse subdirectories (default: false) */
  recursive?: boolean;
  /** Optional file extension filter (e.g., '.ts', '.js') */
  extensions?: string[];
  /** Optional pattern to exclude files/directories */
  exclude?: RegExp;
}

/**
 * Stream directory files lazily using async generators
 * Memory-efficient alternative to building array of all files
 * Yields file paths one-by-one instead of loading entire directory tree
 * 
 * @example
 * ```typescript
 * for await (const filePath of streamDirectoryFiles('./src', { recursive: true })) {
 *   console.log(filePath);
 * }
 * ```
 */
export async function* streamDirectoryFiles(
  dirPath: string,
  options?: StreamDirectoryOptions
): AsyncGenerator<string, void, unknown> {
  const opts = {
    recursive: false,
    extensions: undefined,
    exclude: undefined,
    ...options
  };

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      // Check exclusion pattern
      if (opts.exclude && opts.exclude.test(fullPath)) {
        continue;
      }
      
      if (entry.isDirectory()) {
        if (opts.recursive) {
          yield* streamDirectoryFiles(fullPath, opts);
        }
      } else if (entry.isFile()) {
        // Filter by extension if specified
        if (opts.extensions && opts.extensions.length > 0) {
          const ext = path.extname(entry.name);
          if (!opts.extensions.includes(ext)) {
            continue;
          }
        }
        yield fullPath;
      }
    }
  } catch (error) {
    logger.error(`[streamDirectoryFiles] Error reading directory ${dirPath}:`, error);
    throw error;
  }
}

/**
 * Options for piping stream to archive
 */
export interface PipeToArchiveOptions {
  /** Name/path of the file in the archive */
  archivePath?: string;
  /** Whether to store or compress (default: compress) */
  store?: boolean;
}

/**
 * Pipes a file stream directly to an archiver without buffering entire file
 * Memory-efficient for large file archiving
 * 
 * @example
 * ```typescript
 * import archiver from 'archiver';
 * 
 * const archive = archiver('zip', { zlib: { level: 9 } });
 * archive.pipe(output);
 * 
 * await pipeStreamToArchive(archive, '/path/to/large-file.log', {
 *   archivePath: 'logs/file.log'
 * });
 * 
 * await archive.finalize();
 * ```
 */
export async function pipeStreamToArchive(
  archive: Archiver,
  filePath: string,
  options?: PipeToArchiveOptions
): Promise<void> {
  const opts = {
    archivePath: path.basename(filePath),
    store: false,
    ...options
  };

  let fileHandle: fs.FileHandle | null = null;
  
  try {
    // Check if file exists and get stats
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      throw new Error(`Path is not a file: ${filePath}`);
    }

    // Open file and create read stream
    fileHandle = await fs.open(filePath, 'r');
    const stream = fileHandle.createReadStream();

    // Append stream to archive
    archive.append(stream as unknown as Readable, {
      name: opts.archivePath,
      store: opts.store
    });

    // Wait for the stream to be consumed
    await new Promise<void>((resolve, reject) => {
      stream.on('end', resolve);
      stream.on('error', reject);
    });

    logger.debug(`[pipeStreamToArchive] Added ${filePath} as ${opts.archivePath}`);
  } catch (error) {
    logger.error(`[pipeStreamToArchive] Error archiving ${filePath}:`, error);
    throw error;
  } finally {
    if (fileHandle) {
      await fileHandle.close();
    }
  }
}

/**
 * Pipes multiple files from a directory to an archive using streaming
 * Memory-efficient for archiving large directories
 * 
 * @example
 * ```typescript
 * import archiver from 'archiver';
 * 
 * const archive = archiver('zip', { zlib: { level: 9 } });
 * archive.pipe(output);
 * 
 * await pipeDirectoryToArchive(archive, './logs', {
 *   recursive: true,
 *   baseDir: 'backup/logs'
 * });
 * 
 * await archive.finalize();
 * ```
 */
export async function pipeDirectoryToArchive(
  archive: Archiver,
  dirPath: string,
  options?: StreamDirectoryOptions & { baseDir?: string }
): Promise<number> {
  const { baseDir = '', ...streamOpts } = options || {};
  let fileCount = 0;

  try {
    for await (const filePath of streamDirectoryFiles(dirPath, { recursive: true, ...streamOpts })) {
      // Calculate relative path for archive
      const relativePath = path.relative(dirPath, filePath);
      const archivePath = baseDir ? path.join(baseDir, relativePath) : relativePath;

      await pipeStreamToArchive(archive, filePath, { archivePath });
      fileCount++;
    }

    logger.debug(`[pipeDirectoryToArchive] Added ${fileCount} files from ${dirPath}`);
    return fileCount;
  } catch (error) {
    logger.error(`[pipeDirectoryToArchive] Error archiving directory ${dirPath}:`, error);
    throw error;
  }
}
