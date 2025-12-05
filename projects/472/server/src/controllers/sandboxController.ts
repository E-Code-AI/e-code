import type { Request, Response, NextFunction } from "express";
import type { Server as HttpServer } from "http";
import type { Server as IOServer, Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { sandboxService } from "../services/sandboxService";
import { logger } from "../utils/logger";

export interface SandboxControllerConfig {
  io?: IOServer;
}

export interface SandboxJobRequestBody {
  language: string;
  code: string;
  stdin?: string;
  timeoutMs?: number;
  memoryLimitMb?: number;
  args?: string[];
  files?: Array<{
    name: string;
    content: string;
  }>;
  metadata?: Record<string, unknown>;
  stream?: boolean;
  socketId?: string;
}

export interface SandboxJobResponse {
  jobId: string;
  executionId: string;
  status: "queued" | "running" | "completed" | "failed";
  startedAt?: string;
  completedAt?: string;
  result?: {
    stdout: string;
    stderr: string;
    exitCode: number | null;
    timedOut: boolean;
    memoryUsedMb?: number;
    durationMs?: number;
  };
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

export interface SandboxStatusResponse {
  jobId: string;
  executionId: string;
  status: "queued" | "running" | "completed" | "failed" | "unknown";
  startedAt?: string;
  completedAt?: string;
  result?: {
    stdout: string;
    stderr: string;
    exitCode: number | null;
    timedOut: boolean;
    memoryUsedMb?: number;
    durationMs?: number;
  };
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

export interface SandboxStreamEvent {
  executionId: string;
  type: "stdout" | "stderr" | "status" | "complete" | "error";
  data: unknown;
}

export class SandboxController {
  private io?: IOServer;

  constructor(config?: SandboxControllerConfig) {
    this.io = config?.io;
    if (this.io) {
      this.setupSocketHandlers(this.io);
    }
  }

  public attachSocketServer(io: IOServer): void {
    this.io = io;
    this.setupSocketHandlers(io);
  }

  private setupSocketHandlers(io: IOServer): void {
    io.on("connection", (socket: Socket) => {
      logger.debug(`Socket connected: undefined`);

      socket.on("disconnect", (reason: string) => {
        logger.debug(`Socket disconnected: undefined, reason: undefined`);
      });

      socket.on("sandbox:subscribe", (executionId: string) => {
        if (!executionId || typeof executionId !== "string") {
          socket.emit("sandbox:error", {
            type: "validation",
            message: "Invalid executionId for subscription",
          });
          return;
        }
        const room = this.getExecutionRoom(executionId);
        socket.join(room);
        socket.emit("sandbox:subscribed", { executionId });
      });

      socket.on("sandbox:unsubscribe", (executionId: string) => {
        if (!executionId || typeof executionId !== "string") {
          socket.emit("sandbox:error", {
            type: "validation",
            message: "Invalid executionId for unsubscription",
          });
          return;
        }
        const room = this.getExecutionRoom(executionId);
        socket.leave(room);
        socket.emit("sandbox:unsubscribed", { executionId });
      });
    });
  }

  private getExecutionRoom(executionId: string): string {
    return `sandbox:execution:undefined`;
  }

  private emitStreamEvent(executionId: string, event: SandboxStreamEvent): void {
    if (!this.io) return;
    const room = this.getExecutionRoom(executionId);
    this.io.to(room).emit("sandbox:stream", event);
  }

  public createJob = async (
    req: Request<unknown, unknown, SandboxJobRequestBody>,
    res: Response<SandboxJobResponse>,
    next: NextFunction
  ): Promise<void> => {
    const requestId = uuidv4();
    const startedAt = new Date();

    try {
      const {
        language,
        code,
        stdin,
        timeoutMs,
        memoryLimitMb,
        args,
        files,
        metadata,
        stream,
        socketId,
      } = req.body || {};

      if (!language || typeof language !== "string") {
        res.status(400).json({
          jobId: "",
          executionId: "",
          status: "failed",
          error: {
            message: "Missing or invalid 'language' field",
            code: "VALIDATION_ERROR",
          },
        });
        return;
      }

      if (!code || typeof code !== "string") {
        res.status(400).json({
          jobId: "",
          executionId: "",
          status: "failed",
          error: {
            message: "Missing or invalid 'code' field",
            code: "VALIDATION_ERROR",
          },
        });
        return;
      }

      const executionId = uuidv4();
      const jobId = uuidv4();

      logger.info("Creating sandbox job", {
        requestId,
        jobId,
        executionId,
        language,
        hasStdin: Boolean(stdin),
        hasFiles: Array.isArray(files) && files.length > 0,
        stream,
      });

      const enableStreaming = Boolean(stream && this.io);

      if (enableStreaming && socketId && this.io) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          const room = this.getExecutionRoom(executionId);
          socket.join(room);
        }
      }

      const streamHandlers = enableStreaming
        ? {
            onStdout: (chunk: string) => {
              this.emitStreamEvent(executionId, {
                executionId,
                type: "stdout",
                data: { chunk },
              });
            },
            onStderr: (chunk: string) => {
              this.emitStreamEvent(executionId, {
                executionId,
                type: "stderr",
                data: { chunk },
              });
            },
            onStatus: (status: string) => {
              this.emitStreamEvent(executionId, {
                executionId,
                type: "status",
                data: { status },
              });
            },
          }
        : undefined;

      const job = await sandboxService.createJob({
        jobId,
        executionId,
        language,
        code,
        stdin,
        timeoutMs,
        memoryLimitMb,
        args,
        files,
        metadata: {
          ...metadata,
          requestId,
          createdAt: startedAt.toISOString(),
        },
        streamHandlers,
      });

      const result = await sandboxService.runJob(job);

      const completedAt = new Date();

      if (enableStreaming) {
        this.emitStreamEvent(executionId, {
          executionId,
          type: "complete",
          data: {
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
            timedOut: result.timedOut,
            memoryUsedMb: result.memoryUsedMb,
            durationMs: result.durationMs,
          },
        });
      }

      res.status(200).json({
        jobId,
        executionId,
        status: result.error ? "failed" : "completed",
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        result: {
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
          timedOut: result.timedOut,
          memoryUsedMb: result.memoryUsedMb,
          durationMs: result.durationMs,
        },
        error: result.error
          ? {
              message: result.error.message,
              code: result.error.code,
              details: result.error.details,
            }
          : undefined,
      });
    } catch (err) {
      logger.error("Failed to create or run sandbox job", {
        requestId,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });

      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";

      res.status(500).json({
        jobId: "",
        executionId: "",
        status: "failed",
        error: {
          message: errorMessage,
          code: "INTERNAL_SERVER_ERROR",
        },
      });
    }
  };

  public getJobStatus = async (
    req: Request<{ executionId: string }>,
    res: Response<SandboxStatusResponse>,
    next: NextFunction
  ): Promise<void> => {
    const { executionId } = req.params;

    if (!executionId || typeof executionId !== "string") {
      res.status(400).json({
        jobId: "",
        executionId: "",
        status: "unknown",
        error: {
          message: "Missing or invalid 'executionId' parameter",
          code: "VALIDATION_ERROR",
        },
      });
      return;
    }

    try {
      const status = await sandboxService.getJobStatus(executionId);

      if (!status) {
        res.status(404).json({
          jobId: "",
          executionId,
          status: "unknown",
          error: {
            message: "Job not found",
            code: "