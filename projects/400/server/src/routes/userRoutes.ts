import { Router, Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticate } from '../middleware/authenticate';
import { UserService } from '../services/UserService';
import { AuthenticatedRequest } from '../types/AuthenticatedRequest';

const router = Router();
const userService = new UserService();

const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: 'ValidationError',
      details: errors.array().map((e) => ({
        field: e.param,
        message: e.msg,
      })),
    });
    return;
  }
  next();
};

router.get(
  '/users/me',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await userService.getUserById(req.user.id);
      if (!user) {
        res.status(404).json({ error: 'UserNotFound' });
        return;
      }

      res.json(user);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching current user:', error);
      res.status(500).json({ error: 'InternalServerError' });
    }
  }
);

router.get(
  '/users/:id',
  authenticate,
  [
    param('id')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('User ID is required'),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!req.user || !req.user.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await userService.getUserById(id);
      if (!user) {
        res.status(404).json({ error: 'UserNotFound' });
        return;
      }

      res.json(user);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching user by id:', error);
      res.status(500).json({ error: 'InternalServerError' });
    }
  }
);

router.patch(
  '/users/me',
  authenticate,
  [
    body('name')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Name must be between 1 and 100 characters'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Invalid email address')
      .normalizeEmail(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { name, email } = req.body;

      const updatedUser = await userService.updateUser(req.user.id, {
        name,
        email,
      });

      if (!updatedUser) {
        res.status(404).json({ error: 'UserNotFound' });
        return;
      }

      res.json(updatedUser);
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Error updating current user:', error);

      if (error?.code === 'EMAIL_TAKEN') {
        res.status(409).json({ error: 'EmailAlreadyInUse' });
        return;
      }

      res.status(500).json({ error: 'InternalServerError' });
    }
  }
);

router.delete(
  '/users/me',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const deleted = await userService.deleteUser(req.user.id);

      if (!deleted) {
        res.status(404).json({ error: 'UserNotFound' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error deleting current user:', error);
      res.status(500).json({ error: 'InternalServerError' });
    }
  }
);

export default router;