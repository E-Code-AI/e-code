import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import { getRepository } from "typeorm";
import { User } from "../entities/User";

interface JwtPayload {
  userId: string;
  email: string;
}

const JWT_SECRET = process.env.JWT_SECRET || "";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
const BCRYPT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);

if (!JWT_SECRET) {
  // In production, this should be set and the process should fail fast if missing
  // eslint-disable-next-line no-console
  console.warn("WARNING: JWT_SECRET is not set. Tokens will not be secure.");
}

const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userRepository = getRepository(User);
    const { email, password, name } = req.body as {
      email?: string;
      password?: string;
      name?: string;
    };

    if (!email || !password || !name) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Missing required fields: email, password, name",
      });
    }

    const existingUser = await userRepository.findOne({ where: { email } });
    if (existingUser) {
      return res
        .status(StatusCodes.CONFLICT)
        .json({ message: "Email is already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    const user = userRepository.create({
      email,
      password: hashedPassword,
      name,
    });

    await userRepository.save(user);

    const token = generateToken({ userId: user.id, email: user.email });

    return res.status(StatusCodes.CREATED).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      token,
    });
  } catch (error) {
    return next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userRepository = getRepository(User);
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Missing required fields: email, password",
      });
    }

    const user = await userRepository.findOne({ where: { email } });
    if (!user) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Invalid email or password" });
    }

    const token = generateToken({ userId: user.id, email: user.email });

    return res.status(StatusCodes.OK).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      token,
    });
  } catch (error) {
    return next(error);
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Authorization header missing or malformed" });
    }

    const token = authHeader.split(" ")[1];

    let decoded: jwt.JwtPayload | string;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Invalid or expired token" });
    }

    if (typeof decoded === "string" || !decoded.userId || !decoded.email) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Invalid token payload" });
    }

    const payload: JwtPayload = {
      userId: decoded.userId as string,
      email: decoded.email as string,
    };

    const newToken = generateToken(payload);

    return res.status(StatusCodes.OK).json({ token: newToken });
  } catch (error) {
    return next(error);
  }
};

export const getCurrentUser = async (
  req: Request & { user?: JwtPayload },
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    if (!req.user) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Not authenticated" });
    }

    const userRepository = getRepository(User);
    const user = await userRepository.findOne({
      where: { id: req.user.userId },
    });

    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "User not found" });
    }

    return res.status(StatusCodes.OK).json({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    return next(error);
  }
};