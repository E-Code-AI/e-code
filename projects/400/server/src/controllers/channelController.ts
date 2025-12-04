import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { ChannelModel, IChannel, ChannelVisibility } from "../models/Channel";
import { UserModel, IUser } from "../models/User";
import { MembershipModel, IMembership, MembershipRole } from "../models/Membership";
import { HttpError } from "../utils/HttpError";
import { asyncHandler } from "../utils/asyncHandler";
import { validateObjectId } from "../utils/validateObjectId";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    roles?: string[];
  };
}

const isAdmin = (req: AuthenticatedRequest): boolean => {
  return Array.isArray(req.user?.roles) && req.user!.roles!.includes("admin");
};

const isOwnerOrAdmin = (userId: string, ownerId: string, req: AuthenticatedRequest): boolean => {
  if (isAdmin(req)) return true;
  return userId === ownerId;
};

const getUserIdFromRequest = (req: AuthenticatedRequest): string => {
  if (!req.user?.id) {
    throw new HttpError(401, "Unauthorized");
  }
  return req.user.id;
};

export const createChannel = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, _next: NextFunction) => {
    const userId = getUserIdFromRequest(req);
    const { name, description, visibility }: { name: string; description?: string; visibility?: ChannelVisibility } =
      req.body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      throw new HttpError(400, "Channel name is required");
    }

    const normalizedName = name.trim();

    const existing = await ChannelModel.findOne({ name: normalizedName }).lean().exec();
    if (existing) {
      throw new HttpError(409, "Channel name already exists");
    }

    const channel = await ChannelModel.create({
      name: normalizedName,
      description: description?.trim() || "",
      visibility: visibility || "public",
      owner: new Types.ObjectId(userId),
      createdBy: new Types.ObjectId(userId),
      updatedBy: new Types.ObjectId(userId),
    });

    await MembershipModel.create({
      channel: channel._id,
      user: new Types.ObjectId(userId),
      role: "owner",
      joinedAt: new Date(),
    });

    res.status(201).json({
      id: channel._id,
      name: channel.name,
      description: channel.description,
      visibility: channel.visibility,
      owner: channel.owner,
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt,
    });
  }
);

export const listChannels = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, _next: NextFunction) => {
    const userId = req.user?.id;
    const { visibility, search, limit, offset } = req.query;

    const query: Record<string, unknown> = {};
    if (visibility && typeof visibility === "string") {
      if (!["public", "private"].includes(visibility)) {
        throw new HttpError(400, "Invalid visibility filter");
      }
      query.visibility = visibility;
    }

    if (search && typeof search === "string" && search.trim()) {
      query.name = { $regex: search.trim(), $options: "i" };
    }

    const parsedLimit = Math.min(Number(limit) || 20, 100);
    const parsedOffset = Number(offset) || 0;

    if (!isAdmin(req)) {
      if (userId) {
        query.$or = [
          { visibility: "public" },
          { owner: new Types.ObjectId(userId) },
          {
            _id: {
              $in: await MembershipModel.find({ user: userId })
                .distinct("channel")
                .exec(),
            },
          },
        ];
      } else {
        query.visibility = "public";
      }
    }

    const [channels, total] = await Promise.all([
      ChannelModel.find(query)
        .sort({ createdAt: -1 })
        .skip(parsedOffset)
        .limit(parsedLimit)
        .lean()
        .exec(),
      ChannelModel.countDocuments(query).exec(),
    ]);

    res.json({
      items: channels.map((c) => ({
        id: c._id,
        name: c.name,
        description: c.description,
        visibility: c.visibility,
        owner: c.owner,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      total,
      limit: parsedLimit,
      offset: parsedOffset,
    });
  }
);

export const getChannelDetails = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, _next: NextFunction) => {
    const userId = req.user?.id;
    const { channelId } = req.params;

    if (!validateObjectId(channelId)) {
      throw new HttpError(400, "Invalid channel ID");
    }

    const channel = await ChannelModel.findById(channelId).lean().exec();
    if (!channel) {
      throw new HttpError(404, "Channel not found");
    }

    if (channel.visibility === "private" && !isAdmin(req)) {
      if (!userId) {
        throw new HttpError(403, "Access denied");
      }
      const membership = await MembershipModel.findOne({
        channel: channel._id,
        user: userId,
      })
        .lean()
        .exec();
      if (!membership && String(channel.owner) !== userId) {
        throw new HttpError(403, "Access denied");
      }
    }

    const [memberCount, owner] = await Promise.all([
      MembershipModel.countDocuments({ channel: channel._id }).exec(),
      UserModel.findById(channel.owner).select("_id username displayName").lean().exec(),
    ]);

    res.json({
      id: channel._id,
      name: channel.name,
      description: channel.description,
      visibility: channel.visibility,
      owner: owner
        ? {
            id: owner._id,
            username: (owner as IUser).username,
            displayName: (owner as IUser).displayName,
          }
        : channel.owner,
      memberCount,
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt,
    });
  }
);

export const updateChannel = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, _next: NextFunction) => {
    const userId = getUserIdFromRequest(req);
    const { channelId } = req.params;
    const { name, description, visibility }: { name?: string; description?: string; visibility?: ChannelVisibility } =
      req.body || {};

    if (!validateObjectId(channelId)) {
      throw new HttpError(400, "Invalid channel ID");
    }

    const channel = await ChannelModel.findById(channelId).exec();
    if (!channel) {
      throw new HttpError(404, "Channel not found");
    }

    if (!isOwnerOrAdmin(userId, String(channel.owner), req)) {
      throw new HttpError(403, "Only the owner or an admin can update this channel");
    }

    const updates: Partial<IChannel> = {};
    if (typeof name === "string") {
      const trimmed = name.trim();
      if (!trimmed) {
        throw new HttpError(400, "Channel name cannot be empty");
      }
      if (trimmed !== channel.name) {
        const existing = await ChannelModel.findOne({ name: trimmed, _id: { $ne: channel._id } })
          .lean()
          .exec();
        if (existing) {
          throw new HttpError(409, "Channel name already exists");
        }
        updates.name = trimmed;
      }
    }

    if (typeof description === "string") {
      updates.description = description.trim();
    }

    if (visibility) {
      if (!["public", "private"].includes(visibility)) {
        throw new HttpError(400, "Invalid visibility value");
      }
      updates.visibility = visibility;
    }

    if (Object.keys(updates).length === 0) {
      res.json({
        id: channel._id,
        name: channel.name,
        description: channel.description,
        visibility: channel.visibility,
        owner: channel.owner,
        createdAt: channel.createdAt,
        updatedAt: channel.updatedAt,
      });
      return;
    }

    updates.updatedBy = new Types.ObjectId(userId);
    const updatedChannel = await ChannelModel.findByIdAndUpdate(channelId, updates, {
      new: true,
    })
      .lean()
      .exec();

    if (!updatedChannel) {
      throw new HttpError(500, "Failed to update channel");
    }

    res.json({
      id: updatedChannel._id,
      name: updatedChannel.name,
      description: updatedChannel.description,
      visibility: updatedChannel.visibility,
      owner: updatedChannel.owner,
      createdAt: updatedChannel.createdAt,
      updatedAt: updatedChannel.updatedAt,
    });
  }
);

export const joinChannel = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, _next: NextFunction) => {
    const userId = getUserIdFromRequest(req);
    const { channelId } = req.params;

    if (!validateObjectId(channelId)) {
      throw new HttpError(400, "Invalid channel ID