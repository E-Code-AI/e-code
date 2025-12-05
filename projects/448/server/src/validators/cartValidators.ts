import { z } from "zod";

export const cartItemBaseSchema = z.object({
  productId: z
    .string({
      required_error: "Product ID is required",
      invalid_type_error: "Product ID must be a string",
    })
    .min(1, "Product ID cannot be empty"),
  variantId: z
    .string({
      invalid_type_error: "Variant ID must be a string",
    })
    .min(1, "Variant ID cannot be empty")
    .optional(),
  quantity: z
    .number({
      required_error: "Quantity is required",
      invalid_type_error: "Quantity must be a number",
    })
    .int("Quantity must be an integer")
    .min(1, "Quantity must be at least 1"),
  metadata: z
    .record(z.unknown(), {
      invalid_type_error: "Metadata must be an object",
    })
    .optional(),
});

export const addCartItemSchema = cartItemBaseSchema.extend({
  cartId: z
    .string({
      required_error: "Cart ID is required",
      invalid_type_error: "Cart ID must be a string",
    })
    .min(1, "Cart ID cannot be empty")
    .optional(),
});

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;

export const updateCartItemSchema = z.object({
  cartId: z
    .string({
      required_error: "Cart ID is required",
      invalid_type_error: "Cart ID must be a string",
    })
    .min(1, "Cart ID cannot be empty"),
  itemId: z
    .string({
      required_error: "Item ID is required",
      invalid_type_error: "Item ID must be a string",
    })
    .min(1, "Item ID cannot be empty"),
  quantity: z
    .number({
      invalid_type_error: "Quantity must be a number",
    })
    .int("Quantity must be an integer")
    .min(1, "Quantity must be at least 1")
    .optional(),
  metadata: z
    .record(z.unknown(), {
      invalid_type_error: "Metadata must be an object",
    })
    .optional(),
});

export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;

export const removeCartItemSchema = z.object({
  cartId: z
    .string({
      required_error: "Cart ID is required",
      invalid_type_error: "Cart ID must be a string",
    })
    .min(1, "Cart ID cannot be empty"),
  itemId: z
    .string({
      required_error: "Item ID is required",
      invalid_type_error: "Item ID must be a string",
    })
    .min(1, "Item ID cannot be empty"),
});

export type RemoveCartItemInput = z.infer<typeof removeCartItemSchema>;

export const clearCartSchema = z.object({
  cartId: z
    .string({
      required_error: "Cart ID is required",
      invalid_type_error: "Cart ID must be a string",
    })
    .min(1, "Cart ID cannot be empty"),
});

export type ClearCartInput = z.infer<typeof clearCartSchema>;

export const bulkAddCartItemsSchema = z.object({
  cartId: z
    .string({
      required_error: "Cart ID is required",
      invalid_type_error: "Cart ID must be a string",
    })
    .min(1, "Cart ID cannot be empty")
    .optional(),
  items: z
    .array(cartItemBaseSchema, {
      required_error: "Items are required",
      invalid_type_error: "Items must be an array",
    })
    .min(1, "At least one item is required"),
  replaceExisting: z
    .boolean({
      invalid_type_error: "replaceExisting must be a boolean",
    })
    .optional()
    .default(false),
});

export type BulkAddCartItemsInput = z.infer<typeof bulkAddCartItemsSchema>;

export const bulkUpdateCartItemsSchema = z.object({
  cartId: z
    .string({
      required_error: "Cart ID is required",
      invalid_type_error: "Cart ID must be a string",
    })
    .min(1, "Cart ID cannot be empty"),
  items: z
    .array(
      z.object({
        itemId: z
          .string({
            required_error: "Item ID is required",
            invalid_type_error: "Item ID must be a string",
          })
          .min(1, "Item ID cannot be empty"),
        quantity: z
          .number({
            invalid_type_error: "Quantity must be a number",
          })
          .int("Quantity must be an integer")
          .min(1, "Quantity must be at least 1")
          .optional(),
        metadata: z
          .record(z.unknown(), {
            invalid_type_error: "Metadata must be an object",
          })
          .optional(),
      }),
      {
        required_error: "Items are required",
        invalid_type_error: "Items must be an array",
      }
    )
    .min(1, "At least one item is required"),
});

