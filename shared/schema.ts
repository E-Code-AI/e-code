import { pgTable, text, serial, integer, boolean, timestamp, pgEnum, uniqueIndex, json, jsonb, varchar, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Project visibility enum
export const visibilityEnum = pgEnum("visibility", ["public", "private", "unlisted"]);

// Programming language enum
export const languageEnum = pgEnum("language", [
  "javascript", "python", "html", "css", "typescript", "java", 
  "c", "cpp", "go", "ruby", "php", "rust", "nodejs"
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
export const projects: any = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  visibility: visibilityEnum("visibility").default("private").notNull(),
  language: languageEnum("language").default("nodejs"),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  forkedFromId: integer("forked_from_id").references(() => projects.id),
  views: integer("views").default(0).notNull(),
  likes: integer("likes").default(0).notNull(),
  forks: integer("forks").default(0).notNull(),
  runs: integer("runs").default(0).notNull(),
  coverImage: text("cover_image"),
  isPinned: boolean("is_pinned").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProjectSchema = createInsertSchema(projects).pick({
  name: true,
  description: true,
  visibility: true,
  language: true,
  ownerId: true,
  forkedFromId: true,
  coverImage: true,
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

// Project likes table
export const projectLikes = pgTable("project_likes", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  userId: integer("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    projectUserIdx: uniqueIndex("project_likes_user_idx").on(table.projectId, table.userId),
  };
});

export const insertProjectLikeSchema = createInsertSchema(projectLikes).pick({
  projectId: true,
  userId: true,
});

// Project views table (for tracking unique views)
export const projectViews = pgTable("project_views", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  userId: integer("user_id"),
  ipAddress: text("ip_address"),
  viewedAt: timestamp("viewed_at").defaultNow().notNull(),
});

export const insertProjectViewSchema = createInsertSchema(projectViews).pick({
  projectId: true,
  userId: true,
  ipAddress: true,
});

// Activity log table
export const activityLog = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  userId: integer("user_id").notNull().references(() => users.id),
  action: text("action").notNull(), // created, updated, forked, liked, viewed, deployed, etc.
  details: jsonb("details"), // Additional details about the action
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertActivityLogSchema = createInsertSchema(activityLog).pick({
  projectId: true,
  userId: true,
  action: true,
  details: true,
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

// Notifications table
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(), // comment, follow, deploy, star, pr, system, mention
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  entityType: varchar('entity_type', { length: 50 }), // project, user, deployment, etc.
  entityId: integer('entity_id'), // ID of the related entity
  fromUserId: integer('from_user_id').references(() => users.id, { onDelete: 'set null' }),
  read: boolean('read').default(false),
  readAt: timestamp('read_at'),
  actionUrl: varchar('action_url', { length: 500 }), // URL to navigate when clicked
  metadata: jsonb('metadata'), // Additional data for the notification
  createdAt: timestamp('created_at').defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  readAt: true,
  createdAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Notification preferences table
export const notificationPreferences = pgTable('notification_preferences', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  emailEnabled: boolean('email_enabled').default(true),
  pushEnabled: boolean('push_enabled').default(true),
  commentNotifications: boolean('comment_notifications').default(true),
  followNotifications: boolean('follow_notifications').default(true),
  deploymentNotifications: boolean('deployment_notifications').default(true),
  starNotifications: boolean('star_notifications').default(true),
  mentionNotifications: boolean('mention_notifications').default(true),
  systemNotifications: boolean('system_notifications').default(true),
  newsletterEnabled: boolean('newsletter_enabled').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertNotificationPreferences = z.infer<typeof insertNotificationPreferencesSchema>;
export type NotificationPreferences = typeof notificationPreferences.$inferSelect;

// Templates table - for project templates
export const templates = pgTable('templates', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').notNull(),
  icon: varchar('icon', { length: 100 }), // icon name from lucide-react
  category: varchar('category', { length: 50 }).notNull(), // web, api, mobile, data, game, etc.
  tags: text('tags').array().default([]).notNull(),
  authorId: integer('author_id').references(() => users.id),
  authorName: varchar('author_name', { length: 255 }).notNull(),
  authorVerified: boolean('author_verified').default(false),
  language: varchar('language', { length: 50 }).notNull(),
  framework: varchar('framework', { length: 100 }),
  difficulty: varchar('difficulty', { length: 20 }).notNull(), // beginner, intermediate, advanced
  estimatedTime: varchar('estimated_time', { length: 50 }),
  features: text('features').array().default([]).notNull(),
  files: jsonb('files').notNull(), // JSON structure of template files
  dependencies: jsonb('dependencies'), // package.json dependencies
  uses: integer('uses').default(0).notNull(),
  stars: integer('stars').default(0).notNull(),
  forks: integer('forks').default(0).notNull(),
  isFeatured: boolean('is_featured').default(false),
  isOfficial: boolean('is_official').default(false),
  published: boolean('published').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  uses: true,
  stars: true,
  forks: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Template = typeof templates.$inferSelect;

// Community posts table
export const communityPosts = pgTable('community_posts', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 500 }).notNull(),
  content: text('content').notNull(),
  authorId: integer('author_id').notNull().references(() => users.id),
  category: varchar('category', { length: 50 }).notNull(), // showcase, tutorials, help, discuss
  tags: text('tags').array().default([]).notNull(),
  projectId: integer('project_id').references(() => projects.id),
  imageUrl: varchar('image_url', { length: 500 }),
  likes: integer('likes').default(0).notNull(),
  comments: integer('comments').default(0).notNull(),
  views: integer('views').default(0).notNull(),
  isPinned: boolean('is_pinned').default(false),
  isLocked: boolean('is_locked').default(false),
  published: boolean('published').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const insertCommunityPostSchema = createInsertSchema(communityPosts).omit({
  id: true,
  likes: true,
  comments: true,
  views: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCommunityPost = z.infer<typeof insertCommunityPostSchema>;
export type CommunityPost = typeof communityPosts.$inferSelect;

// Community challenges table
export const communityChallenges = pgTable('community_challenges', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description').notNull(),
  difficulty: varchar('difficulty', { length: 20 }).notNull(), // easy, medium, hard
  category: varchar('category', { length: 50 }).notNull(),
  participants: integer('participants').default(0).notNull(),
  submissions: integer('submissions').default(0).notNull(),
  prize: varchar('prize', { length: 255 }),
  deadline: timestamp('deadline').notNull(),
  status: varchar('status', { length: 20 }).default('active').notNull(), // active, completed, cancelled
  rules: text('rules'),
  judgeId: integer('judge_id').references(() => users.id),
  winnerId: integer('winner_id').references(() => users.id),
  tags: text('tags').array().default([]).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const insertCommunityChallengeSchema = createInsertSchema(communityChallenges).omit({
  id: true,
  participants: true,
  submissions: true,
  winnerId: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCommunityChallenge = z.infer<typeof insertCommunityChallengeSchema>;
export type CommunityChallenge = typeof communityChallenges.$inferSelect;

// Themes table - for editor and UI themes
export const themes = pgTable('themes', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 20 }).notNull(), // editor, syntax, ui
  preview: jsonb('preview').notNull(), // { bg: '#...', fg: '#...', accent: '#...' }
  config: jsonb('config').notNull(), // Full theme configuration
  authorId: integer('author_id').references(() => users.id),
  authorName: varchar('author_name', { length: 255 }).notNull(),
  downloads: integer('downloads').default(0).notNull(),
  rating: integer('rating').default(0), // Average rating 0-5
  isOfficial: boolean('is_official').default(false),
  isDark: boolean('is_dark').default(true),
  published: boolean('published').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const insertThemeSchema = createInsertSchema(themes).omit({
  id: true,
  downloads: true,
  rating: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTheme = z.infer<typeof insertThemeSchema>;
export type Theme = typeof themes.$inferSelect;

// Admin API Keys table - for centralized API key management
export const adminApiKeys = pgTable('admin_api_keys', {
  id: serial('id').primaryKey(),
  provider: varchar('provider', { length: 50 }).notNull(), // anthropic, openai, gemini, etc.
  keyName: varchar('key_name', { length: 255 }).notNull(), // Display name for the key
  apiKey: text('api_key').notNull(), // Encrypted API key
  isActive: boolean('is_active').default(true).notNull(),
  usageLimit: integer('usage_limit'), // Monthly usage limit in requests
  currentUsage: integer('current_usage').default(0).notNull(), // Current month usage
  resetDate: timestamp('reset_date').notNull(), // When to reset usage counter
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const insertAdminApiKeySchema = createInsertSchema(adminApiKeys).omit({
  id: true,
  currentUsage: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAdminApiKey = z.infer<typeof insertAdminApiKeySchema>;
export type AdminApiKey = typeof adminApiKeys.$inferSelect;

// AI Usage Tracking table - tracks AI consumption per user
export const aiUsageTracking = pgTable('ai_usage_tracking', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  provider: varchar('provider', { length: 50 }).notNull(), // anthropic, openai, etc.
  endpoint: varchar('endpoint', { length: 255 }).notNull(), // /chat, /assistant, /code-explain, etc.
  requestTokens: integer('request_tokens').notNull(),
  responseTokens: integer('response_tokens').notNull(),
  totalTokens: integer('total_tokens').notNull(),
  cost: real('cost').notNull(), // Cost in USD
  subscriptionId: integer('subscription_id'), // Link to user's subscription
  projectId: integer('project_id').references(() => projects.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const insertAiUsageTrackingSchema = createInsertSchema(aiUsageTracking).omit({
  id: true,
  createdAt: true,
});

export type InsertAiUsageTracking = z.infer<typeof insertAiUsageTrackingSchema>;
export type AiUsageTracking = typeof aiUsageTracking.$inferSelect;

// User Subscriptions table - tracks user subscription plans
export const userSubscriptions = pgTable('user_subscriptions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  planId: varchar('plan_id', { length: 50 }).notNull(), // free, hacker, pro, enterprise
  status: varchar('status', { length: 20 }).notNull(), // active, canceled, past_due
  monthlyAiTokens: integer('monthly_ai_tokens').notNull(), // Monthly AI token allowance
  usedAiTokens: integer('used_ai_tokens').default(0).notNull(), // Used tokens this month
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAt: timestamp('cancel_at'),
  cancelledAt: timestamp('cancelled_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({
  id: true,
  usedAiTokens: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;
export type UserSubscription = typeof userSubscriptions.$inferSelect;

// Announcements table
export const announcements = pgTable('announcements', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 500 }).notNull(),
  content: text('content'),
  type: varchar('type', { length: 50 }).notNull(), // feature, maintenance, security, general
  priority: varchar('priority', { length: 20 }).default('normal').notNull(), // low, normal, high, critical
  targetAudience: varchar('target_audience', { length: 50 }).default('all').notNull(), // all, free, pro, enterprise
  icon: varchar('icon', { length: 100 }),
  link: varchar('link', { length: 500 }),
  active: boolean('active').default(true),
  dismissible: boolean('dismissible').default(true),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Announcement = typeof announcements.$inferSelect;

// Learning courses table
export const learningCourses = pgTable('learning_courses', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 255 }).unique().notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description').notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  difficulty: varchar('difficulty', { length: 20 }).notNull(),
  duration: varchar('duration', { length: 100 }), // e.g., "4 weeks", "20 hours"
  thumbnail: varchar('thumbnail', { length: 500 }),
  authorId: integer('author_id').references(() => users.id),
  authorName: varchar('author_name', { length: 255 }).notNull(),
  totalLessons: integer('total_lessons').default(0).notNull(),
  enrollments: integer('enrollments').default(0).notNull(),
  rating: integer('rating').default(0), // Average rating 0-5
  tags: text('tags').array().default([]).notNull(),
  prerequisites: text('prerequisites').array().default([]).notNull(),
  published: boolean('published').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const insertLearningCourseSchema = createInsertSchema(learningCourses).omit({
  id: true,
  enrollments: true,
  rating: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLearningCourse = z.infer<typeof insertLearningCourseSchema>;
export type LearningCourse = typeof learningCourses.$inferSelect;

// User learning progress table
export const userLearningProgress = pgTable('user_learning_progress', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  courseId: integer('course_id').notNull().references(() => learningCourses.id),
  currentLesson: integer('current_lesson').default(1).notNull(),
  completedLessons: integer('completed_lessons').default(0).notNull(),
  progress: integer('progress').default(0).notNull(), // Percentage
  streak: integer('streak').default(0).notNull(), // Days in a row
  lastActivityAt: timestamp('last_activity_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  startedAt: timestamp('started_at').defaultNow(),
}, (table) => ({
  userCourseIdx: uniqueIndex('user_course_idx').on(table.userId, table.courseId),
}));

export const insertUserLearningProgressSchema = createInsertSchema(userLearningProgress).omit({
  id: true,
  startedAt: true,
});

export type InsertUserLearningProgress = z.infer<typeof insertUserLearningProgressSchema>;
export type UserLearningProgress = typeof userLearningProgress.$inferSelect;

// Cycles (virtual currency) table
export const userCycles = pgTable('user_cycles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().unique().references(() => users.id),
  balance: integer('balance').default(0).notNull(),
  totalEarned: integer('total_earned').default(0).notNull(),
  totalSpent: integer('total_spent').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const insertUserCyclesSchema = createInsertSchema(userCycles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserCycles = z.infer<typeof insertUserCyclesSchema>;
export type UserCycles = typeof userCycles.$inferSelect;

// Cycles transactions table
export const cyclesTransactions = pgTable('cycles_transactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  amount: integer('amount').notNull(), // Positive for credit, negative for debit
  type: varchar('type', { length: 50 }).notNull(), // bounty_reward, purchase, referral, etc.
  description: text('description').notNull(),
  relatedId: integer('related_id'), // ID of related entity (bounty, purchase, etc.)
  relatedType: varchar('related_type', { length: 50 }), // bounty, powerup, etc.
  balance: integer('balance').notNull(), // Balance after transaction
  createdAt: timestamp('created_at').defaultNow(),
});

export const insertCyclesTransactionSchema = createInsertSchema(cyclesTransactions).omit({
  id: true,
  createdAt: true,
});

export type InsertCyclesTransaction = z.infer<typeof insertCyclesTransactionSchema>;
export type CyclesTransaction = typeof cyclesTransactions.$inferSelect;

// Object storage table - for S3-like storage
export const objectStorage: any = pgTable('object_storage', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  projectId: integer('project_id').references(() => projects.id),
  name: varchar('name', { length: 255 }).notNull(),
  path: varchar('path', { length: 1000 }).notNull(),
  size: integer('size').notNull(), // in bytes
  type: varchar('type', { length: 20 }).notNull(), // file, folder
  mimeType: varchar('mime_type', { length: 100 }),
  url: varchar('url', { length: 1000 }),
  cdnUrl: varchar('cdn_url', { length: 1000 }),
  isPublic: boolean('is_public').default(false),
  metadata: jsonb('metadata'), // Additional file metadata
  parentId: integer('parent_id').references((): any => objectStorage.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userPathIdx: uniqueIndex('user_path_idx').on(table.userId, table.path),
}));

export const insertObjectStorageSchema = createInsertSchema(objectStorage).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertObjectStorage = z.infer<typeof insertObjectStorageSchema>;
export type ObjectStorage = typeof objectStorage.$inferSelect;

// Extensions table
export const extensions = pgTable('extensions', {
  id: serial('id').primaryKey(),
  extensionId: varchar('extension_id', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').notNull(),
  author: varchar('author', { length: 255 }).notNull(),
  authorAvatar: varchar('author_avatar', { length: 500 }),
  version: varchar('version', { length: 50 }).notNull(),
  downloads: integer('downloads').default(0).notNull(),
  rating: real('rating').default(0).notNull(),
  ratingCount: integer('rating_count').default(0).notNull(),
  category: varchar('category', { length: 50 }).notNull(), // 'themes' | 'languages' | 'formatters' | 'linters' | 'snippets' | 'tools'
  tags: text().array().default([]).notNull(),
  icon: varchar('icon', { length: 10 }).notNull(),
  price: real('price').default(0).notNull(),
  screenshots: text().array().default([]),
  lastUpdated: timestamp('last_updated').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const insertExtensionSchema = createInsertSchema(extensions).omit({
  id: true,
  downloads: true,
  rating: true,
  ratingCount: true,
  lastUpdated: true,
  createdAt: true,
});

export type InsertExtension = z.infer<typeof insertExtensionSchema>;
export type Extension = typeof extensions.$inferSelect;

// User Extensions (installed extensions per user)
export const userExtensions = pgTable('user_extensions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  extensionId: integer('extension_id').notNull().references(() => extensions.id),
  installedAt: timestamp('installed_at').defaultNow().notNull(),
  hasUpdate: boolean('has_update').default(false).notNull(),
}, (table) => ({
  userExtensionUnique: uniqueIndex('user_extension_unique').on(table.userId, table.extensionId),
}));

export const insertUserExtensionSchema = createInsertSchema(userExtensions).omit({
  id: true,
  installedAt: true,
  hasUpdate: true,
});

export type InsertUserExtension = z.infer<typeof insertUserExtensionSchema>;
export type UserExtension = typeof userExtensions.$inferSelect;

// Code snippet sharing
export const codeSnippets = pgTable("code_snippets", {
  id: serial("id").primaryKey(),
  shareId: varchar("share_id", { length: 32 }).notNull().unique(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  filePath: varchar("file_path", { length: 512 }).notNull(),
  lineStart: integer("line_start").notNull(),
  lineEnd: integer("line_end").notNull(),
  code: text("code").notNull(),
  language: varchar("language", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }),
  description: text("description"),
  views: integer("views").notNull().default(0),
  isPublic: boolean("is_public").notNull().default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCodeSnippetSchema = createInsertSchema(codeSnippets).omit({
  id: true,
  shareId: true,
  views: true,
  createdAt: true,
  updatedAt: true,
});

export type CodeSnippet = typeof codeSnippets.$inferSelect;
export type InsertCodeSnippet = z.infer<typeof insertCodeSnippetSchema>;

// Learning System Tables

// Courses table
export const courses = pgTable('courses', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 255 }).unique().notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  category: varchar('category', { length: 50 }).notNull(), // python, javascript, web, mobile, data, ai
  difficulty: varchar('difficulty', { length: 20 }).notNull(), // beginner, intermediate, advanced
  duration: varchar('duration', { length: 50 }).notNull(), // e.g., "8 hours"
  thumbnail: varchar('thumbnail', { length: 10 }).notNull(), // emoji or icon
  instructorId: integer('instructor_id').references(() => users.id),
  instructorName: varchar('instructor_name', { length: 255 }).notNull(),
  instructorAvatar: varchar('instructor_avatar', { length: 500 }),
  rating: real('rating').default(0).notNull(),
  studentsCount: integer('students_count').default(0).notNull(),
  isPublished: boolean('is_published').default(true).notNull(),
  isFeatured: boolean('is_featured').default(false).notNull(),
  price: real('price').default(0).notNull(), // 0 = free
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
  rating: true,
  studentsCount: true,
  createdAt: true,
  updatedAt: true,
});

export type Course = typeof courses.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;

// Lessons table
export const lessons = pgTable('lessons', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  order: integer('order').notNull(),
  type: varchar('type', { length: 50 }).notNull(), // video, text, quiz, exercise
  duration: integer('duration').notNull(), // in minutes
  content: jsonb('content').notNull(), // Rich content (markdown, video URL, quiz questions, etc.)
  videoUrl: varchar('video_url', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertLessonSchema = createInsertSchema(lessons).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Lesson = typeof lessons.$inferSelect;
export type InsertLesson = z.infer<typeof insertLessonSchema>;

// User course enrollments
export const courseEnrollments = pgTable('course_enrollments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId: integer('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  enrolledAt: timestamp('enrolled_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  progress: real('progress').default(0).notNull(), // 0-100
  lastAccessedAt: timestamp('last_accessed_at').defaultNow().notNull(),
}, (table) => ({
  userCourseUnique: uniqueIndex('user_course_unique').on(table.userId, table.courseId),
}));

export const insertCourseEnrollmentSchema = createInsertSchema(courseEnrollments).omit({
  id: true,
  enrolledAt: true,
  progress: true,
  lastAccessedAt: true,
});

export type CourseEnrollment = typeof courseEnrollments.$inferSelect;
export type InsertCourseEnrollment = z.infer<typeof insertCourseEnrollmentSchema>;

// Lesson progress tracking
export const lessonProgress = pgTable('lesson_progress', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  lessonId: integer('lesson_id').notNull().references(() => lessons.id, { onDelete: 'cascade' }),
  completed: boolean('completed').default(false).notNull(),
  completedAt: timestamp('completed_at'),
  timeSpent: integer('time_spent').default(0).notNull(), // in seconds
  lastAccessedAt: timestamp('last_accessed_at').defaultNow().notNull(),
}, (table) => ({
  userLessonUnique: uniqueIndex('user_lesson_unique').on(table.userId, table.lessonId),
}));

export const insertLessonProgressSchema = createInsertSchema(lessonProgress).omit({
  id: true,
  timeSpent: true,
  lastAccessedAt: true,
});

export type LessonProgress = typeof lessonProgress.$inferSelect;
export type InsertLessonProgress = z.infer<typeof insertLessonProgressSchema>;

// Learning achievements
export const learningAchievements = pgTable('learning_achievements', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').notNull(),
  icon: varchar('icon', { length: 10 }).notNull(), // emoji
  category: varchar('category', { length: 50 }).notNull(), // streak, completion, skill, special
  requirement: jsonb('requirement').notNull(), // Flexible requirement definition
  points: integer('points').default(10).notNull(),
});

export const insertLearningAchievementSchema = createInsertSchema(learningAchievements).omit({
  id: true,
});

export type LearningAchievement = typeof learningAchievements.$inferSelect;
export type InsertLearningAchievement = z.infer<typeof insertLearningAchievementSchema>;

// User achievements
export const userAchievements = pgTable('user_achievements', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  achievementId: integer('achievement_id').notNull().references(() => learningAchievements.id),
  earnedAt: timestamp('earned_at').defaultNow().notNull(),
}, (table) => ({
  userAchievementUnique: uniqueIndex('user_achievement_unique').on(table.userId, table.achievementId),
}));

export const insertUserAchievementSchema = createInsertSchema(userAchievements).omit({
  id: true,
  earnedAt: true,
});

export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;

// Learning streaks
export const learningStreaks = pgTable('learning_streaks', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  currentStreak: integer('current_streak').default(0).notNull(),
  longestStreak: integer('longest_streak').default(0).notNull(),
  lastActivityDate: timestamp('last_activity_date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertLearningStreakSchema = createInsertSchema(learningStreaks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type LearningStreak = typeof learningStreaks.$inferSelect;
export type InsertLearningStreak = z.infer<typeof insertLearningStreakSchema>;
