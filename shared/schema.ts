import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  integer,
  text,
  boolean,
  pgEnum,
  decimal,
  serial,
  primaryKey,
  unique,
  real
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const visibilityEnum = pgEnum('visibility', ['public', 'private', 'unlisted']);
export const languageEnum = pgEnum('language', [
  'javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'csharp', 'go',
  'rust', 'php', 'ruby', 'swift', 'kotlin', 'html', 'css', 'sql', 'bash', 'other'
]);
export const roleEnum = pgEnum('role', ['owner', 'admin', 'member', 'viewer']);
export const reviewStatusEnum = pgEnum('review_status', ['pending', 'approved', 'rejected', 'changes_requested']);
export const mentorshipStatusEnum = pgEnum('mentorship_status', ['active', 'completed', 'cancelled']);
export const challengeStatusEnum = pgEnum('challenge_status', ['draft', 'published', 'archived']);
export const submissionStatusEnum = pgEnum('submission_status', ['pending', 'accepted', 'rejected']);
export const aiModelEnum = pgEnum('ai_model', [
  'gpt-4',
  'gpt-4-turbo',
  'gpt-5',
  'claude-3-opus',
  'claude-3-sonnet',
  'claude-3-5-sonnet',
  'claude-3-haiku',
  'gemini-pro',
  'gemini-ultra'
]);
export const agentModeEnum = pgEnum('agent_mode', ['plan', 'build']);

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: varchar("username").unique(),
  passwordHash: varchar("password_hash"), // For bcrypt hashed passwords
  email: varchar("email").unique(),
  displayName: varchar("display_name"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  bio: text("bio"),
  website: varchar("website"),
  githubUsername: varchar("github_username"),
  twitterUsername: varchar("twitter_username"),
  linkedinUsername: varchar("linkedin_username"),
  reputation: integer("reputation").default(0),
  isMentor: boolean("is_mentor").default(false),
  isAdmin: boolean("is_admin").default(false),
  emailVerified: boolean("email_verified").default(false),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  stripePriceId: varchar("stripe_price_id"),
  subscriptionStatus: varchar("subscription_status"),
  subscriptionCurrentPeriodEnd: timestamp("subscription_current_period_end"),
  // Security fields
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorSecret: varchar("two_factor_secret"),
  passwordResetToken: varchar("password_reset_token"),
  passwordResetExpiry: timestamp("password_reset_expiry"),
  lastLogin: timestamp("last_login"),
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  lockedUntil: timestamp("locked_until"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email Verification Tokens table
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: varchar("token").notNull().unique(), // Hashed token
  email: varchar("email").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Password Reset Tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: varchar("token").notNull().unique(), // Hashed token
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  visibility: visibilityEnum("visibility").notNull().default('private'),
  language: languageEnum("language").default('javascript'),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  forkedFromId: varchar("forked_from_id"),
  views: integer("views").notNull().default(0),
  likes: integer("likes").notNull().default(0),
  forks: integer("forks").notNull().default(0),
  runs: integer("runs").notNull().default(0),
  coverImage: text("cover_image"),
  isPinned: boolean("is_pinned").notNull().default(false),
  slug: text("slug").unique(),
});

export const files = pgTable("files", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  name: text("name").notNull(),
  path: text("path").notNull(),
  content: text("content").default(''),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  parentId: integer("parent_id"),
  isDirectory: boolean("is_directory").notNull().default(false),
  language: languageEnum("language"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  storageKey: text("storage_key"),
  storageUrl: text("storage_url"),
});

// API SDK Tables - Enhanced with security features
export const apiKeys = pgTable("api_keys", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name").notNull(),
  publicKey: varchar("public_key").unique(), // Public identifier
  keyHash: varchar("key_hash").notNull().unique(), // SHA-256 hash of the actual key
  permissions: jsonb("permissions").$type<string[]>().default([]),
  active: boolean("active").default(true),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  revokedAt: timestamp("revoked_at"),
  rotatedAt: timestamp("rotated_at"),
  usageCount: integer("usage_count").default(0),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  
  // Legacy support - can be removed in future
  key: varchar("key").unique(), // Deprecated
  isActive: boolean("is_active").default(true), // Deprecated - use 'active'
  lastUsed: timestamp("last_used"), // Deprecated - use 'lastUsedAt'
});

export const apiUsage = pgTable("api_usage", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  apiKeyId: integer("api_key_id").notNull().references(() => apiKeys.id),
  endpoint: varchar("endpoint").notNull(),
  method: varchar("method").notNull(),
  statusCode: integer("status_code").notNull(),
  responseTime: integer("response_time"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Security logs table for audit logging
export const securityLogs = pgTable("security_logs", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: varchar("user_id").references(() => users.id),
  ip: varchar("ip").notNull(),
  action: varchar("action").notNull(),
  resource: text("resource"),
  result: varchar("result").notNull(), // 'success' or 'failure'
  userAgent: text("user_agent"),
  sessionId: varchar("session_id"),
  statusCode: integer("status_code"),
  duration: integer("duration"), // in milliseconds
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

// Terminal logs table for persistent console output storage
export const terminalLogs = pgTable("terminal_logs", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").references(() => users.id),
  type: varchar("type", { length: 32 }).notNull(), // 'info', 'error', 'warn', 'log', 'debug'
  message: text("message").notNull(),
  stack: text("stack"),
  source: varchar("source", { length: 64 }), // 'runtime', 'terminal', 'build', etc.
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  confirmationToken: varchar("confirmation_token", { length: 255 }),
  confirmedAt: timestamp("confirmed_at"),
  subscribedAt: timestamp("subscribed_at").notNull().defaultNow(),
  unsubscribedAt: timestamp("unsubscribed_at"),
  ipAddress: varchar("ip_address", { length: 128 }),
  userAgent: text("user_agent"),
  country: varchar("country", { length: 120 }),
  region: varchar("region", { length: 120 }),
  city: varchar("city", { length: 120 }),
  postalCode: varchar("postal_code", { length: 30 }),
  timezone: varchar("timezone", { length: 120 }),
  source: varchar("source", { length: 120 }),
  lastActivityAt: timestamp("last_activity_at"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
});

export const newsletterCampaigns = pgTable("newsletter_campaigns", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  previewText: text("preview_text"),
  htmlContent: text("html_content").notNull(),
  textContent: text("text_content"),
  heroImageUrl: text("hero_image_url"),
  status: varchar("status", { length: 32 }).notNull().default('draft'),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  scheduledFor: timestamp("scheduled_for"),
  sentAt: timestamp("sent_at"),
  metrics: jsonb("metrics").$type<Record<string, any>>().default({}),
});

export const newsletterDeliveries = pgTable("newsletter_deliveries", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => newsletterCampaigns.id, { onDelete: 'cascade' }),
  subscriberId: integer("subscriber_id").notNull().references(() => newsletterSubscribers.id, { onDelete: 'cascade' }),
  email: varchar("email", { length: 320 }).notNull(),
  status: varchar("status", { length: 32 }).notNull(),
  error: text("error"),
  sentAt: timestamp("sent_at").defaultNow(),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
});

