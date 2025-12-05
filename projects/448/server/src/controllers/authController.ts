import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt, { JwtPayload } from "jsonwebtoken";
import { Types } from "mongoose";
import User, { IUserDocument } from "../models/User";

const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret_in_production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
const REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || "change_this_refresh_secret";
const REFRESH_TOKEN_EXPIRES_IN =
  process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";
const COOKIE_SECURE = process.env.NODE_ENV === "production";
const COOKIE_SAME_SITE: boolean | "lax" | "strict" | "none" =
  process.env.NODE_ENV === "production" ? "none" : "lax";

interface AuthenticatedRequest extends Request {
  user?: IUserDocument;
}

interface JwtUserPayload extends JwtPayload {
  id: string;
}

const createAccessToken = (user: IUserDocument): string => {
  const payload: JwtUserPayload = { id: user._id.toString() };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

const createRefreshToken = (user: IUserDocument): string => {
  const payload: JwtUserPayload = { id: user._id.toString() };
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });
};

const setAuthCookies = (res: Response, accessToken: string, refreshToken: string): void => {
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAME_SITE,
    maxAge: 1000 * 60 * 60, // 1 hour
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAME_SITE,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  });
};

const clearAuthCookies = (res: Response): void => {
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAME_SITE,
  });
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAME_SITE,
  });
};

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password, name } = req.body as {
      email?: string;
      password?: string;
      name?: string;
    };

    if (!email || !password || !name) {
      res.status(400).json({ message: "Name, email, and password are required." });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail }).exec();
    if (existingUser) {
      res.status(409).json({ message: "Email is already in use." });
      return;
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);
    setAuthCookies(res, accessToken, refreshToken);

    const userSafe = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.status(201).json({
      message: "User registered successfully.",
      user: userSafe,
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required." });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail }).select("+password").exec();
    if (!user) {
      res.status(401).json({ message: "Invalid email or password." });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: "Invalid email or password." });
      return;
    }

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);
    setAuthCookies(res, accessToken, refreshToken);

    const userSafe = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.status(200).json({
      message: "Logged in successfully.",
      user: userSafe,
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    clearAuthCookies(res);
    res.status(200).json({ message: "Logged out successfully." });
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.substring(7)
      : undefined;

    const cookieAccessToken = req.cookies?.accessToken as string | undefined;
    const token = bearerToken || cookieAccessToken;

    if (!token) {
      res.status(401).json({ message: "Not authenticated." });
      return;
    }

    let decoded: JwtUserPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as JwtUserPayload;
    } catch {
      res.status(401).json({ message: "Invalid or expired token." });
      return;
    }

    if (!decoded.id || !Types.ObjectId.isValid(decoded.id)) {
      res.status(401).json({ message: "Invalid token payload." });
      return;
    }

    const user = await User.findById(decoded.id).exec();
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    const userSafe = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.status(200).json({ user: userSafe });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tokenFromCookie = req.cookies?.refreshToken as string | undefined;
    const tokenFromBody = (req.body && (req.body.refreshToken as string | undefined)) || undefined;
    const refreshTokenValue = tokenFromCookie || tokenFromBody;

    if (!refreshTokenValue) {
      res.status(401).json({ message: "Refresh token is required." });
      return;
    }

    let decoded: JwtUserPayload;
    try {
      decoded = jwt.verify(refreshTokenValue, REFRESH_TOKEN_SECRET) as JwtUserPayload;
    } catch {
      res.status(401).json({ message: "Invalid or expired refresh token." });
      return;
    }

    if (!decoded.id || !Types.ObjectId.isValid(decoded.id)) {
      res.status(401).json({ message: "Invalid token payload." });
      return;
    }

    const user = await User.findById(decoded.id).exec();
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    const newAccessToken = createAccessToken(user);
    const newRefreshToken = createRefreshToken(user);
    setAuthCookies(res, newAccessToken, newRefreshToken);

    res.status(200).json({
      message: "Token refreshed successfully.",
      accessToken: newAccessToken,
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.substring(7)
      : undefined;

    const cookieAccessToken = req.cookies?.accessToken as string | undefined;
    const token = bearerToken || cookie