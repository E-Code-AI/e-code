import { pgTable, serial, integer, text, timestamp, numeric, jsonb, pgEnum, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { users } from "./userModel";
import { products } from "./productModel";

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "processing",
  "paid",
  "shipped",
  "completed",
  "cancelled",
  "refunded",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "authorized",
  "captured",
  "failed",
  "refunded",
  "voided",
]);

export const fulfillmentStatusEnum = pgEnum("fulfillment_status", [
  "unfulfilled",
  "partial",
  "fulfilled",
  "returned",
]);

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    status: orderStatusEnum("status").notNull().default("pending"),
    paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending"),
    fulfillmentStatus: fulfillmentStatusEnum("fulfillment_status").notNull().default("unfulfilled"),
    currency: text("currency").notNull().default("USD"),
    subtotalAmount: numeric("subtotal_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
    taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
    shippingAmount: numeric("shipping_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
    discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
    totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
    paymentProvider: text("payment_provider"),
    paymentReference: text("payment_reference"),
    paymentMetadata: jsonb("payment_metadata").$type<Record<string, unknown> | null>().default(null),
    shippingAddress: jsonb("shipping_address").$type<Record<string, unknown> | null>().default(null),
    billingAddress: jsonb("billing_address").$type<Record<string, unknown> | null>().default(null),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    shippedAt: timestamp("shipped_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    userIdx: index("orders_user_id_idx").on(table.userId),
    statusIdx: index("orders_status_idx").on(table.status),
    paymentStatusIdx: index("orders_payment_status_idx").on(table.paymentStatus),
    createdAtIdx: index("orders_created_at_idx").on(table.createdAt),
  })
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade", onUpdate: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict", onUpdate: "cascade" }),
    quantity: integer("quantity").notNull(),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull().default("0.00"),
    totalPrice: numeric("total_price", { precision: 12, scale: 2 }).notNull().default("0.00"),
    currency: text("currency").notNull().default("USD"),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>().default(null),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orderIdx: index("order_items_order_id_idx").on(table.orderId),
    productIdx: index("order_items_product_id_idx").on(table.productId),
  })
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export type Order = InferSelectModel<typeof orders>;
export type NewOrder = InferInsertModel<typeof orders>;

export type OrderItem = InferSelectModel<typeof orderItems>;
export type NewOrderItem = InferInsertModel<typeof orderItems>;

export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];
export type FulfillmentStatus = (typeof fulfillmentStatusEnum.enumValues)[number];