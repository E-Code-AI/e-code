import { z } from "zod";

export const productIdSchema = z
  .string()
  .min(1, "Product ID is required")
  .regex(/^[a-zA-Z0-9_-]+$/, "Product ID must be alphanumeric with dashes/underscores");

export const productBaseSchema = z.object({
  name: z
    .string({
      required_error: "Product name is required",
      invalid_type_error: "Product name must be a string",
    })
    .min(1, "Product name is required")
    .max(255, "Product name must be at most 255 characters"),
  description: z
    .string({
      invalid_type_error: "Description must be a string",
    })
    .max(5000, "Description must be at most 5000 characters")
    .optional()
    .nullable(),
  sku: z
    .string({
      required_error: "SKU is required",
      invalid_type_error: "SKU must be a string",
    })
    .min(1, "SKU is required")
    .max(100, "SKU must be at most 100 characters"),
  price: z
    .number({
      required_error: "Price is required",
      invalid_type_error: "Price must be a number",
    })
    .nonnegative("Price must be greater than or equal to 0")
    .max(1_000_000_000, "Price is too large"),
  currency: z
    .string({
      required_error: "Currency is required",
      invalid_type_error: "Currency must be a string",
    })
    .length(3, "Currency must be a 3-letter ISO code")
    .transform((val) => val.toUpperCase()),
  stockQuantity: z
    .number({
      required_error: "Stock quantity is required",
      invalid_type_error: "Stock quantity must be a number",
    })
    .int("Stock quantity must be an integer")
    .min(0, "Stock quantity cannot be negative")
    .max(1_000_000_000, "Stock quantity is too large"),
  isActive: z
    .boolean({
      invalid_type_error: "isActive must be a boolean",
    })
    .default(true),
  categoryId: z
    .string({
      required_error: "Category ID is required",
      invalid_type_error: "Category ID must be a string",
    })
    .min(1, "Category ID is required")
    .max(255, "Category ID must be at most 255 characters"),
  brandId: z
    .string({
      invalid_type_error: "Brand ID must be a string",
    })
    .min(1, "Brand ID cannot be empty")
    .max(255, "Brand ID must be at most 255 characters")
    .optional()
    .nullable(),
  tags: z
    .array(
      z
        .string({
          invalid_type_error: "Tag must be a string",
        })
        .min(1, "Tag cannot be empty")
        .max(50, "Tag must be at most 50 characters"),
    )
    .max(100, "Too many tags")
    .optional(),
  images: z
    .array(
      z.object({
        url: z
          .string({
            required_error: "Image URL is required",
            invalid_type_error: "Image URL must be a string",
          })
          .url("Image URL must be a valid URL")
          .max(2000, "Image URL must be at most 2000 characters"),
        alt: z
          .string({
            invalid_type_error: "Alt text must be a string",
          })
          .max(255, "Alt text must be at most 255 characters")
          .optional()
          .nullable(),
        isPrimary: z
          .boolean({
            invalid_type_error: "isPrimary must be a boolean",
          })
          .optional(),
      }),
    )
    .max(50, "Too many images")
    .optional(),
  attributes: z
    .record(
      z
        .string({
          invalid_type_error: "Attribute value must be a string",
        })
        .max(1000, "Attribute value must be at most 1000 characters"),
    )
    .optional(),
});

export const createProductSchema = productBaseSchema.extend({
  id: productIdSchema.optional(),
});

export const updateProductSchema = productBaseSchema
  .partial()
  .extend({
    id: productIdSchema,
  })
  .refine(
    (data) => {
      const { id, ...rest } = data;
      return Object.keys(rest).length > 0;
    },
    {
      message: "At least one field must be provided to update",
      path: [],
    },
  );

export const productListFiltersSchema = z
  .object({
    search: z
      .string({
        invalid_type_error: "Search must be a string",
      })
      .min(1, "Search must not be empty")
      .max(255, "Search must be at most 255 characters")
      .optional(),
    categoryId: z
      .string({
        invalid_type_error: "Category ID must be a string",
      })
      .min(1, "Category ID must not be empty")
      .max(255, "Category ID must be at most 255 characters")
      .optional(),
    brandId: z
      .string({
        invalid_type_error: "Brand ID must be a string",
      })
      .min(1, "Brand ID must not be empty")
      .max(255, "Brand ID must be at most 255 characters")
      .optional(),
    minPrice: z
      .number({
        invalid_type_error: "minPrice must be a number",
      })
      .nonnegative("minPrice must be greater than or equal to 0")
      .max(1_000_000_000, "minPrice is too large")
      .optional(),
    maxPrice: z
      .number({
        invalid_type_error: "maxPrice must be a number",
      })
      .nonnegative("maxPrice must be greater than or equal to 0")
      .max(1_000_000_000, "maxPrice is too large")
      .optional(),
    isActive: z
      .boolean({
        invalid_type_error: "isActive must be a boolean",
      })
      .optional(),
    tags: z
      .array(
        z
          .string({
            invalid_type_error: "Tag must be a string",
          })
          .min(1, "Tag cannot be empty")
          .max(50, "Tag must be at most 50 characters"),
      )
      .max(50, "Too many tags")
      .optional(),
    sortBy: z
      .enum(["name", "price", "createdAt", "updatedAt", "stockQuantity"])
      .optional(),
    sortOrder: z
      .enum(["asc", "desc"])
      .optional()
      .default("asc"),
    page: z
      .number({
        invalid_type_error: "Page must be a number",
      })
      .int("Page must be an integer")
      .min(1, "Page must be at least 1")
      .optional()
      .default(1),
    pageSize: z
      .number({
        invalid_type_error: "pageSize must be a number",
      })
      .int("pageSize must be an integer")
      .min(1, "pageSize must be at least 1")
      .max(100, "pageSize must be at most 100")
      .optional()
      .default(20),
  })
  .refine(
    (data) => {
      if (data.minPrice !== undefined && data.maxPrice !== undefined) {
        return data.minPrice <= data.maxPrice;
      }
      return true;
    },
    {
      message: "minPrice cannot be greater than maxPrice",
      path: ["minPrice"],
    },
  );

export type ProductIdInput = z.infer<typeof productIdSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductListFiltersInput = z.infer<typeof productListFiltersSchema>;