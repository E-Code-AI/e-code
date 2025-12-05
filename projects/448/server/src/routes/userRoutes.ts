import { Router, Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { Types } from 'mongoose';
import { authenticate } from '../middleware/authenticate';
import { requireAuth } from '../middleware/requireAuth';
import { User } from '../models/User';
import { Address } from '../models/Address';

const router = Router();

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    roles?: string[];
  };
}

const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
      })),
    });
    return;
  }
  next();
};

const isValidObjectId = (value: string): boolean => {
  return Types.ObjectId.isValid(value);
};

// GET /me - Get current user profile
router.get(
  '/me',
  authenticate,
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user?.id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const user = await User.findById(req.user.id)
        .select('-password -resetPasswordToken -resetPasswordExpires')
        .lean()
        .exec();

      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      res.json({ user });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching user profile:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// PATCH /me - Update current user profile
router.patch(
  '/me',
  authenticate,
  requireAuth,
  body('firstName').optional().isString().isLength({ min: 1, max: 100 }).withMessage('First name must be between 1 and 100 characters'),
  body('lastName').optional().isString().isLength({ min: 1, max: 100 }).withMessage('Last name must be between 1 and 100 characters'),
  body('phone')
    .optional()
    .isString()
    .isLength({ min: 7, max: 20 })
    .withMessage('Phone must be between 7 and 20 characters'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Date of birth must be a valid date'),
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user?.id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const updateFields: Record<string, unknown> = {};
      const allowedFields: Array<keyof typeof req.body> = ['firstName', 'lastName', 'phone', 'dateOfBirth'];

      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updateFields[field] = req.body[field];
        }
      });

      if (Object.keys(updateFields).length === 0) {
        res.status(400).json({ message: 'No valid fields provided for update' });
        return;
      }

      const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        { $set: updateFields },
        { new: true, runValidators: true, context: 'query' }
      )
        .select('-password -resetPasswordToken -resetPasswordExpires')
        .lean()
        .exec();

      if (!updatedUser) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      res.json({ user: updatedUser });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error updating user profile:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// GET /me/addresses - List user addresses
router.get(
  '/me/addresses',
  authenticate,
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user?.id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const addresses = await Address.find({ user: req.user.id }).lean().exec();

      res.json({ addresses });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching user addresses:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// POST /me/addresses - Add new address
router.post(
  '/me/addresses',
  authenticate,
  requireAuth,
  body('label').optional().isString().isLength({ max: 100 }).withMessage('Label must be at most 100 characters'),
  body('fullName').isString().isLength({ min: 1, max: 150 }).withMessage('Full name is required'),
  body('line1').isString().isLength({ min: 1, max: 200 }).withMessage('Address line 1 is required'),
  body('line2').optional().isString().isLength({ max: 200 }).withMessage('Address line 2 must be at most 200 characters'),
  body('city').isString().isLength({ min: 1, max: 100 }).withMessage('City is required'),
  body('state').optional().isString().isLength({ max: 100 }).withMessage('State must be at most 100 characters'),
  body('postalCode').isString().isLength({ min: 1, max: 20 }).withMessage('Postal code is required'),
  body('country').isString().isLength({ min: 2, max: 100 }).withMessage('Country is required'),
  body('phone')
    .optional()
    .isString()
    .isLength({ min: 7, max: 20 })
    .withMessage('Phone must be between 7 and 20 characters'),
  body('isDefault').optional().isBoolean().withMessage('isDefault must be a boolean'),
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user?.id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const {
        label,
        fullName,
        line1,
        line2,
        city,
        state,
        postalCode,
        country,
        phone,
        isDefault,
      } = req.body;

      if (isDefault) {
        await Address.updateMany(
          { user: req.user.id, isDefault: true },
          { $set: { isDefault: false } }
        ).exec();
      }

      const address = new Address({
        user: req.user.id,
        label,
        fullName,
        line1,
        line2,
        city,
        state,
        postalCode,
        country,
        phone,
        isDefault: Boolean(isDefault),
      });

      const savedAddress = await address.save();

      res.status(201).json({ address: savedAddress });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error creating address:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// PATCH /me/addresses/:addressId - Update address
router.patch(
  '/me/addresses/:addressId',
  authenticate,
  requireAuth,
  param('addressId')
    .custom(value => isValidObjectId(value))
    .withMessage('Invalid address ID'),
  body('label').optional().isString().isLength({ max: 100 }).withMessage('Label must be at most 100 characters'),
  body('fullName').optional().isString().isLength({ min: 1, max: 150 }).withMessage('Full name must be between 1 and 150 characters'),
  body('line1').optional().isString().isLength({ min: 1, max: 200 }).withMessage('Address line 1 must be between 1 and 200 characters'),
  body('line2').optional().isString().isLength({ max: 200 }).withMessage('Address line 2 must be at most 200 characters'),
  body('city').optional().isString().isLength({ min: 1, max: 100 }).withMessage('City must be between 1 and 100 characters'),
  body('state').optional().isString().isLength({ max: 100 }).withMessage('State must be at most 100 characters'),
  body('postalCode').optional().isString().isLength({ min: 1, max: 20 }).withMessage('Postal code must be between 1 and 20 characters'),
  body('country').optional().isString().isLength({ min: 2, max: 100 }).