export type BulkUpdateCartItemsInput = z.infer<typeof bulkUpdateCartItemsSchema>;

export const bulkRemoveCartItemsSchema = z.object({
  cartId: z
    .string({
      required_error: "Cart ID is required",
      invalid_type_error: "Cart ID must be a string",
    })
    .min(1, "Cart ID cannot be empty"),
  itemIds: z
    .array(
      z.string({
        invalid_type_error: "Item ID must be a string",
      }).min(1, "Item ID cannot be empty"),
      {
        required_error: "Item IDs are required",
        invalid_type_error: "Item IDs must be an array of strings",
      }
    )
    .min(1, "At least one item ID is required"),
});

export type BulkRemoveCartItemsInput = z.infer<typeof bulkRemoveCartItemsSchema>;

export const getCartSchema = z.object({
  cartId: z
    .string({
      required_error: "Cart ID is required",
      invalid_type_error: "Cart ID must be a string",
    })
    .min(1, "Cart ID cannot be empty"),
  includeItems: z
    .boolean({
      invalid_type_error: "includeItems must be a boolean",
    })
    .optional()
    .default(true),
});

export type GetCartInput = z.infer<typeof getCartSchema>;

export const mergeCartsSchema = z.object({
  sourceCartId: z
    .string({
      required_error: "Source cart ID is required",
      invalid_type_error: "Source cart ID must be a string",
    })
    .min(1, "Source cart ID cannot be empty"),
  targetCartId: z
    .string({
      required_error: "Target cart ID is required",
      invalid_type_error: "Target cart ID must be a string",
    })
    .min(1, "Target cart ID cannot be empty"),
  conflictStrategy: z
    .enum(["source-wins", "target-wins", "sum-quantities"], {
      invalid_type_error:
        "Conflict strategy must be one of: source-wins, target-wins, sum-quantities",
    })
    .default("sum-quantities"),
});

export type MergeCartsInput = z.infer<typeof mergeCartsSchema>;

export const applyCartDiscountSchema = z.object({
  cartId: z
    .string({
      required_error: "Cart ID is required",
      invalid_type_error: "Cart ID must be a string",
    })
    .min(1, "Cart ID cannot be empty"),
  code: z
    .string({
      required_error: "Discount code is required",
      invalid_type_error: "Discount code must be a string",
    })
    .min(1, "Discount code cannot be empty"),
});

export type ApplyCartDiscountInput = z.infer<typeof applyCartDiscountSchema>;

export const removeCartDiscountSchema = z.object({
  cartId: z
    .string({
      required_error: "Cart ID is required",
      invalid_type_error: "Cart ID must be a string",
    })
    .min(1, "Cart ID cannot be empty"),
  code: z
    .string({
      required_error: "Discount code is required",
      invalid_type_error: "Discount code must be a string",
    })
    .min(1, "Discount code cannot be empty"),
});

export type RemoveCartDiscountInput = z.infer<typeof removeCartDiscountSchema>;

export const setCartMetadataSchema = z.object({
  cartId: z
    .string({
      required_error: "Cart ID is required",
      invalid_type_error: "Cart ID must be a string",
    })
    .min(1, "Cart ID cannot be empty"),
  metadata: z
    .record(z.unknown(), {
      required_error: "Metadata is required",
      invalid_type_error: "Metadata must be an object",
    })
    .optional(),
});

export type SetCartMetadataInput = z.infer<typeof setCartMetadataSchema>;

export const cartValidators = {
  addCartItemSchema,
  updateCartItemSchema,
  removeCartItemSchema,
  clearCartSchema,
  bulkAddCartItemsSchema,
  bulkUpdateCartItemsSchema,
  bulkRemoveCartItemsSchema,
  getCartSchema