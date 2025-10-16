// @ts-nocheck
import { Request, Response, NextFunction } from 'express';

// Simple authentication middleware for development
export const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  // In development with auth bypass enabled, always authenticate
  if (process.env.NODE_ENV === 'development') {
    // Set a default user if not present
    if (!req.user) {
      req.user = {
        id: 1,
        username: 'admin',
        email: 'admin@example.com'
      } as any;
    }
    return next();
  }
  
  // In production, check if user is authenticated
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  res.status(401).json({ error: 'Authentication required' });
};

// Optional authentication - doesn't fail if not authenticated
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  // In development, set a default user
  if (process.env.NODE_ENV === 'development' && !req.user) {
    req.user = {
      id: 1,
      username: 'admin',
      email: 'admin@example.com'
    } as any;
  }
  next();
};