import { z } from "zod";

export const OrderItemSchema = z
  .object({
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
      .optional()
      .nullable(),
    quantity: z
      .number({
        required_error: "Quantity is required",
        invalid_type_error: "Quantity must be a number",
      })
      .int("Quantity must be an integer")
      .min(1, "Quantity must be at least 1"),
    unitPrice: z
      .number({
        required_error: "Unit price is required",
        invalid_type_error: "Unit price must be a number",
      })
      .nonnegative("Unit price cannot be negative"),
    currency: z
      .string({
        required_error: "Currency is required",
        invalid_type_error: "Currency must be a string",
      })
      .length(3, "Currency must be a 3-letter ISO code")
      .transform((val) => val.toUpperCase()),
    name: z
      .string({
        required_error: "Product name is required",
        invalid_type_error: "Product name must be a string",
      })
      .min(1, "Product name cannot be empty"),
    imageUrl: z
      .string({
        invalid_type_error: "Image URL must be a string",
      })
      .url("Image URL must be a valid URL")
      .optional()
      .nullable(),
  })
  .strict();

export type OrderItemInput = z.infer<typeof OrderItemSchema>;

export const AddressSchema = z
  .object({
    firstName: z
      .string({
        required_error: "First name is required",
        invalid_type_error: "First name must be a string",
      })
      .min(1, "First name cannot be empty"),
    lastName: z
      .string({
        required_error: "Last name is required",
        invalid_type_error: "Last name must be a string",
      })
      .min(1, "Last name cannot be empty"),
    company: z
      .string({
        invalid_type_error: "Company must be a string",
      })
      .max(255, "Company name is too long")
      .optional()
      .nullable(),
    line1: z
      .string({
        required_error: "Address line 1 is required",
        invalid_type_error: "Address line 1 must be a string",
      })
      .min(1, "Address line 1 cannot be empty"),
    line2: z
      .string({
        invalid_type_error: "Address line 2 must be a string",
      })
      .max(255, "Address line 2 is too long")
      .optional()
      .nullable(),
    city: z
      .string({
        required_error: "City is required",
        invalid_type_error: "City must be a string",
      })
      .min(1, "City cannot be empty"),
    state: z
      .string({
        invalid_type_error: "State must be a string",
      })
      .max(255, "State is too long")
      .optional()
      .nullable(),
    postalCode: z
      .string({
        required_error: "Postal code is required",
        invalid_type_error: "Postal code must be a string",
      })
      .min(1, "Postal code cannot be empty")
      .max(32, "Postal code is too long"),
    country: z
      .string({
        required_error: "Country is required",
        invalid_type_error: "Country must be a string",
      })
      .length(2, "Country must be a 2-letter ISO code")
      .transform((val) => val.toUpperCase()),
    phone: z
      .string({
        invalid_type_error: "Phone must be a string",
      })
      .min(5, "Phone number is too short")
      .max(32, "Phone number is too long")
      .optional()
      .nullable(),
  })
  .strict();

export type AddressInput = z.infer<typeof AddressSchema>;

export const CustomerInfoSchema = z
  .object({
    email: z
      .string({
        required_error: "Email is required",
        invalid_type_error: "Email must be a string",
      })
      .email("Invalid email address"),
    firstName: z
      .string({
        required_error: "First name is required",
        invalid_type_error: "First name must be a string",
      })
      .min(1, "First name cannot be empty"),
    lastName: z
      .string({
        required_error: "Last name is required",
        invalid_type_error: "Last name must be a string",
      })
      .min(1, "Last name cannot be empty"),
    phone: z
      .string({
        invalid_type_error: "Phone must be a string",
      })
      .min(5, "Phone number is too short")
      .max(32, "Phone number is too long")
      .optional()
      .nullable(),
  })
  .strict();

export type CustomerInfoInput = z.infer<typeof CustomerInfoSchema>;

export const PaymentMethodSchema = z
  .object({
    provider: z
      .string({
        required_error: "Payment provider is required",
        invalid_type_error: "Payment provider must be a string",
      })
      .min(1, "Payment provider cannot be empty"),
    methodType: z
      .enum(["card", "wallet", "bank_transfer", "cod", "other"], {
        required_error: "Payment method type is required",
        invalid_type_error: "Invalid payment method type",
      }),
    externalPaymentId: z
      .string({
        invalid_type_error: "External payment ID must be a string",
      })
      .min(1, "External payment ID cannot be empty")
      .optional()
      .nullable(),
    last4: z
      .string({
        invalid_type_error: "Last4 must be a string",
      })
      .length(4, "Last4 must be 4 digits")
      .optional()
      .nullable(),
  })
  .strict();

export type PaymentMethodInput = z.infer<typeof PaymentMethodSchema>;

export const ShippingMethodSchema = z
  .object({
    id: z
      .string({
        required_error: "Shipping method ID is required",
        invalid_type_error: "Shipping method ID must be a string",
      })
      .min(1, "Shipping method ID cannot be empty"),
    label: z
      .string({
        required_error: "Shipping method label is required",
        invalid_type_error: "Shipping method label must be a string",
      })
      .min(1, "Shipping method label cannot be empty"),
    amount: z
      .number({
        required_error: "Shipping amount is required",
        invalid_type_error: "Shipping amount must be a number",
      })
      .nonnegative("Shipping amount cannot be negative"),
    currency: z
      .string({
        required_error: "Currency is required",
        invalid_type_error: "Currency must be a string",
      })
      .length(3, "Currency must be a 3-letter ISO code")
      .transform((val) => val.toUpperCase()),
  })
  .strict();

export type ShippingMethodInput = z.infer<typeof ShippingMethodSchema>;

export const OrderTotalsSchema = z
  .object({
    subtotal: z
      .number({
        required_error: "Subtotal is required",
        invalid_type_error: "Subtotal must be a number",
      })
      .nonnegative("Subtotal cannot be negative"),
    tax: z
      .number({
        required_error: "Tax is required",
        invalid_type_error: "Tax must be a number",
      })
      .nonnegative("Tax cannot be negative"),
    shipping: z
      .number({
        required_error: "Shipping total is required",
        invalid_type_error: "Shipping total must be a number",
      })
      .nonnegative("Shipping total cannot be negative"),
    discount: z
      .number({
        required_error: "Discount is required",
        invalid_type_error: "Discount must be a number",
      })
      .nonnegative("Discount cannot be negative"),
    total: z
      .number({
        required_error: "Total is required",
        invalid_type_error: "Total must be a number",
      })
      .nonnegative("Total cannot be negative"),
    currency: z
      .string({
        required_error: "Currency is required",
        invalid_type_error: "Currency must be a string",
      })
      .length(3, "Currency must be a 3-letter ISO code")
      .transform((val) => val.toUpperCase()),
  })
  .strict()
  .superRefine((data, ctx) => {
    const computedTotal = data.subtotal + data.tax + data.shipping - data.discount;
    if (Math.abs(computedTotal - data.total) > 0.01) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Total does not match subtotal + tax + shipping - discount",