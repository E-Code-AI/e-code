import { Server, Socket } from "socket.io";
import { Types } from "mongoose";
import Message from "../models/Message";
import Conversation from "../models/Conversation";
import User from "../models/User";
import { getUserIdFromSocket, isUserInConversationRoom } from "../utils/socketAuth";
import { pushNotificationService } from "../services/pushNotificationService";

export interface SendMessagePayload {
  conversationId: string;
  content: string;
  attachments?: Array<{
    url: string;
    type: "image" | "video" | "file" | "audio";
    name?: string;
    size?: number;
  }>;
  tempId?: string;
}

export interface MessageReadPayload {
  conversationId: string;
  messageId: string;
}

export interface TypingPayload {
  conversationId: string;
  isTyping: boolean;
}

export interface MessageDeletedPayload {
  conversationId: string;
  messageId: string;
}

export interface MessageEditedPayload {
  conversationId: string;
  messageId: string;
  content: string;
}

interface ConnectedUserInfo {
  socketId: string;
  activeConversationId?: string | null;
}

const connectedUsers: Map<string, ConnectedUserInfo> = new Map();

export const registerSocketUser = (userId: string, socketId: string): void => {
  connectedUsers.set(userId, { socketId, activeConversationId: null });
};

export const unregisterSocketUser = (userId: string): void => {
  connectedUsers.delete(userId);
};

export const setUserActiveConversation = (userId: string, conversationId: string | null): void => {
  const info = connectedUsers.get(userId);
  if (!info) return;
  connectedUsers.set(userId, { ...info, activeConversationId: conversationId || null });
};

const getConversationRoomName = (conversationId: string): string => `conversation:undefined`;

const emitToConversation = (io: Server, conversationId: string, event: string, payload: unknown): void => {
  io.to(getConversationRoomName(conversationId)).emit(event, payload);
};

const notifyOfflineParticipants = async (
  io: Server,
  conversationId: string,
  messageDoc: any,
  senderId: string
): Promise<void> => {
  const conversation = await Conversation.findById(conversationId)
    .select("participants")
    .lean()
    .exec();

  if (!conversation) return;

  const participantIds: string[] = (conversation.participants || [])
    .map((p: any) => (p.user ? p.user.toString() : p.toString()))
    .filter((id: string) => id !== senderId);

  if (!participantIds.length) return;

  const offlineRecipientIds: string[] = [];

  for (const participantId of participantIds) {
    const info = connectedUsers.get(participantId);
    const isOnline = !!info;
    const isViewingConversation = info?.activeConversationId === conversationId;

    if (!isOnline || !isViewingConversation) {
      offlineRecipientIds.push(participantId);
    }
  }

  if (!offlineRecipientIds.length) return;

  const sender = await User.findById(senderId).select("name").lean().exec();
  const senderName = sender?.name || "New message";

  const notificationTitle = senderName;
  const notificationBody =
    messageDoc.content && messageDoc.content.trim().length > 0
      ? messageDoc.content
      : messageDoc.attachments && messageDoc.attachments.length > 0
      ? "Sent an attachment"
      : "Sent a message";

  await pushNotificationService.sendToUsers(offlineRecipientIds, {
    title: notificationTitle,
    body: notificationBody,
    data: {
      type: "NEW_MESSAGE",
      conversationId,
      messageId: messageDoc._id.toString(),
      senderId,
    },
  });
};

