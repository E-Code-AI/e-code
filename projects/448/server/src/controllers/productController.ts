import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { ProductModel, ProductDocument } from "../models/Product";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../middleware/asyncHandler";
import { buildProductQuery } from "../utils/queryBuilder";
import { validateObjectId } from "../utils/validateObjectId";

interface PaginatedResult<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ProductFilters {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  tags?: string[];
  isActive?: boolean;
}

const parseBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return undefined;
};

const parseNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && !isNaN(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (!isNaN(parsed)) return parsed;
  }
  return undefined;
};

const parseStringArray = (value: unknown): string[] | undefined => {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    return value.map((v) => String(v)).filter((v) => v.trim().length > 0);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
  }
  return undefined;
};

const buildFiltersFromQuery = (query: Request["query"]): ProductFilters => {
  const filters: ProductFilters = {};

  if (typeof query.search === "string" && query.search.trim().length > 0) {
    filters.search = query.search.trim();
  }

  if (typeof query.category === "string" && query.category.trim().length > 0) {
    filters.category = query.category.trim();
  }

  const minPrice = parseNumber(query.minPrice);
  if (typeof minPrice === "number") {
    filters.minPrice = minPrice;
  }

  const maxPrice = parseNumber(query.maxPrice);
  if (typeof maxPrice === "number") {
    filters.maxPrice = maxPrice;
  }

  const inStock = parseBoolean(query.inStock);
  if (typeof inStock === "boolean") {
    filters.inStock = inStock;
  }

  const isActive = parseBoolean(query.isActive);
  if (typeof isActive === "boolean") {
    filters.isActive = isActive;
  }

  const tags = parseStringArray(query.tags);
  if (tags && tags.length > 0) {
    filters.tags = tags;
  }

  return filters;
};

export const listProducts = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const page = parseNumber(req.query.page) || 1;
    const limit = parseNumber(req.query.limit) || 20;
    const sortBy = typeof req.query.sortBy === "string" ? req.query.sortBy : "createdAt";
    const sortOrder = typeof req.query.sortOrder === "string" ? req.query.sortOrder : "desc";

    const filters = buildFiltersFromQuery(req.query);
    const query = buildProductQuery(filters);

    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    const [data, total] = await Promise.all([
      ProductModel.find(query)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      ProductModel.countDocuments(query).exec(),
    ]);

    const result: PaginatedResult<ProductDocument> = {
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };

    res.status(200).json(result);
  }
);

export const getProductById = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      return next(new ApiError(400, "Invalid product ID"));
    }

    const product = await ProductModel.findById(id).lean().exec();

    if (!product) {
      return next(new ApiError(404, "Product not found"));
    }

    res.status(200).json(product);
  }
);

export const createProduct = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const {
      name,
      description,
      price,
      category,
      tags,
      sku,
      inventoryQuantity,
      isActive,
      images,
      metadata,
    } = req.body;

    if (!name || typeof name !== "string") {
      return next(new ApiError(400, "Product name is required"));
    }

    if (price === undefined || typeof price !== "number" || price < 0) {
      return next(new ApiError(400, "Valid product price is required"));
    }

    if (!category || typeof category !== "string") {
      return next(new ApiError(400, "Product category is required"));
    }

    if (sku && typeof sku !== "string") {
      return next(new ApiError(400, "SKU must be a string"));
    }

    if (
      inventoryQuantity !== undefined &&
      (typeof inventoryQuantity !== "number" || inventoryQuantity < 0)
    ) {
      return next(new ApiError(400, "Inventory quantity must be a non-negative number"));
    }

    const existingSku =
      sku &&
      (await ProductModel.findOne({ sku }).select("_id").lean().exec());

    if (existingSku) {
      return next(new ApiError(409, "Product with this SKU already exists"));
    }

    const product = await ProductModel.create({
      name,
      description,
      price,
      category,
      tags,
      sku,
      inventoryQuantity: inventoryQuantity ?? 0,
      isActive: typeof isActive === "boolean" ? isActive : true,
      images,
      metadata,
    });

    res.status(201).json(product);
  }
);

export const updateProduct = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      return next(new ApiError(400, "Invalid product ID"));
    }

    const updateData: Partial<ProductDocument> = {};
    const allowedFields: (keyof ProductDocument)[] = [
      "name",
      "description",
      "price",
      "category",
      "tags",
      "sku",
      "isActive",
      "images",
      "metadata",
    ];

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        // @ts-expect-error dynamic assignment
        updateData[field] = req.body[field];
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "inventoryQuantity")) {
      const inventoryQuantity = req.body.inventoryQuantity;
      if (
        typeof inventoryQuantity !== "number" ||
        inventoryQuantity < 0 ||
        !Number.isFinite(inventoryQuantity)
      ) {
        return next(
          new ApiError(400, "Inventory quantity must be a non-negative number")
        );
      }
      // @ts-expect-error dynamic assignment
      updateData.inventoryQuantity = inventoryQuantity;
    }

    if (updateData.sku) {
      const existingSku = await ProductModel.findOne({
        sku: updateData.sku,
        _id: { $ne: new Types.ObjectId(id) },
      })
        .select("_id")
        .lean()
        .exec();

      if (existingSku) {
        return next(new ApiError(409, "Product with this SKU already exists"));
      }
    }

    const updatedProduct = await ProductModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .lean()
      .exec();

    if (!updatedProduct) {
      return next(new ApiError(404, "Product not found"));
    }

    res.status(200).json(updatedProduct);
  }
);

export const deleteProduct = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      return next(new ApiError(400, "Invalid product ID"));
    }

    const deleted = await ProductModel.findByIdAndDelete(id).lean().exec();

    if (!deleted) {
      return next(new ApiError(404, "Product not found"));
    }

    res.status(204).send();
  }
);

export const adjustInventory = asyncHandler(
  async (req: Request, res: Response,