import { pgTable, serial, varchar, integer, timestamp, jsonb, text } from "drizzle-orm/pg-core";
import { relations, InferSelectModel, InferInsertModel } from "drizzle-orm";
import { orders } from "./orderModel";
import { users } from "./userModel";

export const emailLogStatusEnum = {
  PENDING: "PENDING",
  SENT: "SENT",
  FAILED: "FAILED",
  RETRYING: "RETRYING",
} as const;

export type EmailLogStatus = (typeof emailLogStatusEnum)[keyof typeof emailLogStatusEnum];

export const emailLogTypeEnum = {
  ORDER_CONFIRMATION: "ORDER_CONFIRMATION",
  SHIPPING_NOTIFICATION: "SHIPPING_NOTIFICATION",
  DELIVERY_CONFIRMATION: "DELIVERY_CONFIRMATION",
  PASSWORD_RESET: "PASSWORD_RESET",
  ACCOUNT_VERIFICATION: "ACCOUNT_VERIFICATION",
  GENERIC_NOTIFICATION: "GENERIC_NOTIFICATION",
} as const;

export type EmailLogType = (typeof emailLogTypeEnum)[keyof typeof emailLogTypeEnum];

export const emailLogs = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 64 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default(emailLogStatusEnum.PENDING),
  toEmail: varchar("to_email", { length: 255 }).notNull(),
  cc: jsonb("cc").$type<string[] | null>().default(null),
  bcc: jsonb("bcc").$type<string[] | null>().default(null),
  subject: varchar("subject", { length: 255 }).notNull(),
  templateName: varchar("template_name", { length: 128 }).notNull(),
  templateData: jsonb("template_data").$type<Record<string, unknown> | null>().default(null),
  providerMessageId: varchar("provider_message_id", { length: 255 }),
  providerName: varchar("provider_name", { length: 64 }),
  errorCode: varchar("error_code", { length: 128 }),
  errorMessage: text("error_message"),
  errorDetails: jsonb("error_details").$type<Record<string, unknown> | null>().default(null),
  retryCount: integer("retry_count").notNull().default(0),
  maxRetries: integer("max_retries").notNull().default(3),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  orderId: integer("order_id").references(() => orders.id, { onDelete: "set null" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const emailLogsRelations = relations(emailLogs, ({ one }) => ({
  order: one(orders, {
    fields: [emailLogs.orderId],
    references: [orders.id],
  }),
  user: one(users, {
    fields: [emailLogs.userId],
    references: [users.id],
  }),
}));

export type EmailLog = InferSelectModel<typeof emailLogs>;
export type NewEmailLog = InferInsertModel<typeof emailLogs>;

export const isEmailLogStatus = (value: unknown): value is EmailLogStatus => {
  if (typeof value !== "string") return false;
  return Object.values(emailLogStatusEnum).includes(value as EmailLogStatus);
};

export const isEmailLogType = (value: unknown): value is EmailLogType => {
  if (typeof value !== "string") return false;
  return Object.values(emailLogTypeEnum).includes(value as EmailLogType);
};

export const createEmailLogDefaults = (overrides: Partial<NewEmailLog> = {}): NewEmailLog => {
  const now = new Date();
  return {
    type: emailLogTypeEnum.GENERIC_NOTIFICATION,
    status: emailLogStatusEnum.PENDING,
    toEmail: "",
    subject: "",
    templateName: "",
    cc: null,
    bcc: null,
    templateData: null,
    providerMessageId: null,
    providerName: null,
    errorCode: null,
    errorMessage: null,
    errorDetails: null,
    retryCount: 0,
    maxRetries: 3,
    lastAttemptAt: null,
    sentAt: null,
    orderId: null,
    userId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};