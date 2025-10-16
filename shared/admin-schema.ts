// @ts-nocheck
import { pgTable, varchar, text, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// API Keys Management
export const apiKeys = pgTable("api_keys", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  provider: varchar("provider", { length: 50 }).notNull(), // openai, anthropic, gemini, xai, perplexity
  key: text("key").notNull(),
  name: varchar("name", { length: 255 }),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  usageLimit: integer("usage_limit"),
  currentUsage: integer("current_usage").default(0),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertApiKeySchema = createInsertSchema(apiKeys);
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;

// CMS Pages
export const cmsPages = pgTable("cms_pages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(),
  metaTitle: varchar("meta_title", { length: 255 }),
  metaDescription: text("meta_description"),
  metaKeywords: text("meta_keywords"),
  status: varchar("status", { length: 20 }).default("draft"), // draft, published, archived
  publishedAt: timestamp("published_at"),
  authorId: integer("author_id"),
  template: varchar("template", { length: 50 }).default("default"),
  customCss: text("custom_css"),
  customJs: text("custom_js"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertCmsPageSchema = createInsertSchema(cmsPages);
export type InsertCmsPage = z.infer<typeof insertCmsPageSchema>;
export type CmsPage = typeof cmsPages.$inferSelect;

// Documentation
export const documentation = pgTable("documentation", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  categoryId: integer("category_id"),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  order: integer("order").default(0),
  status: varchar("status", { length: 20 }).default("draft"),
  version: varchar("version", { length: 20 }),
  tags: jsonb("tags").$type<string[]>().default([]),
  relatedDocs: jsonb("related_docs").$type<number[]>().default([]),
  authorId: integer("author_id"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertDocumentationSchema = createInsertSchema(documentation);
export type InsertDocumentation = z.infer<typeof insertDocumentationSchema>;
export type Documentation = typeof documentation.$inferSelect;

// Documentation Categories
export const docCategories = pgTable("doc_categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  parentId: integer("parent_id"),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 100 }),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertDocCategorySchema = createInsertSchema(docCategories);
export type InsertDocCategory = z.infer<typeof insertDocCategorySchema>;
export type DocCategory = typeof docCategories.$inferSelect;

// Support Tickets
export const supportTickets = pgTable("support_tickets", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  ticketNumber: varchar("ticket_number", { length: 20 }).unique().notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 50 }), // billing, technical, account, other
  priority: varchar("priority", { length: 20 }).default("normal"), // low, normal, high, urgent
  status: varchar("status", { length: 20 }).default("open"), // open, in_progress, resolved, closed
  assignedTo: integer("assigned_to"),
  tags: jsonb("tags").$type<string[]>().default([]),
  attachments: jsonb("attachments").$type<{url: string, name: string}[]>().default([]),
  resolvedAt: timestamp("resolved_at"),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertSupportTicketSchema = createInsertSchema(supportTickets);
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;

// Support Ticket Replies
export const ticketReplies = pgTable("ticket_replies", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  ticketId: integer("ticket_id").notNull(),
  userId: integer("user_id").notNull(),
  message: text("message").notNull(),
  isInternal: boolean("is_internal").default(false), // Internal notes for staff
  attachments: jsonb("attachments").$type<{url: string, name: string}[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertTicketReplySchema = createInsertSchema(ticketReplies);
export type InsertTicketReply = z.infer<typeof insertTicketReplySchema>;
export type TicketReply = typeof ticketReplies.$inferSelect;

// User Subscriptions
export const userSubscriptions = pgTable("user_subscriptions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  planId: varchar("plan_id", { length: 50 }).notNull(), // free, pro, enterprise
  status: varchar("status", { length: 20 }).default("active"), // active, cancelled, expired, paused
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAt: timestamp("cancel_at"),
  cancelledAt: timestamp("cancelled_at"),
  features: jsonb("features").$type<Record<string, any>>().default({}),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions);
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;
export type UserSubscription = typeof userSubscriptions.$inferSelect;

// Admin Activity Logs
export const adminActivityLogs = pgTable("admin_activity_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  adminId: integer("admin_id").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }), // user, subscription, ticket, etc.
  entityId: integer("entity_id"),
  details: jsonb("details").$type<Record<string, any>>().default({}),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertAdminActivityLogSchema = createInsertSchema(adminActivityLogs);
export type InsertAdminActivityLog = z.infer<typeof insertAdminActivityLogSchema>;
export type AdminActivityLog = typeof adminActivityLogs.$inferSelect;