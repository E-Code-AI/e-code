import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { EventEmitter } from "events";
import { randomUUID } from "crypto";
import { tmpdir } from "os";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { join } from "path";

export type SupportedRuntime = "node" | "python";

export interface SandboxExecutionOptions {
  runtime: SupportedRuntime;
  code: string;
  args?: string[];
  stdin?: string;
  timeoutMs?: number;
  memoryLimitMb?: number;
  cpuTimeLimitMs?: number;
  workingDirectory?: string;
  env?: Record<string, string | undefined>;
}

export interface SandboxExecutionResult {
  id: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  startTime: Date;
  endTime: Date;
  durationMs: number;
}

export interface SandboxExecutionEvents {
  stdout: (chunk: string) => void;
  stderr: (chunk: string) => void;
  exit: (result: SandboxExecutionResult) => void;
  error: (error: Error) => void;
}

export interface SandboxExecution extends EventEmitter {
  id: string;
  kill: () => void;
  on<U extends keyof SandboxExecutionEvents>(
    event: U,
    listener: SandboxExecutionEvents[U]
  ): this;
  once<U extends keyof SandboxExecutionEvents>(
    event: U,
    listener: SandboxExecutionEvents[U]
  ): this;
  emit<U extends keyof SandboxExecutionEvents>(
    event: U,
    ...args: Parameters<SandboxExecutionEvents[U]>
  ): boolean;
}

export interface SandboxServiceConfig {
  defaultTimeoutMs?: number;
  maxTimeoutMs?: number;
  defaultMemoryLimitMb?: number;
  maxMemoryLimitMb?: number;
  defaultCpuTimeLimitMs?: number;
  maxCpuTimeLimitMs?: number;
  nodeExecutable?: string;
  pythonExecutable?: string;
  baseTmpDir?: string;
}

const DEFAULT_CONFIG: Required<SandboxServiceConfig> = {
  defaultTimeoutMs: 10_000,
  maxTimeoutMs: 60_000,
  defaultMemoryLimitMb: 256,
  maxMemoryLimitMb: 1024,
  defaultCpuTimeLimitMs: 10_000,
  maxCpuTimeLimitMs: 60_000,
  nodeExecutable: "node",
  pythonExecutable: "python3",
  baseTmpDir: tmpdir(),
};

type InternalExecutionState = {
  id: string;
  process: ChildProcessWithoutNullStreams | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  startTime: Date;
  timeoutHandle?: NodeJS.Timeout;
  tmpDir?: string;
  codeFilePath?: string;
};

export class SandboxService {
  private readonly config: Required<SandboxServiceConfig>;

  constructor(config?: SandboxServiceConfig) {
    this.config = { ...DEFAULT_CONFIG, ...(config || {}) };
  }

  public async execute(
    options: SandboxExecutionOptions
  ): Promise<SandboxExecution> {
    const execId = randomUUID();
    const emitter = new EventEmitter() as SandboxExecution;

    (emitter as SandboxExecution).id = execId;
    (emitter as SandboxExecution).kill = () => {
      if (state.process && !state.process.killed) {
        state.process.kill("SIGKILL");
      }
    };

    const state: InternalExecutionState = {
      id: execId,
      process: null,
      stdout: "",
      stderr: "",
      timedOut: false,
      startTime: new Date(),
    };

    const timeoutMs = this.normalizeTimeout(options.timeoutMs);
    const memoryLimitMb = this.normalizeMemoryLimit(options.memoryLimitMb);
    const cpuTimeLimitMs = this.normalizeCpuTimeLimit(
      options.cpuTimeLimitMs
    );

    const workingDirectory =
      options.workingDirectory || (await this.createIsolatedTmpDir(execId));
    state.tmpDir = workingDirectory;

    try {
      const codeFilePath = await this.writeCodeToFile(
        workingDirectory,
        options.runtime,
        options.code
      );
      state.codeFilePath = codeFilePath;

      const { command, args } = this.buildCommand(
        options.runtime,
        codeFilePath,
        options.args,
        memoryLimitMb,
        cpuTimeLimitMs
      );

      const childEnv = this.buildEnv(options.env);

      const child = spawn(command, args, {
        cwd: workingDirectory,
        env: childEnv,
        stdio: ["pipe", "pipe", "pipe"],
        detached: false,
      });

      state.process = child;

      if (options.stdin) {
        child.stdin.write(options.stdin);
      }
      child.stdin.end();

      state.timeoutHandle = setTimeout(() => {
        state.timedOut = true;
        if (!child.killed) {
          child.kill("SIGKILL");
        }
      }, timeoutMs);

      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");

      child.stdout.on("data", (chunk: string) => {
        state.stdout += chunk;
        emitter.emit("stdout", chunk);
      });

      child.stderr.on("data", (chunk: string) => {
        state.stderr += chunk;
        emitter.emit("stderr", chunk);
      });

      child.on("error", (error: Error) => {
        this.cleanup(state).finally(() => {
          emitter.emit("error", error);
        });
      });

      child.on("exit", (code: number | null, signal: NodeJS.Signals | null) => {
        if (state.timeoutHandle) {
          clearTimeout(state.timeoutHandle);
        }
        const endTime = new Date();
        const result: SandboxExecutionResult = {
          id: execId,
          exitCode: code,
          signal,
          stdout: state.stdout,
          stderr: state.stderr,
          timedOut: state.timedOut,
          startTime: state.startTime,
          endTime,
          durationMs: endTime.getTime() - state.startTime.getTime(),
        };
        this.cleanup(state).finally(() => {
          emitter.emit("exit", result);
        });
      });
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error(String(error));
      this.cleanup(state).finally(() => {
        process.nextTick(() => {
          emitter.emit("error", err);
        });
      });
    }

    return emitter;
  }

