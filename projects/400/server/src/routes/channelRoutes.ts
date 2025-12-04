import { Router, Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { Types } from 'mongoose';
import { ChannelModel } from '../models/Channel';
import { UserModel } from '../models/User';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware';

const router = Router();

const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      message: 'Validation failed',
      errors: errors.array(),
    });
    return;
  }
  next();
};

const isValidObjectId = (value: string): boolean => Types.ObjectId.isValid(value);

// GET /channels - list channels with optional filters
router.get(
  '/channels',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { search, limit = '50', offset = '0', memberOf } = req.query;

      const query: Record<string, unknown> = {};

      if (typeof search === 'string' && search.trim().length > 0) {
        query.name = { $regex: search.trim(), $options: 'i' };
      }

      if (memberOf === 'true' && req.user?._id) {
        query.members = { $in: [req.user._id] };
      }

      const parsedLimit = Math.min(Math.max(parseInt(limit as string, 10) || 50, 1), 100);
      const parsedOffset = Math.max(parseInt(offset as string, 10) || 0, 0);

      const [channels, total] = await Promise.all([
        ChannelModel.find(query)
          .skip(parsedOffset)
          .limit(parsedLimit)
          .sort({ createdAt: -1 })
          .lean()
          .exec(),
        ChannelModel.countDocuments(query).exec(),
      ]);

      res.json({
        data: channels,
        pagination: {
          total,
          limit: parsedLimit,
          offset: parsedOffset,
        },
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching channels:', error);
      res.status(500).json({ message: 'Failed to fetch channels' });
    }
  }
);

// POST /channels - create a new channel
router.post(
  '/channels',
  authMiddleware,
  [
    body('name').isString().trim().isLength({ min: 3, max: 100 }).withMessage('Name must be between 3 and 100 characters'),
    body('description').optional().isString().trim().isLength({ max: 500 }).withMessage('Description must be at most 500 characters'),
    body('isPrivate').optional().isBoolean().withMessage('isPrivate must be a boolean'),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user?._id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const { name, description, isPrivate = false } = req.body;

      const existing = await ChannelModel.findOne({ name: name.trim() }).exec();
      if (existing) {
        res.status(409).json({ message: 'Channel name already exists' });
        return;
      }

      const channel = await ChannelModel.create({
        name: name.trim(),
        description: description?.trim() || '',
        isPrivate,
        owner: req.user._id,
        members: [req.user._id],
      });

      res.status(201).json(channel);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error creating channel:', error);
      res.status(500).json({ message: 'Failed to create channel' });
    }
  }
);

// GET /channels/:id - get channel by id
router.get(
  '/channels/:id',
  authMiddleware,
  [param('id').custom((value) => isValidObjectId(value)).withMessage('Invalid channel id')],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const channel = await ChannelModel.findById(id).lean().exec();
      if (!channel) {
        res.status(404).json({ message: 'Channel not found' });
        return;
      }

      if (channel.isPrivate && (!req.user?._id || !channel.members.some((m) => m.toString() === req.user?._id?.toString()))) {
        res.status(403).json({ message: 'Access denied to private channel' });
        return;
      }

      res.json(channel);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching channel:', error);
      res.status(500).json({ message: 'Failed to fetch channel' });
    }
  }
);

// PATCH /channels/:id - update channel (owner only)
router.patch(
  '/channels/:id',
  authMiddleware,
  [
    param('id').custom((value) => isValidObjectId(value)).withMessage('Invalid channel id'),
    body('name').optional().isString().trim().isLength({ min: 3, max: 100 }).withMessage('Name must be between 3 and 100 characters'),
    body('description').optional().isString().trim().isLength({ max: 500 }).withMessage('Description must be at most 500 characters'),
    body('isPrivate').optional().isBoolean().withMessage('isPrivate must be a boolean'),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user?._id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const updates: Record<string, unknown> = {};
      const { name, description, isPrivate } = req.body;

      const channel = await ChannelModel.findById(id).exec();
      if (!channel) {
        res.status(404).json({ message: 'Channel not found' });
        return;
      }

      if (channel.owner.toString() !== req.user._id.toString()) {
        res.status(403).json({ message: 'Only the channel owner can update the channel' });
        return;
      }

      if (typeof name === 'string') {
        const trimmedName = name.trim();
        if (trimmedName !== channel.name) {
          const existing = await ChannelModel.findOne({ name: trimmedName, _id: { $ne: id } }).exec();
          if (existing) {
            res.status(409).json({ message: 'Channel name already exists' });
            return;
          }
          updates.name = trimmedName;
        }
      }

      if (typeof description === 'string') {
        updates.description = description.trim();
      }

      if (typeof isPrivate === 'boolean') {
        updates.isPrivate = isPrivate;
      }

      if (Object.keys(updates).length === 0) {
        res.json(channel);
        return;
      }

      const updatedChannel = await ChannelModel.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean().exec();
      res.json(updatedChannel);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error updating channel:', error);
      res.status(500).json({ message: 'Failed to update channel' });
    }
  }
);

// DELETE /channels/:id - delete channel (owner only)
router.delete(
  '/channels/:id',
  authMiddleware,
  [param('id').custom((value) => isValidObjectId(value)).withMessage('Invalid channel id')],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user?._id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const { id } = req.params;

      const channel = await ChannelModel.findById(id).exec();
      if (!channel) {
        res.status(404).json({ message: 'Channel not found' });
        return;
      }

      if (channel.owner.toString() !== req.user._id.toString()) {
        res.status(403).json({ message: 'Only the channel owner can delete the channel' });
        return;
      }

      await ChannelModel.findByIdAndDelete(id).exec();

      res.status(204).send();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error deleting channel:', error);
      res.status(500).json({ message: 'Failed to delete channel' });
    }
  }
);

// POST /channels/:id/join - join a channel
router.post(
  '/channels/:id/join',
  authMiddleware,
  [param('id').custom((value) => isValidObjectId(value)).withMessage('Invalid channel id')],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user?._id