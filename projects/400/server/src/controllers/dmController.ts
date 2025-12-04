import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { DirectMessageService } from "../services/directMessageService";
import { UserService } from "../services/userService";
import { HttpError } from "../utils/HttpError";
import { logger } from "../utils/logger";

const directMessageService = new DirectMessageService();
const userService = new UserService();

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    username?: string;
  };
}

export const initiateDirectMessage = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new HttpError(401, "Unauthorized");
    }

    const currentUserId = req.user.id;
    const { recipientId } = req.body;

    if (!recipientId) {
      throw new HttpError(400, "recipientId is required");
    }

    if (!Types.ObjectId.isValid(recipientId)) {
      throw new HttpError(400, "Invalid recipientId");
    }

    if (recipientId === currentUserId) {
      throw new HttpError(400, "Cannot initiate a direct message with yourself");
    }

    const [currentUser, recipientUser] = await Promise.all([
      userService.getUserById(currentUserId),
      userService.getUserById(recipientId),
    ]);

    if (!currentUser) {
      throw new HttpError(404, "Current user not found");
    }

    if (!recipientUser) {
      throw new HttpError(404, "Recipient user not found");
    }

    const conversation = await directMessageService.initiateConversation(
      currentUserId,
      recipientId
    );

    logger.info("Direct message conversation initiated", {
      conversationId: conversation.id,
      participants: conversation.participants,
    });

    res.status(201).json({
      success: true,
      data: {
        conversationId: conversation.id,
        participants: conversation.participants,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        lastMessage: conversation.lastMessage || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getUserDirectMessages = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new HttpError(401, "Unauthorized");
    }

    const userId = req.user.id;

    const conversations = await directMessageService.getUserConversations(userId);

    const formatted = conversations.map((conv) => ({
      conversationId: conv.id,
      participants: conv.participants,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      lastMessage: conv.lastMessage || null,
      unreadCount: conv.unreadCount ?? 0,
    }));

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
};

export const getDirectMessageConversationById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new HttpError(401, "Unauthorized");
    }

    const userId = req.user.id;
    const { conversationId } = req.params;

    if (!conversationId || !Types.ObjectId.isValid(conversationId)) {
      throw new HttpError(400, "Invalid conversationId");
    }

    const conversation = await directMessageService.getConversationById(
      conversationId
    );

    if (!conversation) {
      throw new HttpError(404, "Conversation not found");
    }

    const isParticipant = conversation.participants.some(
      (p) => p.userId.toString() === userId
    );

    if (!isParticipant) {
      throw new HttpError(403, "Forbidden: not a participant of this conversation");
    }

    res.status(200).json({
      success: true,
      data: {
        conversationId: conversation.id,
        participants: conversation.participants,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        lastMessage: conversation.lastMessage || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const archiveDirectMessageConversation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new HttpError(401, "Unauthorized");
    }

    const userId = req.user.id;
    const { conversationId } = req.params;

    if (!conversationId || !Types.ObjectId.isValid(conversationId)) {
      throw new HttpError(400, "Invalid conversationId");
    }

    const updated = await directMessageService.archiveConversationForUser(
      conversationId,
      userId
    );

    if (!updated) {
      throw new HttpError(404, "Conversation not found or not accessible");
    }

    res.status(200).json({
      success: true,
      data: {
        conversationId: updated.id,
        archivedForUserId: userId,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const unarchiveDirectMessageConversation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new HttpError(401, "Unauthorized");
    }

    const userId = req.user.id;
    const { conversationId } = req.params;

    if (!conversationId || !Types.ObjectId.isValid(conversationId)) {
      throw new HttpError(400, "Invalid conversationId");
    }

    const updated = await directMessageService.unarchiveConversationForUser(
      conversationId,
      userId
    );

    if (!updated) {
      throw new HttpError(404, "Conversation not found or not accessible");
    }

    res.status(200).json({
      success: true,
      data: {
        conversationId: updated.id,
        unarchivedForUserId: userId,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDirectMessageConversationForUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new HttpError(401, "Unauthorized");
    }

    const userId = req.user.id;
    const { conversationId } = req.params;

    if (!conversationId || !Types.ObjectId.isValid(conversationId)) {
      throw new HttpError(400, "Invalid conversationId");
    }

    const result = await directMessageService.deleteConversationForUser(
      conversationId,
      userId
    );

    if (!result) {
      throw new HttpError(404, "Conversation not found or not accessible");
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const getUserDirectMessagesSummary = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new HttpError(401, "Unauthorized");
    }

    const userId = req.user.id;

    const summary = await directMessageService.getUserConversationsSummary(userId);

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};