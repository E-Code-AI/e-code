import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import httpStatus from "http-status";
import { Types } from "mongoose";
import { UserModel, IUser, IUserAddress } from "../models/User";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { logger } from "../utils/logger";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    roles?: string[];
  };
}

const buildUserProfileResponse = (user: IUser) => {
  return {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

const buildUserAccountResponse = (user: IUser) => {
  return {
    profile: buildUserProfileResponse(user),
    preferences: user.preferences,
    addresses: user.addresses,
    roles: user.roles,
    status: user.status,
  };
};

export const getMe = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user?.id) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
    }

    const user = await UserModel.findById(req.user.id);
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }

    res.status(httpStatus.OK).json({
      success: true,
      data: buildUserProfileResponse(user),
    });
  }
);

export const updateProfile = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user?.id) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Validation error", errors.array());
    }

    const { firstName, lastName, phone, avatarUrl } = req.body as Partial<IUser>;

    const updatePayload: Partial<IUser> = {};
    if (typeof firstName === "string") updatePayload.firstName = firstName.trim();
    if (typeof lastName === "string") updatePayload.lastName = lastName.trim();
    if (typeof phone === "string") updatePayload.phone = phone.trim();
    if (typeof avatarUrl === "string") updatePayload.avatarUrl = avatarUrl.trim();

    const user = await UserModel.findByIdAndUpdate(
      req.user.id,
      { $set: updatePayload },
      { new: true }
    );

    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }

    logger.info("User profile updated", { userId: req.user.id });

    res.status(httpStatus.OK).json({
      success: true,
      data: buildUserProfileResponse(user),
    });
  }
);

export const getAccount = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user?.id) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
    }

    const user = await UserModel.findById(req.user.id);
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }

    res.status(httpStatus.OK).json({
      success: true,
      data: buildUserAccountResponse(user),
    });
  }
);

export const getAddresses = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user?.id) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
    }

    const user = await UserModel.findById(req.user.id).select("addresses");
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }

    res.status(httpStatus.OK).json({
      success: true,
      data: user.addresses || [],
    });
  }
);

export const addAddress = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user?.id) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Validation error", errors.array());
    }

    const {
      label,
      fullName,
      phone,
      line1,
      line2,
      city,
      state,
      postalCode,
      country,
      isDefault,
    } = req.body as Partial<IUserAddress>;

    const user = await UserModel.findById(req.user.id);
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }

    const newAddress: IUserAddress = {
      _id: new Types.ObjectId(),
      label: label?.trim() || "Address",
      fullName: fullName?.trim() || `undefined undefined`.trim(),
      phone: phone?.trim() || user.phone || "",
      line1: line1?.trim() || "",
      line2: line2?.trim() || "",
      city: city?.trim() || "",
      state: state?.trim() || "",
      postalCode: postalCode?.trim() || "",
      country: country?.trim() || "",
      isDefault: Boolean(isDefault),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (newAddress.isDefault) {
      user.addresses = user.addresses.map((addr) => ({
        ...addr,
        isDefault: false,
      }));
    } else if (!user.addresses.length) {
      newAddress.isDefault = true;
    }

    user.addresses.push(newAddress);
    await user.save();

    logger.info("User address added", { userId: req.user.id, addressId: newAddress._id });

    res.status(httpStatus.CREATED).json({
      success: true,
      data: newAddress,
    });
  }
);

export const updateAddress = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user?.id) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
    }

    const { addressId } = req.params;
    if (!Types.ObjectId.isValid(addressId)) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid address ID");
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Validation error", errors.array());
    }

    const {
      label,
      fullName,
      phone,
      line1,
      line2,
      city,
      state,
      postalCode,
      country,
      isDefault,
    } = req.body as Partial<IUserAddress>;

    const user = await UserModel.findById(req.user.id);
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }

    const addressIndex = user.addresses.findIndex(
      (addr) => addr._id.toString() === addressId
    );
    if (addressIndex === -1) {
      throw new ApiError(httpStatus.NOT_FOUND, "Address not found");
    }

    const address = user.addresses[addressIndex];

    if (typeof label === "string") address.label = label.trim();
    if (typeof fullName === "string") address.fullName = fullName.trim();
    if (typeof phone === "string") address.phone = phone.trim();
    if (typeof line1 === "string") address.line1 = line1.trim();
    if (typeof line2 === "string") address.line2 = line2.trim();
    if (typeof city === "string") address.city = city.trim();
    if (typeof state === "string") address.state = state.trim();
    if (typeof postalCode === "string") address.postalCode = postalCode.trim();
    if (typeof country === "string") address.country = country.trim();

    if (typeof isDefault === "boolean") {
      if (isDefault) {
        user.addresses = user.addresses.map((addr, idx) => ({
          ...addr,
          isDefault: idx === addressIndex,
        }));
      } else if (!user.addresses.some((addr, idx) => idx !== addressIndex && addr.isDefault)) {
        address.isDefault = true;
      } else {
        address.isDefault = false;
      }
    }

    address.updatedAt = new Date();
    user.markModified("addresses");
    await user.save();

    logger.info("User address updated", { userId: req.user.id, addressId });

    res.status(httpStatus.OK).json({
      success: true,
      data: address,
    });
  }
);

export const deleteAddress = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user?.id) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
    }

    const { addressId } = req.params;
    if (!Types.ObjectId.isValid(addressId)) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid address