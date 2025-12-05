import { Server, Socket } from "socket.io";
import { Logger } from "../utils/logger";
import { SandboxExecutionService } from "../services/sandboxExecutionService";
import { AuthenticatedSocket } from "../types/socketTypes";

export interface SandboxSocketHandlersDeps {
  io: Server;
  logger: Logger;
  sandboxExecutionService: SandboxExecutionService;
}

export interface SandboxExecutionStartPayload {
  sandboxId: string;
  code: string;
  language: string;
  input?: string;
  timeoutMs?: number;
}

export interface SandboxExecutionAttachPayload {
  sandboxId: string;
  executionId: string;
}

export interface SandboxSubscribePayload {
  sandboxId: string;
}

export interface SandboxUnsubscribePayload {
  sandboxId: string;
}

export interface SandboxExecutionStopPayload {
  sandboxId: string;
  executionId: string;
}

export interface SandboxExecutionEvent {
  type: "stdout" | "stderr" | "exit" | "error" | "status";
  data: unknown;
  timestamp: number;
}

const SANDBOX_ROOM_PREFIX = "sandbox:";
const EXECUTION_ROOM_PREFIX = "sandbox:exec:";

const getSandboxRoom = (sandboxId: string): string =>
  `undefinedundefined`;

const getExecutionRoom = (sandboxId: string, executionId: string): string =>
  `undefinedundefined:undefined`;

