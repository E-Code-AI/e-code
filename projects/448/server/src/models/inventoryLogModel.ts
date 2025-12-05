import { pgTable, serial, integer, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { products } from "./productModel";

export type InventoryAdjustmentSource =
  | "order"
  | "order_cancellation"
  | "manual_adjustment"
  | "stock_take"
  | "system_correction";

export type InventoryAdjustmentReason =
  | "new_order"
  | "order_item_removed"
  | "order_cancelled"
  | "manual_increase"
  | "manual_decrease"
  | "stock_take_increase"
  | "stock_take_decrease"
  | "system_sync"
  | "system_correction"
  | "return_to_stock"
  | "damage_or_loss";

export const inventoryLogs = pgTable("inventory_logs", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict", onUpdate: "cascade" }),
  previousQuantity: integer("previous_quantity").notNull(),
  newQuantity: integer("new_quantity").notNull(),
  delta: integer("delta").notNull(),
  source: text("source").$type<InventoryAdjustmentSource>().notNull(),
  reason: text("reason").$type<InventoryAdjustmentReason>().notNull(),
  referenceId: text("reference_id"),
  referenceType: text("reference_type"),
  note: text("note"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`NOW()`),
});

export type InventoryLog = typeof inventoryLogs.$inferSelect;
export type NewInventoryLog = typeof inventoryLogs.$inferInsert;

export interface CreateInventoryLogInput {
  productId: number;
  previousQuantity: number;
  newQuantity: number;
  delta: number;
  source: InventoryAdjustmentSource;
  reason: InventoryAdjustmentReason;
  referenceId?: string | null;
  referenceType?: string | null;
  note?: string | null;
  metadata?: Record<string, unknown>;
  createdBy?: string | null;
}