export const registerMessageHandlers = (io: Server, socket: Socket): void => {
  const userId = getUserIdFromSocket(socket);

  if (!userId) {
    socket.disconnect(true);
    return;
  }

  registerSocketUser(userId, socket.id);

  socket.on("joinConversation", async (conversationId: string) => {
    if (!Types.ObjectId.isValid(conversationId)) return;

    const isParticipant = await Conversation.exists({
      _id: conversationId,
      "participants.user": userId,
    }).lean();

    if (!isParticipant) return;

    const roomName = getConversationRoomName(conversationId);
    socket.join(roomName);
    setUserActiveConversation(userId, conversationId);
    socket.emit("conversationJoined", { conversationId });
  });

  socket.on("leaveConversation", (conversationId: string) => {
    if (!Types.ObjectId.isValid(conversationId)) return;
    const roomName = getConversationRoomName(conversationId);
    socket.leave(roomName);

    const info = connectedUsers.get(userId);
    if (info?.activeConversationId === conversationId) {
      setUserActiveConversation(userId, null);
    }

    socket.emit("conversationLeft", { conversationId });
  });

  socket.on("sendMessage", async (payload: SendMessagePayload) => {
    try {
      const { conversationId, content, attachments, tempId } = payload;

      if (!Types.ObjectId.isValid(conversationId)) return;

      const conversation = await Conversation.findOne({
        _id: conversationId,
        "participants.user": userId,
      }).exec();

      if (!conversation) {
        socket.emit("error", { message: "Conversation not found or access denied" });
        return;
      }

      const message = new Message({
        conversation: conversation._id,
        sender: userId,
        content: content?.trim() || "",
        attachments: attachments || [],
        createdAt: new Date(),
        updatedAt: new Date(),
        readBy: [userId],
      });

      await message.save();

      conversation.lastMessage = message._id;
      conversation.updatedAt = new Date();
      await conversation.save();

      const populatedMessage = await Message.findById(message._id)
        .populate("sender", "id name avatar")
        .lean()
        .exec();

      const messagePayload = {
        ...populatedMessage,
        tempId,
      };

      emitToConversation(io, conversationId, "message:new", messagePayload);

      await notifyOfflineParticipants(io, conversationId, populatedMessage, userId);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("sendMessage error:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  socket.on("message:read", async (payload: MessageReadPayload) => {
    try {
      const { conversationId, messageId } = payload;

      if (!Types.ObjectId.isValid(conversationId) || !Types.ObjectId.isValid(messageId)) return;

      const message = await Message.findOne({
        _id: messageId,
        conversation: conversationId,
      }).exec();

      if (!message) return;

      const isParticipant = await Conversation.exists({
        _id: conversationId,
        "participants.user": userId,
      }).lean();

      if (!isParticipant) return;

      const alreadyRead = message.readBy.some((id: Types.ObjectId) => id.toString() === userId);
      if (!alreadyRead) {
        message.readBy.push(new Types.ObjectId(userId));
        message.updatedAt = new Date();
        await message.save();
      }

      emitToConversation(io, conversationId, "message:read", {
        conversationId,
        messageId,
        userId,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("message:read error:", error);
    }
  });

  socket.on("typing", async (payload: TypingPayload) => {
    try {
      const { conversationId, isTyping } = payload;

      if (!Types.ObjectId.isValid(conversationId)) return;

      const isParticipant = await Conversation.exists({
        _id: conversationId,
        "participants.user": userId,
      }).lean();

      if (!isParticipant) return;

      socket.to(getConversationRoomName(conversationId)).emit("typing", {
        conversationId,
        userId,
        isTyping,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("typing event error:", error);
    }
  });

  socket.on("message:delete", async (payload: MessageDeletedPayload) => {
    try {
      const { conversationId, messageId } = payload;

      if (!Types.ObjectId.isValid(conversationId) || !Types.ObjectId.isValid(messageId)) return;

      const message = await Message.findOne({
        _id: messageId,
        conversation: conversationId,
      }).exec();

      if (!message) return;

      if (message.sender.toString() !== userId) {
        socket.emit("error", { message: "Not authorized to delete this message" });
        return;
      }

      await Message.deleteOne({ _id: messageId }).exec();

      const conversation = await Conversation.findById(conversationId).exec();
      if (conversation && conversation.lastMessage?.toString() === messageId) {
        const lastMessage = await Message.findOne({ conversation: conversationId })
          .sort({ createdAt: -1 })
          .