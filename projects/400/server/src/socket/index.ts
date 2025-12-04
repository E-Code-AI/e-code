import { Server as HttpServer } from "http";
import { Server as IOServer, Socket } from "socket.io";
import jwt, { JwtPayload } from "jsonwebtoken";
import { instrument } from "@socket.io/admin-ui";
import { registerChatHandlers } from "../socketHandlers/chatHandlers";
import { registerPresenceHandlers } from "../socketHandlers/presenceHandlers";
import { registerNotificationHandlers } from "../socketHandlers/notificationHandlers";

export interface SocketUserPayload extends JwtPayload {
  id: string;
  email?: string;
  username?: string;
  roles?: string[];
}

export interface AuthedSocket extends Socket {
  user?: SocketUserPayload;
}

export interface SocketServerOptions {
  corsOrigin?: string | string[];
  jwtSecret: string;
  adminUi?: {
    enabled: boolean;
    username?: string;
    password?: string;
  };
}

export interface SocketContext {
  io: IOServer;
  socket: AuthedSocket;
}

export interface SocketServer {
  io: IOServer;
  start: () => void;
  stop: () => Promise<void>;
}

const DEFAULT_CORS_ORIGIN = "*";

function createAuthMiddleware(jwtSecret: string) {
  return (socket: AuthedSocket, next: (err?: Error) => void): void => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (typeof socket.handshake.query?.token === "string"
          ? socket.handshake.query.token
          : undefined) ||
        extractTokenFromHeader(socket.handshake.headers.authorization);

      if (!token) {
        return next(new Error("Authentication token missing"));
      }

      const decoded = jwt.verify(token, jwtSecret) as SocketUserPayload;
      if (!decoded || !decoded.id) {
        return next(new Error("Invalid authentication token"));
      }

      socket.user = decoded;
      next();
    } catch (error) {
      next(new Error("Authentication failed"));
    }
  };
}

function extractTokenFromHeader(
  authHeader?: string | string[]
): string | undefined {
  if (!authHeader) return undefined;
  const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const parts = headerValue.split(" ");
  if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
    return parts[1];
  }
  return undefined;
}

function registerCoreEventHandlers(io: IOServer, socket: AuthedSocket): void {
  socket.on("ping", (payload: unknown, callback?: (response: unknown) => void) => {
    if (callback) {
      callback({ status: "ok", timestamp: Date.now(), payload });
    }
  });

  socket.on("disconnect", (reason: string) => {
    io.to("system:connections").emit("user:disconnected", {
      userId: socket.user?.id,
      reason,
      socketId: socket.id,
      timestamp: Date.now(),
    });
  });

  socket.on("error", (err: Error) => {
    io.to("system:errors").emit("socket:error", {
      userId: socket.user?.id,
      message: err.message,
      stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
      timestamp: Date.now(),
    });
  });
}

function registerAllHandlers(io: IOServer, socket: AuthedSocket): void {
  const context: SocketContext = { io, socket };

  registerCoreEventHandlers(io, socket);
  registerChatHandlers(context);
  registerPresenceHandlers(context);
  registerNotificationHandlers(context);
}

export function createSocketServer(
  httpServer: HttpServer,
  options: SocketServerOptions
): SocketServer {
  const io = new IOServer(httpServer, {
    cors: {
      origin: options.corsOrigin ?? DEFAULT_CORS_ORIGIN,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    serveClient: false,
  });

  io.use(createAuthMiddleware(options.jwtSecret));

  io.on("connection", (socket: AuthedSocket) => {
    if (!socket.user) {
      socket.disconnect(true);
      return;
    }

    socket.join(`user:undefined`);
    io.to("system:connections").emit("user:connected", {
      userId: socket.user.id,
      socketId: socket.id,
      timestamp: Date.now(),
    });

    registerAllHandlers(io, socket);
  });

  if (options.adminUi?.enabled) {
    instrument(io, {
      auth: {
        type: "basic",
        username: options.adminUi.username || "admin",
        password: options.adminUi.password || "change-me",
      },
      mode: "development",
    });
  }

  const start = (): void => {
    // Socket.IO starts listening as soon as the HTTP server is listening.
    // This function is provided for API symmetry and future extensibility.
  };

  const stop = async (): Promise<void> => {
    await new Promise<void>((resolve, reject) => {
      io.close((err?: Error) => {
        if (err) reject(err);
        else resolve();
      });
    });
  };

  return { io, start, stop };
}

export default createSocketServer;