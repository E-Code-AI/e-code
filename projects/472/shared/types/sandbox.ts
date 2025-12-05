export type SupportedLanguage =
  | "javascript"
  | "typescript"
  | "python"
  | "ruby"
  | "go"
  | "rust"
  | "c"
  | "cpp"
  | "java"
  | "bash";

export type SandboxExecutionMode = "run" | "test" | "lint" | "compile";

export interface SandboxFile {
  /**
   * Path of the file relative to the sandbox root.
   * Example: "src/index.ts"
   */
  path: string;
  /**
   * File contents as UTF-8 text.
   */
  content: string;
  /**
   * Optional language override for this file.
   * If omitted, the sandbox-level language is used.
   */
  language?: SupportedLanguage;
  /**
   * Whether this file is read-only in the sandbox.
   */
  readOnly?: boolean;
}

export interface SandboxExecutionLimits {
  /**
   * Maximum execution time in milliseconds.
   */
  timeoutMs?: number;
  /**
   * Maximum memory usage in megabytes.
   */
  memoryMb?: number;
  /**
   * Maximum size of stdout in bytes before truncation.
   */
  maxStdoutBytes?: number;
  /**
   * Maximum size of stderr in bytes before truncation.
   */
  maxStderrBytes?: number;
  /**
   * Maximum size of combined output (stdout + stderr) in bytes.
   */
  maxCombinedOutputBytes?: number;
}

export interface SandboxEnvironmentVariable {
  name: string;
  value: string;
}

export interface SandboxExecutionRequest {
  /**
   * Primary language of the execution.
   */
  language: SupportedLanguage;
  /**
   * Main source code to execute.
   */
  code: string;
  /**
   * Optional list of additional files to include in the sandbox.
   */
  files?: SandboxFile[];
  /**
   * Standard input to provide to the process.
   */
  stdin?: string;
  /**
   * Command-line arguments passed to the program.
   */
  args?: string[];
  /**
   * Environment variables for the sandboxed process.
   */
  env?: SandboxEnvironmentVariable[];
  /**
   * Execution mode (run, test, lint, compile).
   */
  mode?: SandboxExecutionMode;
  /**
   * Optional working directory relative to sandbox root.
   */
  workingDirectory?: string;
  /**
   * Resource limits and quotas.
   */
  limits?: SandboxExecutionLimits;
  /**
   * Whether to enable streaming of output events.
   */
  stream?: boolean;
  /**
   * Optional identifier for correlating requests and responses.
   */
  requestId?: string;
  /**
   * Optional metadata for application-specific context.
   */
  metadata?: Record<string, unknown>;
}

export interface SandboxExecutionResult {
  /**
   * Captured standard output.
   */
  stdout: string;
  /**
   * Captured standard error.
   */
  stderr: string;
  /**
   * Process exit code. Null if the process did not exit normally.
   */
  exitCode: number | null;
  /**
   * Signal that terminated the process, if any.
   */
  signal?: string | null;
  /**
   * Total execution time in milliseconds.
   */
  durationMs: number;
  /**
   * Whether stdout was truncated due to limits.
   */
  stdoutTruncated?: boolean;
  /**
   * Whether stderr was truncated due to limits.
   */
  stderrTruncated?: boolean;
  /**
   * Whether combined output was truncated due to limits.
   */
  combinedOutputTruncated?: boolean;
  /**
   * Optional diagnostics or tool-specific data.
   */
  diagnostics?: Record<string, unknown>;
  /**
   * Optional identifier matching the originating request.
   */
  requestId?: string;
  /**
   * Optional metadata for application-specific context.
   */
  metadata?: Record<string, unknown>;
}

export type SandboxStreamEventType =
  | "start"
  | "stdout"
  | "stderr"
  | "exit"
  | "error"
  | "heartbeat";

export interface SandboxBaseStreamEvent {
  /**
   * Type discriminator for the event.
   */
  type: SandboxStreamEventType;
  /**
   * Monotonic sequence number for ordering events within a stream.
   */
  sequence: number;
  /**
   * Timestamp in ISO 8601 format.
   */
  timestamp: string;
  /**
   * Optional identifier matching the originating request.
   */
  requestId?: string;
}

export interface SandboxStartEvent extends SandboxBaseStreamEvent {
  type: "start";
  /**
   * Echo of the execution request that initiated this stream, if available.
   */
  request?: SandboxExecutionRequest;
}

export interface SandboxStdoutEvent extends SandboxBaseStreamEvent {
  type: "stdout";
  /**
   * Chunk of standard output.
   */
  data: string;
}

export interface SandboxStderrEvent extends SandboxBaseStreamEvent {
  type: "stderr";
  /**
   * Chunk of standard error.
   */
  data: string;
}

export interface SandboxExitEvent extends SandboxBaseStreamEvent {
  type: "exit";
  /**
   * Final exit code of the process. Null if not available.
   */
  exitCode: number | null;
  /**
   * Signal that terminated the process, if any.
   */
  signal?: string | null;
  /**
   * Total execution time in milliseconds.
   */
  durationMs: number;
}

export interface SandboxErrorEvent extends SandboxBaseStreamEvent {
  type: "error";
  /**
   * Human-readable error message.
   */
  message: string;
  /**
   * Optional machine-readable error code.
   */
  code?: string;
  /**
   * Optional additional error details.
   */
  details?: unknown;
}

export interface SandboxHeartbeatEvent extends SandboxBaseStreamEvent {
  type: "heartbeat";
  /**
   * Optional payload for health or progress information.
   */
  info?: Record<string, unknown>;
}

export type SandboxStreamEvent =
  | SandboxStartEvent
  | SandboxStdoutEvent
  | SandboxStderrEvent
  | SandboxExitEvent
  | SandboxErrorEvent
  | SandboxHeartbeatEvent;

export interface SandboxStreamEnvelope {
  /**
   * Unique identifier for this stream instance.
   */
  streamId: string;
  /**
   * Event payload.
   */
  event: SandboxStreamEvent;
}

export interface SandboxExecutionResponse {
  /**
   * Final result of the execution.
   */
  result: SandboxExecutionResult;
  /**
   * Optional list of all streamed events, if the backend buffers them.
   */
  events?: SandboxStreamEvent[];
}