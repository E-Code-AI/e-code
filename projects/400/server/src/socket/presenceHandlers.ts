import type { Server, Socket } from "socket.io";

export type PresenceStatus = "online" | "offline" | "away" | "busy";

export interface PresenceUpdatePayload {
  userId: string;
  status: PresenceStatus;
  lastActiveAt?: string;
}

export interface PresenceHandlersConfig {
  io: Server;
  getUserIdFromSocket: (socket: Socket) => string | null;
  logger?: {
    info: (msg: string, meta?: Record<string, unknown>) => void;
    warn: (msg: string, meta?: Record<string, unknown>) => void;
    error: (msg: string, meta?: Record<string, unknown>) => void;
  };
}

type PresenceMap = Map<
  string,
  {
    status: PresenceStatus;
    lastActiveAt: string;
    socketIds: Set<string>;
  }
>;

const DEFAULT_STATUS: PresenceStatus = "offline";

export class PresenceService {
  private readonly io: Server;
  private readonly getUserIdFromSocket: (socket: Socket) => string | null;
  private readonly logger: PresenceHandlersConfig["logger"];
  private readonly presence: PresenceMap;

  constructor(config: PresenceHandlersConfig) {
    this.io = config.io;
    this.getUserIdFromSocket = config.getUserIdFromSocket;
    this.logger = config.logger;
    this.presence = new Map();
  }

  public attachSocketHandlers(socket: Socket): void {
    const userId = this.getUserIdFromSocket(socket);

    if (!userId) {
      this.logger?.warn("Socket connected without userId for presence", {
        socketId: socket.id,
      });
      return;
    }

    this.handleUserOnline(userId, socket.id);

    socket.on("updatePresence", (payload: Partial<PresenceUpdatePayload>) => {
      this.handleUpdatePresence(socket, payload);
    });

    socket.on("disconnect", () => {
      this.handleDisconnect(userId, socket.id);
    });
  }

  private handleUserOnline(userId: string, socketId: string): void {
    const now = new Date().toISOString();
    const existing = this.presence.get(userId);

    if (existing) {
      existing.socketIds.add(socketId);
      if (existing.status === "offline") {
        existing.status = "online";
        existing.lastActiveAt = now;
        this.broadcastPresenceChange(userId, existing.status, existing.lastActiveAt);
      }
    } else {
      const status: PresenceStatus = "online";
      this.presence.set(userId, {
        status,
        lastActiveAt: now,
        socketIds: new Set([socketId]),
      });
      this.broadcastPresenceChange(userId, status, now);
    }

    this.logger?.info("User marked online", { userId, socketId });
  }

  private handleDisconnect(userId: string, socketId: string): void {
    const record = this.presence.get(userId);
    if (!record) {
      return;
    }

    record.socketIds.delete(socketId);

    if (record.socketIds.size === 0) {
      const now = new Date().toISOString();
      record.status = "offline";
      record.lastActiveAt = now;
      this.broadcastPresenceChange(userId, record.status, record.lastActiveAt);
      this.logger?.info("User marked offline (no active sockets)", {
        userId,
        socketId,
      });
    } else {
      this.logger?.info("Socket disconnected but user still has active connections", {
        userId,
        socketId,
        remainingSockets: record.socketIds.size,
      });
    }
  }

  private handleUpdatePresence(
    socket: Socket,
    payload: Partial<PresenceUpdatePayload>
  ): void {
    const userId = this.getUserIdFromSocket(socket);
    if (!userId) {
      this.logger?.warn("updatePresence received from unauthenticated socket", {
        socketId: socket.id,
      });
      return;
    }

    const record = this.presence.get(userId);
    if (!record) {
      this.logger?.warn("updatePresence for user without presence record", {
        userId,
        socketId: socket.id,
      });
      return;
    }

    const newStatus: PresenceStatus | undefined = payload.status;
    if (!newStatus) {
      return;
    }

    if (!this.isValidStatus(newStatus)) {
      this.logger?.warn("Invalid presence status received", {
        userId,
        status: newStatus,
      });
      return;
    }

    if (record.status === newStatus) {
      return;
    }

    const now = new Date().toISOString();
    record.status = newStatus;
    record.lastActiveAt = now;

    this.broadcastPresenceChange(userId, record.status, record.lastActiveAt);

    this.logger?.info("User presence updated", {
      userId,
      status: record.status,
    });
  }

  private isValidStatus(status: string): status is PresenceStatus {
    return status === "online" || status === "offline" || status === "away" || status === "busy";
  }

  private broadcastPresenceChange(
    userId: string,
    status: PresenceStatus,
    lastActiveAt: string
  ): void {
    const payload: PresenceUpdatePayload = {
      userId,
      status,
      lastActiveAt,
    };

    this.io.emit("presenceUpdate", payload);

    if (status === "online") {
      this.io.emit("userOnline", payload);
    } else if (status === "offline") {
      this.io.emit("userOffline", payload);
    }
  }

  public getUserPresence(userId: string): PresenceUpdatePayload {
    const record = this.presence.get(userId);
    if (!record) {
      return {
        userId,
        status: DEFAULT_STATUS,
        lastActiveAt: new Date(0).toISOString(),
      };
    }

    return {
      userId,
      status: record.status,
      lastActiveAt: record.lastActiveAt,
    };
  }

  public getAllPresence(): PresenceUpdatePayload[] {
    const result: PresenceUpdatePayload[] = [];
    for (const [userId, record] of this.presence.entries()) {
      result.push({
        userId,
        status: record.status,
        lastActiveAt: record.lastActiveAt,
      });
    }
    return result;
  }
}

export const registerPresenceHandlers = (config: PresenceHandlersConfig) => {
  const presenceService = new PresenceService(config);

  config.io.on("connection", (socket: Socket) => {
    presenceService.attachSocketHandlers(socket);
  });

  return presenceService;
};