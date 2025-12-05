import { Request, Response, NextFunction } from "express";

export type UserRole = "user" | "admin" | "seller";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  [key: string]: unknown;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser | null;
}

const hasManagementPrivileges = (user?: AuthenticatedUser | null): boolean => {
  if (!user) return false;
  return user.role === "admin" || user.role === "seller";
};

export const adminMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    if (!hasManagementPrivileges(req.user)) {
      res.status(403).json({
        success: false,
        message: "Insufficient privileges. Admin or seller role required.",
      });
      return;
    }

    next();
  } catch (error) {
    // Fallback in case of unexpected errors in middleware
    // Do not leak internal error details to the client
    // Log can be handled by a centralized logger if available
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred while checking permissions.",
    });
  }
};

export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    if (req.user.role !== "admin") {
      res.status(403).json({
        success: false,
        message: "Admin privileges required.",
      });
      return;
    }

    next();
  } catch {
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred while checking admin permissions.",
    });
  }
};

export const requireSeller = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    if (req.user.role !== "seller") {
      res.status(403).json({
        success: false,
        message: "Seller privileges required.",
      });
      return;
    }

    next();
  } catch {
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred while checking seller permissions.",
    });
  }
};