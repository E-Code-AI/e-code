// @ts-nocheck
import { Request, Response, NextFunction } from 'express';

import { devAuthBypass } from '../dev-auth-bypass';

/**
 * Shared authentication guard used by all API routes.
 * It applies the development auth bypass before enforcing Passport sessions
 * to keep behaviour consistent across the app.
 */
export const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  devAuthBypass(req, res, () => {
    const isAuthed = typeof req.isAuthenticated === 'function' ? req.isAuthenticated() : false;

    if (isAuthed) {
      return next();
    }

    res.status(401).json({ error: 'Authentication required' });
  });
};

// Optional authentication - doesn't fail if not authenticated
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  devAuthBypass(req, res, next);
};