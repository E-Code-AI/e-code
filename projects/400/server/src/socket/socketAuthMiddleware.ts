import { Socket } from "socket.io";
import { ExtendedError } from "socket.io/dist/namespace";
import jwt, { JwtPayload } from "jsonwebtoken";

export interface AuthenticatedUser {
  id: string;
  email?: string;
  roles?: string[];
  [key: string]: unknown;
}

export interface AuthenticatedSocket extends Socket {
  user?: AuthenticatedUser;
}

interface DecodedToken extends JwtPayload {
  sub?: string;
  email?: string;
  roles?: string[];
}

const AUTH_HEADER_PREFIX = "Bearer ";

const getTokenFromHandshake = (socket: Socket): string | null => {
  const { auth, headers } = socket.handshake;

  if (auth && typeof auth === "object" && typeof auth.token === "string") {
    return auth.token;
  }

  const headerAuth =
    (headers.authorization as string | undefined) ||
    (headers.Authorization as string | undefined);

  if (headerAuth && headerAuth.startsWith(AUTH_HEADER_PREFIX)) {
    return headerAuth.substring(AUTH_HEADER_PREFIX.length).trim();
  }

  if (auth && typeof auth === "object" && typeof auth.token === "string") {
    return auth.token;
  }

  return null;
};

const buildUserFromToken = (decoded: DecodedToken): AuthenticatedUser | null => {
  const userId = decoded.sub || (decoded as unknown as { id?: string }).id;
  if (!userId) {
    return null;
  }

  const user: AuthenticatedUser = {
    id: userId,
  };

  if (decoded.email && typeof decoded.email === "string") {
    user.email = decoded.email;
  }

  if (Array.isArray(decoded.roles)) {
    user.roles = decoded.roles;
  }

  Object.keys(decoded).forEach((key) => {
    if (["sub", "email", "roles", "iat", "exp", "nbf", "jti", "iss", "aud"].includes(key)) {
      return;
    }
    const value = (decoded as Record<string, unknown>)[key];
    if (value !== undefined) {
      user[key] = value;
    }
  });

  return user;
};

export const createSocketAuthMiddleware = (options: { jwtSecret: string }) => {
  const { jwtSecret } = options;

  if (!jwtSecret || typeof jwtSecret !== "string") {
    throw new Error("JWT secret must be provided to createSocketAuthMiddleware");
  }

  return (socket: AuthenticatedSocket, next: (err?: ExtendedError) => void): void => {
    try {
      const token = getTokenFromHandshake(socket);

      if (!token) {
        const error: ExtendedError = new Error("Authentication error: missing token");
        (error as any).data = { code: "AUTH_MISSING_TOKEN" };
        return next(error);
      }

      let decoded: DecodedToken;
      try {
        decoded = jwt.verify(token, jwtSecret) as DecodedToken;
      } catch (err) {
        const error: ExtendedError = new Error("Authentication error: invalid token");
        (error as any).data = { code: "AUTH_INVALID_TOKEN" };
        return next(error);
      }

      const user = buildUserFromToken(decoded);
      if (!user) {
        const error: ExtendedError = new Error("Authentication error: invalid token payload");
        (error as any).data = { code: "AUTH_INVALID_PAYLOAD" };
        return next(error);
      }

      socket.user = user;
      return next();
    } catch (err) {
      const error: ExtendedError = new Error("Authentication error");
      (error as any).data = { code: "AUTH_UNKNOWN_ERROR" };
      return next(error);
    }
  };
};

export const socketAuthMiddleware = ((
  socket: AuthenticatedSocket,
  next: (err?: ExtendedError) => void
): void => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    const error: ExtendedError = new Error("Server configuration error: missing JWT_SECRET");
    (error as any).data = { code: "SERVER_CONFIG_ERROR" };
    return next(error);
  }

  return createSocketAuthMiddleware({ jwtSecret })(socket, next);
}) as (socket: AuthenticatedSocket, next: (err?: ExtendedError) => void) => void;