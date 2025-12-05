import { Server, Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { ChatStreamService, ChatStreamOptions, ChatStreamChunk } from "../services/chatStreamService";
import { ConversationMemoryService } from "../services/conversationMemoryService";
import { logger } from "../utils/logger";

export interface ChatSocketHandlersConfig {
  io: Server;
  chatStreamService: ChatStreamService;
  conversationMemoryService: ConversationMemoryService;
}

export interface StartStreamPayload {
  conversationId: string;
  userId: string;
  message: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  metadata?: Record<string, unknown>;
}

export interface CancelStreamPayload {
  streamId: string;
}

export interface ChatCompletionPayload {
  conversationId: string;
  userId: string;
  message: string;
  response: string;
  streamId?: string;
  metadata?: Record<string, unknown>;
}

export interface ChatErrorPayload {
  streamId?: string;
  error: string;
  code?: string;
}

export interface ChatStreamStartedPayload {
  streamId: string;
  conversationId: string;
  userId: string;
  metadata?: Record<string, unknown>;
}

export interface ChatStreamChunkPayload {
  streamId: string;
  chunk: ChatStreamChunk;
}

export interface ChatStreamCompletedPayload {
  streamId: string;
  conversationId: string;
  userId: string;
  response: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: Record<string, unknown>;
}

export interface ChatStreamCanceledPayload {
  streamId: string;
  conversationId?: string;
  userId?: string;
  reason?: string;
}

type ActiveStream = {
  streamId: string;
  conversationId: string;
  userId: string;
  cancel: () => Promise<void> | void;
};

const EVENT_START_STREAM = "chat:startStream";
const EVENT_CANCEL_STREAM = "chat:cancelStream";
const EVENT_STREAM_STARTED = "chat:streamStarted";
const EVENT_STREAM_CHUNK = "chat:streamChunk";
const EVENT_STREAM_COMPLETED = "chat:streamCompleted";
const EVENT_STREAM_CANCELED = "chat:streamCanceled";
const EVENT_COMPLETION = "chat:completion";
const EVENT_ERROR = "chat:error";

export function registerChatSocketHandlers(config: ChatSocketHandlersConfig) {
  const { io, chatStreamService, conversationMemoryService } = config;

  const socketStreams = new Map<string, Map<string, ActiveStream>>();

  const getSocketStreams = (socketId: string): Map<string, ActiveStream> => {
    let streams = socketStreams.get(socketId);
    if (!streams) {
      streams = new Map<string, ActiveStream>();
      socketStreams.set(socketId, streams);
    }
    return streams;
  };

  const removeSocketStream = (socketId: string, streamId: string) => {
    const streams = socketStreams.get(socketId);
    if (!streams) return;
    streams.delete(streamId);
    if (streams.size === 0) {
      socketStreams.delete(socketId);
    }
  };

  const cancelAllStreamsForSocket = async (socketId: string) => {
    const streams = socketStreams.get(socketId);
    if (!streams) return;
    const cancelPromises: Array<Promise<void> | void> = [];
    for (const stream of streams.values()) {
      try {
        cancelPromises.push(stream.cancel());
      } catch (err) {
        logger.warn("Error canceling stream on socket disconnect", {
          socketId,
          streamId: stream.streamId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    socketStreams.delete(socketId);
    await Promise.allSettled(cancelPromises);
  };

  const handleStartStream = (socket: Socket) => async (payload: StartStreamPayload) => {
    const streamId = uuidv4();
    const { conversationId, userId, message, model, temperature, maxTokens, metadata } = payload;

    if (!conversationId || !userId || !message) {
      const errorPayload: ChatErrorPayload = {
        streamId,
        error: "Missing required fields: conversationId, userId, and message are required.",
        code: "BAD_REQUEST",
      };
      socket.emit(EVENT_ERROR, errorPayload);
      return;
    }

    logger.info("Starting chat stream", {
      socketId: socket.id,
      streamId,
      conversationId,
      userId,
      model,
    });

    const streams = getSocketStreams(socket.id);

    try {
      const history = await conversationMemoryService.getConversationHistory(conversationId, userId);

      const options: ChatStreamOptions = {
        model,
        temperature,
        maxTokens,
        metadata,
      };

      const streamController = await chatStreamService.startStream({
        streamId,
        userId,
        conversationId,
        message,
        history,
        options,
        onStart: () => {
          const startedPayload: ChatStreamStartedPayload = {
            streamId,
            conversationId,
            userId,
            metadata,
          };
          socket.emit(EVENT_STREAM_STARTED, startedPayload);
        },
        onChunk: (chunk: ChatStreamChunk) => {
          const chunkPayload: ChatStreamChunkPayload = {
            streamId,
            chunk,
          };
          socket.emit(EVENT_STREAM_CHUNK, chunkPayload);
        },
        onComplete: async (result) => {
          try {
            await conversationMemoryService.appendMessage(conversationId, {
              role: "user",
              userId,
              content: message,
              metadata,
            });

            await conversationMemoryService.appendMessage(conversationId, {
              role: "assistant",
              userId,
              content: result.response,
              usage: result.usage,
              metadata,
            });
          } catch (err) {
            logger.error("Failed to persist conversation messages on completion", {
              socketId: socket.id,
              streamId,
              conversationId,
              userId,
              error: err instanceof Error ? err.message : String(err),
            });
          }

          const completedPayload: ChatStreamCompletedPayload = {
            streamId,
            conversationId,
            userId,
            response: result.response,
            usage: result.usage,
            metadata,
          };
          socket.emit(EVENT_STREAM_COMPLETED, completedPayload);

          const completionPayload: ChatCompletionPayload = {
            conversationId,
            userId,
            message,
            response: result.response,
            streamId,
            metadata,
          };
          socket.emit(EVENT_COMPLETION, completionPayload);

          removeSocketStream(socket.id, streamId);
        },
        onError: (error) => {
          logger.error("Error during chat stream", {
            socketId: socket.id,
            streamId,
            conversationId,
            userId,
            error: error instanceof Error ? error.message : String(error),
          });

          const errorPayload: ChatErrorPayload = {
            streamId,
            error: error instanceof Error ? error.message : "Unknown error during chat stream.",
            code: "STREAM_ERROR",
          };
          socket.emit(EVENT_ERROR, errorPayload);

          removeSocketStream(socket.id, streamId);
        },
        onCancel: () => {
          const canceledPayload: ChatStreamCanceledPayload = {
            streamId,
            conversationId,
            userId,
            reason: "canceled_by_client",
          };
          socket.emit(EVENT_STREAM_CANCELED, canceledPayload);
          removeSocketStream(socket.id, streamId);
        },
      });

      const activeStream: ActiveStream = {
        streamId,
        conversationId,
        userId,
        cancel: () => streamController.cancel(),
      };

      streams.set(streamId, activeStream);
    } catch (err) {
      logger.error("Failed to start chat stream", {
        socketId: socket.id,
        streamId,
        conversationId,
        userId,
        error: err instanceof Error ? err.message : String(err),
      });

      const errorPayload: ChatErrorPayload = {
        streamId,
        error: err instanceof Error ? err.message : "Failed to start chat stream.",
        code: "START_STREAM_ERROR",
      };
      socket.emit(EVENT_ERROR, errorPayload);
    }
  };

  const handleCancelStream = (socket: Socket) => async (payload: CancelStreamPayload) => {
    const { streamId } = payload;
    if (!streamId) {
      const errorPayload: ChatErrorPayload = {
        error: "Missing required field: streamId.",
        code: "BAD_REQUEST",
      };
      socket.emit(EVENT_ERROR, errorPayload);
      return;
    }

    const streams = socketStreams.get(socket.id);
    const activeStream = streams?.get(streamId);

    if (!activeStream) {
      const canceledPayload: ChatStreamCanceledPayload = {
        streamId,
        reason: "not_found_or_already_completed",
      };
      socket.emit(EVENT_STREAM_CANCELED, canceledPayload);
      return;
    }

    logger.info("Canceling chat stream", {
      socketId: socket.id,
      streamId,
      conversationId: activeStream.conversationId,
      userId: activeStream.userId,
    });

    try {
      await activeStream.cancel();
    } catch (err) {
      logger.warn("Error while canceling chat stream", {
        socketId: socket.id,
        streamId,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      removeSocketStream(socket.id, streamId);
    }