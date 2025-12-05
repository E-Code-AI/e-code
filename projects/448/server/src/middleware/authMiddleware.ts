import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export interface AuthenticatedUser {
  id: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

const AUTH_HEADER_PREFIX = "Bearer ";
const COOKIE_TOKEN_NAME = "token";

const getTokenFromRequest = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith(AUTH_HEADER_PREFIX)) {
    return authHeader.substring(AUTH_HEADER_PREFIX.length).trim();
  }

  const cookieToken =
    (req as Request & { cookies?: Record<string, string> }).cookies?.[
      COOKIE_TOKEN_NAME
    ];
  if (cookieToken && typeof cookieToken === "string") {
    return cookieToken;
  }

  return null;
};

const verifyToken = (token: string): AuthenticatedUser | null => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload | string;
    if (typeof decoded === "string") {
      return { id: decoded };
    }

    if (!decoded || (!decoded.sub && !decoded.id)) {
      return null;
    }

    const user: AuthenticatedUser = {
      id: (decoded.sub as string) || (decoded.id as string),
    };

    if (decoded.email && typeof decoded.email === "string") {
      user.email = decoded.email;
    }

    if (decoded.role && typeof decoded.role === "string") {
      user.role = decoded.role;
    }

    Object.keys(decoded).forEach((key) => {
      if (!(key in user)) {
        user[key] = decoded[key];
      }
    });

    return user;
  } catch {
    return null;
  }
};

export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      res.status(401).json({ error: "Authentication token missing" });
      return;
    }

    const user = verifyToken(token);
    if (!user) {
      res.status(401).json({ error: "Invalid or expired authentication token" });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    // In case of configuration or unexpected errors, avoid leaking details
    // but log server-side if a logger is available.
    res.status(500).json({ error: "Internal authentication error" });
  }
};

export const optionalAuthMiddleware = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return next();
    }

    const user = verifyToken(token);
    if (user) {
      req.user = user;
    }

    next();
  } catch {
    next();
  }
};