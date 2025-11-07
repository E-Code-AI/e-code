/**
 * Admin authentication middleware
 * Ensures only admin users can access protected routes
 */

import { Request, Response, NextFunction } from 'express';
import { getStorage } from '../storage';

export const ensureAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required',
        code: 'UNAUTHENTICATED'
      });
    }

    const storage = getStorage();
    const user = await storage.getUser(req.user.id);

    // Check if user is an admin
    if (!user || !user.isAdmin) {
      return res.status(403).json({
        message: 'Admin access required',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // User is admin, proceed
    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    res.status(500).json({
      message: 'Authorization check failed',
      code: 'AUTH_ERROR'
    });
  }
};

export const checkAdminStatus = async (userId: string): Promise<boolean> => {
  try {
    const storage = getStorage();
    const user = await storage.getUser(userId);
    return user?.isAdmin || false;
  } catch (error) {
    console.error('Admin status check error:', error);
    return false;
  }
};