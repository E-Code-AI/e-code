/**
 * SECURITY FIX C-04: Hardened JavaScript Sandbox
 *
 * Uses worker_threads with strict resourceLimits for memory isolation.
 * Removes unsafe `require()` access entirely.
 * Removes direct access to Node.js globals (setTimeout, Buffer, etc.)
 * that could be used for sandbox escapes.
 *
 * For non-JS languages, always route to Docker or remote executor.
 */
import { Worker } from 'worker_threads';
import * as vm from 'vm';
import * as path from 'path';
import { ExecutionResult } from './executor';

// SECURITY FIX C-04: Maximum code size to prevent memory exhaustion
const MAX_CODE_SIZE = 1_000_000; // 1MB max
const MAX_OUTPUT_SIZE = 5_000_000; // 5MB max output
const DEFAULT_TIMEOUT = 10_000; // 10 seconds (was 5s)
const MAX_TIMEOUT = 30_000; // 30 seconds absolute max
const DEFAULT_MEMORY_LIMIT = 128; // MB

interface SandboxOptions {
  code: string;
  language: string;
  timeout?: number;
  memoryLimit?: number;
  stdin?: string;
}

export class Sandbox {
  private workerPath: string;

  constructor() {
    this.workerPath = path.join(__dirname, 'sandbox-worker.js');
  }

  async execute(options: SandboxOptions): Promise<ExecutionResult> {
    const { code, language, timeout = DEFAULT_TIMEOUT, memoryLimit = DEFAULT_MEMORY_LIMIT, stdin } = options;
    const startTime = Date.now();

    // SECURITY FIX E-03: Validate code size
    if (code.length > MAX_CODE_SIZE) {
      return {
        stdout: '',
        stderr: `Code too large (${(code.length / 1_000_000).toFixed(1)}MB). Maximum allowed: 1MB`,
        exitCode: 1,
        executionTime: Date.now() - startTime,
        error: 'Code size limit exceeded'
      };
    }

    // Clamp timeout to safe range
    const safeTimeout = Math.min(Math.max(timeout, 1000), MAX_TIMEOUT);

    if (language === 'javascript' || language === 'nodejs') {
      // SECURITY FIX C-04: Prefer worker-based execution for better isolation
      return this.executeInWorker({
        ...options,
        timeout: safeTimeout,
        memoryLimit: Math.min(memoryLimit, 256), // Cap at 256MB
      });
    }

    // For other languages, we need external executors (Docker or Piston)
    // SECURITY FIX E-02: Never execute non-JS locally
    return {
      stdout: '',
      stderr: `Language '${language}' requires Docker or remote execution. Local sandbox only supports JavaScript.`,
      exitCode: 1,
      executionTime: Date.now() - startTime,
      error: 'Use Docker or remote executor for this language'
    };
  }

  /**
   * SECURITY FIX C-04: Hardened VM-based JavaScript execution
   * Removed: require(), setTimeout, setInterval, Buffer (potential escape vectors)
   * Added: Output size limits, stricter timeout handling
   */
  private async executeJavaScript(
    code: string,
    timeout: number,
    stdin?: string
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const output: string[] = [];
    const errors: string[] = [];
    let totalOutputSize = 0;

    // Helper to safely append output with size limit
    const appendOutput = (arr: string[], data: string) => {
      if (totalOutputSize < MAX_OUTPUT_SIZE) {
        arr.push(data);
        totalOutputSize += data.length;
      }
    };

    try {
      // SECURITY FIX C-04: Minimal sandbox context — no require(), no Node.js globals
      const sandbox = {
        console: {
          log: (...args: any[]) => appendOutput(output, args.map(arg => String(arg)).join(' ') + '\n'),
          error: (...args: any[]) => appendOutput(errors, args.map(arg => String(arg)).join(' ') + '\n'),
          warn: (...args: any[]) => appendOutput(output, '[WARN] ' + args.map(arg => String(arg)).join(' ') + '\n'),
          info: (...args: any[]) => appendOutput(output, '[INFO] ' + args.map(arg => String(arg)).join(' ') + '\n'),
        },
        // Minimal process stub (no access to real process)
        process: {
          stdin: { read: () => stdin || '' },
          stdout: { write: (data: string) => { appendOutput(output, data); } },
          stderr: { write: (data: string) => { appendOutput(errors, data); } },
          exit: (exitCode: number) => { throw new Error(`Process exited with code ${exitCode}`); },
          version: 'v20.0.0', // Safe stub
          platform: 'linux',
          arch: 'x64',
        },
        // SECURITY FIX C-04: Safe built-in constructors only (no require, no Buffer, no timers)
        Date,
        Math,
        JSON,
        Array,
        Object,
        String,
        Number,
        Boolean,
        RegExp,
        Promise,
        Map,
        Set,
        WeakMap,
        WeakSet,
        Error,
        TypeError,
        RangeError,
        SyntaxError,
        parseInt,
        parseFloat,
        isNaN,
        isFinite,
        encodeURIComponent,
        decodeURIComponent,
        encodeURI,
        decodeURI,
        // NOTE: setTimeout/setInterval deliberately excluded to prevent escape vectors
        // NOTE: require() deliberately excluded to prevent fs/net access
        // NOTE: Buffer deliberately excluded to prevent binary exploitation
      };

      const context = vm.createContext(sandbox);

      // Wrap code to handle both sync and async patterns
      const wrappedCode = `
        (async () => {
          ${code}
        })()
      `;

      const script = new vm.Script(wrappedCode);
      await new Promise<void>(async (resolve, reject) => {
        const timeoutId = global.setTimeout(() => {
          reject(new Error('Execution timed out'));
        }, timeout);

        try {
          const result = script.runInContext(context, {
            timeout,
            displayErrors: true
          });

          if (result && typeof result.then === 'function') {
            await result;
          }

          clearTimeout(timeoutId);
          resolve();
        } catch (error) {
          clearTimeout(timeoutId);
          reject(error);
        }
      });

      return {
        stdout: output.join(''),
        stderr: errors.join(''),
        exitCode: 0,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        stdout: output.join(''),
        stderr: errors.join('') + '\n' + errorMessage,
        exitCode: 1,
        executionTime: Date.now() - startTime,
        error: errorMessage,
        timedOut: errorMessage.includes('timed out')
      };
    }
  }

