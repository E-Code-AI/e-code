import { Server, Socket } from "socket.io";
import { Types } from "mongoose";

type ObjectId = Types.ObjectId | string;

export interface DMMessagePayload {
  dmId: ObjectId;
  content: string;
  tempId?: string;
}

export interface JoinDMPayload {
  dmId: ObjectId;
}

export interface LeaveDMPayload {
  dmId: ObjectId;
}

export interface DMMessage {
  _id: ObjectId;
  dmId: ObjectId;
  senderId: ObjectId;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DMHandlersOptions {
  io: Server;
  getUserIdFromSocket: (socket: Socket) => ObjectId | null;
  isUserInDM: (userId: ObjectId, dmId: ObjectId) => Promise<boolean>;
  saveDMMessage: (params: {
    dmId: ObjectId;
    senderId: ObjectId;
    content: string;
  }) => Promise<DMMessage>;
  markDMAsRead?: (params: {
    dmId: ObjectId;
    userId: ObjectId;
  }) => Promise<void>;
  logger?: {
    info: (msg: string, meta?: unknown) => void;
    warn: (msg: string, meta?: unknown) => void;
    error: (msg: string, meta?: unknown) => void;
  };
}

const DM_ROOM_PREFIX = "dm:";

function getDMRoomId(dmId: ObjectId): string {
  return `undefinedundefined`;
}

export function registerDMHandlers(socket: Socket, options: DMHandlersOptions): void {
  const { io, getUserIdFromSocket, isUserInDM, saveDMMessage, markDMAsRead, logger } = options;

  const logInfo = (message: string, meta?: unknown) => {
    if (logger?.info) logger.info(message, meta);
  };

  const logWarn = (message: string, meta?: unknown) => {
    if (logger?.warn) logger.warn(message, meta);
  };

  const logError = (message: string, meta?: unknown) => {
    if (logger?.error) logger.error(message, meta);
  };

  const getAuthedUserId = (): ObjectId | null => {
    const userId = getUserIdFromSocket(socket);
    if (!userId) {
      logWarn("Unauthorized socket access for DM handler", { socketId: socket.id });
    }
    return userId;
  };

  const handleJoinDM = async (payload: JoinDMPayload, callback?: (response: { ok: boolean; error?: string }) => void) => {
    try {
      const userId = getAuthedUserId();
      if (!userId) {
        callback?.({ ok: false, error: "UNAUTHORIZED" });
        return;
      }

      if (!payload || !payload.dmId) {
        callback?.({ ok: false, error: "INVALID_PAYLOAD" });
        return;
      }

      const { dmId } = payload;
      const isMember = await isUserInDM(userId, dmId);
      if (!isMember) {
        logWarn("User attempted to join DM they are not a member of", { userId, dmId });
        callback?.({ ok: false, error: "FORBIDDEN" });
        return;
      }

      const roomId = getDMRoomId(dmId);
      await socket.join(roomId);

      if (markDMAsRead) {
        try {
          await markDMAsRead({ dmId, userId });
        } catch (err) {
          logError("Failed to mark DM as read on join", { error: err, userId, dmId });
        }
      }

      logInfo("User joined DM room", { userId, dmId, roomId, socketId: socket.id });
      callback?.({ ok: true });
    } catch (error) {
      logError("Error in joinDM handler", { error });
      callback?.({ ok: false, error: "INTERNAL_ERROR" });
    }
  };

  const handleLeaveDM = async (payload: LeaveDMPayload, callback?: (response: { ok: boolean; error?: string }) => void) => {
    try {
      const userId = getAuthedUserId();
      if (!userId) {
        callback?.({ ok: false, error: "UNAUTHORIZED" });
        return;
      }

      if (!payload || !payload.dmId) {
        callback?.({ ok: false, error: "INVALID_PAYLOAD" });
        return;
      }

      const { dmId } = payload;
      const roomId = getDMRoomId(dmId);

      await socket.leave(roomId);

      logInfo("User left DM room", { userId, dmId, roomId, socketId: socket.id });
      callback?.({ ok: true });
    } catch (error) {
      logError("Error in leaveDM handler", { error });
      callback?.({ ok: false, error: "INTERNAL_ERROR" });
    }
  };

  const handleDMMessage = async (
    payload: DMMessagePayload,
    callback?: (response: { ok: boolean; error?: string; message?: DMMessage; tempId?: string }) => void
  ) => {
    try {
      const userId = getAuthedUserId();
      if (!userId) {
        callback?.({ ok: false, error: "UNAUTHORIZED" });
        return;
      }

      if (!payload || !payload.dmId || typeof payload.content !== "string" || !payload.content.trim()) {
        callback?.({ ok: false, error: "INVALID_PAYLOAD" });
        return;
      }

      const { dmId, content, tempId } = payload;

      const isMember = await isUserInDM(userId, dmId);
      if (!isMember) {
        logWarn("User attempted to send DM message to conversation they are not a member of", { userId, dmId });
        callback?.({ ok: false, error: "FORBIDDEN" });
        return;
      }

      const message = await saveDMMessage({
        dmId,
        senderId: userId,
        content: content.trim(),
      });

      const roomId = getDMRoomId(dmId);

      io.to(roomId).emit("dmMessage", {
        message,
      });

      logInfo("DM message sent", { userId, dmId, messageId: message._id });

      callback?.({ ok: true, message, tempId });
    } catch (error) {
      logError("Error in dmMessage handler", { error });
      callback?.({ ok: false, error: "INTERNAL_ERROR" });
    }
  };

  socket.on("joinDM", handleJoinDM);
  socket.on("leaveDM", handleLeaveDM);
  socket.on("dmMessage", handleDMMessage);
}