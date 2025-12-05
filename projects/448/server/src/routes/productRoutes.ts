import express, { Request, Response, NextFunction, Router } from "express";
import { body, param, query } from "express-validator";
import { Types } from "mongoose";
import { ProductModel } from "../models/Product";
import { InventoryModel } from "../models/Inventory";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validateRequest } from "../middleware/validateRequest";

const router: Router = express.Router();

const isValidObjectId = (value: string): boolean => Types.ObjectId.isValid(value);

router.get(
  "/",
  [
    query("search").optional().isString().trim().isLength({ min: 1 }).withMessage("Search must be a non-empty string"),
    query("category").optional().isString().trim(),
    query("minPrice").optional().isFloat({ min: 0 }).toFloat(),
    query("maxPrice").optional().isFloat({ min: 0 }).toFloat(),
    query("inStock").optional().isBoolean().toBoolean(),
    query("sortBy")
      .optional()
      .isIn(["name", "price", "createdAt", "updatedAt", "popularity"])
      .withMessage("Invalid sortBy field"),
    query("sortOrder")
      .optional()
      .isIn(["asc", "desc"])
      .withMessage("sortOrder must be 'asc' or 'desc'"),
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        search,
        category,
        minPrice,
        maxPrice,
        inStock,
        sortBy = "createdAt",
        sortOrder = "desc",
        page = 1,
        limit = 20,
      } = req.query as {
        search?: string;
        category?: string;
        minPrice?: number;
        maxPrice?: number;
        inStock?: boolean;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
        page?: number;
        limit?: number;
      };

      const filter: Record<string, unknown> = { isDeleted: { $ne: true } };

      if (search) {
        filter.$text = { $search: search };
      }

      if (category) {
        filter.category = category;
      }

      if (minPrice !== undefined || maxPrice !== undefined) {
        filter.price = {};
        if (minPrice !== undefined) {
          (filter.price as Record<string, number>).$gte = minPrice;
        }
        if (maxPrice !== undefined) {
          (filter.price as Record<string, number>).$lte = maxPrice;
        }
      }

      if (inStock !== undefined) {
        filter.stock = inStock ? { $gt: 0 } : 0;
      }

      const sort: Record<string, 1 | -1> = {
        [sortBy]: sortOrder === "asc" ? 1 : -1,
      };

      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        ProductModel.find(filter).sort(sort).skip(skip).limit(limit).lean(),
        ProductModel.countDocuments(filter),
      ]);

      res.status(200).json({
        data: items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/:id",
  [param("id").custom((value) => isValidObjectId(value)).withMessage("Invalid product id")],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const product = await ProductModel.findOne({ _id: id, isDeleted: { $ne: true } }).lean();

      if (!product) {
        res.status(404).json({ message: "Product not found" });
        return;
      }

      res.status(200).json({ data: product });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/",
  authenticate,
  authorize("admin"),
  [
    body("name").isString().trim().isLength({ min: 1 }).withMessage("Name is required"),
    body("description").optional().isString().trim(),
    body("category").isString().trim().isLength({ min: 1 }).withMessage("Category is required"),
    body("price").isFloat({ min: 0 }).withMessage("Price must be a non-negative number").toFloat(),
    body("sku").isString().trim().isLength({ min: 1 }).withMessage("SKU is required"),
    body("stock").isInt({ min: 0 }).withMessage("Stock must be a non-negative integer").toInt(),
    body("images").optional().isArray(),
    body("images.*").optional().isString().trim(),
    body("attributes").optional().isObject(),
    body("isActive").optional().isBoolean().toBoolean(),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, description, category, price, sku, stock, images, attributes, isActive } = req.body;

      const existing = await ProductModel.findOne({ sku, isDeleted: { $ne: true } }).lean();
      if (existing) {
        res.status(409).json({ message: "Product with this SKU already exists" });
        return;
      }

      const product = await ProductModel.create({
        name,
        description,
        category,
        price,
        sku,
        stock,
        images,
        attributes,
        isActive: isActive !== undefined ? isActive : true,
      });

      await InventoryModel.create({
        productId: product._id,
        sku: product.sku,
        stock: product.stock,
        reserved: 0,
      });

      res.status(201).json({ data: product });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  "/:id",
  authenticate,
  authorize("admin"),
  [
    param("id").custom((value) => isValidObjectId(value)).withMessage("Invalid product id"),
    body("name").optional().isString().trim().isLength({ min: 1 }),
    body("description").optional().isString().trim(),
    body("category").optional().isString().trim().isLength({ min: 1 }),
    body("price").optional().isFloat({ min: 0 }).toFloat(),
    body("sku").optional().isString().trim().isLength({ min: 1 }),
    body("stock").optional().isInt({ min: 0 }).toInt(),
    body("images").optional().isArray(),
    body("images.*").optional().isString().trim(),
    body("attributes").optional().isObject(),
    body("isActive").optional().isBoolean().toBoolean(),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const updates = req.body as Partial<{
        name: string;
        description: string;
        category: string;
        price: number;
        sku: string;
        stock: number;
        images: string[];
        attributes: Record<string, unknown>;
        isActive: boolean;
      }>;

      const product = await ProductModel.findOne({ _id: id, isDeleted: { $ne: true } });
      if (!product) {
        res.status(404).json({ message: "Product not found" });
        return;
      }

      if (updates.sku && updates.sku !== product.sku) {
        const skuExists = await ProductModel.findOne({
          sku: updates.sku,
          _id: { $ne: id },
          isDeleted: { $ne: true },
        }).lean();
        if (skuExists) {
          res.status(409).json({ message: "Another product with this SKU already exists" });
          return;
        }
      }

      const originalStock = product.stock;
      Object.assign(product, updates);
      await product.save();

      if (updates.stock !== undefined || updates.sku !== undefined) {
        const inventory = await InventoryModel.findOne({ productId: product._id });
        if (inventory) {
          if (updates.sku) {
            inventory.sku = updates.sku;
          }
          if (updates.stock !== undefined) {
            const stockDiff = updates.stock - originalStock;
            inventory.stock += stockDiff;
            if (inventory.stock < 0) {
              inventory.stock = 0;
            }
          }
          await inventory.save();
        }
      }

      res.status(200).json({ data: product });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  [param("id").custom((value)