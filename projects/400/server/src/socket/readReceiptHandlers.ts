import { Server, Socket } from "socket.io";
import { Types } from "mongoose";
import { ConversationModel } from "../models/Conversation";
import { MessageModel } from "../models/Message";
import { UserModel } from "../models/User";
import { logger } from "../utils/logger";

export interface MessageReadPayload {
  messageId: string;
  conversationId: string;
  userId: string;
  readAt?: string;
}

export interface ReadReceiptHandlersOptions {
  io: Server;
}

export const registerReadReceiptHandlers = (
  socket: Socket,
  { io }: ReadReceiptHandlersOptions
): void => {
  const handleMessageRead = async (payload: MessageReadPayload): Promise<void> => {
    try {
      if (!payload || typeof payload !== "object") {
        return;
      }

      const { messageId, conversationId, userId, readAt } = payload;

      if (!messageId || !conversationId || !userId) {
        return;
      }

      if (
        !Types.ObjectId.isValid(messageId) ||
        !Types.ObjectId.isValid(conversationId) ||
        !Types.ObjectId.isValid(userId)
      ) {
        return;
      }

      const [user, conversation, message] = await Promise.all([
        UserModel.findById(userId).select("_id").lean(),
        ConversationModel.findById(conversationId).select("_id participants").lean(),
        MessageModel.findById(messageId).select("_id conversationId readBy").lean(),
      ]);

      if (!user || !conversation || !message) {
        return;
      }

      if (message.conversationId.toString() !== conversationId) {
        return;
      }

      const isParticipant = conversation.participants.some(
        (participantId: Types.ObjectId) => participantId.toString() === userId
      );

      if (!isParticipant) {
        return;
      }

      const alreadyRead = message.readBy?.some(
        (entry: { userId: Types.ObjectId; readAt: Date }) =>
          entry.userId.toString() === userId
      );

      if (alreadyRead) {
        return;
      }

      const readTimestamp = readAt ? new Date(readAt) : new Date();

      await MessageModel.updateOne(
        { _id: messageId },
        {
          $addToSet: {
            readBy: {
              userId: new Types.ObjectId(userId),
              readAt: readTimestamp,
            },
          },
        }
      ).exec();

      const roomId = `conversation:undefined`;

      io.to(roomId).emit("messageRead", {
        messageId,
        conversationId,
        userId,
        readAt: readTimestamp.toISOString(),
      });
    } catch (error) {
      logger.error("Error handling messageRead event", {
        error,
        socketId: socket.id,
      });
    }
  };

  socket.on("messageRead", handleMessageRead);
};