import OpenAI from "openai";
import { Server as SocketIOServer, Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";

export interface ChatStreamServiceConfig {
  openAIApiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

export interface StreamStartPayload {
  conversationId: string;
  messages: ChatMessage[];
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface StreamChunkEvent {
  streamId: string;
  conversationId: string;
  contentDelta: string;
  fullContent: string;
  isFinal: boolean;
  createdAt: string;
}

export interface StreamErrorEvent {
  streamId: string;
  conversationId: string;
  error: string;
  code?: string;
  createdAt: string;
}

export interface StreamStartedEvent {
  streamId: string;
  conversationId: string;
  createdAt: string;
}

export interface StreamCompletedEvent {
  streamId: string;
  conversationId: string;
  fullContent: string;
  createdAt: string;
}

export interface StreamCancelledEvent {
  streamId: string;
  conversationId: string;
  createdAt: string;
}

type ActiveStream = {
  abortController: AbortController;
  conversationId: string;
  socketId: string;
  fullContent: string;
};

export class ChatStreamService {
  private readonly io: SocketIOServer;
  private readonly openai: OpenAI;
  private readonly config: ChatStreamServiceConfig;
  private readonly activeStreams: Map<string, ActiveStream>;

  constructor(io: SocketIOServer, config: ChatStreamServiceConfig) {
    if (!config.openAIApiKey) {
      throw new Error("OpenAI API key is required for ChatStreamService");
    }

    this.io = io;
    this.config = {
      model: config.model,
      openAIApiKey: config.openAIApiKey,
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens,
    };
    this.openai = new OpenAI({ apiKey: this.config.openAIApiKey });
    this.activeStreams = new Map<string, ActiveStream>();
  }

  public registerSocketHandlers(socket: Socket): void {
    socket.on("chat:stream:start", async (payload: StreamStartPayload) => {
      const { conversationId } = payload;
      const room = this.getConversationRoom(conversationId);
      socket.join(room);
      try {
        await this.startStream(socket, payload);
      } catch (error) {
        const err = this.normalizeError(error);
        const streamId = uuidv4();
        const errorEvent: StreamErrorEvent = {
          streamId,
          conversationId,
          error: err.message,
          code: err.code,
          createdAt: new Date().toISOString(),
        };
        this.io.to(room).emit("chat:stream:error", errorEvent);
      }
    });

    socket.on(
      "chat:stream:cancel",
      (data: { streamId: string; conversationId: string }) => {
        const { streamId, conversationId } = data;
        this.cancelStream(streamId, conversationId);
      }
    );

    socket.on("disconnect", () => {
      this.cleanupStreamsForSocket(socket.id);
    });
  }

  private async startStream(
    socket: Socket,
    payload: StreamStartPayload
  ): Promise<void> {
    const { conversationId, messages } = payload;
    const room = this.getConversationRoom(conversationId);
    const streamId = uuidv4();
    const abortController = new AbortController();

    const activeStream: ActiveStream = {
      abortController,
      conversationId,
      socketId: socket.id,
      fullContent: "",
    };

    this.activeStreams.set(streamId, activeStream);

    const startedEvent: StreamStartedEvent = {
      streamId,
      conversationId,
      createdAt: new Date().toISOString(),
    };
    this.io.to(room).emit("chat:stream:started", startedEvent);

    try {
      const stream = await this.openai.chat.completions.create(
        {
          model: this.config.model,
          messages,
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          stream: true,
        },
        {
          signal: abortController.signal,
        }
      );

      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta?.content ?? "";
        if (!delta) {
          continue;
        }

        const current = this.activeStreams.get(streamId);
        if (!current) {
          break;
        }

        current.fullContent += delta;

        const chunkEvent: StreamChunkEvent = {
          streamId,
          conversationId,
          contentDelta: delta,
          fullContent: current.fullContent,
          isFinal: false,
          createdAt: new Date().toISOString(),
        };

        this.io.to(room).emit("chat:stream:chunk", chunkEvent);
      }

      const finalState = this.activeStreams.get(streamId);
      if (finalState) {
        const completionEvent: StreamCompletedEvent = {
          streamId,
          conversationId,
          fullContent: finalState.fullContent,
          createdAt: new Date().toISOString(),
        };

        const finalChunkEvent: StreamChunkEvent = {
          streamId,
          conversationId,
          contentDelta: "",
          fullContent: finalState.fullContent,
          isFinal: true,
          createdAt: new Date().toISOString(),
        };

        this.io.to(room).emit("chat:stream:chunk", finalChunkEvent);
        this.io.to(room).emit("chat:stream:completed", completionEvent);
      }
    } catch (error) {
      if (abortController.signal.aborted) {
        const cancelledEvent: StreamCancelledEvent = {
          streamId,
          conversationId,
          createdAt: new Date().toISOString(),
        };
        this.io.to(room).emit("chat:stream:cancelled", cancelledEvent);
      } else {
        const err = this.normalizeError(error);
        const errorEvent: StreamErrorEvent = {
          streamId,
          conversationId,
          error: err.message,
          code: err.code,
          createdAt: new Date().toISOString(),
        };
        this.io.to(room).emit("chat:stream:error", errorEvent);
      }
    } finally {
      this.activeStreams.delete(streamId);
    }
  }

  private cancelStream(streamId: string, conversationId: string): void {
    const active = this.activeStreams.get(streamId);
    if (!active) {
      return;
    }

    active.abortController.abort();
    this.activeStreams.delete(streamId);

    const room = this.getConversationRoom(conversationId);
    const cancelledEvent: StreamCancelledEvent = {
      streamId,
      conversationId,
      createdAt: new Date().toISOString(),
    };
    this.io.to(room).emit("chat:stream:cancelled", cancelledEvent);
  }

  private cleanupStreamsForSocket(socketId: string): void {
    const toCancel: { streamId: string; conversationId: string }[] = [];
    for (const [streamId, active] of this.activeStreams.entries()) {
      if (active.socketId === socketId) {
        toCancel.push({ streamId, conversationId: active.conversationId });
      }
    }

    for (const { streamId, conversationId } of toCancel) {
      this.cancelStream(streamId, conversationId);
    }
  }

  private getConversationRoom(conversationId: string): string {
    return `conversation:undefined`;
  }

  private normalizeError(
    error: unknown
  ): { message: string; code?: string } {
    if (error instanceof Error) {
      const anyErr = error as any;
      return {
        message: anyErr.message || "Unknown error",
        code: anyErr.code || anyErr.status || undefined,
      };
    }

    if (typeof error === "string") {
      return { message: error };
    }

    return { message: "Unknown error" };
  }
}