export const customerRequests = pgTable("customer_requests", {
  id: serial("id").primaryKey(),
  formType: varchar("form_type", { length: 64 }).notNull(),
  pagePath: varchar("page_path", { length: 255 }).notNull(),
  senderName: varchar("sender_name", { length: 255 }),
  senderEmail: varchar("sender_email", { length: 320 }),
  senderCompany: varchar("sender_company", { length: 255 }),
  senderPhone: varchar("sender_phone", { length: 50 }),
  subject: varchar("subject", { length: 255 }),
  message: text("message"),
  status: varchar("status", { length: 32 }).notNull().default('new'),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const insertCustomerRequestSchema = createInsertSchema(customerRequests, {
  metadata: z
    .object({})
    .catchall(z.any())
    .optional(),
  status: z.enum(['new', 'in_progress', 'resolved', 'archived']).optional(),
});

// Usage tracking table for billing
export const usageTracking = pgTable("usage_tracking", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: varchar("user_id").notNull().references(() => users.id),
  metricType: varchar("metric_type").notNull(), // compute, storage, bandwidth, etc.
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit").notNull(), // hours, GB, etc.
  timestamp: timestamp("timestamp").defaultNow(),
  billingPeriodStart: timestamp("billing_period_start").notNull(),
  billingPeriodEnd: timestamp("billing_period_end").notNull(),
});

// Credits and billing system
export const userCredits = pgTable("user_credits", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  monthlyCredits: decimal("monthly_credits", { precision: 10, scale: 2 }).notNull().default('25.00'),
  remainingCredits: decimal("remaining_credits", { precision: 10, scale: 2 }).notNull().default('25.00'),
  extraCredits: decimal("extra_credits", { precision: 10, scale: 2 }).notNull().default('0.00'),
  resetDate: timestamp("reset_date").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const budgetLimits = pgTable("budget_limits", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  monthlyLimit: decimal("monthly_limit", { precision: 10, scale: 2 }),
  alertThreshold: integer("alert_threshold").default(80), // percentage
  hardStop: boolean("hard_stop").default(true),
  notificationEmail: varchar("notification_email"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const usageAlerts = pgTable("usage_alerts", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: varchar("user_id").notNull().references(() => users.id),
  alertType: varchar("alert_type").notNull(), // threshold_reached, limit_exceeded, etc.
  threshold: integer("threshold").notNull(),
  sent: boolean("sent").default(false),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Code Review Tables (moved to line 606)

// Mentorship Tables
export const mentorProfiles = pgTable("mentor_profiles", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: varchar("user_id").notNull().references(() => users.id),
  expertise: jsonb("expertise").$type<string[]>().default([]),
  experience: text("experience"),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  availability: jsonb("availability").$type<Record<string, any>>().default({}),
  rating: decimal("rating", { precision: 3, scale: 2 }).default('0.00'),
  totalSessions: integer("total_sessions").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const mentorshipSessions = pgTable("mentorship_sessions", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  mentorId: varchar("mentor_id").notNull().references(() => users.id),
  menteeId: varchar("mentee_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  description: text("description"),
  status: mentorshipStatusEnum("status").default('active'),
  scheduledAt: timestamp("scheduled_at"),
  duration: integer("duration"), // in minutes
  meetingUrl: varchar("meeting_url"),
  notes: text("notes"),
  rating: integer("rating"), // 1-5 stars
  feedback: text("feedback"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Challenges Tables
export const challenges = pgTable("challenges", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  difficulty: varchar("difficulty").notNull(), // easy, medium, hard
  category: varchar("category").notNull(),
  points: integer("points").default(0),
  status: challengeStatusEnum("status").default('draft'),
  starterCode: text("starter_code"),
  solutionCode: text("solution_code"),
  testCases: jsonb("test_cases").$type<any[]>().default([]),
  tags: jsonb("tags").$type<string[]>().default([]),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const challengeSubmissions = pgTable("challenge_submissions", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  challengeId: integer("challenge_id").notNull().references(() => challenges.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  code: text("code").notNull(),
  status: submissionStatusEnum("status").default('pending'),
  score: integer("score").default(0),
  executionTime: integer("execution_time"), // in milliseconds
  testResults: jsonb("test_results").$type<any[]>().default([]),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

export const challengeLeaderboard = pgTable("challenge_leaderboard", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  challengeId: integer("challenge_id").notNull().references(() => challenges.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  bestScore: integer("best_score").default(0),
  bestTime: integer("best_time"), // in milliseconds
  submissionCount: integer("submission_count").default(0),
  lastSubmission: timestamp("last_submission").defaultNow(),
});

export const communityCategories = pgTable("community_categories", {
  id: varchar("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  icon: varchar("icon").notNull().default('TrendingUp'),
  position: integer("position").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const communityPosts = pgTable("community_posts", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  content: text("content").notNull(),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  categoryId: varchar("category_id").notNull().references(() => communityCategories.id),
  tags: jsonb("tags").$type<string[]>().default([]),
  projectUrl: text("project_url"),
  imageUrl: text("image_url"),
  viewCount: integer("view_count").default(0),
  isPinned: boolean("is_pinned").default(false),
  isLocked: boolean("is_locked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const communityPostLikes = pgTable("community_post_likes", {
  postId: integer("post_id").notNull().references(() => communityPosts.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.postId, table.userId] }),
}));

export const communityPostBookmarks = pgTable("community_post_bookmarks", {
  postId: integer("post_id").notNull().references(() => communityPosts.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.postId, table.userId] }),
}));

export const communityComments = pgTable("community_comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => communityPosts.id, { onDelete: 'cascade' }),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  parentCommentId: integer("parent_comment_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const communityFollows = pgTable("community_follows", {
  followerId: varchar("follower_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  followeeId: varchar("followee_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.followerId, table.followeeId] }),
}));

// Mobile App Tables
export const mobileDevices = pgTable("mobile_devices", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: varchar("user_id").notNull().references(() => users.id),
  deviceId: varchar("device_id").notNull(),
  platform: varchar("platform").notNull(), // ios, android
  deviceName: varchar("device_name"),
  pushToken: varchar("push_token"),
  appVersion: varchar("app_version"),
  isActive: boolean("is_active").default(true),
  lastSeen: timestamp("last_seen").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pushNotifications = pgTable("push_notifications", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  body: text("body").notNull(),
  type: varchar("type").notNull().default('system'),
  actionUrl: varchar("action_url"),
  data: jsonb("data").default({}),
  read: boolean("read").notNull().default(false),
  readAt: timestamp("read_at"),
  sent: boolean("sent").default(false),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notificationPreferences = pgTable("notification_preferences", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  email: jsonb("email").$type<Record<string, boolean>>().notNull().default({}),
  push: jsonb("push").$type<Record<string, boolean>>().notNull().default({}),
  frequency: varchar("frequency").notNull().default('instant'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Deployments table
// Knowledge Graph for Memory MCP
export const knowledgeGraphNodes = pgTable("knowledge_graph_nodes", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  embedding: real("embedding").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const knowledgeGraphEdges = pgTable("knowledge_graph_edges", {
  id: text("id").primaryKey(),
  sourceId: text("source_id").notNull().references(() => knowledgeGraphNodes.id, { onDelete: "cascade" }),
  targetId: text("target_id").notNull().references(() => knowledgeGraphNodes.id, { onDelete: "cascade" }),
  relationship: text("relationship").notNull(),
  weight: real("weight").default(1.0),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow()
});

export const conversationMemory = pgTable("conversation_memory", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  sessionId: text("session_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  timestamp: timestamp("timestamp").defaultNow()
});

export const deployments = pgTable("deployments", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  deploymentId: varchar("deployment_id").notNull().unique(),
  type: varchar("type").notNull(), // static, autoscale, reserved-vm, serverless, scheduled
  environment: varchar("environment").notNull(), // development, staging, production
  status: varchar("status").notNull(), // pending, building, deploying, active, failed
  url: varchar("url"),
  customDomain: varchar("custom_domain"),
  buildLogs: text("build_logs"),
  deploymentLogs: text("deployment_logs"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Deployment type specific configurations
export const autoscaleDeployments = pgTable("autoscale_deployments", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  deploymentId: integer("deployment_id").notNull().references(() => deployments.id).unique(),
  minInstances: integer("min_instances").notNull().default(1),
  maxInstances: integer("max_instances").notNull().default(10),
  targetCpuUtilization: integer("target_cpu_utilization").default(70),
  scaleDownDelay: integer("scale_down_delay").default(300), // seconds
  createdAt: timestamp("created_at").defaultNow(),
});

export const reservedVmDeployments = pgTable("reserved_vm_deployments", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  deploymentId: integer("deployment_id").notNull().references(() => deployments.id).unique(),
  vmSize: varchar("vm_size").notNull(), // small, medium, large, xlarge
  cpuCores: integer("cpu_cores").notNull(),
  memoryGb: integer("memory_gb").notNull(),
  diskGb: integer("disk_gb").notNull(),
  region: varchar("region").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const scheduledDeployments = pgTable("scheduled_deployments", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  deploymentId: integer("deployment_id").notNull().references(() => deployments.id).unique(),
  cronExpression: varchar("cron_expression").notNull(),
  timezone: varchar("timezone").notNull().default('UTC'),
  lastRun: timestamp("last_run"),
  nextRun: timestamp("next_run"),
  maxRuntime: integer("max_runtime").default(3600), // seconds
  createdAt: timestamp("created_at").defaultNow(),
});

export const staticDeployments = pgTable("static_deployments", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  deploymentId: integer("deployment_id").notNull().references(() => deployments.id).unique(),
  cdnEnabled: boolean("cdn_enabled").default(true),
  buildCommand: varchar("build_command"),
  outputDirectory: varchar("output_directory").default('dist'),
  headers: jsonb("headers").default({}),
  redirects: jsonb("redirects").default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

// Team and collaboration tables (existing from previous implementation)
export const teams = pgTable("teams", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  name: varchar("name").notNull(),
  slug: varchar("slug").notNull().unique(),
  description: text("description"),
  visibility: visibilityEnum("visibility").notNull().default('private'),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  memberCount: integer("member_count").notNull().default(1),
  projectCount: integer("project_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const teamMembers = pgTable("team_members", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  teamId: integer("team_id").notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: roleEnum("role").notNull().default('member'),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

// Comments system for projects and files
export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  projectId: varchar('project_id').notNull().references(() => projects.id),
  fileId: integer('file_id').references(() => files.id),
  authorId: varchar('author_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  lineNumber: integer('line_number'),
  resolved: boolean('resolved').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Checkpoints for version control
export const checkpoints = pgTable('checkpoints', {
  id: serial('id').primaryKey(),
  projectId: varchar('project_id').notNull().references(() => projects.id),
  name: text('name').notNull(),
  description: text('description'),
  filesSnapshot: jsonb('files_snapshot').notNull().default({}),
  type: varchar('type', { length: 50 }).notNull().default('manual'), // manual, automatic, before_action, error_recovery
  createdBy: varchar('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  metadata: jsonb('metadata').notNull().default({}),
});

// Checkpoint files for storing file snapshots
export const checkpointFiles = pgTable('checkpoint_files', {
  id: serial('id').primaryKey(),
  checkpointId: integer('checkpoint_id').notNull().references(() => checkpoints.id, { onDelete: 'cascade' }),
  fileId: integer('file_id').notNull(),
  path: text('path').notNull(),
  content: text('content'),
  metadata: jsonb('metadata').default({}),
});

// Checkpoint database for storing database snapshots
export const checkpointDatabase = pgTable('checkpoint_database', {
  id: serial('id').primaryKey(),
  checkpointId: integer('checkpoint_id').notNull().references(() => checkpoints.id, { onDelete: 'cascade' }),
  snapshotPath: text('snapshot_path').notNull(),
  metadata: jsonb('metadata').default({}),
});

// Code Review Tables
export const codeReviews = pgTable('code_reviews', {
  id: serial('id').primaryKey(),
  projectId: varchar('project_id').notNull().references(() => projects.id),
  fileId: integer('file_id').references(() => files.id),
  reviewType: varchar('review_type').notNull().default('manual'), // manual, automatic, git-diff, pre-commit
  status: varchar('status').notNull().default('pending'), // pending, completed, failed
  totalIssues: integer('total_issues').notNull().default(0),
  criticalIssues: integer('critical_issues').notNull().default(0),
  highIssues: integer('high_issues').notNull().default(0),
  mediumIssues: integer('medium_issues').notNull().default(0),
  lowIssues: integer('low_issues').notNull().default(0),
  codeQualityScore: real('code_quality_score').notNull().default(100),
  summary: text('summary'),
  metadata: jsonb('metadata').default({}),
  createdBy: varchar('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

export const reviewIssues = pgTable('review_issues', {
  id: serial('id').primaryKey(),
  reviewId: integer('review_id').notNull().references(() => codeReviews.id, { onDelete: 'cascade' }),
  fileId: integer('file_id').references(() => files.id),
  issueType: varchar('issue_type').notNull(), // error, warning, suggestion, security, performance, style
  severity: varchar('severity').notNull(), // critical, high, medium, low, info
  line: integer('line').notNull(),
  column: integer('column'),
  endLine: integer('end_line'),
  endColumn: integer('end_column'),
  message: text('message').notNull(),
  explanation: text('explanation'),
  suggestion: text('suggestion'),
  fixCode: text('fix_code'),
  category: varchar('category').notNull(), // Security, Performance, Style, Best Practices, etc.
  rule: varchar('rule'),
  confidence: real('confidence').notNull().default(1.0),
  isFixed: boolean('is_fixed').notNull().default(false),
  fixedAt: timestamp('fixed_at'),
  fixedBy: varchar('fixed_by').references(() => users.id),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const reviewSettings = pgTable('review_settings', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').notNull().references(() => users.id).unique(),
  enabledChecks: jsonb('enabled_checks').notNull().default({
    security: true,
    performance: true,
    style: true,
    bestPractices: true,
    complexity: true,
    duplication: true,
    documentation: true
  }),
  severityThresholds: jsonb('severity_thresholds').notNull().default({
    critical: 'error',
    high: 'error',
    medium: 'warning',
    low: 'info'
  }),
  aiProvider: varchar('ai_provider').notNull().default('anthropic'), // anthropic, openai, both
  confidenceThreshold: real('confidence_threshold').notNull().default(0.7),
  maxIssues: integer('max_issues').notNull().default(100),
  autoReviewEnabled: boolean('auto_review_enabled').notNull().default(true),
  autoReviewTriggers: jsonb('auto_review_triggers').notNull().default({
    onSave: false,
    onCommit: true,
    onPullRequest: true
  }),
  customRules: jsonb('custom_rules').default([]),
  ignoredPatterns: jsonb('ignored_patterns').default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// WebRTC Voice/Video Session Tables
export const webrtcSessions = pgTable('webrtc_sessions', {
  id: serial('id').primaryKey(),
  projectId: varchar('project_id').notNull().references(() => projects.id),
  roomId: varchar('room_id').notNull().unique(),
  sessionType: varchar('session_type').notNull().default('video'), // video, voice, screen-share
  maxParticipants: integer('max_participants').notNull().default(10),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: varchar('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  endedAt: timestamp('ended_at'),
});

export const webrtcParticipants = pgTable('webrtc_participants', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id').notNull().references(() => webrtcSessions.id, { onDelete: 'cascade' }),
  userId: varchar('user_id').notNull().references(() => users.id),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  leftAt: timestamp('left_at'),
  connectionId: varchar('connection_id').notNull(),
  isHost: boolean('is_host').notNull().default(false),
  audioEnabled: boolean('audio_enabled').notNull().default(true),
  videoEnabled: boolean('video_enabled').notNull().default(true),
});

export const webrtcRecordings = pgTable('webrtc_recordings', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id').notNull().references(() => webrtcSessions.id),
  recordingUrl: text('recording_url').notNull(),
  duration: integer('duration'), // in seconds
  fileSize: integer('file_size'), // in bytes
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Collaboration Presence Tables
export const collaborationPresence = pgTable('collaboration_presence', {
  id: serial('id').primaryKey(),
  projectId: varchar('project_id').notNull().references(() => projects.id),
  userId: varchar('user_id').notNull().references(() => users.id),
  fileId: integer('file_id').references(() => files.id),
  cursorPosition: jsonb('cursor_position').default({}), // {line: number, column: number}
  selection: jsonb('selection').default({}), // {start: {line, column}, end: {line, column}}
  isActive: boolean('is_active').notNull().default(true),
  lastSeen: timestamp('last_seen').defaultNow().notNull(),
});

// Time tracking for projects
export const projectTimeTracking = pgTable('project_time_tracking', {
  id: serial('id').primaryKey(),
  projectId: varchar('project_id').notNull().references(() => projects.id),
  userId: varchar('user_id').notNull().references(() => users.id),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time'),
  duration: integer('duration'),
  taskDescription: text('task_description'),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Screenshots for projects
export const projectScreenshots = pgTable('project_screenshots', {
  id: serial('id').primaryKey(),
  projectId: varchar('project_id').notNull().references(() => projects.id),
  title: text('title').notNull(),
  imageUrl: text('image_url').notNull(),
  description: text('description'),
  createdBy: varchar('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Deployment Metrics Table
export const deploymentMetrics = pgTable('deployment_metrics', {
  id: serial('id').primaryKey(),
  deploymentId: varchar('deployment_id').notNull(),
  cpuUsage: real('cpu_usage').notNull(), // percentage 0-100
  memoryUsage: real('memory_usage').notNull(), // percentage 0-100
  requestCount: integer('request_count').notNull().default(0),
  errorCount: integer('error_count').notNull().default(0),
  responseTime: real('response_time').notNull(), // milliseconds
  activeConnections: integer('active_connections').notNull().default(0),
  networkIn: varchar('network_in').notNull().default('0'), // bytes as string
  networkOut: varchar('network_out').notNull().default('0'), // bytes as string
  diskUsage: real('disk_usage').notNull().default(0), // percentage 0-100
  containerCount: integer('container_count').notNull().default(1),
  healthScore: real('health_score').notNull().default(100), // 0-100
  timestamp: timestamp('timestamp').defaultNow().notNull(),
}, (table) => [
  index('idx_deployment_metrics_deployment_id').on(table.deploymentId),
  index('idx_deployment_metrics_timestamp').on(table.timestamp),
]);

// Auto-Scaling Policies Table
export const scalingPolicies = pgTable('scaling_policies', {
  id: varchar('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  deploymentId: varchar('deployment_id').notNull(),
  name: text('name').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  metric: varchar('metric', { length: 50 }).notNull(), // cpu, memory, requests, responseTime, custom
  thresholdUp: real('threshold_up').notNull(),
  thresholdDown: real('threshold_down').notNull(),
  scaleUpBy: integer('scale_up_by').notNull().default(1),
  scaleDownBy: integer('scale_down_by').notNull().default(1),
  minInstances: integer('min_instances').notNull().default(1),
  maxInstances: integer('max_instances').notNull().default(10),
  cooldownPeriod: integer('cooldown_period').notNull().default(300), // seconds
  customMetric: jsonb('custom_metric'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_scaling_policies_deployment_id').on(table.deploymentId),
]);

// Deployment Snapshots Table
export const deploymentSnapshots = pgTable('deployment_snapshots', {
  id: varchar('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  deploymentId: varchar('deployment_id').notNull(),
  version: varchar('version').notNull(),
  environment: varchar('environment', { length: 50 }).notNull().default('production'),
  config: jsonb('config').notNull().default({}),
  fileManifest: jsonb('file_manifest').notNull().default([]),
  databaseSchema: jsonb('database_schema'),
  metadata: jsonb('metadata').notNull().default({}),
  status: varchar('status', { length: 50 }).notNull().default('active'), // active, archived, failed
  size: integer('size').notNull().default(0), // bytes
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_deployment_snapshots_deployment_id').on(table.deploymentId),
  index('idx_deployment_snapshots_version').on(table.version),
  index('idx_deployment_snapshots_created_at').on(table.createdAt),
]);

// Task summaries
export const taskSummaries = pgTable('task_summaries', {
  id: serial('id').primaryKey(),
  projectId: varchar('project_id').notNull().references(() => projects.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  completedTasks: jsonb('completed_tasks'),
  filesCreated: integer('files_created').default(0),
  filesModified: integer('files_modified').default(0),
  linesAdded: integer('lines_added').default(0),
  linesDeleted: integer('lines_deleted').default(0),
  createdBy: varchar('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Object Storage tables (Google Cloud Storage)
export const objectStorageBuckets = pgTable('object_storage_buckets', {
  id: serial('id').primaryKey(),
  projectId: varchar('project_id').notNull().references(() => projects.id),
  bucketName: varchar('bucket_name').notNull().unique(),
  region: varchar('region').notNull().default('us-central1'),
  storageClass: varchar('storage_class').notNull().default('STANDARD'),
  publicAccess: boolean('public_access').default(false),
  corsEnabled: boolean('cors_enabled').default(true),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const objectStorageFiles = pgTable('object_storage_files', {
  id: serial('id').primaryKey(),
  bucketId: integer('bucket_id').notNull().references(() => objectStorageBuckets.id),
  fileName: text('file_name').notNull(),
  filePath: text('file_path').notNull(),
  contentType: varchar('content_type').notNull(),
  size: integer('size').notNull(), // bytes
  url: text('url').notNull(),
  metadata: jsonb('metadata').default({}),
  uploadedBy: integer('uploaded_by').notNull().references(() => users.id),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
});

// Key-Value Store
export const keyValueStore = pgTable('key_value_store', {
  id: serial('id').primaryKey(),
  projectId: varchar('project_id').notNull().references(() => projects.id),
  key: varchar('key').notNull(),
  value: jsonb('value').notNull(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  unique().on(table.projectId, table.key),
]);

// AI Agent Conversations
export const aiConversations = pgTable('ai_conversations', {
  id: serial('id').primaryKey(),
  projectId: varchar('project_id').notNull().references(() => projects.id),
  userId: varchar('user_id').notNull().references(() => users.id),
  messages: jsonb('messages').notNull().default([]),
  context: jsonb('context').default({}),
  totalTokensUsed: integer('total_tokens_used').default(0),
  model: varchar('model').notNull().default('claude-3-sonnet'),
  agentMode: agentModeEnum('agent_mode').notNull().default('build'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Dynamic Intelligence settings
export const dynamicIntelligence = pgTable('dynamic_intelligence', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').notNull().references(() => users.id).unique(),
  extendedThinking: boolean('extended_thinking').default(false),
  highPowerMode: boolean('high_power_mode').default(false),
  autoWebSearch: boolean('auto_web_search').default(true),
  preferredModel: varchar('preferred_model').default('claude-3-sonnet'),
  customInstructions: text('custom_instructions'),
  // AI UX Feature preferences
  improvePromptEnabled: boolean('improve_prompt_enabled').default(false),
  progressTabEnabled: boolean('progress_tab_enabled').default(false),
  pauseResumeEnabled: boolean('pause_resume_enabled').default(false),
  autoCheckpoints: boolean('auto_checkpoints').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Web Search History
export const webSearchHistory = pgTable('web_search_history', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversation_id').notNull().references(() => aiConversations.id),
  query: text('query').notNull(),
  results: jsonb('results').notNull(),
  selectedUrls: jsonb('selected_urls').default([]),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

// Agent Conversation Messages - For detailed message tracking with extended thinking
export const agentMessages = pgTable('agent_messages', {
  id: varchar('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: varchar('session_id').references(() => agentSessions.id, { onDelete: 'cascade' }),
  conversationId: integer('conversation_id').notNull().references(() => aiConversations.id, { onDelete: 'cascade' }), // Primary thread identifier
  projectId: varchar('project_id').notNull().references(() => projects.id),
  userId: varchar('user_id').notNull().references(() => users.id),
  role: varchar('role').notNull(), // 'user' | 'assistant' | 'system'
  content: text('content').notNull(),
  model: varchar('model'), // Model used for this specific message
  extendedThinking: jsonb('extended_thinking').$type<{
    enabled: boolean;
    reasoning: string;
    steps: Array<{
      step: number;
      thought: string;
      conclusion: string;
    }>;
    confidence: number;
  }>(),
  metadata: jsonb('metadata').$type<{
    tokensUsed?: number;
    processingTimeMs?: number;
    toolsUsed?: string[];
    filesModified?: string[];
    actions?: Array<{
      type: string;
      path?: string;
      success: boolean;
    }>;
  }>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('agent_messages_session_id_idx').on(table.sessionId),
  index('agent_messages_conversation_id_idx').on(table.conversationId),
  index('agent_messages_project_id_idx').on(table.projectId),
  index('agent_messages_timeline_idx').on(table.projectId, table.createdAt), // For timeline queries
]);

// Secrets Management
export const secrets = pgTable('secrets', {
  id: serial('id').primaryKey(),
  projectId: varchar('project_id').notNull().references(() => projects.id),
  key: varchar('key').notNull(),
  encryptedValue: text('encrypted_value').notNull(),
  description: text('description'),
  createdBy: varchar('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  unique().on(table.projectId, table.key),
]);

// Environment Variables
export const environmentVariables = pgTable('environment_variables', {
  id: serial('id').primaryKey(),
  projectId: varchar('project_id').notNull().references(() => projects.id),
  key: varchar('key').notNull(),
  value: text('value').notNull(),
  environment: varchar('environment').notNull().default('development'), // development, staging, production
  isSecret: boolean('is_secret').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  unique().on(table.projectId, table.key, table.environment),
]);

// Git Integration
export const gitRepositories = pgTable('git_repositories', {
  id: serial('id').primaryKey(),
  projectId: varchar('project_id').notNull().references(() => projects.id).unique(),
  provider: varchar('provider').notNull(), // github, gitlab, bitbucket
  repositoryUrl: text('repository_url').notNull(),
  defaultBranch: varchar('default_branch').notNull().default('main'),
  isPrivate: boolean('is_private').default(true),
  deployKey: text('deploy_key'), // encrypted
  webhookSecret: varchar('webhook_secret'),
  autoSync: boolean('auto_sync').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const gitCommits = pgTable('git_commits', {
  id: serial('id').primaryKey(),
  repositoryId: integer('repository_id').notNull().references(() => gitRepositories.id),
  commitHash: varchar('commit_hash').notNull(),
  message: text('message').notNull(),
  author: varchar('author').notNull(),
  authorEmail: varchar('author_email').notNull(),
  timestamp: timestamp('timestamp').notNull(),
  branch: varchar('branch').notNull(),
  syncedAt: timestamp('synced_at').defaultNow().notNull(),
});

// Custom Domains
export const customDomains = pgTable('custom_domains', {
  id: serial('id').primaryKey(),
  projectId: varchar('project_id').notNull().references(() => projects.id),
  domain: varchar('domain').notNull().unique(),
  subdomain: varchar('subdomain'),
  sslStatus: varchar('ssl_status').notNull().default('pending'), // pending, active, failed
  sslCertificate: text('ssl_certificate'),
  verificationStatus: varchar('verification_status').notNull().default('pending'),
  verificationToken: varchar('verification_token'),
  dnsRecords: jsonb('dns_records').default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// AI Usage Tracking Table (for billing)
export const aiUsageRecords = pgTable('ai_usage_records', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').notNull().references(() => users.id),
  model: varchar('model').notNull(),
  provider: varchar('provider').notNull(), // OpenAI, Anthropic, E-Code
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  totalTokens: integer('total_tokens').notNull().default(0),
  creditsCost: decimal('credits_cost', { precision: 10, scale: 4 }).notNull().default('0'),
  purpose: varchar('purpose'), // chat, completion, embedding, code-generation, agent-task
  projectId: varchar('project_id').references(() => projects.id),
  conversationId: varchar('conversation_id'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('ai_usage_user_idx').on(table.userId),
  index('ai_usage_project_idx').on(table.projectId),
  index('ai_usage_created_idx').on(table.createdAt),
]);

// Custom Prompts System Tables
export const promptCategories = pgEnum('prompt_category', [
  'code_generation', 'debugging', 'documentation', 'refactoring',
  'testing', 'performance', 'security', 'architecture', 'other'
]);

// Prompt Templates - Reusable prompt templates
export const promptTemplates = pgTable('prompt_templates', {
  id: serial('id').primaryKey(),
  name: varchar('name').notNull(),
  description: text('description'),
  category: promptCategories('category').notNull().default('other'),
  prompt: text('prompt').notNull(),
  variables: jsonb('variables').default([]).$type<Array<{name: string; description: string; defaultValue?: string}>>(),
  isSystem: boolean('is_system').notNull().default(false), // System-provided templates
  createdBy: varchar('created_by').references(() => users.id),
  isPublic: boolean('is_public').notNull().default(false), // Can be shared
  usageCount: integer('usage_count').notNull().default(0),
  rating: real('rating').default(0), // Average rating
  tags: text('tags').array().default([]),
  examples: jsonb('examples').default([]).$type<Array<{input: string; output: string}>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('prompt_templates_category_idx').on(table.category),
  index('prompt_templates_created_by_idx').on(table.createdBy),
  index('prompt_templates_public_idx').on(table.isPublic),
]);

// Custom Prompts - User-specific custom prompts
export const customPrompts = pgTable('custom_prompts', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').notNull().references(() => users.id),
  templateId: integer('template_id').references(() => promptTemplates.id), // Optional link to template
  name: varchar('name').notNull(),
  description: text('description'),
  category: promptCategories('category').notNull().default('other'),
  prompt: text('prompt').notNull(),
  variables: jsonb('variables').default({}).$type<Record<string, string>>(), // Variable values
  isFavorite: boolean('is_favorite').notNull().default(false),
  usageCount: integer('usage_count').notNull().default(0),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('custom_prompts_user_idx').on(table.userId),
  index('custom_prompts_template_idx').on(table.templateId),
  index('custom_prompts_favorite_idx').on(table.isFavorite),
]);

// Project AI Rules - AI rules applied to specific projects
export const projectAiRules = pgTable('project_ai_rules', {
  id: serial('id').primaryKey(),
  projectId: varchar('project_id').notNull().references(() => projects.id),
  customPromptId: integer('custom_prompt_id').references(() => customPrompts.id),
  templateId: integer('template_id').references(() => promptTemplates.id),
  name: varchar('name').notNull(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(false),
  priority: integer('priority').notNull().default(0), // Higher priority rules are applied first
  conditions: jsonb('conditions').default({}).$type<{
    fileTypes?: string[];
    paths?: string[];
    keywords?: string[];
  }>(), // When to apply this rule
  settings: jsonb('settings').default({}).$type<{
    autoApply?: boolean;
    maxTokens?: number;
    temperature?: number;
  }>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('project_ai_rules_project_idx').on(table.projectId),
  index('project_ai_rules_prompt_idx').on(table.customPromptId),
  index('project_ai_rules_template_idx').on(table.templateId),
  index('project_ai_rules_active_idx').on(table.isActive),
]);

// Prompt Usage History - Track usage of prompts
export const promptUsageHistory = pgTable('prompt_usage_history', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').notNull().references(() => users.id),
  projectId: varchar('project_id').references(() => projects.id),
  customPromptId: integer('custom_prompt_id').references(() => customPrompts.id),
  templateId: integer('template_id').references(() => promptTemplates.id),
  prompt: text('prompt').notNull(), // The actual prompt used
  variables: jsonb('variables').default({}), // Variables used
  response: text('response'), // AI response
  inputTokens: integer('input_tokens').default(0),
  outputTokens: integer('output_tokens').default(0),
  model: varchar('model'),
  rating: integer('rating'), // User rating 1-5
  feedback: text('feedback'), // User feedback
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('prompt_usage_user_idx').on(table.userId),
  index('prompt_usage_project_idx').on(table.projectId),
  index('prompt_usage_created_idx').on(table.createdAt),
]);

// Prompt Template Ratings - User ratings for templates
export const promptTemplateRatings = pgTable('prompt_template_ratings', {
  id: serial('id').primaryKey(),
  templateId: integer('template_id').notNull().references(() => promptTemplates.id),
  userId: varchar('user_id').notNull().references(() => users.id),
  rating: integer('rating').notNull(), // 1-5
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('prompt_ratings_template_idx').on(table.templateId),
  index('prompt_ratings_user_idx').on(table.userId),
  unique('unique_template_user_rating').on(table.templateId, table.userId),
]);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  apiKeys: many(apiKeys),
  codeReviews: many(codeReviews),
  mentorProfile: many(mentorProfiles),
  mentorshipSessions: many(mentorshipSessions),
  challengeSubmissions: many(challengeSubmissions),
  mobileDevices: many(mobileDevices),
  aiUsageRecords: many(aiUsageRecords),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
  }),
  files: many(files),
  codeReviews: many(codeReviews),
}));

export const filesRelations = relations(files, ({ one }) => ({
  project: one(projects, {
    fields: [files.projectId],
    references: [projects.id],
  }),
}));

export const codeReviewsRelations = relations(codeReviews, ({ one, many }) => ({
  project: one(projects, {
    fields: [codeReviews.projectId],
    references: [projects.id],
  }),
  createdBy: one(users, {
    fields: [codeReviews.createdBy],
    references: [users.id],
  }),
  issues: many(reviewIssues),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters").max(50, "Username must be at most 50 characters"),
});

// Registration-specific schema with password validation (NOT for database insertion)
export const userRegistrationSchema = insertUserSchema.extend({
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export const insertEmailVerificationTokenSchema = createInsertSchema(emailVerificationTokens).omit({ id: true, createdAt: true });
export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({ id: true, createdAt: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFileSchema = createInsertSchema(files).omit({ id: true, createdAt: true, updatedAt: true });
export const insertApiKeySchema = createInsertSchema(apiKeys).omit({ id: true, createdAt: true });
export const insertCodeReviewSchema = createInsertSchema(codeReviews).omit({ id: true, createdAt: true, completedAt: true });
export const insertChallengeSchema = createInsertSchema(challenges).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMentorProfileSchema = createInsertSchema(mentorProfiles).omit({ id: true, createdAt: true });
export const insertDeploymentSchema = createInsertSchema(deployments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCommentSchema = createInsertSchema(comments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCheckpointSchema = createInsertSchema(checkpoints).omit({ id: true, createdAt: true });
export const insertCheckpointFileSchema = createInsertSchema(checkpointFiles).omit({ id: true });
export const insertCheckpointDatabaseSchema = createInsertSchema(checkpointDatabase).omit({ id: true });
export const insertTimeTrackingSchema = createInsertSchema(projectTimeTracking).omit({ id: true, createdAt: true });
export const insertScreenshotSchema = createInsertSchema(projectScreenshots).omit({ id: true, createdAt: true });
export const insertTaskSummarySchema = createInsertSchema(taskSummaries).omit({ id: true, createdAt: true });
export const insertWebrtcSessionSchema = createInsertSchema(webrtcSessions).omit({ id: true, createdAt: true });
export const insertWebrtcParticipantSchema = createInsertSchema(webrtcParticipants).omit({ id: true, joinedAt: true });
export const insertWebrtcRecordingSchema = createInsertSchema(webrtcRecordings).omit({ id: true, createdAt: true });
export const insertCollaborationPresenceSchema = createInsertSchema(collaborationPresence).omit({ id: true, lastSeen: true });
export const insertUserCreditsSchema = createInsertSchema(userCredits).omit({ id: true, updatedAt: true });
export const insertBudgetLimitSchema = createInsertSchema(budgetLimits).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUsageAlertSchema = createInsertSchema(usageAlerts).omit({ id: true, createdAt: true });
export const insertAutoscaleDeploymentSchema = createInsertSchema(autoscaleDeployments).omit({ id: true, createdAt: true });
export const insertReservedVmDeploymentSchema = createInsertSchema(reservedVmDeployments).omit({ id: true, createdAt: true });
export const insertScheduledDeploymentSchema = createInsertSchema(scheduledDeployments).omit({ id: true, createdAt: true });
export const insertStaticDeploymentSchema = createInsertSchema(staticDeployments).omit({ id: true, createdAt: true });
export const insertObjectStorageBucketSchema = createInsertSchema(objectStorageBuckets).omit({ id: true, createdAt: true });
export const insertObjectStorageFileSchema = createInsertSchema(objectStorageFiles).omit({ id: true, uploadedAt: true });
export const insertKeyValueStoreSchema = createInsertSchema(keyValueStore).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAiConversationSchema = createInsertSchema(aiConversations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDynamicIntelligenceSchema = createInsertSchema(dynamicIntelligence).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWebSearchHistorySchema = createInsertSchema(webSearchHistory).omit({ id: true, timestamp: true });
export const insertAgentMessageSchema = createInsertSchema(agentMessages).omit({ id: true, createdAt: true });
export const insertSecretSchema = createInsertSchema(secrets).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEnvironmentVariableSchema = createInsertSchema(environmentVariables).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGitRepositorySchema = createInsertSchema(gitRepositories).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGitCommitSchema = createInsertSchema(gitCommits).omit({ id: true, syncedAt: true });
export const insertCustomDomainSchema = createInsertSchema(customDomains).omit({ id: true, createdAt: true, updatedAt: true });
export const insertNewsletterSubscriberSchema = createInsertSchema(newsletterSubscribers).omit({
  id: true,
  subscribedAt: true,
  unsubscribedAt: true,
  confirmedAt: true,
  lastActivityAt: true,
});
export const insertNewsletterCampaignSchema = createInsertSchema(newsletterCampaigns).omit({
  id: true,
  createdAt: true,
  sentAt: true,
  scheduledFor: true,
  status: true,
  metrics: true,
});
export const insertNewsletterDeliverySchema = createInsertSchema(newsletterDeliveries).omit({
  id: true,
  sentAt: true,
});

// Custom Prompts Insert Schemas
export const insertPromptTemplateSchema = createInsertSchema(promptTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCustomPromptSchema = createInsertSchema(customPrompts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProjectAiRuleSchema = createInsertSchema(projectAiRules).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPromptUsageHistorySchema = createInsertSchema(promptUsageHistory).omit({ id: true, createdAt: true });
export const insertPromptTemplateRatingSchema = createInsertSchema(promptTemplateRatings).omit({ id: true, createdAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = typeof users.$inferInsert;

export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type InsertEmailVerificationToken = z.infer<typeof insertEmailVerificationTokenSchema>;

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type File = typeof files.$inferSelect;
export type InsertFile = z.infer<typeof insertFileSchema>;

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;

export type CodeReview = typeof codeReviews.$inferSelect;
export type InsertCodeReview = z.infer<typeof insertCodeReviewSchema>;

export type Challenge = typeof challenges.$inferSelect;
export type InsertChallenge = z.infer<typeof insertChallengeSchema>;

export type MentorProfile = typeof mentorProfiles.$inferSelect;
export type InsertMentorProfile = z.infer<typeof insertMentorProfileSchema>;

export type ChallengeSubmission = typeof challengeSubmissions.$inferSelect;
export type MentorshipSession = typeof mentorshipSessions.$inferSelect;
export type MobileDevice = typeof mobileDevices.$inferSelect;

export type Deployment = typeof deployments.$inferSelect;
export type InsertDeployment = z.infer<typeof insertDeploymentSchema>;

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;

export type Checkpoint = typeof checkpoints.$inferSelect;
export type InsertCheckpoint = z.infer<typeof insertCheckpointSchema>;

export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type InsertNewsletterSubscriber = z.infer<typeof insertNewsletterSubscriberSchema>;
export type NewsletterCampaign = typeof newsletterCampaigns.$inferSelect;
export type InsertNewsletterCampaign = z.infer<typeof insertNewsletterCampaignSchema>;
export type NewsletterDelivery = typeof newsletterDeliveries.$inferSelect;
export type InsertNewsletterDelivery = z.infer<typeof insertNewsletterDeliverySchema>;

export type TimeTracking = typeof projectTimeTracking.$inferSelect;
export type InsertTimeTracking = z.infer<typeof insertTimeTrackingSchema>;

export type Screenshot = typeof projectScreenshots.$inferSelect;
export type InsertScreenshot = z.infer<typeof insertScreenshotSchema>;

export type TaskSummary = typeof taskSummaries.$inferSelect;
export type InsertTaskSummary = z.infer<typeof insertTaskSummarySchema>;

export type WebrtcSession = typeof webrtcSessions.$inferSelect;
export type InsertWebrtcSession = z.infer<typeof insertWebrtcSessionSchema>;

export type WebrtcParticipant = typeof webrtcParticipants.$inferSelect;
export type InsertWebrtcParticipant = z.infer<typeof insertWebrtcParticipantSchema>;

export type WebrtcRecording = typeof webrtcRecordings.$inferSelect;
export type InsertWebrtcRecording = z.infer<typeof insertWebrtcRecordingSchema>;

export type CollaborationPresence = typeof collaborationPresence.$inferSelect;
export type InsertCollaborationPresence = z.infer<typeof insertCollaborationPresenceSchema>;

// Custom Prompts Types
export type PromptTemplate = typeof promptTemplates.$inferSelect;
export type InsertPromptTemplate = z.infer<typeof insertPromptTemplateSchema>;

export type CustomPrompt = typeof customPrompts.$inferSelect;
export type InsertCustomPrompt = z.infer<typeof insertCustomPromptSchema>;

export type ProjectAiRule = typeof projectAiRules.$inferSelect;
export type InsertProjectAiRule = z.infer<typeof insertProjectAiRuleSchema>;

export type PromptUsageHistory = typeof promptUsageHistory.$inferSelect;
export type InsertPromptUsageHistory = z.infer<typeof insertPromptUsageHistorySchema>;

export type PromptTemplateRating = typeof promptTemplateRatings.$inferSelect;
export type InsertPromptTemplateRating = z.infer<typeof insertPromptTemplateRatingSchema>;

// Agent Messages Types
export type AgentMessage = typeof agentMessages.$inferSelect;
export type InsertAgentMessage = z.infer<typeof insertAgentMessageSchema>;

// AI Model Enum Values
export const AI_MODELS = [
  'gpt-4',
  'gpt-4-turbo',
  'gpt-5',
  'claude-3-opus',
  'claude-3-sonnet',
  'claude-3-5-sonnet',
  'claude-3-haiku',
  'gemini-pro',
  'gemini-ultra'
] as const;
export type AiModel = typeof AI_MODELS[number];

// Import tables from separate schema files
export { projectImports, importTemplates } from './schema/imports';
export type { ProjectImport, InsertProjectImport, ImportTemplate, InsertImportTemplate } from './schema/imports';

// Voice/Video Sessions
export const voiceVideoSessions = pgTable("voice_video_sessions", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  roomId: varchar("room_id").notNull().unique(),
  hostUserId: varchar("host_user_id").notNull().references(() => users.id),
  sessionType: varchar("session_type").notNull(), // 'voice', 'video', or 'screen'
  status: varchar("status").notNull().default('active'), // 'active', 'ended'
  maxParticipants: integer("max_participants").notNull().default(10),
  recordingEnabled: boolean("recording_enabled").notNull().default(false),
  recordingUrl: text("recording_url"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const voiceVideoParticipants = pgTable("voice_video_participants", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  sessionId: integer("session_id").notNull().references(() => voiceVideoSessions.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: varchar("role").notNull().default('participant'), // 'host' or 'participant'
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  leftAt: timestamp("left_at"),
  isMuted: boolean("is_muted").notNull().default(false),
  isVideoEnabled: boolean("is_video_enabled").notNull().default(true),
});

// GPU Resources
export const gpuInstances = pgTable("gpu_instances", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  gpuType: varchar("gpu_type").notNull(), // 'T4', 'A100', etc.
  instanceId: varchar("instance_id").notNull().unique(),
  status: varchar("status").notNull().default('provisioning'), // 'provisioning', 'active', 'stopped', 'terminated'
  region: varchar("region").notNull(),
  costPerHour: decimal("cost_per_hour", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const gpuUsage = pgTable("gpu_usage", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  instanceId: integer("instance_id").notNull().references(() => gpuInstances.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  gpuUtilization: integer("gpu_utilization"), // percentage
  memoryUsed: integer("memory_used"), // MB
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Education Assignments
export const assignments = pgTable("assignments", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  title: varchar("title").notNull(),
  description: text("description"),
  courseId: integer("course_id"), // References to a course if part of structured learning
  createdBy: varchar("created_by").notNull().references(() => users.id),
  dueDate: timestamp("due_date"),
  points: integer("points").default(100),
  isPublished: boolean("is_published").default(false),
  instructions: text("instructions"),
  rubric: jsonb("rubric"), // Grading criteria
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const submissions = pgTable("submissions", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  assignmentId: integer("assignment_id").notNull().references(() => assignments.id),
  studentId: integer("student_id").notNull().references(() => users.id),
  projectId: integer("project_id").references(() => projects.id), // Link to the project containing the submission
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  grade: integer("grade"),
  feedback: text("feedback"),
  status: varchar("status").notNull().default('submitted'), // 'submitted', 'graded', 'returned'
  gradedBy: integer("graded_by").references(() => users.id),
  gradedAt: timestamp("graded_at"),
});

// Monitoring Tables (Fortune 500 Production Standards)
export const monitoringEvents = pgTable("monitoring_events", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  eventType: varchar("event_type").notNull(),
  severity: varchar("severity"),
  source: varchar("source"),
  message: text("message"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const performanceMetrics = pgTable("performance_metrics", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  type: varchar("type"), // 'system', 'application', 'deployment'
  category: varchar("category"), // 'cpu', 'memory', 'network', 'disk', 'request'
  metric_name: varchar("metric_name").notNull(),
  metric_value: decimal("metric_value", { precision: 20, scale: 4 }).notNull(),
  value: real("value"), // Alternative numeric value for compatibility
  unit: varchar("unit").notNull(),
  deploymentId: varchar("deployment_id"),
  endpoint: varchar("endpoint"),
  method: varchar("method"),
  statusCode: integer("status_code"),
  durationMs: integer("duration_ms"),
  memoryUsage: jsonb("memory_usage"),
  metadata: jsonb("metadata"),
  tags: jsonb("tags"),
  context: jsonb("context"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const errorLogs = pgTable("error_logs", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  message: text("message").notNull(),
  stack: text("stack"),
  type: varchar("type").notNull(), // 'error', 'unhandledRejection', etc.
  severity: varchar("severity").notNull().default('medium'), // 'low', 'medium', 'high', 'critical'
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  userAgent: text("user_agent"),
  url: text("url"),
  userId: varchar("user_id").references(() => users.id),
  sessionId: varchar("session_id"),
  metadata: jsonb("metadata"), // Additional context
  resolved: boolean("resolved").notNull().default(false),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: integer("resolved_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Collaborative Editing Sessions
export const collaborationSessions = pgTable("collaboration_sessions", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  fileId: integer("file_id").notNull().references(() => files.id),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Session Participants for Collaborative Editing
export const sessionParticipants = pgTable("session_participants", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: varchar("session_id").notNull().references(() => collaborationSessions.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  username: varchar("username").notNull(),
  cursorColor: varchar("cursor_color").notNull(),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  leftAt: timestamp("left_at"),
  active: boolean("active").notNull().default(true),
});

// Templates table for project templates with marketplace features
export const templates = pgTable("templates", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  slug: varchar("slug").notNull().unique(),
  name: varchar("name").notNull(),
  description: text("description"),
  category: varchar("category").notNull(), // 'web', 'backend', 'bot', 'game', etc.
  tags: text().array().notNull().default([]),
  authorId: varchar("author_id").references(() => users.id), // Link to user for community templates
  authorName: varchar("author_name").notNull(),
  authorVerified: boolean("author_verified").notNull().default(false),
  uses: integer("uses").notNull().default(0),
  stars: integer("stars").notNull().default(0),
  forks: integer("forks").notNull().default(0),
  language: varchar("language").notNull(),
  framework: varchar("framework"),
  difficulty: varchar("difficulty").notNull(), // 'beginner', 'intermediate', 'advanced'
  estimatedTime: integer("estimated_time").notNull(), // in minutes
  features: text().array().notNull().default([]),
  isFeatured: boolean("is_featured").notNull().default(false),
  isOfficial: boolean("is_official").notNull().default(false),
  isPublished: boolean("is_published").notNull().default(true),
  isCommunity: boolean("is_community").notNull().default(false), // Community submitted templates
  status: varchar("status").notNull().default('published'), // 'draft', 'pending_review', 'published', 'rejected'
  githubUrl: text("github_url"), // Source repository URL
  demoUrl: text("demo_url"), // Live demo URL
  thumbnailUrl: text("thumbnail_url"), // Screenshot/preview image
  version: varchar("version").notNull().default('1.0.0'),
  license: varchar("license").notNull().default('MIT'),
  price: decimal("price", { precision: 10, scale: 2 }).default('0.00'), // For premium templates
  downloads: integer("downloads").notNull().default(0),
  rating: real("rating").notNull().default(0), // Average rating
  reviewCount: integer("review_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Template categories with icons
export const templateCategories = pgTable("template_categories", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name").notNull().unique(),
  slug: varchar("slug").notNull().unique(),
  description: text("description"),
  icon: varchar("icon").notNull(), // Lucide icon name
  color: varchar("color").notNull().default('#F26207'), // E-Code orange by default
  templateCount: integer("template_count").notNull().default(0),
  order: integer("order").notNull().default(0), // Display order
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Template ratings and reviews
export const templateRatings = pgTable("template_ratings", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  templateId: varchar("template_id").notNull().references(() => templates.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(), // 1-5 stars
  review: text("review"),
  isVerifiedPurchase: boolean("is_verified_purchase").notNull().default(false),
  helpful: integer("helpful").notNull().default(0), // Upvotes on the review
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  unique('unique_template_user_rating').on(table.templateId, table.userId),
]);

// Template tags for enhanced categorization
export const templateTags = pgTable("template_tags", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  templateId: varchar("template_id").notNull().references(() => templates.id, { onDelete: 'cascade' }),
  tag: varchar("tag").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index('template_tags_template_idx').on(table.templateId),
  index('template_tags_tag_idx').on(table.tag),
  unique('unique_template_tag').on(table.templateId, table.tag),
]);

// Template collections (curated lists)
export const templateCollections = pgTable("template_collections", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name").notNull(),
  slug: varchar("slug").notNull().unique(),
  description: text("description"),
  authorId: varchar("author_id").notNull().references(() => users.id),
  thumbnailUrl: text("thumbnail_url"),
  isPublic: boolean("is_public").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  templateCount: integer("template_count").notNull().default(0),
  likes: integer("likes").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Templates in collections
export const collectionTemplates = pgTable("collection_templates", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  collectionId: varchar("collection_id").notNull().references(() => templateCollections.id, { onDelete: 'cascade' }),
  templateId: varchar("template_id").notNull().references(() => templates.id),
  order: integer("order").notNull().default(0),
  addedAt: timestamp("added_at").notNull().defaultNow(),
}, (table) => [
  unique('unique_collection_template').on(table.collectionId, table.templateId),
]);

// Monitoring and Alert Tables
export const alerts = pgTable("alerts", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  type: varchar("type").notNull(),
  severity: varchar("severity").notNull(), // 'info', 'warning', 'error', 'critical'
  message: text("message").notNull(),
  status: varchar("status").notNull().default('active'), // 'active', 'acknowledged', 'resolved', 'muted'
  triggered_at: timestamp("triggered_at").notNull().defaultNow(),
  acknowledged_by: varchar("acknowledged_by"),
  acknowledged_at: timestamp("acknowledged_at"),
  resolved_at: timestamp("resolved_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const alertHistory = pgTable("alert_history", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  alertId: integer("alert_id").notNull().references(() => alerts.id),
  action: varchar("action").notNull(), // 'triggered', 'acknowledged', 'resolved', 'muted', 'escalated'
  performedBy: varchar("performed_by"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  details: jsonb("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Community Templates Table
export const communityTemplates = pgTable("community_templates", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  authorId: varchar("author_id").notNull().references(() => users.id),
  name: varchar("name").notNull(),
  description: text("description"),
  githubUrl: text("github_url").notNull(),
  downloads: integer("downloads").notNull().default(0),
  stars: integer("stars").notNull().default(0),
  category: varchar("category").notNull(),
  tags: text().array().notNull().default([]),
  language: varchar("language").notNull(),
  framework: varchar("framework"),
  license: varchar("license").notNull().default('MIT'),
  isPublished: boolean("is_published").notNull().default(false),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Insert schemas
export const insertVoiceVideoSessionSchema = createInsertSchema(voiceVideoSessions).omit({ id: true, createdAt: true });
export const insertVoiceVideoParticipantSchema = createInsertSchema(voiceVideoParticipants).omit({ id: true });
export const insertGpuInstanceSchema = createInsertSchema(gpuInstances).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGpuUsageSchema = createInsertSchema(gpuUsage).omit({ id: true, createdAt: true });
export const insertAssignmentSchema = createInsertSchema(assignments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSubmissionSchema = createInsertSchema(submissions).omit({ id: true });
export const insertMonitoringEventSchema = createInsertSchema(monitoringEvents).omit({ id: true, createdAt: true });
export const insertPerformanceMetricSchema = createInsertSchema(performanceMetrics).omit({ id: true, createdAt: true });
export const insertErrorLogSchema = createInsertSchema(errorLogs).omit({ id: true, createdAt: true, resolved: true });
export const insertAlertSchema = createInsertSchema(alerts).omit({ id: true, createdAt: true, status: true, triggered_at: true });
export const insertAlertHistorySchema = createInsertSchema(alertHistory).omit({ id: true, createdAt: true, timestamp: true });
export const insertTemplateSchema = createInsertSchema(templates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTemplateCategorySchema = createInsertSchema(templateCategories).omit({ id: true, createdAt: true });
export const insertTemplateRatingSchema = createInsertSchema(templateRatings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTemplateTagSchema = createInsertSchema(templateTags).omit({ id: true, createdAt: true });
export const insertTemplateCollectionSchema = createInsertSchema(templateCollections).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCollectionTemplateSchema = createInsertSchema(collectionTemplates).omit({ id: true, addedAt: true });
export const insertNotificationSchema = createInsertSchema(pushNotifications, {
  type: z.string().min(1).optional(),
  actionUrl: z.string().min(1).optional(),
  data: z.record(z.any()).optional(),
}).omit({ id: true, createdAt: true, read: true, readAt: true, sent: true, sentAt: true });
export const insertNotificationPreferenceSchema = createInsertSchema(notificationPreferences, {
  email: z.record(z.boolean()),
  push: z.record(z.boolean()),
  frequency: z.enum(['instant', 'hourly', 'daily', 'weekly']).optional(),
}).omit({ createdAt: true, updatedAt: true });

// Types
export type VoiceVideoSession = typeof voiceVideoSessions.$inferSelect;
export type InsertVoiceVideoSession = z.infer<typeof insertVoiceVideoSessionSchema>;

export type VoiceVideoParticipant = typeof voiceVideoParticipants.$inferSelect;
export type InsertVoiceVideoParticipant = z.infer<typeof insertVoiceVideoParticipantSchema>;

export type GpuInstance = typeof gpuInstances.$inferSelect;
export type InsertGpuInstance = z.infer<typeof insertGpuInstanceSchema>;

export type GpuUsage = typeof gpuUsage.$inferSelect;
export type InsertGpuUsage = z.infer<typeof insertGpuUsageSchema>;

export type Assignment = typeof assignments.$inferSelect;
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;

export type Submission = typeof submissions.$inferSelect;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;

export type MonitoringEvent = typeof monitoringEvents.$inferSelect;
export type InsertMonitoringEvent = z.infer<typeof insertMonitoringEventSchema>;

export type PerformanceMetric = typeof performanceMetrics.$inferSelect;
export type InsertPerformanceMetric = z.infer<typeof insertPerformanceMetricSchema>;

export type ErrorLog = typeof errorLogs.$inferSelect;
export type InsertErrorLog = z.infer<typeof insertErrorLogSchema>;

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type TemplateCategory = typeof templateCategories.$inferSelect;
export type InsertTemplateCategory = z.infer<typeof insertTemplateCategorySchema>;
export type TemplateRating = typeof templateRatings.$inferSelect;
export type InsertTemplateRating = z.infer<typeof insertTemplateRatingSchema>;
export type TemplateTag = typeof templateTags.$inferSelect;
export type InsertTemplateTag = z.infer<typeof insertTemplateTagSchema>;
export type TemplateCollection = typeof templateCollections.$inferSelect;
export type InsertTemplateCollection = z.infer<typeof insertTemplateCollectionSchema>;
export type CollectionTemplate = typeof collectionTemplates.$inferSelect;
export type InsertCollectionTemplate = z.infer<typeof insertCollectionTemplateSchema>;
export type Notification = typeof pushNotifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = z.infer<typeof insertNotificationPreferenceSchema>;

// Security Tables

// Authentication attempts tracking
export const authAttempts = pgTable('auth_attempts', {
  id: varchar('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: text('username').notNull(),
  ipAddress: text('ip_address').notNull(),
  attemptType: text('attempt_type').notNull(), // 'success' | 'failed'
  lockedUntil: timestamp('locked_until'),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('auth_attempts_username_idx').on(table.username),
  index('auth_attempts_ip_idx').on(table.ipAddress),
  index('auth_attempts_created_at_idx').on(table.createdAt),
]);

// User sessions for enhanced session management
export const userSessions = pgTable('user_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  ipAddress: text('ip_address').notNull(),
  userAgent: text('user_agent').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastActivity: timestamp('last_activity').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  revokedAt: timestamp('revoked_at'),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
}, (table) => [
  index('user_sessions_user_id_idx').on(table.userId),
  index('user_sessions_expires_at_idx').on(table.expiresAt),
]);

// Security events logging
export const securityEvents = pgTable('security_events', {
  id: varchar('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  type: text('type').notNull(), // 'failed_login', 'xss_attempt', 'sql_injection', etc.
  severity: text('severity').notNull(), // 'low', 'medium', 'high', 'critical'
  source: text('source').notNull(), // IP address or user ID
  description: text('description').notNull(),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  resolved: boolean('resolved').default(false),
  resolvedAt: timestamp('resolved_at'),
  resolvedBy: text('resolved_by'),
}, (table) => [
  index('security_events_type_idx').on(table.type),
  index('security_events_severity_idx').on(table.severity),
  index('security_events_source_idx').on(table.source),
  index('security_events_timestamp_idx').on(table.timestamp),
]);

// Audit logs for sensitive operations
export const auditLogs = pgTable('audit_logs', {
  id: varchar('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull(),
  action: text('action').notNull(),
  resource: text('resource').notNull(),
  resourceId: text('resource_id'),
  oldValue: jsonb('old_value').$type<Record<string, any>>(),
  newValue: jsonb('new_value').$type<Record<string, any>>(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
}, (table) => [
  index('audit_logs_user_id_idx').on(table.userId),
  index('audit_logs_action_idx').on(table.action),
  index('audit_logs_resource_idx').on(table.resource),
  index('audit_logs_timestamp_idx').on(table.timestamp),
]);

// Add security-specific fields to users table if not exists
// NOTE: Update users table with security fields in a migration

// ============================================
// AUTONOMOUS AGENT SYSTEM TABLES
// ============================================

// Enum for agent operation types
export const agentOperationTypeEnum = pgEnum('agent_operation_type', [
  'file_create', 'file_read', 'file_update', 'file_delete', 'file_rename', 'file_move',
  'command_execute', 'database_query', 'database_migration', 'tool_execution',
  'workflow_start', 'workflow_step', 'workflow_complete', 'workflow_error'
]);

// Enum for operation status
export const operationStatusEnum = pgEnum('operation_status', [
  'pending', 'in_progress', 'completed', 'failed', 'cancelled', 'rolled_back'
]);

// Enum for tool capability types
export const toolCapabilityEnum = pgEnum('tool_capability', [
  'file_system', 'command_execution', 'database', 'ide_integration',
  'git_operations', 'package_management', 'testing', 'deployment',
  'monitoring', 'security', 'api_integration', 'ai_analysis'
]);

// Enum for autonomous mode risk thresholds
export const riskThresholdEnum = pgEnum('risk_threshold', [
  'low', 'medium', 'high', 'critical'
]);
export type RiskThreshold = 'low' | 'medium' | 'high' | 'critical';

// Agent Sessions - Track active AI agent sessions
export const agentSessions = pgTable('agent_sessions', {
  id: varchar('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar('user_id').notNull().references(() => users.id),
  projectId: varchar('project_id').references(() => projects.id),
  sessionToken: text('session_token').notNull().unique(),
  model: text('model').notNull(), // gpt-5, gpt-4, claude-3, etc
  context: jsonb('context').$type<{
    files: string[];
    currentFile?: string;
    workingDirectory: string;
    environment: Record<string, string>;
    capabilities: string[];
  }>(),
  isActive: boolean('is_active').default(true),
  totalTokensUsed: integer('total_tokens_used').default(0),
  totalOperations: integer('total_operations').default(0),
  // Autonomous Mode Settings
  autonomousMode: boolean('autonomous_mode').default(false),
  riskThreshold: riskThresholdEnum('risk_threshold').default('medium'),
  autoApproveActions: boolean('auto_approve_actions').default(false),
  startedAt: timestamp('started_at').defaultNow(),
  endedAt: timestamp('ended_at'),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
}, (table) => [
  index('agent_sessions_user_id_idx').on(table.userId),
  index('agent_sessions_project_id_idx').on(table.projectId),
  index('agent_sessions_active_idx').on(table.isActive),
]);

// File Operations - Track all file system operations
export const fileOperations = pgTable('file_operations', {
  id: varchar('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: varchar('session_id').notNull().references(() => agentSessions.id),
  operationType: agentOperationTypeEnum('operation_type').notNull(),
  filePath: text('file_path').notNull(),
  newPath: text('new_path'), // For rename/move operations
  content: text('content'), // File content for create/update
  previousContent: text('previous_content'), // For rollback capability
  checksum: text('checksum'), // File integrity check
  status: operationStatusEnum('status').notNull().default('pending'),
  error: text('error'),
  executedAt: timestamp('executed_at'),
  completedAt: timestamp('completed_at'),
  rollbackOf: varchar('rollback_of'), // Reference to operation being rolled back
  metadata: jsonb('metadata').$type<{
    fileSize?: number;
    mimeType?: string;
    encoding?: string;
    permissions?: string;
    diff?: string;
  }>(),
}, (table) => [
  index('file_operations_session_id_idx').on(table.sessionId),
  index('file_operations_status_idx').on(table.status),
  index('file_operations_file_path_idx').on(table.filePath),
]);

// Command Executions - Track all command/process executions
export const commandExecutions = pgTable('command_executions', {
  id: varchar('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: varchar('session_id').notNull().references(() => agentSessions.id),
  command: text('command').notNull(),
  arguments: jsonb('arguments').$type<string[]>(),
  workingDirectory: text('working_directory').notNull(),
  environment: jsonb('environment').$type<Record<string, string>>(),
  stdin: text('stdin'),
  stdout: text('stdout'),
  stderr: text('stderr'),
  exitCode: integer('exit_code'),
  status: operationStatusEnum('status').notNull().default('pending'),
  timeout: integer('timeout'), // In milliseconds
  resourceLimits: jsonb('resource_limits').$type<{
    maxMemory?: number;
    maxCpu?: number;
    maxDiskIo?: number;
  }>(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  killedAt: timestamp('killed_at'),
  error: text('error'),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
}, (table) => [
  index('command_executions_session_id_idx').on(table.sessionId),
  index('command_executions_status_idx').on(table.status),
  index('command_executions_started_at_idx').on(table.startedAt),
]);

// Tool Registry - Define available tools and their capabilities
export const toolRegistry = pgTable('tool_registry', {
  id: varchar('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull().unique(),
  displayName: text('display_name').notNull(),
  description: text('description'),
  capability: toolCapabilityEnum('capability').notNull(),
  version: text('version').notNull(),
  isEnabled: boolean('is_enabled').default(true),
  requiresAuth: boolean('requires_auth').default(false),
  permissions: jsonb('permissions').$type<string[]>(),
  configuration: jsonb('configuration').$type<{
    endpoint?: string;
    apiKey?: string;
    rateLimit?: number;
    timeout?: number;
    parameters?: Record<string, any>;
  }>(),
  inputSchema: jsonb('input_schema').$type<Record<string, any>>(), // JSON Schema
  outputSchema: jsonb('output_schema').$type<Record<string, any>>(), // JSON Schema
  examples: jsonb('examples').$type<Array<{
    input: Record<string, any>;
    output: Record<string, any>;
    description?: string;
  }>>(),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('tool_registry_capability_idx').on(table.capability),
  index('tool_registry_enabled_idx').on(table.isEnabled),
]);

// Tool Executions - Track tool usage
export const toolExecutions = pgTable('tool_executions', {
  id: varchar('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: varchar('session_id').notNull().references(() => agentSessions.id),
  toolId: varchar('tool_id').notNull().references(() => toolRegistry.id),
  input: jsonb('input').$type<Record<string, any>>().notNull(),
  output: jsonb('output').$type<Record<string, any>>(),
  status: operationStatusEnum('status').notNull().default('pending'),
  error: text('error'),
  executionTime: integer('execution_time'), // In milliseconds
  tokensUsed: integer('tokens_used'),
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
}, (table) => [
  index('tool_executions_session_id_idx').on(table.sessionId),
  index('tool_executions_tool_id_idx').on(table.toolId),
  index('tool_executions_status_idx').on(table.status),
]);

// Workflows - Multi-step operation orchestration
export const agentWorkflows = pgTable('agent_workflows', {
  id: varchar('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: varchar('session_id').notNull().references(() => agentSessions.id),
  name: text('name').notNull(),
  description: text('description'),
  steps: jsonb('steps').$type<Array<{
    id: string;
    name: string;
    type: 'file_operation' | 'command' | 'tool' | 'database' | 'conditional';
    config: Record<string, any>;
    dependencies?: string[];
    retryPolicy?: {
      maxRetries: number;
      backoffMs: number;
    };
  }>>().notNull(),
  currentStep: text('current_step'),
  status: operationStatusEnum('status').notNull().default('pending'),
  progress: integer('progress').default(0), // Percentage 0-100
  result: jsonb('result').$type<Record<string, any>>(),
  error: text('error'),
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  checkpoints: jsonb('checkpoints').$type<Array<{
    stepId: string;
    timestamp: string;
    state: Record<string, any>;
  }>>(),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
}, (table) => [
  index('agent_workflows_session_id_idx').on(table.sessionId),
  index('agent_workflows_status_idx').on(table.status),
]);

// Database Operations - Track database queries and migrations
export const databaseOperations = pgTable('database_operations', {
  id: varchar('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: varchar('session_id').notNull().references(() => agentSessions.id),
  operationType: text('operation_type').notNull(), // query, migration, backup, restore
  database: text('database').notNull(),
  query: text('query'),
  migration: text('migration'),
  affectedRows: integer('affected_rows'),
  result: jsonb('result').$type<any>(),
  status: operationStatusEnum('status').notNull().default('pending'),
  error: text('error'),
  executionTime: integer('execution_time'), // In milliseconds
  transaction: boolean('transaction').default(false),
  rollbackQuery: text('rollback_query'),
  executedAt: timestamp('executed_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
}, (table) => [
  index('database_operations_session_id_idx').on(table.sessionId),
  index('database_operations_status_idx').on(table.status),
  index('database_operations_type_idx').on(table.operationType),
]);

// Agent Audit Trail - Comprehensive audit logging for all agent actions
export const agentAuditTrail = pgTable('agent_audit_trail', {
  id: varchar('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: varchar('session_id').notNull().references(() => agentSessions.id),
  userId: varchar('user_id').notNull().references(() => users.id),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id'),
  details: jsonb('details').$type<Record<string, any>>(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  // Autonomous Mode Tracking
  riskScore: integer('risk_score'), // 0-100 scale
  autoApproved: boolean('auto_approved').default(false),
  rollbackAvailable: boolean('rollback_available').default(false),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  severity: text('severity').notNull().default('info'), // info, warning, error, critical
}, (table) => [
  index('agent_audit_trail_session_id_idx').on(table.sessionId),
  index('agent_audit_trail_user_id_idx').on(table.userId),
  index('agent_audit_trail_timestamp_idx').on(table.timestamp),
  index('agent_audit_trail_severity_idx').on(table.severity),
]);

// Autonomous Actions - Track all autonomous agent actions
export const autonomousActions = pgTable('autonomous_actions', {
  id: varchar('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: varchar('session_id').notNull().references(() => agentSessions.id),
  actionType: text('action_type').notNull(), // file_write, command_execute, tool_call, etc
  actionData: jsonb('action_data').$type<Record<string, any>>(),
  riskScore: integer('risk_score').notNull(), // 0-100 scale
  riskFactors: jsonb('risk_factors').$type<{
    fileModification?: boolean;
    commandExecution?: boolean;
    networkAccess?: boolean;
    databaseAccess?: boolean;
    systemChange?: boolean;
    impact?: string;
  }>(),
  autoApproved: boolean('auto_approved').notNull().default(false),
  approvalRequired: boolean('approval_required').notNull().default(true),
  status: operationStatusEnum('status').notNull().default('pending'),
  result: jsonb('result').$type<any>(),
  error: text('error'),
  rollbackAvailable: boolean('rollback_available').default(true),
  rollbackData: jsonb('rollback_data').$type<Record<string, any>>(),
  executedAt: timestamp('executed_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  rolledBackAt: timestamp('rolled_back_at'),
}, (table) => [
  index('autonomous_actions_session_id_idx').on(table.sessionId),
  index('autonomous_actions_status_idx').on(table.status),
  index('autonomous_actions_risk_score_idx').on(table.riskScore),
  index('autonomous_actions_auto_approved_idx').on(table.autoApproved),
]);

// Agent Permissions - Fine-grained permission control
export const agentPermissions = pgTable('agent_permissions', {
  id: varchar('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar('user_id').references(() => users.id),
  roleId: varchar('role_id'), // For future role-based permissions
  resource: text('resource').notNull(),
  action: text('action').notNull(),
  conditions: jsonb('conditions').$type<Record<string, any>>(),
  isAllowed: boolean('is_allowed').notNull().default(true),
  priority: integer('priority').default(0),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('agent_permissions_user_id_idx').on(table.userId),
  index('agent_permissions_resource_action_idx').on(table.resource, table.action),
]);

// ============================================================================
// AI AGENT APPROVAL QUEUE & AUDIT - Fortune 500 Security
// ============================================================================

// AI Approval Queue - Stores pending actions requiring human approval
export const aiApprovalQueue = pgTable('ai_approval_queue', {
  id: varchar('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar('user_id').notNull().references(() => users.id),
  projectId: varchar('project_id').notNull().references(() => projects.id),
  action: jsonb('action').$type<{
    type: string;
    path?: string;
    content?: string;
    package?: string;
    description?: string;
  }>().notNull(),
  status: text('status').notNull().default('pending'), // pending, approved, rejected, expired
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  processedAt: timestamp('processed_at'),
  processedBy: varchar('processed_by').references(() => users.id),
  rejectionReason: text('rejection_reason'),
}, (table) => [
  index('ai_approval_queue_user_id_idx').on(table.userId),
  index('ai_approval_queue_project_id_idx').on(table.projectId),
  index('ai_approval_queue_status_idx').on(table.status),
  index('ai_approval_queue_expires_at_idx').on(table.expiresAt),
]);

// AI Audit Logs - Comprehensive compliance-grade audit trail for all AI actions
export const aiAuditLogs = pgTable('ai_audit_logs', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').notNull().references(() => users.id),
  projectId: varchar('project_id').notNull().references(() => projects.id),
  approvalId: varchar('approval_id').references(() => aiApprovalQueue.id),
  action: jsonb('action').$type<{
    type: string;
    path?: string;
    content?: string;
    package?: string;
    description?: string;
  }>().notNull(),
  result: jsonb('result').$type<{
    success: boolean;
    error?: string;
    fileId?: string;
  }>().notNull(),
  securityValidation: jsonb('security_validation').$type<{
    pathValid: boolean;
    reason?: string;
    sanitized?: string;
  }>(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
}, (table) => [
  index('ai_audit_logs_user_id_idx').on(table.userId),
  index('ai_audit_logs_project_id_idx').on(table.projectId),
  index('ai_audit_logs_approval_id_idx').on(table.approvalId),
  index('ai_audit_logs_timestamp_idx').on(table.timestamp),
]);

// ============================================================================
// IDE WORKSPACE FEATURES - For true Replit parity
// ============================================================================

// LSP Diagnostics - For Problems Panel (real-time error/warning display)
export const lspDiagnostics = pgTable('lsp_diagnostics', {
  id: varchar('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: varchar('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  fileId: integer('file_id').references(() => files.id, { onDelete: 'cascade' }),
  filePath: text('file_path').notNull(),
  severity: text('severity').notNull(), // 'error', 'warning', 'info', 'hint'
  message: text('message').notNull(),
  source: text('source'), // 'typescript', 'eslint', etc.
  code: text('code'), // Error code like 'TS2322'
  startLine: integer('start_line').notNull(),
  startColumn: integer('start_column').notNull(),
  endLine: integer('end_line').notNull(),
  endColumn: integer('end_column').notNull(),
  tags: text('tags').array(), // 'unnecessary', 'deprecated', etc.
  relatedInformation: jsonb('related_information').$type<Array<{
    message: string;
    filePath: string;
    line: number;
    column: number;
  }>>(),
  createdAt: timestamp('created_at').defaultNow(),
  resolvedAt: timestamp('resolved_at'),
}, (table) => [
  index('lsp_diagnostics_project_id_idx').on(table.projectId),
  index('lsp_diagnostics_file_id_idx').on(table.fileId),
  index('lsp_diagnostics_severity_idx').on(table.severity),
]);

// Build Logs - For Output Panel (real-time build/runtime output)
export const buildLogs = pgTable('build_logs', {
  id: varchar('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: varchar('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  buildId: varchar('build_id').notNull(), // Groups logs by build session
  logType: text('log_type').notNull(), // 'stdout', 'stderr', 'build', 'runtime'
  level: text('level').notNull(), // 'info', 'warn', 'error', 'debug'
  message: text('message').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  source: text('source'), // 'vite', 'tsc', 'node', etc.
  metadata: jsonb('metadata').$type<Record<string, any>>(),
}, (table) => [
  index('build_logs_project_id_idx').on(table.projectId),
  index('build_logs_build_id_idx').on(table.buildId),
  index('build_logs_timestamp_idx').on(table.timestamp),
  index('build_logs_level_idx').on(table.level),
]);

// Test Runs - For Testing Panel (test execution tracking)
export const testRuns = pgTable('test_runs', {
  id: varchar('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: varchar('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  runId: varchar('run_id').notNull().unique(), // Unique identifier for this test run
  runner: text('runner').notNull(), // 'jest', 'playwright', 'vitest', etc.
  status: text('status').notNull(), // 'running', 'passed', 'failed', 'cancelled'
  totalTests: integer('total_tests').notNull().default(0),
  passedTests: integer('passed_tests').notNull().default(0),
  failedTests: integer('failed_tests').notNull().default(0),
  skippedTests: integer('skipped_tests').notNull().default(0),
  duration: integer('duration'), // milliseconds
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  config: jsonb('config').$type<Record<string, any>>(),
  coverage: jsonb('coverage').$type<{
    lines: number;
    statements: number;
    functions: number;
    branches: number;
  }>(),
}, (table) => [
  index('test_runs_project_id_idx').on(table.projectId),
  index('test_runs_status_idx').on(table.status),
  index('test_runs_started_at_idx').on(table.startedAt),
]);

// Test Cases - Individual test results
export const testCases = pgTable('test_cases', {
  id: varchar('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  testRunId: varchar('test_run_id').notNull().references(() => testRuns.id, { onDelete: 'cascade' }),
  suiteName: text('suite_name').notNull(),
  testName: text('test_name').notNull(),
  filePath: text('file_path').notNull(),
  status: text('status').notNull(), // 'passed', 'failed', 'skipped', 'pending'
  duration: integer('duration'), // milliseconds
  error: text('error'),
  errorStack: text('error_stack'),
  retries: integer('retries').default(0),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
}, (table) => [
  index('test_cases_test_run_id_idx').on(table.testRunId),
  index('test_cases_status_idx').on(table.status),
  index('test_cases_file_path_idx').on(table.filePath),
]);

// ============================================================================
// PHASE 2: BROWSER TESTING & QUALITY INFRASTRUCTURE
// ============================================================================

// Browser Test Executions - Agent-driven Playwright test executions
export const browserTestExecutions = pgTable('browser_test_executions', {
  id: varchar('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: varchar('session_id').notNull().references(() => agentSessions.id),
  projectId: varchar('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  testType: text('test_type').notNull(), // 'e2e', 'visual_regression', 'performance', 'accessibility', 'cross_browser'
  browser: text('browser').notNull(), // 'chromium', 'firefox', 'webkit'
  viewport: jsonb('viewport').$type<{ width: number; height: number; }>(),
  testScript: text('test_script'), // Playwright test code
  status: operationStatusEnum('status').notNull().default('pending'),
  result: jsonb('result').$type<{
    passed: boolean;
    errors?: Array<{ message: string; stack?: string; }>;
    assertions?: number;
    performance?: { fcp: number; lcp: number; tti: number; };
    accessibility?: { violations: number; issues: any[]; };
  }>(),
  screenshots: text('screenshots').array(), // Array of S3/storage URLs
  videoUrl: text('video_url'),
  traceUrl: text('trace_url'), // Playwright trace file URL
  duration: integer('duration'), // milliseconds
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
}, (table) => [
  index('browser_test_executions_session_id_idx').on(table.sessionId),
  index('browser_test_executions_project_id_idx').on(table.projectId),
  index('browser_test_executions_status_idx').on(table.status),
  index('browser_test_executions_test_type_idx').on(table.testType),
]);

// Test Artifacts - Screenshots, videos, traces from test executions
export const testArtifacts = pgTable('test_artifacts', {
  id: varchar('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  executionId: varchar('execution_id').notNull().references(() => browserTestExecutions.id, { onDelete: 'cascade' }),
  artifactType: text('artifact_type').notNull(), // 'screenshot', 'video', 'trace', 'har', 'coverage'
  fileName: text('file_name').notNull(),
  storageUrl: text('storage_url').notNull(), // S3/object storage URL
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(), // bytes
  metadata: jsonb('metadata').$type<{
    width?: number;
    height?: number;
    duration?: number;
    timestamp?: string;
    stepName?: string;
  }>(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('test_artifacts_execution_id_idx').on(table.executionId),
  index('test_artifacts_type_idx').on(table.artifactType),
]);

// Element Selectors - Visual element picker results
export const elementSelectors = pgTable('element_selectors', {
  id: varchar('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: varchar('session_id').notNull().references(() => agentSessions.id),
  projectId: varchar('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  elementName: text('element_name').notNull(),
  cssSelector: text('css_selector').notNull(),
  xpathSelector: text('xpath_selector'),
  testId: text('test_id'), // data-testid attribute
  elementType: text('element_type'), // 'button', 'input', 'link', 'div', etc.
  elementText: text('element_text'),
  elementAttributes: jsonb('element_attributes').$type<Record<string, string>>(),
  screenshotUrl: text('screenshot_url'), // Screenshot with element highlighted
  confidence: real('confidence'), // 0-1 score for selector reliability
  pageUrl: text('page_url').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('element_selectors_session_id_idx').on(table.sessionId),
  index('element_selectors_project_id_idx').on(table.projectId),
  index('element_selectors_page_url_idx').on(table.pageUrl),
]);

// Session Recordings - Video recordings of agent sessions
export const sessionRecordings = pgTable('session_recordings', {
  id: varchar('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: varchar('session_id').notNull().references(() => agentSessions.id),
  projectId: varchar('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  recordingType: text('recording_type').notNull(), // 'screen', 'browser', 'terminal'
  videoUrl: text('video_url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  duration: integer('duration').notNull(), // milliseconds
  size: integer('size').notNull(), // bytes
  resolution: jsonb('resolution').$type<{ width: number; height: number; }>(),
  fps: integer('fps').default(30),
  timeline: jsonb('timeline').$type<Array<{
    timestamp: number; // milliseconds from start
    actionType: string; // 'file_edit', 'command_run', 'test_execute', etc.
    description: string;
    screenshotUrl?: string;
  }>>(),
  status: text('status').notNull().default('processing'), // 'processing', 'ready', 'failed'
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  expiresAt: timestamp('expires_at'), // Auto-delete old recordings
}, (table) => [
  index('session_recordings_session_id_idx').on(table.sessionId),
  index('session_recordings_project_id_idx').on(table.projectId),
  index('session_recordings_status_idx').on(table.status),
]);

// Security Scans - For Security Scanner Panel
export const securityScans = pgTable('security_scans', {
  id: varchar('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: varchar('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  scanType: text('scan_type').notNull(), // 'dependencies', 'code', 'secrets', 'full'
  status: text('status').notNull(), // 'queued', 'running', 'completed', 'failed'
  totalVulnerabilities: integer('total_vulnerabilities').default(0),
  criticalCount: integer('critical_count').default(0),
  highCount: integer('high_count').default(0),
  mediumCount: integer('medium_count').default(0),
  lowCount: integer('low_count').default(0),
  scanner: text('scanner'), // 'snyk', 'npm-audit', 'custom', etc.
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  errorMessage: text('error_message'),
}, (table) => [
  index('security_scans_project_id_idx').on(table.projectId),
  index('security_scans_status_idx').on(table.status),
  index('security_scans_started_at_idx').on(table.startedAt),
]);

// Vulnerabilities - Individual security issues found
export const vulnerabilities = pgTable('vulnerabilities', {
  id: varchar('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  scanId: varchar('scan_id').notNull().references(() => securityScans.id, { onDelete: 'cascade' }),
  projectId: varchar('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  severity: text('severity').notNull(), // 'critical', 'high', 'medium', 'low'
  type: text('type').notNull(), // 'dependency', 'code', 'secret', 'config'
  title: text('title').notNull(),
  description: text('description').notNull(),
  filePath: text('file_path'),
  lineNumber: integer('line_number'),
  cve: text('cve'), // CVE identifier if applicable
  cwe: text('cwe'), // CWE identifier if applicable
  packageName: text('package_name'),
  vulnerableVersion: text('vulnerable_version'),
  fixedVersion: text('fixed_version'),
  recommendation: text('recommendation'),
  references: text('references').array(),
  status: text('status').notNull().default('open'), // 'open', 'fixed', 'ignored', 'false_positive'
  discoveredAt: timestamp('discovered_at').defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at'),
}, (table) => [
  index('vulnerabilities_scan_id_idx').on(table.scanId),
  index('vulnerabilities_project_id_idx').on(table.projectId),
  index('vulnerabilities_severity_idx').on(table.severity),
  index('vulnerabilities_status_idx').on(table.status),
]);

// Resource Metrics - For Resources Panel (live CPU/RAM/storage monitoring)
export const resourceMetrics = pgTable('resource_metrics', {
  id: varchar('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: varchar('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  cpuUsage: real('cpu_usage').notNull(), // CPU usage percentage (0-100)
  memoryUsage: real('memory_usage').notNull(), // Memory usage in MB
  memoryLimit: real('memory_limit').notNull(), // Memory limit in MB
  networkRxBytes: integer('network_rx_bytes').default(0).notNull(),
  networkTxBytes: integer('network_tx_bytes').default(0).notNull(),
  diskUsage: real('disk_usage').notNull(), // Disk usage in MB
  diskLimit: real('disk_limit').notNull(), // Disk limit in MB
  activeConnections: integer('active_connections').default(0).notNull(),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
}, (table) => [
  index('resource_metrics_project_id_idx').on(table.projectId),
  index('resource_metrics_timestamp_idx').on(table.timestamp),
]);

// Pane Configurations - For Split Editor workspace layout persistence
export const paneConfigurations = pgTable('pane_configurations', {
  id: varchar('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  projectId: varchar('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // 'default', 'custom-1', etc.
  isDefault: boolean('is_default').default(false),
  layout: jsonb('layout').notNull().$type<{
    type: 'horizontal' | 'vertical' | 'tabs';
    children?: Array<any>;
    activeTab?: string;
    size?: number;
    panes?: Array<{
      id: string;
      type: string;
      fileId?: number;
      tool?: string;
    }>;
  }>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('pane_configurations_user_id_idx').on(table.userId),
  index('pane_configurations_project_id_idx').on(table.projectId),
]);

// Export schemas and types for agent tables
export const insertAgentSessionSchema = createInsertSchema(agentSessions).omit({
  id: true,
  startedAt: true,
  totalTokensUsed: true,
  totalOperations: true,
});

export const insertFileOperationSchema = createInsertSchema(fileOperations).omit({
  id: true,
  executedAt: true,
  completedAt: true,
});

export const insertCommandExecutionSchema = createInsertSchema(commandExecutions).omit({
  id: true,
  startedAt: true,
  completedAt: true,
  killedAt: true,
});

export const insertToolRegistrySchema = createInsertSchema(toolRegistry).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertToolExecutionSchema = createInsertSchema(toolExecutions).omit({
  id: true,
  startedAt: true,
  completedAt: true,
});

export const insertAgentWorkflowSchema = createInsertSchema(agentWorkflows).omit({
  id: true,
  startedAt: true,
  completedAt: true,
  progress: true,
});

export const insertDatabaseOperationSchema = createInsertSchema(databaseOperations).omit({
  id: true,
  executedAt: true,
  completedAt: true,
});

export const insertAgentAuditTrailSchema = createInsertSchema(agentAuditTrail).omit({
  id: true,
  timestamp: true,
});

export const insertAgentPermissionSchema = createInsertSchema(agentPermissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAiApprovalQueueSchema = createInsertSchema(aiApprovalQueue).omit({
  id: true,
  createdAt: true,
  processedAt: true,
});

export const insertAiAuditLogSchema = createInsertSchema(aiAuditLogs).omit({
  id: true,
  timestamp: true,
});

// Type exports
export type AgentSession = typeof agentSessions.$inferSelect;
export type InsertAgentSession = z.infer<typeof insertAgentSessionSchema>;

export type FileOperation = typeof fileOperations.$inferSelect;
export type InsertFileOperation = z.infer<typeof insertFileOperationSchema>;

export type AiApprovalQueue = typeof aiApprovalQueue.$inferSelect;
export type InsertAiApprovalQueue = z.infer<typeof insertAiApprovalQueueSchema>;

export type AiAuditLog = typeof aiAuditLogs.$inferSelect;
export type InsertAiAuditLog = z.infer<typeof insertAiAuditLogSchema>;

export type CommandExecution = typeof commandExecutions.$inferSelect;
export type InsertCommandExecution = z.infer<typeof insertCommandExecutionSchema>;

export type ToolRegistry = typeof toolRegistry.$inferSelect;
export type InsertToolRegistry = z.infer<typeof insertToolRegistrySchema>;

export type ToolExecution = typeof toolExecutions.$inferSelect;
export type InsertToolExecution = z.infer<typeof insertToolExecutionSchema>;

export type AgentWorkflow = typeof agentWorkflows.$inferSelect;
export type InsertAgentWorkflow = z.infer<typeof insertAgentWorkflowSchema>;

export type DatabaseOperation = typeof databaseOperations.$inferSelect;
export type InsertDatabaseOperation = z.infer<typeof insertDatabaseOperationSchema>;

export type AgentAuditTrail = typeof agentAuditTrail.$inferSelect;
export type InsertAgentAuditTrail = z.infer<typeof insertAgentAuditTrailSchema>;

export type AgentPermission = typeof agentPermissions.$inferSelect;
export type InsertAgentPermission = z.infer<typeof insertAgentPermissionSchema>;
// Insert schemas for IDE workspace features
export const insertLspDiagnosticSchema = createInsertSchema(lspDiagnostics).omit({
  id: true,
  createdAt: true,
});

export const insertBuildLogSchema = createInsertSchema(buildLogs).omit({
  id: true,
  timestamp: true,
});

export const insertTestRunSchema = createInsertSchema(testRuns).omit({
  id: true,
  startedAt: true,
});

export const insertTestCaseSchema = createInsertSchema(testCases).omit({
  id: true,
});

export const insertSecurityScanSchema = createInsertSchema(securityScans).omit({
  id: true,
  startedAt: true,
});

export const insertVulnerabilitySchema = createInsertSchema(vulnerabilities).omit({
  id: true,
  discoveredAt: true,
});

export const insertResourceMetricSchema = createInsertSchema(resourceMetrics).omit({
  id: true,
  timestamp: true,
});

export const insertPaneConfigurationSchema = createInsertSchema(paneConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Type exports for IDE workspace features
export type LspDiagnostic = typeof lspDiagnostics.$inferSelect;
export type InsertLspDiagnostic = z.infer<typeof insertLspDiagnosticSchema>;

export type BuildLog = typeof buildLogs.$inferSelect;
export type InsertBuildLog = z.infer<typeof insertBuildLogSchema>;

export const insertTerminalLogSchema = createInsertSchema(terminalLogs).omit({
  id: true,
  timestamp: true,
});

export type TerminalLog = typeof terminalLogs.$inferSelect;
export type InsertTerminalLog = z.infer<typeof insertTerminalLogSchema>;

export type TestRun = typeof testRuns.$inferSelect;
export type InsertTestRun = z.infer<typeof insertTestRunSchema>;

export type TestCase = typeof testCases.$inferSelect;
export type InsertTestCase = z.infer<typeof insertTestCaseSchema>;

// Phase 2: Browser Testing & Quality Infrastructure
export const insertBrowserTestExecutionSchema = createInsertSchema(browserTestExecutions).omit({
  id: true,
  startedAt: true,
  completedAt: true,
});

export const insertTestArtifactSchema = createInsertSchema(testArtifacts).omit({
  id: true,
  createdAt: true,
});

export const insertElementSelectorSchema = createInsertSchema(elementSelectors).omit({
  id: true,
  createdAt: true,
});

export const insertSessionRecordingSchema = createInsertSchema(sessionRecordings).omit({
  id: true,
  startedAt: true,
  completedAt: true,
});

export const insertAutonomousActionSchema = createInsertSchema(autonomousActions).omit({
  id: true,
  executedAt: true,
  completedAt: true,
  rolledBackAt: true,
});

export type BrowserTestExecution = typeof browserTestExecutions.$inferSelect;
export type InsertBrowserTestExecution = z.infer<typeof insertBrowserTestExecutionSchema>;

export type TestArtifact = typeof testArtifacts.$inferSelect;
export type InsertTestArtifact = z.infer<typeof insertTestArtifactSchema>;

export type ElementSelector = typeof elementSelectors.$inferSelect;
export type InsertElementSelector = z.infer<typeof insertElementSelectorSchema>;

export type SessionRecording = typeof sessionRecordings.$inferSelect;
export type InsertSessionRecording = z.infer<typeof insertSessionRecordingSchema>;

export type AutonomousAction = typeof autonomousActions.$inferSelect;
export type InsertAutonomousAction = z.infer<typeof insertAutonomousActionSchema>;

export type SecurityScan = typeof securityScans.$inferSelect;
export type InsertSecurityScan = z.infer<typeof insertSecurityScanSchema>;

export type Vulnerability = typeof vulnerabilities.$inferSelect;
export type InsertVulnerability = z.infer<typeof insertVulnerabilitySchema>;

export type ResourceMetric = typeof resourceMetrics.$inferSelect;
export type InsertResourceMetric = z.infer<typeof insertResourceMetricSchema>;

export type PaneConfiguration = typeof paneConfigurations.$inferSelect;
export type InsertPaneConfiguration = z.infer<typeof insertPaneConfigurationSchema>;

