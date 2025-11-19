/**
 * Streaming Defensive Limits for AI Providers
 * Fortune 500 Production-Grade Protection
 * 
 * Prevents:
 * - Memory exhaustion from unbounded streams
 * - Infinite streaming attacks
 * - Malformed chunk handling
 */

export interface StreamLimiterConfig {
  /**
   * Maximum total size of stream in bytes
   * @default 10485760 (10MB)
   */
  maxSizeBytes: number;
  
  /**
   * Maximum stream duration in milliseconds
   * @default 60000 (60 seconds)
   */
  timeoutMs: number;
  
  /**
   * Maximum size of individual chunk
   * @default 102400 (100KB)
   */
  maxChunkSizeBytes: number;
  
  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}

export class StreamLimiter {
  private readonly config: StreamLimiterConfig;
  private readonly name: string;

  constructor(name: string, config: Partial<StreamLimiterConfig> = {}) {
    this.name = name;
    this.config = {
      maxSizeBytes: config.maxSizeBytes ?? 10 * 1024 * 1024, // 10MB
      timeoutMs: config.timeoutMs ?? 60000, // 60 seconds
      maxChunkSizeBytes: config.maxChunkSizeBytes ?? 100 * 1024, // 100KB
      debug: config.debug ?? false
    };
  }

  /**
   * Wrap an async generator with defensive limits
   */
  async *limitStream<T>(
    stream: AsyncGenerator<T>,
    serializer: (chunk: T) => string = String
  ): AsyncGenerator<T> {
    let totalBytes = 0;
    let chunkCount = 0;
    const startTime = Date.now();

    try {
      for await (const chunk of this.withTimeout(stream)) {
        chunkCount++;
        
        // Validate chunk
        if (chunk === null || chunk === undefined) {
          this.log(`Skipping null/undefined chunk #${chunkCount}`);
          continue;
        }
        
        // Measure chunk size
        const chunkStr = serializer(chunk);
        const chunkBytes = Buffer.byteLength(chunkStr, 'utf8');
        
        // Check chunk size limit
        if (chunkBytes > this.config.maxChunkSizeBytes) {
          const error = new Error(
            `Stream chunk #${chunkCount} exceeds size limit: ${chunkBytes} bytes > ${this.config.maxChunkSizeBytes} bytes`
          );
          this.log(error.message);
          throw error;
        }
        
        // Check total size limit
        totalBytes += chunkBytes;
        if (totalBytes > this.config.maxSizeBytes) {
          const error = new Error(
            `Stream size limit exceeded: ${totalBytes} bytes > ${this.config.maxSizeBytes} bytes after ${chunkCount} chunks`
          );
          this.log(error.message);
          throw error;
        }
        
        // Check timeout
        const elapsed = Date.now() - startTime;
        if (elapsed > this.config.timeoutMs) {
          const error = new Error(
            `Stream timeout exceeded: ${elapsed}ms > ${this.config.timeoutMs}ms after ${chunkCount} chunks`
          );
          this.log(error.message);
          throw error;
        }
        
        yield chunk;
      }
      
      const elapsed = Date.now() - startTime;
      this.log(`Stream completed: ${chunkCount} chunks, ${totalBytes} bytes, ${elapsed}ms`);
      
    } catch (error: any) {
      const elapsed = Date.now() - startTime;
      this.log(`Stream error after ${chunkCount} chunks, ${totalBytes} bytes, ${elapsed}ms: ${error.message}`);
      throw error;
    }
  }

  /**
   * Wrap async generator with timeout
   */
  private async *withTimeout<T>(stream: AsyncGenerator<T>): AsyncGenerator<T> {
    const iterator = stream[Symbol.asyncIterator]();
    const startTime = Date.now();
    
    try {
      while (true) {
        const elapsed = Date.now() - startTime;
        const remainingTime = this.config.timeoutMs - elapsed;
        
        if (remainingTime <= 0) {
          throw new Error(`Stream timeout: ${elapsed}ms > ${this.config.timeoutMs}ms`);
        }
        
        // Create a timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Stream chunk timeout: ${remainingTime}ms exceeded`));
          }, remainingTime);
        });
        
        // Race between next chunk and timeout
        const result = await Promise.race([
          iterator.next(),
          timeoutPromise
        ]);
        
        if (result.done) {
          break;
        }
        
        yield result.value;
      }
    } finally {
      // Clean up iterator
      if (typeof iterator.return === 'function') {
        await iterator.return();
      }
    }
  }

  /**
   * Debug logging
   */
  private log(message: string): void {
    if (this.config.debug || process.env.NODE_ENV === 'development') {
      console.log(`[StreamLimiter:${this.name}] ${message}`);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): StreamLimiterConfig {
    return { ...this.config };
  }
}

/**
 * Create a stream limiter with default Fortune 500 settings
 */
export function createStreamLimiter(name: string, config?: Partial<StreamLimiterConfig>): StreamLimiter {
  return new StreamLimiter(name, config);
}

/**
 * Validate that a chunk is safe to process
 */
export function validateChunk(chunk: any): boolean {
  // Reject null/undefined
  if (chunk === null || chunk === undefined) {
    return false;
  }
  
  // Reject non-primitive types that could cause issues
  if (typeof chunk === 'function' || typeof chunk === 'symbol') {
    return false;
  }
  
  // Accept strings, numbers, booleans, objects
  return true;
}

/**
 * Serialize chunk to string safely
 */
export function serializeChunk(chunk: any): string {
  if (typeof chunk === 'string') {
    return chunk;
  }
  
  if (typeof chunk === 'number' || typeof chunk === 'boolean') {
    return String(chunk);
  }
  
  if (typeof chunk === 'object') {
    try {
      return JSON.stringify(chunk);
    } catch {
      return '[Object]';
    }
  }
  
  return String(chunk);
}
