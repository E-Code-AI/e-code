import { Server, Socket } from "socket.io";
import { getUserFromSocket } from "../auth/socketAuth";
import { logger } from "../utils/logger";
import { getUserRoomId } from "../utils/socketRooms";

export type TypingContextType = "channel" | "dm";

export interface TypingStartPayload {
  context: TypingContextType;
  channelId?: string;
  dmUserId?: string;
}

export interface TypingStopPayload {
  context: TypingContextType;
  channelId?: string;
  dmUserId?: string;
}

interface RegisterTypingHandlersOptions {
  io: Server;
}

const getChannelRoomId = (channelId: string): string => `channel:undefined`;
const getDmRoomId = (userAId: string, userBId: string): string => {
  const [first, second] = [userAId, userBId].sort();
  return `dm:undefined:undefined`;
};

const validateTypingPayload = (
  payload: TypingStartPayload | TypingStopPayload
): { valid: boolean; error?: string } => {
  if (!payload || typeof payload !== "object") {
    return { valid: false, error: "Invalid payload" };
  }

  if (payload.context !== "channel" && payload.context !== "dm") {
    return { valid: false, error: "Invalid context" };
  }

  if (payload.context === "channel") {
    if (!payload.channelId || typeof payload.channelId !== "string") {
      return { valid: false, error: "Missing or invalid channelId" };
    }
  }

  if (payload.context === "dm") {
    if (!payload.dmUserId || typeof payload.dmUserId !== "string") {
      return { valid: false, error: "Missing or invalid dmUserId" };
    }
  }

  return { valid: true };
};

export const registerTypingHandlers = (
  socket: Socket,
  { io }: RegisterTypingHandlersOptions
): void => {
  socket.on("typingStart", async (payload: TypingStartPayload) => {
    try {
      const user = await getUserFromSocket(socket);
      if (!user) {
        logger.warn("typingStart: unauthenticated socket", {
          socketId: socket.id,
        });
        return;
      }

      const { valid, error } = validateTypingPayload(payload);
      if (!valid) {
        logger.warn("typingStart: invalid payload", {
          error,
          payload,
          userId: user.id,
        });
        return;
      }

      if (payload.context === "channel" && payload.channelId) {
        const roomId = getChannelRoomId(payload.channelId);
        socket.to(roomId).emit("typingStart", {
          context: "channel",
          channelId: payload.channelId,
          userId: user.id,
        });
        return;
      }

      if (payload.context === "dm" && payload.dmUserId) {
        const roomId = getDmRoomId(user.id, payload.dmUserId);
        socket.to(roomId).emit("typingStart", {
          context: "dm",
          dmUserId: user.id,
        });
      }
    } catch (err) {
      logger.error("typingStart handler error", {
        error: err,
        socketId: socket.id,
      });
    }
  });

  socket.on("typingStop", async (payload: TypingStopPayload) => {
    try {
      const user = await getUserFromSocket(socket);
      if (!user) {
        logger.warn("typingStop: unauthenticated socket", {
          socketId: socket.id,
        });
        return;
      }

      const { valid, error } = validateTypingPayload(payload);
      if (!valid) {
        logger.warn("typingStop: invalid payload", {
          error,
          payload,
          userId: user.id,
        });
        return;
      }

      if (payload.context === "channel" && payload.channelId) {
        const roomId = getChannelRoomId(payload.channelId);
        socket.to(roomId).emit("typingStop", {
          context: "channel",
          channelId: payload.channelId,
          userId: user.id,
        });
        return;
      }

      if (payload.context === "dm" && payload.dmUserId) {
        const roomId = getDmRoomId(user.id, payload.dmUserId);
        socket.to(roomId).emit("typingStop", {
          context: "dm",
          dmUserId: user.id,
        });
      }
    } catch (err) {
      logger.error("typingStop handler error", {
        error: err,
        socketId: socket.id,
      });
    }
  });

  socket.on("disconnect", async () => {
    try {
      const user = await getUserFromSocket(socket);
      if (!user) return;

      const userRoomId = getUserRoomId(user.id);
      const rooms = Array.from(socket.rooms).filter(
        (roomId) => roomId !== socket.id && roomId !== userRoomId
      );

      rooms.forEach((roomId) => {
        if (roomId.startsWith("channel:")) {
          const channelId = roomId.split(":")[1];
          io.to(roomId).emit("typingStop", {
            context: "channel",
            channelId,
            userId: user.id,
          });
        } else if (roomId.startsWith("dm:")) {
          const parts = roomId.split(":");
          const otherUserId =
            parts[1] === user.id ? parts[2] : parts[1] === parts[2] ? parts[1] : parts[2];
          io.to(roomId).emit("typingStop", {
            context: "dm",
            dmUserId: user.id,
            otherUserId,
          });
        }
      });
    } catch (err) {
      logger.error("disconnect typing cleanup error", {
        error: err,
        socketId: socket.id,
      });
    }
  });
};