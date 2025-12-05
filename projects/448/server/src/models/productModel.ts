import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export type ProductStatus = "draft" | "active" | "inactive" | "archived";
export type ProductCondition = "new" | "used_like_new" | "used_good" | "used_fair" | "refurbished";

export interface ProductImage {
  id: string;
  url: string;
  alt?: string | null;
  isPrimary?: boolean;
  sortOrder?: number;
  width?: number | null;
  height?: number | null;
}

export interface ProductTag {
  id: string;
  label: string;
  slug: string;
}

export interface ProductAttribute {
  name: string;
  value: string | number | boolean;
  unit?: string | null;
}

export interface ProductVariantOption {
  name: string;
  value: string;
}

export interface ProductVariant {
  id: string;
  sku?: string | null;
  barcode?: string | null;
  options: ProductVariantOption[];
  price?: string | null;
  compareAtPrice?: string | null;
  inventoryQuantity?: number | null;
  inventoryLocationId?: string | null;
  isDefault?: boolean;
}

export interface ProductSEO {
  title?: string | null;
  description?: string | null;
  keywords?: string[] | null;
}

export interface ProductDimensions {
  weight?: number | null;
  weightUnit?: string | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  dimensionUnit?: string | null;
}

export interface ProductInventory {
  sku?: string | null;
  barcode?: string | null;
  quantity: number;
  reservedQuantity?: number | null;
  locationId?: string | null;
  allowBackorder?: boolean;
  lowStockThreshold?: number | null;
}

export interface ProductMarketplaceAttributes {
  amazon?: {
    asin?: string | null;
    fulfillmentChannel?: "FBA" | "FBM" | null;
    browseNodes?: string[] | null;
  } | null;
  ebay?: {
    itemId?: string | null;
    categoryId?: string | null;
    conditionId?: string | null;
  } | null;
  etsy?: {
    listingId?: string | null;
    sectionId?: string | null;
  } | null;
  shopify?: {
    productId?: string | null;
    handle?: string | null;
  } | null;
  custom?: Record<string, unknown> | null;
}

export interface ProductMetadata {
  [key: string]: unknown;
}

export const products = pgTable(
  "products",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey()
      .notNull(),

    // Core info
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    description: text("description"),
    shortDescription: varchar("short_description", { length: 512 }),

    // Pricing
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    compareAtPrice: numeric("compare_at_price", { precision: 12, scale: 2 }),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),

    // Category & tags
    categoryId: uuid("category_id"),
    categoryPath: varchar("category_path", { length: 1024 }),
    tags: jsonb("tags").$type<ProductTag[]>().default(sql`'[]'::jsonb`).notNull(),

    // Inventory
    inventory: jsonb("inventory")
      .$type<ProductInventory>()
      .default(
        sql`jsonb_build_object(
          'quantity', 0,
          'reservedQuantity', 0,
          'allowBackorder', false
        )`
      )
      .notNull(),
    trackInventory: boolean("track_inventory").notNull().default(true),
    isPhysicalProduct: boolean("is_physical_product").notNull().default(true),

    // Images
    images: jsonb("images")
      .$type<ProductImage[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    thumbnailUrl: varchar("thumbnail_url", { length: 1024 }),

    // Variants
    hasVariants: boolean("has_variants").notNull().default(false),
    variants: jsonb("variants")
      .$type<ProductVariant[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),

    // Attributes & dimensions
    attributes: jsonb("attributes")
      .$type<ProductAttribute[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    dimensions: jsonb("dimensions")
      .$type<ProductDimensions>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    condition: varchar("condition", { length: 32 }).$type<ProductCondition>().default("new"),

    // SEO
    seo: jsonb("seo")
      .$type<ProductSEO>()
      .default(sql`'{}'::jsonb`)
      .notNull(),

    // Status & visibility
    status: varchar("status", { length: 32 }).$type<ProductStatus>().notNull().default("draft"),
    isFeatured: boolean("is_featured").notNull().default(false),
    isVisible: boolean("is_visible").notNull().default(true),

    // Marketplace-specific attributes
    marketplaceAttributes: jsonb("marketplace_attributes")
      .$type<ProductMarketplaceAttributes>()
      .default(sql`'{}'::jsonb`)
      .notNull(),

    // Misc
    metadata: jsonb("metadata")
      .$type<ProductMetadata>()
      .default(sql`'{}'::jsonb`)
      .notNull(),

    // Audit
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => {
    return {
      slugIdx: index("products_slug_idx").on(table.slug),
      categoryIdx: index("products_category_idx").on(table.categoryId),
      statusIdx: index("products_status_idx").on(table.status),
      visibilityIdx: index("products_visibility_idx").on(table.isVisible),
      featuredIdx: index("products_featured_idx").on(table.isFeatured),
      createdAtIdx: index("products_created_at_idx").on(table.createdAt),
    };
  }
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;