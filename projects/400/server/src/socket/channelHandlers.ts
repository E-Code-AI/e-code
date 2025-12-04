import { Server, Socket } from "socket.io";
import { Logger } from "../utils/logger";
import { ChannelService } from "../services/channelService";
import { AuthenticatedSocket } from "../types/socket";
import {
  ChannelJoinPayload,
  ChannelLeavePayload,
  ChannelMessagePayload,
  ChannelMessageServerEvent,
  ChannelJoinServerEvent,
  ChannelLeaveServerEvent,
  ChannelErrorServerEvent,
  ChannelTypingPayload,
  ChannelTypingServerEvent,
} from "../types/channelEvents";

const logger = new Logger("channelHandlers");

export interface ChannelHandlersDeps {
  io: Server;
  channelService: ChannelService;
}

export const registerChannelHandlers = (
  socket: AuthenticatedSocket,
  deps: ChannelHandlersDeps
): void => {
  const { io, channelService } = deps;

  const safeEmit = (event: string, payload: unknown): void => {
    try {
      socket.emit(event, payload);
    } catch (error) {
      logger.error("Failed to emit event", { event, error });
    }
  };

  const handleJoinChannel = async (payload: ChannelJoinPayload): Promise<void> => {
    try {
      if (!socket.user) {
        safeEmit("channel:error", {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        } as ChannelErrorServerEvent);
        return;
      }

      const { channelId } = payload;
      if (!channelId) {
        safeEmit("channel:error", {
          code: "INVALID_PAYLOAD",
          message: "channelId is required",
        } as ChannelErrorServerEvent);
        return;
      }

      const membership = await channelService.joinChannel({
        userId: socket.user.id,
        channelId,
      });

      socket.join(channelId);

      const serverEvent: ChannelJoinServerEvent = {
        channelId,
        userId: socket.user.id,
        joinedAt: membership.joinedAt.toISOString(),
      };

      io.to(channelId).emit("channel:joined", serverEvent);
    } catch (error) {
      logger.error("Error in handleJoinChannel", { error, payload, userId: socket.user?.id });
      safeEmit("channel:error", {
        code: "JOIN_FAILED",
        message: "Failed to join channel",
      } as ChannelErrorServerEvent);
    }
  };

  const handleLeaveChannel = async (payload: ChannelLeavePayload): Promise<void> => {
    try {
      if (!socket.user) {
        safeEmit("channel:error", {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        } as ChannelErrorServerEvent);
        return;
      }

      const { channelId } = payload;
      if (!channelId) {
        safeEmit("channel:error", {
          code: "INVALID_PAYLOAD",
          message: "channelId is required",
        } as ChannelErrorServerEvent);
        return;
      }

      await channelService.leaveChannel({
        userId: socket.user.id,
        channelId,
      });

      socket.leave(channelId);

      const serverEvent: ChannelLeaveServerEvent = {
        channelId,
        userId: socket.user.id,
        leftAt: new Date().toISOString(),
      };

      io.to(channelId).emit("channel:left", serverEvent);
    } catch (error) {
      logger.error("Error in handleLeaveChannel", { error, payload, userId: socket.user?.id });
      safeEmit("channel:error", {
        code: "LEAVE_FAILED",
        message: "Failed to leave channel",
      } as ChannelErrorServerEvent);
    }
  };

  const handleChannelMessage = async (payload: ChannelMessagePayload): Promise<void> => {
    try {
      if (!socket.user) {
        safeEmit("channel:error", {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        } as ChannelErrorServerEvent);
        return;
      }

      const { channelId, content, metadata } = payload;
      if (!channelId || !content || typeof content !== "string" || !content.trim()) {
        safeEmit("channel:error", {
          code: "INVALID_PAYLOAD",
          message: "channelId and non-empty content are required",
        } as ChannelErrorServerEvent);
        return;
      }

      const message = await channelService.createMessage({
        channelId,
        userId: socket.user.id,
        content: content.trim(),
        metadata,
      });

      const serverEvent: ChannelMessageServerEvent = {
        id: message.id,
        channelId: message.channelId,
        userId: message.userId,
        content: message.content,
        metadata: message.metadata ?? undefined,
        createdAt: message.createdAt.toISOString(),
      };

      io.to(channelId).emit("channel:message", serverEvent);
    } catch (error) {
      logger.error("Error in handleChannelMessage", { error, payload, userId: socket.user?.id });
      safeEmit("channel:error", {
        code: "MESSAGE_FAILED",
        message: "Failed to send message",
      } as ChannelErrorServerEvent);
    }
  };

  const handleTyping = async (payload: ChannelTypingPayload): Promise<void> => {
    try {
      if (!socket.user) {
        safeEmit("channel:error", {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        } as ChannelErrorServerEvent);
        return;
      }

      const { channelId, isTyping } = payload;
      if (!channelId || typeof isTyping !== "boolean") {
        safeEmit("channel:error", {
          code: "INVALID_PAYLOAD",
          message: "channelId and isTyping are required",
        } as ChannelErrorServerEvent);
        return;
      }

      const serverEvent: ChannelTypingServerEvent = {
        channelId,
        userId: socket.user.id,
        isTyping,
        timestamp: new Date().toISOString(),
      };

      socket.to(channelId).emit("channel:typing", serverEvent);
    } catch (error) {
      logger.error("Error in handleTyping", { error, payload, userId: socket.user?.id });
      safeEmit("channel:error", {
        code: "TYPING_FAILED",
        message: "Failed to send typing event",
      } as ChannelErrorServerEvent);
    }
  };

  const handleDisconnecting = (): void => {
    try {
      const rooms = Array.from(socket.rooms).filter((room) => room !== socket.id);
      if (!socket.user) return;

      const now = new Date().toISOString();
      rooms.forEach((channelId) => {
        const serverEvent: ChannelLeaveServerEvent = {
          channelId,
          userId: socket.user!.id,
          leftAt: now,
        };
        socket.to(channelId).emit("channel:left", serverEvent);
      });
    } catch (error) {
      logger.error("Error in handleDisconnecting", { error, userId: socket.user?.id });
    }
  };

  socket.on("channel:join", handleJoinChannel);
  socket.on("channel:leave", handleLeaveChannel);
  socket.on("channel:message", handleChannelMessage);
  socket.on("channel:typing", handleTyping);
  socket.on("disconnecting", handleDisconnecting);
};

export const unregisterChannelHandlers = (socket: Socket): void => {
  socket.removeAllListeners("channel:join");
  socket.removeAllListeners("channel:leave");
  socket.removeAllListeners("channel:message");
  socket.removeAllListeners("channel:typing");
  socket.removeAllListeners("disconnecting");
};