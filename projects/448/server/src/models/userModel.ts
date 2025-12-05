import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  boolean,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", ["user", "admin", "moderator"]);
export const userStatusEnum = pgEnum("user_status", ["active", "inactive", "banned", "pending"]);

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),

    // Authentication
    email: varchar("email", { length: 255 }).notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    passwordSalt: varchar("password_salt", { length: 255 }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    loginAttempts: varchar("login_attempts", { length: 50 }).default("0"),
    resetPasswordToken: varchar("reset_password_token", { length: 255 }),
    resetPasswordTokenExpiresAt: timestamp("reset_password_token_expires_at", {
      withTimezone: true,
    }),

    // Roles & status
    role: userRoleEnum("role").notNull().default("user"),
    status: userStatusEnum("status").notNull().default("pending"),
    isSuperAdmin: boolean("is_super_admin").notNull().default(false),

    // Basic profile
    username: varchar("username", { length: 50 }).notNull(),
    displayName: varchar("display_name", { length: 100 }),
    firstName: varchar("first_name", { length: 100 }),
    lastName: varchar("last_name", { length: 100 }),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),

    // Preferences
    locale: varchar("locale", { length: 10 }).default("en"),
    timezone: varchar("timezone", { length: 50 }).default("UTC"),

    // Audit
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => {
    return {
      emailIdx: uniqueIndex("users_email_unique").on(table.email),
      usernameIdx: uniqueIndex("users_username_unique").on(table.username),
      roleIdx: index("users_role_idx").on(table.role),
      statusIdx: index("users_status_idx").on(table.status),
      createdAtIdx: index("users_created_at_idx").on(table.createdAt),
    };
  }
);

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type UserStatus = (typeof userStatusEnum.enumValues)[number];

export const PUBLIC_USER_FIELDS: Array<keyof User> = [
  "id",
  "username",
  "displayName",
  "firstName",
  "lastName",
  "avatarUrl",
  "bio",
  "locale",
  "timezone",
  "createdAt",
];

export const SAFE_USER_FIELDS: Array<keyof User> = [
  "id",
  "email",
  "emailVerified",
  "username",
  "displayName",
  "firstName",
  "lastName",
  "avatarUrl",
  "bio",
  "role",
  "status",
  "locale",
  "timezone",
  "lastLoginAt",
  "createdAt",
  "updatedAt",
];

export const isAdmin = (user: Pick<User, "role" | "isSuperAdmin"> | null | undefined): boolean => {
  if (!user) return false;
  return user.isSuperAdmin || user.role === "admin";
};

export const isModerator = (user: Pick<User, "role" | "isSuperAdmin"> | null | undefined): boolean => {
  if (!user) return false;
  return user.isSuperAdmin || user.role === "moderator" || user.role === "admin";
};

export const isActiveUser = (user: Pick<User, "status"> | null | undefined): boolean => {
  if (!user) return false;
  return user.status === "active";
};

export const sanitizeUserForPublic = (user: User | null | undefined): Partial<User> | null => {
  if (!user) return null;
  const result: Partial<User> = {};
  for (const field of PUBLIC_USER_FIELDS) {
    result[field] = user[field];
  }
  return result;
};

export const sanitizeUserForClient = (user: User | null | undefined): Partial<User> | null => {
  if (!user) return null;
  const result: Partial<User> = {};
  for (const field of SAFE_USER_FIELDS) {
    result[field] = user[field];
  }
  return result;
};