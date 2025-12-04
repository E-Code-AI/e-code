import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { Types } from 'mongoose';
import { authenticate } from '../middleware/authenticate';
import { validateRequest } from '../middleware/validateRequest';
import { DmService } from '../services/DmService';
import { ApiError } from '../utils/ApiError';

const router = Router();
const dmService = new DmService();

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    username?: string;
  };
}

const isValidObjectId = (value: string): boolean => {
  return Types.ObjectId.isValid(value);
};

router.get(
  '/dms',
  authenticate,
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('limit must be an integer between 1 and 100'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('offset must be a non-negative integer'),
    query('search')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 100 })
      .withMessage('search must be a string up to 100 characters'),
  ],
  validateRequest,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new ApiError(401, 'Unauthorized');
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
      const search = (req.query.search as string) || undefined;

      const result = await dmService.listConversations({
        userId,
        limit,
        offset,
        search,
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/dms',
  authenticate,
  [
    body('participantId')
      .exists()
      .withMessage('participantId is required')
      .bail()
      .custom((value) => isValidObjectId(value))
      .withMessage('participantId must be a valid id'),
    body('initialMessage')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 2000 })
      .withMessage('initialMessage must be between 1 and 2000 characters'),
  ],
  validateRequest,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new ApiError(401, 'Unauthorized');
      }

      const { participantId, initialMessage } = req.body;

      if (participantId === userId) {
        throw new ApiError(400, 'Cannot start a DM conversation with yourself');
      }

      const conversation = await dmService.startConversation({
        userId,
        participantId,
        initialMessage: initialMessage || undefined,
      });

      res.status(201).json(conversation);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/dms/:conversationId',
  authenticate,
  [
    param('conversationId')
      .exists()
      .withMessage('conversationId is required')
      .bail()
      .custom((value) => isValidObjectId(value))
      .withMessage('conversationId must be a valid id'),
  ],
  validateRequest,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new ApiError(401, 'Unauthorized');
      }

      const { conversationId } = req.params;

      const conversation = await dmService.getConversation({
        userId,
        conversationId,
      });

      res.status(200).json(conversation);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/dms/:conversationId/messages',
  authenticate,
  [
    param('conversationId')
      .exists()
      .withMessage('conversationId is required')
      .bail()
      .custom((value) => isValidObjectId(value))
      .withMessage('conversationId must be a valid id'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('limit must be an integer between 1 and 100'),
    query('before')
      .optional()
      .isISO8601()
      .withMessage('before must be a valid ISO8601 date'),
  ],
  validateRequest,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new ApiError(401, 'Unauthorized');
      }

      const { conversationId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const before = (req.query.before as string) || undefined;

      const messages = await dmService.listMessages({
        userId,
        conversationId,
        limit,
        before,
      });

      res.status(200).json(messages);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/dms/:conversationId/messages',
  authenticate,
  [
    param('conversationId')
      .exists()
      .withMessage('conversationId is required')
      .bail()
      .custom((value) => isValidObjectId(value))
      .withMessage('conversationId must be a valid id'),
    body('content')
      .exists()
      .withMessage('content is required')
      .bail()
      .isString()
      .trim()
      .isLength({ min: 1, max: 2000 })
      .withMessage('content must be between 1 and 2000 characters'),
  ],
  validateRequest,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new ApiError(401, 'Unauthorized');
      }

      const { conversationId } = req.params;
      const { content } = req.body;

      const message = await dmService.sendMessage({
        userId,
        conversationId,
        content,
      });

      res.status(201).json(message);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/dms/:conversationId/read',
  authenticate,
  [
    param('conversationId')
      .exists()
      .withMessage('conversationId is required')
      .bail()
      .custom((value) => isValidObjectId(value))
      .withMessage('conversationId must be a valid id'),
  ],
  validateRequest,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new ApiError(401, 'Unauthorized');
      }

      const { conversationId } = req.params;

      const result = await dmService.markConversationAsRead({
        userId,
        conversationId,
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/dms/:conversationId',
  authenticate,
  [
    param('conversationId')
      .exists()
      .withMessage('conversationId is required')
      .bail()
      .custom((value) => isValidObjectId(value))
      .withMessage('conversationId must be a valid id'),
  ],
  validateRequest,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new ApiError(401, 'Unauthorized');
      }

      const { conversationId } = req.params;

      await dmService.archiveConversation({
        userId,
        conversationId,
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;