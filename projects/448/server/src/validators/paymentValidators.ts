import { z } from "zod";

const currencyCodeRegex = /^[A-Z]{3}$/;
const stripeIdRegex = /^((cus|pi|ch|evt|sub|price|prod|acct|seti|setacct|cs|in|pm|card)_[A-Za-z0-9]+)$/;
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const CreatePaymentIntentSchema = z.object({
  amount: z
    .number()
    .int()
    .positive()
    .max(10_000_000, "Amount exceeds maximum allowed"),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(currencyCodeRegex, "Invalid currency code"),
  customerId: z
    .string()
    .trim()
    .regex(stripeIdRegex, "Invalid Stripe customer ID")
    .optional(),
  metadata: z
    .record(z.string().min(1), z.string().max(500))
    .optional()
    .default({}),
  description: z.string().trim().max(500).optional(),
  receiptEmail: z.string().email().optional(),
  paymentMethodId: z
    .string()
    .trim()
    .regex(stripeIdRegex, "Invalid Stripe payment method ID")
    .optional(),
  savePaymentMethod: z.boolean().optional().default(false),
});

export type CreatePaymentIntentInput = z.infer<typeof CreatePaymentIntentSchema>;

export const ConfirmPaymentIntentSchema = z.object({
  paymentIntentId: z
    .string()
    .trim()
    .regex(stripeIdRegex, "Invalid Stripe payment intent ID"),
  paymentMethodId: z
    .string()
    .trim()
    .regex(stripeIdRegex, "Invalid Stripe payment method ID")
    .optional(),
  returnUrl: z.string().url().optional(),
});

export type ConfirmPaymentIntentInput = z.infer<
  typeof ConfirmPaymentIntentSchema
>;

export const AttachPaymentMethodSchema = z.object({
  customerId: z
    .string()
    .trim()
    .regex(stripeIdRegex, "Invalid Stripe customer ID"),
  paymentMethodId: z
    .string()
    .trim()
    .regex(stripeIdRegex, "Invalid Stripe payment method ID"),
  setAsDefault: z.boolean().optional().default(false),
});

export type AttachPaymentMethodInput = z.infer<
  typeof AttachPaymentMethodSchema
>;

export const DetachPaymentMethodSchema = z.object({
  paymentMethodId: z
    .string()
    .trim()
    .regex(stripeIdRegex, "Invalid Stripe payment method ID"),
});

export type DetachPaymentMethodInput = z.infer<
  typeof DetachPaymentMethodSchema
>;

export const ListPaymentMethodsSchema = z.object({
  customerId: z
    .string()
    .trim()
    .regex(stripeIdRegex, "Invalid Stripe customer ID"),
  type: z.enum(["card"]).default("card"),
  limit: z.number().int().min(1).max(100).optional(),
});

export type ListPaymentMethodsInput = z.infer<typeof ListPaymentMethodsSchema>;

export const CreateSubscriptionSchema = z.object({
  customerId: z
    .string()
    .trim()
    .regex(stripeIdRegex, "Invalid Stripe customer ID"),
  priceId: z
    .string()
    .trim()
    .regex(stripeIdRegex, "Invalid Stripe price ID"),
  trialPeriodDays: z.number().int().min(1).max(365).optional(),
  metadata: z
    .record(z.string().min(1), z.string().max(500))
    .optional()
    .default({}),
  couponId: z.string().trim().max(100).optional(),
  paymentBehavior: z
    .enum(["default_incomplete", "error_if_incomplete", "allow_incomplete"])
    .optional(),
});

export type CreateSubscriptionInput = z.infer<typeof CreateSubscriptionSchema>;

export const UpdateSubscriptionSchema = z.object({
  subscriptionId: z
    .string()
    .trim()
    .regex(stripeIdRegex, "Invalid Stripe subscription ID"),
  cancelAtPeriodEnd: z.boolean().optional(),
  newPriceId: z
    .string()
    .trim()
    .regex(stripeIdRegex, "Invalid Stripe price ID")
    .optional(),
  prorationBehavior: z
    .enum(["create_prorations", "none", "always_invoice"])
    .optional(),
  metadata: z
    .record(z.string().min(1), z.string().max(500))
    .optional(),
});

export type UpdateSubscriptionInput = z.infer<typeof UpdateSubscriptionSchema>;