  private normalizeTimeout(timeoutMs?: number): number {
    const { defaultTimeoutMs, maxTimeoutMs } = this.config;
    if (!timeoutMs || timeoutMs <= 0) {
      return defaultTimeoutMs;
    }
    return Math.min(timeoutMs, maxTimeoutMs);
  }

  private normalizeMemoryLimit(memoryLimitMb?: number): number {
    const { defaultMemoryLimitMb, maxMemoryLimitMb } = this.config;
    if (!memoryLimitMb || memoryLimitMb <= 0) {
      return defaultMemoryLimitMb;
    }
    return Math.min(memoryLimitMb, maxMemoryLimitMb);
  }

  private normalizeCpuTimeLimit(cpuTimeLimitMs?: number): number {
    const { defaultCpuTimeLimitMs, maxCpuTimeLimitMs } = this.config;
    if (!cpuTimeLimitMs || cpuTimeLimitMs <= 0) {
      return defaultCpuTimeLimitMs;
    }
    return Math.min(cpuTimeLimitMs, maxCpuTimeLimitMs);
  }

  private async createIsolatedTmpDir(execId: string): Promise<string> {
    const prefix = join(this.config.baseTmpDir, `sandbox-undefined-`);
    const dir = await mkdtemp(prefix);
    return dir;
  }

  private async writeCodeToFile(
    dir: string,
    runtime: SupportedRuntime,
    code: string
  ): Promise<string> {
    const extension = runtime === "node" ? ".js" : ".py";
    const filename = `mainundefined`;
    const filePath = join(dir, filename);
    await writeFile(filePath, code, { encoding: "utf8", mode: 0o600 });
    return filePath;
  }

  private buildCommand(
    runtime: SupportedRuntime,
    codeFilePath: string,
    userArgs: string[] | undefined,
    memoryLimitMb: number,
    cpuTimeLimitMs: number
  ): { command: string; args: string[] } {
    const args: string[] = [];
    const runtimeArgs: string[] = [];

    if (runtime === "node") {
      const nodeExec = this.config.nodeExecutable;
      runtimeArgs.push(codeFilePath);
      if (Array.isArray(userArgs) && userArgs.length > 0) {
        runtimeArgs.push(...userArgs);
      }
      return {
        command: nodeExec,
        args: runtimeArgs,
      };
    }

    if (runtime === "python") {
      const pythonExec = this.config.pythonExecutable;
      runtimeArgs.push(codeFilePath);
      if (Array.isArray(userArgs) && userArgs.length > 0) {
        runtimeArgs.push(...userArgs);
      }
      return {
        command: pythonExec,
        args: runtimeArgs,
      };
    }

    throw new Error(`Unsupported runtime: undefined`);
  }

  private buildEnv(
    overrides?: Record<string, string | undefined>
  ): NodeJS.ProcessEnv {
    const baseEnv: NodeJS