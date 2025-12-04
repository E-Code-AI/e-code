import { Request, Response, NextFunction } from "express";
import { validationResult, body, param, query } from "express-validator";
import { Types } from "mongoose";
import { UserModel, IUserDocument } from "../models/User";
import { AuthenticatedRequest } from "../types/auth";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { logger } from "../utils/logger";

type UpdateUserBody = {
  name?: string;
  email?: string;
  avatarUrl?: string;
  bio?: string;
};

type ListUsersQuery = {
  page?: string;
  limit?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

const validateObjectId = (value: string, fieldName: string): void => {
  if (!Types.ObjectId.isValid(value)) {
    throw new ApiError(400, `Invalid undefined id`);
  }
};

export const validateGetUserProfile = [
  param("id").optional().custom((value) => {
    if (value) validateObjectId(value, "user");
    return true;
  }),
];

export const validateUpdateUser = [
  param("id")
    .optional()
    .custom((value) => {
      if (value) validateObjectId(value, "user");
      return true;
    }),
  body("name").optional().isString().isLength({ min: 1, max: 100 }).trim(),
  body("email").optional().isEmail().normalizeEmail(),
  body("avatarUrl").optional().isURL().isLength({ max: 500 }),
  body("bio").optional().isString().isLength({ max: 500 }).trim(),
];

export const validateListUsers = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("search").optional().isString().trim().isLength({ max: 100 }),
  query("sortBy")
    .optional()
    .isIn(["createdAt", "name", "email", "updatedAt"]),
  query("sortOrder").optional().isIn(["asc", "desc"]),
];

const handleValidation = (req: Request): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(422, "Validation failed", errors.array());
  }
};

const sanitizeUser = (user: IUserDocument) => {
  const { password, __v, ...safeUser } = user.toObject({ virtuals: true });
  return safeUser;
};

export const getCurrentUserProfile = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    handleValidation(req);

    if (!req.user || !req.user.id) {
      throw new ApiError(401, "Unauthorized");
    }

    const user = await UserModel.findById(req.user.id);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    res.status(200).json({
      success: true,
      data: sanitizeUser(user),
    });
  }
);

export const getUserProfileById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    handleValidation(req);

    const { id } = req.params;
    if (!id) {
      throw new ApiError(400, "User id is required");
    }

    const user = await UserModel.findById(id);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    res.status(200).json({
      success: true,
      data: sanitizeUser(user),
    });
  }
);

export const updateCurrentUser = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    handleValidation(req);

    if (!req.user || !req.user.id) {
      throw new ApiError(401, "Unauthorized");
    }

    const updates: UpdateUserBody = {};
    const allowedFields: (keyof UpdateUserBody)[] = [
      "name",
      "email",
      "avatarUrl",
      "bio",
    ];

    for (const field of allowedFields) {
      if (typeof req.body[field] !== "undefined") {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      throw new ApiError(400, "No valid fields provided for update");
    }

    const existingUser = await UserModel.findById(req.user.id);
    if (!existingUser) {
      throw new ApiError(404, "User not found");
    }

    if (updates.email && updates.email !== existingUser.email) {
      const emailInUse = await UserModel.exists({ email: updates.email });
      if (emailInUse) {
        throw new ApiError(409, "Email is already in use");
      }
    }

    Object.assign(existingUser, updates);
    await existingUser.save();

    logger.info("User updated", {
      userId: existingUser._id.toString(),
      fields: Object.keys(updates),
    });

    res.status(200).json({
      success: true,
      data: sanitizeUser(existingUser),
    });
  }
);

export const updateUserById = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    handleValidation(req);

    const { id } = req.params;
    if (!id) {
      throw new ApiError(400, "User id is required");
    }

    if (!req.user || !req.user.roles || !req.user.roles.includes("admin")) {
      throw new ApiError(403, "Forbidden: admin role required");
    }

    const updates: UpdateUserBody & { roles?: string[]; isActive?: boolean } =
      {};
    const allowedFields: (keyof typeof updates)[] = [
      "name",
      "email",
      "avatarUrl",
      "bio",
      "roles",
      "isActive",
    ];

    for (const field of allowedFields) {
      if (typeof req.body[field] !== "undefined") {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      throw new ApiError(400, "No valid fields provided for update");
    }

    const existingUser = await UserModel.findById(id);
    if (!existingUser) {
      throw new ApiError(404, "User not found");
    }

    if (updates.email && updates.email !== existingUser.email) {
      const emailInUse = await UserModel.exists({ email: updates.email });
      if (emailInUse) {
        throw new ApiError(409, "Email is already in use");
      }
    }

    Object.assign(existingUser, updates);
    await existingUser.save();

    logger.info("User updated by admin", {
      userId: existingUser._id.toString(),
      updatedBy: req.user.id,
      fields: Object.keys(updates),
    });

    res.status(200).json({
      success: true,
      data: sanitizeUser(existingUser),
    });
  }
);

export const listUsers = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    handleValidation(req);

    if (!req.user || !req.user.roles || !req.user.roles.includes("admin")) {
      throw new ApiError(403, "Forbidden: admin role required");
    }

    const {
      page = "1",
      limit = "20",
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query as ListUsersQuery;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;

    const filter: Record<string, unknown> = {};
    if (search) {
      const regex = new RegExp(search, "i");
      filter.$or = [{ name: regex }, { email: regex }];
    }

    const sort: Record<string, 1 | -1> = {
      [sortBy as string]: sortOrder === "asc" ? 1 : -1,
    };

    const [users, total] = await Promise.all([
      UserModel.find(filter)
        .sort(sort)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      UserModel.countDocuments(filter),
    ]);

    const sanitizedUsers = users.map(sanitizeUser);

    res.status(200).json({
      success: true,
      data: sanitizedUsers,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  }
);

export const deleteUserById = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!id) {
      throw new ApiError(400, "User id is required");
    }

    validateObjectId(id, "user");

    if (!req.user || !req.user.roles || !req.user.roles.includes("admin")) {
      throw new ApiError(403, "Forbidden