import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  integer,
  numeric,
  jsonb,
  timestamp,
  text,
} from "drizzle-orm/pg-core";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { orders } from "./orderModel";
import { products } from "./productModel";

export type ProductSnapshot = {
  name: string;
  sku?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  metadata?: Record<string, unknown> | null;
};

export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade", onUpdate: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict", onUpdate: "cascade" }),
  quantity: integer("quantity").notNull().check("order_items_quantity_check", (q) => q.gt(0)),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull(),
  productSnapshot: jsonb("product_snapshot").$type<ProductSnapshot>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

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

export type OrderItem = InferSelectModel<typeof orderItems>;
export type NewOrderItem = InferInsertModel<typeof orderItems>;