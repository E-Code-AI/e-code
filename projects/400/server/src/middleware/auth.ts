import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export interface AuthUser {
  id: string;
  email?: string;
  roles?: string[];
  [key: string]: unknown;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

const AUTH_HEADER_PREFIX = "Bearer ";

const getTokenFromHeader = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== "string") {
    return null;
  }

  if (!authHeader.startsWith(AUTH_HEADER_PREFIX)) {
    return null;
  }

  const token = authHeader.slice(AUTH_HEADER_PREFIX.length).trim();
  return token || null;
};

const verifyToken = (token: string, secret: string): AuthUser | null => {
  try {
    const decoded = jwt.verify(token, secret) as JwtPayload | string;

    if (typeof decoded === "string") {
      return { id: decoded };
    }

    if (!decoded || typeof decoded !== "object") {
      return null;
    }

    const { sub, id, email, roles, ...rest } = decoded;

    const userId = typeof id === "string" ? id : typeof sub === "string" ? sub : undefined;
    if (!userId) {
      return null;
    }

    const user: AuthUser = {
      id: userId,
    };

    if (typeof email === "string") {
      user.email = email;
    }

    if (Array.isArray(roles)) {
      user.roles = roles.filter((r) => typeof r === "string");
    }

    Object.assign(user, rest);

    return user;
  } catch {
    return null;
  }
};

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    // Misconfiguration: fail fast with 500
    res.status(500).json({ error: "Authentication configuration error" });
    return;
  }

  const token = getTokenFromHeader(req);
  if (!token) {
    res.status(401).json({ error: "Authorization token missing or malformed" });
    return;
  }

  const user = verifyToken(token, jwtSecret);
  if (!user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  req.user = user;
  next();
};

export const optionalAuthMiddleware = (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    next();
    return;
  }

  const token = getTokenFromHeader(req);
  if (!token) {
    next();
    return;
  }

  const user = verifyToken(token, jwtSecret);
  if (user) {
    req.user = user;
  }

  next();
};

export const requireRole =
  (requiredRoles: string | string[]) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const rolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!rolesArray.length) {
      next();
      return;
    }

    const userRoles = req.user.roles || [];
    const hasRole = rolesArray.some((role) => userRoles.includes(role));

    if (!hasRole) {
      res.status(403).json({ error: "Forbidden: insufficient permissions" });
      return;
    }

    next();
  };

export default authMiddleware;