export function registerSandboxSocketHandlers(
  socket: AuthenticatedSocket,
  deps: SandboxSocketHandlersDeps
): void {
  const { io, logger, sandboxExecutionService } = deps;

  const logPrefix = `[sandbox-socket][user:undefined][socket:undefined]`;

  const safeEmitToRoom = (room: string, event: string, payload: unknown): void => {
    try {
      io.to(room).emit(event, payload);
    } catch (err) {
      logger.error(`undefined Failed to emit event`, {
        room,
        event,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const handleSandboxSubscribe = async (payload: SandboxSubscribePayload): Promise<void> => {
    if (!payload?.sandboxId) {
      socket.emit("sandbox:error", {
        message: "sandboxId is required to subscribe",
      });
      return;
    }

    const room = getSandboxRoom(payload.sandboxId);

    try {
      await socket.join(room);
      logger.debug(`undefined Joined sandbox room`, { room, sandboxId: payload.sandboxId });

      socket.emit("sandbox:subscribed", {
        sandboxId: payload.sandboxId,
      });
    } catch (err) {
      logger.error(`undefined Failed to join sandbox room`, {
        sandboxId: payload.sandboxId,
        error: err instanceof Error ? err.message : String(err),
      });
      socket.emit("sandbox:error", {
        sandboxId: payload.sandboxId,
        message: "Failed to subscribe to sandbox",
      });
    }
  };

  const handleSandboxUnsubscribe = async (payload: SandboxUnsubscribePayload): Promise<void> => {
    if (!payload?.sandboxId) {
      socket.emit("sandbox:error", {
        message: "sandboxId is required to unsubscribe",
      });
      return;
    }

    const room = getSandboxRoom(payload.sandboxId);

    try {
      await socket.leave(room);
      logger.debug(`undefined Left sandbox room`, { room, sandboxId: payload.sandboxId });

      socket.emit("sandbox:unsubscribed", {
        sandboxId: payload.sandboxId,
      });
    } catch (err) {
      logger.error(`undefined Failed to leave sandbox room`, {
        sandboxId: payload.sandboxId,
        error: err instanceof Error ? err.message : String(err),
      });
      socket.emit("sandbox:error", {
        sandboxId: payload.sandboxId,
        message: "Failed to unsubscribe from sandbox",
      });
    }
  };

  const handleExecutionStart = async (payload: SandboxExecutionStartPayload): Promise<void> => {
    if (!payload?.sandboxId || !payload?.code || !payload?.language) {
      socket.emit("sandbox:execution:error", {
        sandboxId: payload?.sandboxId,
        message: "sandboxId, code, and language are required to start execution",
      });
      return;
    }

    const { sandboxId, code, language, input, timeoutMs } = payload;

    try {
      const execution = await sandboxExecutionService.startExecution({
        sandboxId,
        userId: socket.user?.id ?? null,
        code,
        language,
        input,
        timeoutMs,
        onStdout: (chunk: string) => {
          const event: SandboxExecutionEvent = {
            type: "stdout",
            data: chunk,
            timestamp: Date.now(),
          };
          safeEmitToRoom(getExecutionRoom(sandboxId, execution.id), "sandbox:execution:output", event);
          safeEmitToRoom(getSandboxRoom(sandboxId), "sandbox:execution:output", {
            executionId: execution.id,
            ...event,
          });
        },
        onStderr: (chunk: string) => {
          const event: SandboxExecutionEvent = {
            type: "stderr",
            data: chunk,
            timestamp: Date.now(),
          };
          safeEmitToRoom(getExecutionRoom(sandboxId, execution.id), "sandbox:execution:output", event);
          safeEmitToRoom(getSandboxRoom(sandboxId), "sandbox:execution:output", {
            executionId: execution.id,
            ...event,
          });
        },
        onExit: (code: number | null, signal: string | null) => {
          const event: SandboxExecutionEvent = {
            type: "exit",
            data: { code, signal },
            timestamp: Date.now(),
          };
          safeEmitToRoom(getExecutionRoom(sandboxId, execution.id), "sandbox:execution:complete", event);
          safeEmitToRoom(getSandboxRoom(sandboxId), "sandbox:execution:complete", {
            executionId: execution.id,
            ...event,
          });
        },
        onError: (error: Error) => {
          const event: SandboxExecutionEvent = {
            type: "error",
            data: { message: error.message },
            timestamp: Date.now(),
          };
          safeEmitToRoom(getExecutionRoom(sandboxId, execution.id), "sandbox:execution:error", event);
          safeEmitToRoom(getSandboxRoom(sandboxId), "sandbox:execution:error", {
            executionId: execution.id,
            ...event,
          });
        },
        onStatusChange: (status: string) => {
          const event: SandboxExecutionEvent = {
            type: "status",
            data: { status },
            timestamp: Date.now(),
          };
          safeEmitToRoom(getExecutionRoom(sandboxId, execution.id), "sandbox:execution:status", event);
          safeEmitToRoom(getSandboxRoom(sandboxId), "sandbox:execution:status", {
            executionId: execution.id,
            ...event,
          });
        },
      });

      const execRoom = getExecutionRoom(sandboxId, execution.id);
      await socket.join(execRoom);

      logger.info(`undefined Started sandbox execution`, {
        sandboxId,
        executionId: execution.id,
        language,
      });

      socket.emit("sandbox:execution:started", {
        sandboxId,
        executionId: execution.id,
        status: execution.status,
        startedAt: execution.startedAt,
      });
    } catch (err) {
      logger.error(`undefined Failed to start sandbox execution`, {
        sandboxId,
        error: err instanceof Error ? err.message : String(err),
      });
      socket.emit("sandbox:execution:error", {
        sandboxId,
        message: "Failed to start execution",
      });
    }
  };

  const handleExecutionAttach = async (payload: SandboxExecutionAttachPayload): Promise<void> => {
    if (!payload?.sandboxId || !payload?.executionId) {
      socket.emit("sandbox:execution:error", {
        message: "sandboxId and executionId are required to attach",
      });
      return;
    }

    const { sandboxId, executionId } = payload;
    const execRoom = getExecutionRoom(sandboxId, executionId);

    try {
      const execution = await sandboxExecutionService.getExecution(sandboxId, executionId);
      if (!execution) {
        socket.emit("sandbox:execution:error", {
          sandboxId,
          executionId,
          message: "Execution not found",
        });
        return;
      }

      await socket.join(execRoom);

      logger.debug(`undefined Attached to execution`, {
        sandboxId,
        executionId,
        room: execRoom,
      });

      socket.emit("sandbox:execution:attached", {
        sandboxId,
        executionId,
        status: execution.status,
        startedAt: execution.startedAt,
        finishedAt: execution.finishedAt ?? null,
      });
    } catch (err) {
      logger.error(`undefined Failed to attach to execution`, {
        sandboxId,
        executionId,
        error: err instanceof Error ? err.message : String(err),
      });
      socket.emit("sandbox:execution:error", {
        sandboxId,
        executionId,
        message: "Failed to attach to execution",
      });
    }
  };

  const handleExecutionStop = async (payload: SandboxExecutionStopPayload): Promise<void> => {
    if (!payload?.sandboxId || !payload?.executionId) {
      socket.emit("sandbox