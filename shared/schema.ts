import { pgTable, text, serial, integer, boolean, timestamp, pgEnum, uniqueIndex, json, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Project visibility enum
export const visibilityEnum = pgEnum("visibility", ["public", "private", "unlisted"]);

// Programming language enum
export const languageEnum = pgEnum("language", [
  "nodejs", "python", "java", "go", "ruby", "rust", "php", "c", "cpp", 
  "csharp", "swift", "kotlin", "dart", "typescript", "bash", 
  "html-css-js", "nix", "deno"
]);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  emailVerified: boolean("email_verified").default(false).notNull(),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpiry: timestamp("email_verification_expiry"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpiry: timestamp("password_reset_expiry"),
  failedLoginAttempts: integer("failed_login_attempts").default(0).notNull(),
  accountLockedUntil: timestamp("account_locked_until"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
  twoFactorSecret: text("two_factor_secret"),
  lastLoginAt: timestamp("last_login_at"),
  lastLoginIp: text("last_login_ip"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
});

// Login history table
export const loginHistory = pgTable("login_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent"),
  successful: boolean("successful").notNull(),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLoginHistorySchema = createInsertSchema(loginHistory).pick({
  userId: true,
  ipAddress: true,
  userAgent: true,
  successful: true,
  failureReason: true,
});

// API tokens table
export const apiTokens = pgTable("api_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  token: text("token").notNull().unique(),
  tokenHash: text("token_hash").notNull().unique(), // Store hashed version for lookups
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  scopes: json("scopes").default(['read', 'write']), // JSON array of permission scopes
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertApiTokenSchema = createInsertSchema(apiTokens).pick({
  userId: true,
  name: true,
  token: true,
  tokenHash: true,
  expiresAt: true,
  scopes: true,
});

// Projects table
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  visibility: visibilityEnum("visibility").default("private").notNull(),
  language: languageEnum("language").default("nodejs"),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProjectSchema = createInsertSchema(projects).pick({
  name: true,
  description: true,
  visibility: true,
  language: true,
  ownerId: true,
});

// Project collaborators table - represents users who have access to a project
export const projectCollaborators = pgTable("project_collaborators", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  userId: integer("user_id").notNull().references(() => users.id),
  role: text("role").default("editor").notNull(), // owner, editor, viewer
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    projectUserIdx: uniqueIndex("project_user_idx").on(table.projectId, table.userId),
  };
});

export const insertProjectCollaboratorSchema = createInsertSchema(projectCollaborators).pick({
  projectId: true,
  userId: true,
  role: true,
});

// Files table (both files and folders)
export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  content: text("content").default(""),
  isFolder: boolean("is_folder").default(false).notNull(),
  parentId: integer("parent_id"),
  projectId: integer("project_id").notNull().references(() => projects.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFileSchema = createInsertSchema(files).pick({
  name: true,
  content: true,
  isFolder: true,
  parentId: true,
  projectId: true,
});

// Deployments table - for tracking website deployments
export const deployments = pgTable("deployments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  status: text("status").default("deploying").notNull(), // deploying, running, stopped, failed
  url: text("url"),
  logs: text("logs"), // JSON string array of deployment logs
  version: text("version").notNull(),  // Version tag for the deployment (e.g., v1, v2, etc.)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDeploymentSchema = createInsertSchema(deployments).pick({
  projectId: true,
  status: true,
  url: true,
  logs: true,
  version: true,
});

// Environment variables table - for project-specific environment variables
export const environmentVariables = pgTable("environment_variables", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  key: text("key").notNull(),
  value: text("value").notNull(),
  isSecret: boolean("is_secret").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    projectKeyIdx: uniqueIndex("project_key_idx").on(table.projectId, table.key),
  };
});

export const insertEnvironmentVariableSchema = createInsertSchema(environmentVariables).pick({
  projectId: true,
  key: true,
  value: true,
  isSecret: true,
});

// Define relations after all tables are created
export const usersRelations = relations(users, ({ many }) => ({
  ownedProjects: many(projects, { relationName: "owner" }),
  collaborations: many(projectCollaborators, { relationName: "user" }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
    relationName: "owner",
  }),
  files: many(files, { relationName: "project" }),
  collaborators: many(projectCollaborators, { relationName: "project" }),
  deployments: many(deployments, { relationName: "project" }),
  environmentVariables: many(environmentVariables, { relationName: "project" }),
}));

export const projectCollaboratorsRelations = relations(projectCollaborators, ({ one }) => ({
  project: one(projects, {
    fields: [projectCollaborators.projectId],
    references: [projects.id],
    relationName: "project",
  }),
  user: one(users, {
    fields: [projectCollaborators.userId],
    references: [users.id],
    relationName: "user",
  }),
}));

