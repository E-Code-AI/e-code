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
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  username: varchar("username").unique(),
  password: varchar("password"),
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
  emailVerified: boolean("email_verified").default(false),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  stripePriceId: varchar("stripe_price_id"),
  subscriptionStatus: varchar("subscription_status"),
  subscriptionCurrentPeriodEnd: timestamp("subscription_current_period_end"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projects = pgTable("projects", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  name: text("name").notNull(),
  description: text("description"),
  visibility: visibilityEnum("visibility").notNull().default('private'),
  language: languageEnum("language").default('javascript'),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  forkedFromId: integer("forked_from_id"),
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
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  isDirectory: boolean("is_directory").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// API SDK Tables
export const apiKeys = pgTable("api_keys", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: varchar("name").notNull(),
  key: varchar("key").notNull().unique(),
  permissions: jsonb("permissions").$type<string[]>().default([]),
  isActive: boolean("is_active").default(true),
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
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

// Usage tracking table for billing
export const usageTracking = pgTable("usage_tracking", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id),
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
  userId: integer("user_id").notNull().references(() => users.id).unique(),
  monthlyCredits: decimal("monthly_credits", { precision: 10, scale: 2 }).notNull().default('25.00'),
  remainingCredits: decimal("remaining_credits", { precision: 10, scale: 2 }).notNull().default('25.00'),
  extraCredits: decimal("extra_credits", { precision: 10, scale: 2 }).notNull().default('0.00'),
  resetDate: timestamp("reset_date").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const budgetLimits = pgTable("budget_limits", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id).unique(),
  monthlyLimit: decimal("monthly_limit", { precision: 10, scale: 2 }),
  alertThreshold: integer("alert_threshold").default(80), // percentage
  hardStop: boolean("hard_stop").default(true),
  notificationEmail: varchar("notification_email"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const usageAlerts = pgTable("usage_alerts", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id),
  alertType: varchar("alert_type").notNull(), // threshold_reached, limit_exceeded, etc.
  threshold: integer("threshold").notNull(),
  sent: boolean("sent").default(false),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Code Review Tables
export const codeReviews = pgTable("code_reviews", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  authorId: integer("author_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  description: text("description"),
  status: reviewStatusEnum("status").default('pending'),
  filesChanged: jsonb("files_changed").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const reviewComments = pgTable("review_comments", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  reviewId: integer("review_id").notNull().references(() => codeReviews.id),
  authorId: integer("author_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  filePath: varchar("file_path"),
  lineNumber: integer("line_number"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reviewApprovals = pgTable("review_approvals", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  reviewId: integer("review_id").notNull().references(() => codeReviews.id),
  reviewerId: integer("reviewer_id").notNull().references(() => users.id),
  approved: boolean("approved").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Mentorship Tables
export const mentorProfiles = pgTable("mentor_profiles", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id),
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
  mentorId: integer("mentor_id").notNull().references(() => users.id),
  menteeId: integer("mentee_id").notNull().references(() => users.id),
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
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const challengeSubmissions = pgTable("challenge_submissions", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  challengeId: integer("challenge_id").notNull().references(() => challenges.id),
  userId: integer("user_id").notNull().references(() => users.id),
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
  userId: integer("user_id").notNull().references(() => users.id),
  bestScore: integer("best_score").default(0),
  bestTime: integer("best_time"), // in milliseconds
  submissionCount: integer("submission_count").default(0),
  lastSubmission: timestamp("last_submission").defaultNow(),
});

// Mobile App Tables
export const mobileDevices = pgTable("mobile_devices", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id),
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
  userId: integer("user_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  body: text("body").notNull(),
  data: jsonb("data").default({}),
  sent: boolean("sent").default(false),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
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
  projectId: integer("project_id").notNull().references(() => projects.id),
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
  ownerId: integer("owner_id").notNull().references(() => users.id),
  memberCount: integer("member_count").notNull().default(1),
  projectCount: integer("project_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const teamMembers = pgTable("team_members", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  teamId: integer("team_id").notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: roleEnum("role").notNull().default('member'),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

// Comments system for projects and files
export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id),
  fileId: integer('file_id').references(() => files.id),
  authorId: integer('author_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  lineNumber: integer('line_number'),
  resolved: boolean('resolved').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Checkpoints for version control
export const checkpoints = pgTable('checkpoints', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id),
  name: text('name').notNull(),
  description: text('description'),
  filesSnapshot: jsonb('files_snapshot').notNull().default({}),
  type: varchar('type', { length: 50 }).notNull().default('manual'), // manual, automatic, before_action, error_recovery
  createdBy: integer('created_by').notNull().references(() => users.id),
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

// WebRTC Voice/Video Session Tables
export const webrtcSessions = pgTable('webrtc_sessions', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id),
  roomId: varchar('room_id').notNull().unique(),
  sessionType: varchar('session_type').notNull().default('video'), // video, voice, screen-share
  maxParticipants: integer('max_participants').notNull().default(10),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: integer('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  endedAt: timestamp('ended_at'),
});

export const webrtcParticipants = pgTable('webrtc_participants', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id').notNull().references(() => webrtcSessions.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id),
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
  projectId: integer('project_id').notNull().references(() => projects.id),
  userId: integer('user_id').notNull().references(() => users.id),
  fileId: integer('file_id').references(() => files.id),
  cursorPosition: jsonb('cursor_position').default({}), // {line: number, column: number}
  selection: jsonb('selection').default({}), // {start: {line, column}, end: {line, column}}
  isActive: boolean('is_active').notNull().default(true),
  lastSeen: timestamp('last_seen').defaultNow().notNull(),
});

// Time tracking for projects
export const projectTimeTracking = pgTable('project_time_tracking', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id),
  userId: integer('user_id').notNull().references(() => users.id),
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
  projectId: integer('project_id').notNull().references(() => projects.id),
  title: text('title').notNull(),
  imageUrl: text('image_url').notNull(),
  description: text('description'),
  createdBy: integer('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Task summaries
export const taskSummaries = pgTable('task_summaries', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  completedTasks: jsonb('completed_tasks'),
  filesCreated: integer('files_created').default(0),
  filesModified: integer('files_modified').default(0),
  linesAdded: integer('lines_added').default(0),
  linesDeleted: integer('lines_deleted').default(0),
  createdBy: integer('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Object Storage tables (Google Cloud Storage)
export const objectStorageBuckets = pgTable('object_storage_buckets', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id),
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
  projectId: integer('project_id').notNull().references(() => projects.id),
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
  projectId: integer('project_id').notNull().references(() => projects.id),
  userId: integer('user_id').notNull().references(() => users.id),
  conversationId: varchar('conversation_id').notNull().unique(),
  messages: jsonb('messages').notNull().default([]),
  context: jsonb('context').default({}),
  totalTokensUsed: integer('total_tokens_used').default(0),
  model: varchar('model').notNull().default('claude-3-sonnet'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Dynamic Intelligence settings
export const dynamicIntelligence = pgTable('dynamic_intelligence', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id).unique(),
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

// Secrets Management
export const secrets = pgTable('secrets', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id),
  key: varchar('key').notNull(),
  encryptedValue: text('encrypted_value').notNull(),
  description: text('description'),
  createdBy: integer('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  unique().on(table.projectId, table.key),
]);

// Environment Variables
export const environmentVariables = pgTable('environment_variables', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id),
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
  projectId: integer('project_id').notNull().references(() => projects.id).unique(),
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
  projectId: integer('project_id').notNull().references(() => projects.id),
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
  userId: integer('user_id').notNull().references(() => users.id),
  model: varchar('model').notNull(),
  provider: varchar('provider').notNull(), // OpenAI, Anthropic, E-Code
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  totalTokens: integer('total_tokens').notNull().default(0),
  creditsCost: decimal('credits_cost', { precision: 10, scale: 4 }).notNull().default('0'),
  purpose: varchar('purpose'), // chat, completion, embedding, code-generation, agent-task
  projectId: integer('project_id').references(() => projects.id),
  conversationId: varchar('conversation_id'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('ai_usage_user_idx').on(table.userId),
  index('ai_usage_project_idx').on(table.projectId),
  index('ai_usage_created_idx').on(table.createdAt),
]);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  apiKeys: many(apiKeys),
  codeReviews: many(codeReviews),
  reviewComments: many(reviewComments),
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
  author: one(users, {
    fields: [codeReviews.authorId],
    references: [users.id],
  }),
  comments: many(reviewComments),
  approvals: many(reviewApprovals),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFileSchema = createInsertSchema(files).omit({ id: true, createdAt: true, updatedAt: true });
export const insertApiKeySchema = createInsertSchema(apiKeys).omit({ id: true, createdAt: true });
export const insertCodeReviewSchema = createInsertSchema(codeReviews).omit({ id: true, createdAt: true, updatedAt: true });
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
export const insertSecretSchema = createInsertSchema(secrets).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEnvironmentVariableSchema = createInsertSchema(environmentVariables).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGitRepositorySchema = createInsertSchema(gitRepositories).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGitCommitSchema = createInsertSchema(gitCommits).omit({ id: true, syncedAt: true });
export const insertCustomDomainSchema = createInsertSchema(customDomains).omit({ id: true, createdAt: true, updatedAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = typeof users.$inferInsert;

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
export type ReviewComment = typeof reviewComments.$inferSelect;
export type ReviewApproval = typeof reviewApprovals.$inferSelect;

export type Deployment = typeof deployments.$inferSelect;
export type InsertDeployment = z.infer<typeof insertDeploymentSchema>;

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;

export type Checkpoint = typeof checkpoints.$inferSelect;
export type InsertCheckpoint = z.infer<typeof insertCheckpointSchema>;

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

// Voice/Video Sessions
export const voiceVideoSessions = pgTable("voice_video_sessions", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  type: varchar("type").notNull(), // 'voice' or 'video'
  status: varchar("status").notNull().default('active'), // 'active', 'ended'
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
  recordingUrl: text("recording_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const voiceVideoParticipants = pgTable("voice_video_participants", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  sessionId: integer("session_id").notNull().references(() => voiceVideoSessions.id),
  userId: integer("user_id").notNull().references(() => users.id),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  leftAt: timestamp("left_at"),
  isMuted: boolean("is_muted").notNull().default(false),
  isVideoEnabled: boolean("is_video_enabled").notNull().default(true),
});

// GPU Resources
export const gpuInstances = pgTable("gpu_instances", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  projectId: integer("project_id").notNull().references(() => projects.id),
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
  userId: integer("user_id").notNull().references(() => users.id),
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
  createdBy: integer("created_by").notNull().references(() => users.id),
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
  eventType: varchar("event_type").notNull(), // 'user_action', 'system_event', etc.
  eventData: jsonb("event_data").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  userId: integer("user_id").references(() => users.id),
  sessionId: varchar("session_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const performanceMetrics = pgTable("performance_metrics", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  name: varchar("name").notNull(),
  value: decimal("value", { precision: 20, scale: 4 }).notNull(),
  unit: varchar("unit").notNull(), // 'ms', 'bytes', 'count', 'percentage'
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  userId: integer("user_id").references(() => users.id),
  sessionId: varchar("session_id"),
  tags: jsonb("tags"), // Additional metadata
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
  userId: integer("user_id").references(() => users.id),
  sessionId: varchar("session_id"),
  metadata: jsonb("metadata"), // Additional context
  resolved: boolean("resolved").notNull().default(false),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: integer("resolved_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
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