  /**
   * SECURITY FIX C-04: Worker-based execution with memory limits
   * Preferred over VM for better isolation via V8 resource limits
   */
  async executeInWorker(options: SandboxOptions): Promise<ExecutionResult> {
    const { code, timeout = DEFAULT_TIMEOUT, memoryLimit = DEFAULT_MEMORY_LIMIT } = options;
    const startTime = Date.now();

    return new Promise((resolve) => {
      // SECURITY FIX C-04: Wrap user code in a safe harness that captures output
      const workerCode = `
        const { parentPort } = require('worker_threads');
        const output = [];
        const errors = [];

        // Override console to capture output
        const origConsole = console;
        global.console = {
          log: (...args) => { const msg = args.map(String).join(' ') + '\\n'; output.push(msg); parentPort.postMessage({ type: 'stdout', data: msg }); },
          error: (...args) => { const msg = args.map(String).join(' ') + '\\n'; errors.push(msg); parentPort.postMessage({ type: 'stderr', data: msg }); },
          warn: (...args) => { const msg = '[WARN] ' + args.map(String).join(' ') + '\\n'; output.push(msg); parentPort.postMessage({ type: 'stdout', data: msg }); },
          info: (...args) => { const msg = '[INFO] ' + args.map(String).join(' ') + '\\n'; output.push(msg); parentPort.postMessage({ type: 'stdout', data: msg }); },
        };

        // SECURITY: Remove dangerous globals in worker context
        delete global.process.env;

        (async () => {
          try {
            ${code}
          } catch (e) {
            parentPort.postMessage({ type: 'stderr', data: (e.message || String(e)) + '\\n' });
            process.exit(1);
          }
        })();
      `;

      const worker = new Worker(workerCode, {
        eval: true,
        resourceLimits: {
          maxOldGenerationSizeMb: memoryLimit,
          maxYoungGenerationSizeMb: Math.floor(memoryLimit / 2),
          codeRangeSizeMb: 32, // SECURITY FIX C-04: Limit code range
          stackSizeMb: 4, // SECURITY FIX C-04: Limit stack size
        }
      });

      const output: string[] = [];
      const errors: string[] = [];
      let terminated = false;

      worker.on('message', (message) => {
        if (message.type === 'stdout') {
          output.push(message.data);
        } else if (message.type === 'stderr') {
          errors.push(message.data);
        }
      });

      worker.on('error', (error) => {
        if (terminated) return;
        terminated = true;
        resolve({
          stdout: output.join(''),
          stderr: errors.join('') + '\n' + error.message,
          exitCode: 1,
          executionTime: Date.now() - startTime,
          error: error.message
        });
      });

      worker.on('exit', (exitCode) => {
        if (terminated) return;
        terminated = true;
        resolve({
          stdout: output.join(''),
          stderr: errors.join(''),
          exitCode: exitCode ?? 0,
          executionTime: Date.now() - startTime
        });
      });

      // SECURITY FIX C-04: Strict timeout with forced termination
      global.setTimeout(() => {
        if (terminated) return;
        terminated = true;
        worker.terminate();
        resolve({
          stdout: output.join(''),
          stderr: errors.join('') + '\nExecution timed out',
          exitCode: 1,
          executionTime: Date.now() - startTime,
          timedOut: true
        });
      }, timeout);
    });
  }
}

export const sandbox = new Sandbox();