export const filesRelations = relations(files, ({ one, many }) => ({
  project: one(projects, {
    fields: [files.projectId],
    references: [projects.id],
    relationName: "project",
  }),
  parent: one(files, {
    fields: [files.parentId],
    references: [files.id],
    relationName: "parent",
  }),
  children: many(files, { relationName: "parent" }),
}));

export const deploymentsRelations = relations(deployments, ({ one }) => ({
  project: one(projects, {
    fields: [deployments.projectId],
    references: [projects.id],
    relationName: "project",
  }),
}));

// Bounties table
export const bounties = pgTable("bounties", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  reward: integer("reward").notNull(),
  status: text("status", { enum: ["open", "in-progress", "completed", "cancelled"] }).default("open").notNull(),
  difficulty: text("difficulty", { enum: ["beginner", "intermediate", "advanced"] }).notNull(),
  deadline: timestamp("deadline").notNull(),
  tags: text("tags").array().default([]).notNull(),
  authorId: integer("author_id").references(() => users.id).notNull(),
  authorName: text("author_name").notNull(),
  authorAvatar: text("author_avatar"),
  authorVerified: boolean("author_verified").default(false).notNull(),
  winnerId: integer("winner_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Bounty submissions table
export const bountySubmissions = pgTable("bounty_submissions", {
  id: serial("id").primaryKey(),
  bountyId: integer("bounty_id").references(() => bounties.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  status: text("status", { enum: ["pending", "submitted", "accepted", "rejected"] }).default("pending").notNull(),
  submissionUrl: text("submission_url"),
  feedback: text("feedback"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
});

// Secrets table
export const secrets = pgTable("secrets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  key: text("key").notNull(),
  value: text("value").notNull(), // This will be encrypted in production
  description: text("description"),
  projectId: integer("project_id").references(() => projects.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("unique_user_key").on(table.userId, table.key),
]);

export const insertSecretSchema = createInsertSchema(secrets).pick({
  userId: true,
  key: true,
  value: true,
  description: true,
  projectId: true,
});

export type InsertSecret = z.infer<typeof insertSecretSchema>;
export type Secret = typeof secrets.$inferSelect;

// Newsletter subscribers table
export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  isActive: boolean("is_active").default(true).notNull(),
  subscribedAt: timestamp("subscribed_at").defaultNow().notNull(),
  unsubscribedAt: timestamp("unsubscribed_at"),
  confirmationToken: text("confirmation_token"),
  confirmedAt: timestamp("confirmed_at"),
}, (table) => {
  return {
    emailIdx: uniqueIndex("email_idx").on(table.email),
  };
});

export const insertBountySchema = createInsertSchema(bounties).omit({
  id: true,
  winnerId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBountySubmissionSchema = createInsertSchema(bountySubmissions).omit({
  id: true,
  reviewedAt: true,
  submittedAt: true,
});

export const insertNewsletterSubscriberSchema = createInsertSchema(newsletterSubscribers).pick({
  email: true,
  isActive: true,
  confirmationToken: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type LoginHistory = typeof loginHistory.$inferSelect;
export type InsertLoginHistory = z.infer<typeof insertLoginHistorySchema>;

export type ApiToken = typeof apiTokens.$inferSelect;
export type InsertApiToken = z.infer<typeof insertApiTokenSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type ProjectCollaborator = typeof projectCollaborators.$inferSelect;
export type InsertProjectCollaborator = z.infer<typeof insertProjectCollaboratorSchema>;

export type File = typeof files.$inferSelect;
export type InsertFile = z.infer<typeof insertFileSchema>;

export type Deployment = typeof deployments.$inferSelect;
export type InsertDeployment = z.infer<typeof insertDeploymentSchema>;

export type EnvironmentVariable = typeof environmentVariables.$inferSelect;
export type InsertEnvironmentVariable = z.infer<typeof insertEnvironmentVariableSchema>;

export type Bounty = typeof bounties.$inferSelect;
export type InsertBounty = z.infer<typeof insertBountySchema>;

export type BountySubmission = typeof bountySubmissions.$inferSelect;
export type InsertBountySubmission = z.infer<typeof insertBountySubmissionSchema>;

export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;

// Blog posts table
export const blogPosts = pgTable('blog_posts', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 255 }).unique().notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  excerpt: text('excerpt').notNull(),
  content: text('content').notNull(),
  author: varchar('author', { length: 255 }).notNull(),
  authorRole: varchar('author_role', { length: 255 }),
  category: varchar('category', { length: 100 }).notNull(),
  tags: text('tags').array(),
  coverImage: varchar('cover_image', { length: 500 }),
  readTime: integer('read_time').notNull(), // in minutes
  featured: boolean('featured').default(false),
  published: boolean('published').default(true),
  publishedAt: timestamp('published_at').defaultNow(),
  views: integer('views').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const insertBlogPostSchema = createInsertSchema(blogPosts);
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertNewsletterSubscriber = z.infer<typeof insertNewsletterSubscriberSchema>;