export const CancelSubscriptionSchema = z.object({
  subscriptionId: z
    .string()
    .trim()
    .regex(stripeIdRegex, "Invalid Stripe subscription ID"),
  invoiceNow: z.boolean().optional(),
  prorate: z.boolean().optional(),
});

export type CancelSubscriptionInput = z.infer<typeof CancelSubscriptionSchema>;

export const CreateCheckoutSessionSchema = z.object({
  priceId: z
    .string()
    .trim()
    .regex(stripeIdRegex, "Invalid Stripe price ID"),
  quantity: z.number().int().min(1).max(100).default(1),
  mode: z.enum(["payment", "subscription"]).default("payment"),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  customerEmail: z.string().email().optional(),
  clientReferenceId: z.string().trim().max(255).optional(),
  metadata: z
    .record(z.string().min(1), z.string().max(500))
    .optional()
    .default({}),
});

export type CreateCheckoutSessionInput = z.infer<
  typeof CreateCheckoutSessionSchema
>;

export const StripeWebhookHeadersSchema = z.object({
  "stripe-signature": z.string().min(1, "Missing Stripe signature header"),
});

export type StripeWebhookHeaders = z.infer<typeof StripeWebhookHeadersSchema>;

export const StripeWebhookRequestSchema = z.object({
  headers: StripeWebhookHeadersSchema,
  rawBody: z.instanceof(Buffer),
});

export type StripeWebhookRequest = z.infer<typeof StripeWebhookRequestSchema>;

export const StripeEventBaseSchema = z.object({
  id: z.string().regex(stripeIdRegex, "Invalid Stripe event ID"),
  type: z.string().min(1),
  created: z.number().int().positive(),
  livemode: z.boolean(),
  pending_webhooks: z.number().int().nonnegative(),
  request: z
    .object({
      id: z.string().nullable(),
      idempotency_key: z.string().nullable(),
    })
    .nullable(),
});

export type StripeEventBase = z.infer<typeof StripeEventBaseSchema>;

export const StripePaymentMetadataSchema = z.object({
  userId: z
    .string()
    .regex(uuidRegex, "Invalid userId in metadata")
    .optional(),
  orderId: z
    .string()
    .regex(uuidRegex, "Invalid orderId in metadata")
    .optional(),
  subscriptionId: z
    .string()
    .regex(uuidRegex, "Invalid subscriptionId in metadata")
    .optional(),
  environment: z.enum(["development", "staging", "production"]).optional(),
  source: z.string().max(100).optional(),
});

export type StripePaymentMetadata = z.infer<typeof StripePaymentMetadataSchema>;

export const StripePaymentIntentObjectSchema = z.object({
  id: z.string().regex(stripeIdRegex, "Invalid payment intent ID"),
  object: z.literal("payment_intent"),
  amount: z.number().int().positive(),
  currency: z.string().regex(currencyCodeRegex),
  status: z.string(),
  customer: z.string().regex(stripeIdRegex).nullable().optional(),
  metadata: z.record(z.string(), z.string()).optional().default({}),
});

export type StripePaymentIntentObject = z.infer<
  typeof StripePaymentIntentObjectSchema
>;

export const StripeInvoiceObjectSchema = z.object({
  id: z.string().regex(stripeIdRegex, "Invalid invoice ID"),
  object: z.literal("invoice"),
  customer: z.string().regex(stripeIdRegex).nullable().optional(),
  subscription: z.string().regex(stripeIdRegex).nullable().optional(),
  status: z.string().optional(),
  metadata: z.record(z.string(), z.string()).optional().default({}),
});

export type StripeInvoiceObject = z.infer<typeof StripeInvoiceObjectSchema>;

export const StripeSubscriptionObjectSchema = z.object({
  id: z.string().regex(stripeIdRegex, "Invalid subscription ID"),
  object: z.literal("subscription"),
  customer: z.string().regex(stripeIdRegex),
  status: z.string(),
  metadata: z.record(z.string(), z.string()).optional().default({}),
});

export type StripeSubscriptionObject = z.infer<
  typeof StripeSubscriptionObjectSchema
>;

export const StripeChargeObjectSchema = z.object({
  id: z.string().regex(stripeIdRegex, "Invalid charge ID"),
  object: z.literal("charge"),
  amount: z.number().int().positive(),
  currency: z.string().regex(currencyCodeRegex),
  paid: z.boolean(),
  status: