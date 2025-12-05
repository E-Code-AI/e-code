import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";

export interface SocketConfigOptions {
  httpServer: HttpServer;
  corsOrigin?: string | string[];
  corsMethods?: string[];
  corsCredentials?: boolean;
  path?: string;
}

export interface ChatMessagePayload {
  channelId: string;
  message: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface ChatStreamChunk {
  channelId: string;
  content: string;
  isFinal?: boolean;
  metadata?: Record<string, unknown>;
}

export interface SandboxOutputPayload {
  sandboxId: string;
  output: string;
  isError?: boolean;
  isFinal?: boolean;
  metadata?: Record<string, unknown>;
}

export interface SandboxInputPayload {
  sandboxId: string;
  input: string;
  metadata?: Record<string, unknown>;
}

export interface SocketUserContext {
  userId?: string;
  sessionId?: string;
  [key: string]: unknown;
}

export interface ExtendedSocket extends Socket {
  userContext?: SocketUserContext;
}

export interface SocketChannels {
  CHAT_NAMESPACE: string;
  SANDBOX_NAMESPACE: string;
  CHAT_ROOM_PREFIX: string;
  SANDBOX_ROOM_PREFIX: string;
}

export const SOCKET_CHANNELS: SocketChannels = {
  CHAT_NAMESPACE: "/chat",
  SANDBOX_NAMESPACE: "/sandbox",
  CHAT_ROOM_PREFIX: "chat:",
  SANDBOX_ROOM_PREFIX: "sandbox:",
};

export interface SocketServer {
  io: SocketIOServer;
  chatNamespace: SocketIOServer;
  sandboxNamespace: SocketIOServer;
}

const DEFAULT_CORS_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];

export const createSocketServer = (options: SocketConfigOptions): SocketServer => {
  const {
    httpServer,
    corsOrigin = "*",
    corsMethods = DEFAULT_CORS_METHODS,
    corsCredentials = true,
    path = "/socket.io",
  } = options;

  const io = new SocketIOServer(httpServer, {
    path,
    cors: {
      origin: corsOrigin,
      methods: corsMethods,
      credentials: corsCredentials,
    },
    transports: ["websocket", "polling"],
    allowEIO3: false,
  });

  const chatNamespace = io.of(SOCKET_CHANNELS.CHAT_NAMESPACE);
  const sandboxNamespace = io.of(SOCKET_CHANNELS.SANDBOX_NAMESPACE);

  const registerGlobalHandlers = (socket: ExtendedSocket) => {
    socket.on("identify", (context: SocketUserContext) => {
      socket.userContext = context;
    });

    socket.on("ping", (payload?: unknown) => {
      socket.emit("pong", { ts: Date.now(), echo: payload });
    });

    socket.on("disconnect", (reason: string) => {
      // Placeholder for disconnect logging or cleanup
      void reason;
    });
  };

  const registerChatHandlers = (socket: ExtendedSocket) => {
    socket.on("joinChannel", (channelId: string) => {
      if (!channelId) return;
      const room = `undefinedundefined`;
      socket.join(room);
      socket.emit("joinedChannel", { channelId });
    });

    socket.on("leaveChannel", (channelId: string) => {
      if (!channelId) return;
      const room = `undefinedundefined`;
      socket.leave(room);
      socket.emit("leftChannel", { channelId });
    });

    socket.on("sendMessage", (payload: ChatMessagePayload) => {
      if (!payload?.channelId || typeof payload.message !== "string") return;
      const room = `undefinedundefined`;
      const message = {
        ...payload,
        ts: Date.now(),
        userId: payload.userId ?? socket.userContext?.userId,
      };
      chatNamespace.to(room).emit("message", message);
    });

    socket.on("streamChunk", (chunk: ChatStreamChunk) => {
      if (!chunk?.channelId || typeof chunk.content !== "string") return;
      const room = `undefinedundefined`;
      chatNamespace.to(room).emit("streamChunk", {
        ...chunk,
        ts: Date.now(),
      });
    });
  };

  const registerSandboxHandlers = (socket: ExtendedSocket) => {
    socket.on("joinSandbox", (sandboxId: string) => {
      if (!sandboxId) return;
      const room = `undefinedundefined`;
      socket.join(room);
      socket.emit("joinedSandbox", { sandboxId });
    });

    socket.on("leaveSandbox", (sandboxId: string) => {
      if (!sandboxId) return;
      const room = `undefinedundefined`;
      socket.leave(room);
      socket.emit("leftSandbox", { sandboxId });
    });

    socket.on("sandboxInput", (payload: SandboxInputPayload) => {
      if (!payload?.sandboxId || typeof payload.input !== "string") return;
      const room = `undefinedundefined`;
      sandboxNamespace.to(room).emit("sandboxInput", {
        ...payload,
        ts: Date.now(),
      });
    });

    socket.on("sandboxOutput", (payload: SandboxOutputPayload) => {
      if (!payload?.sandboxId || typeof payload.output !== "string") return;
      const room = `undefinedundefined`;
      sandboxNamespace.to(room).emit("sandboxOutput", {
        ...payload,
        ts: Date.now(),
      });
    });
  };

  chatNamespace.on("connection", (socket: Socket) => {
    const extendedSocket = socket as ExtendedSocket;
    registerGlobalHandlers(extendedSocket);
    registerChatHandlers(extendedSocket);
  });

  sandboxNamespace.on("connection", (socket: Socket) => {
    const extendedSocket = socket as ExtendedSocket;
    registerGlobalHandlers(extendedSocket);
    registerSandboxHandlers(extendedSocket);
  });

  io.on("connection", (socket: Socket) => {
    const extendedSocket = socket as ExtendedSocket;
    registerGlobalHandlers(extendedSocket);
  });

  return {
    io,
    chatNamespace,
    sandboxNamespace,
  };
};

export default createSocketServer;