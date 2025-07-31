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
  unique
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const visibilityEnum = pgEnum('visibility', ['public', 'private']);
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
  userId: integer('user_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  lineNumber: integer('line_number'),
  parentId: integer('parent_id'),
  resolved: boolean('resolved').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Checkpoints for version control
export const checkpoints = pgTable('checkpoints', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id),
  userId: integer('user_id').notNull().references(() => users.id),
  message: text('message').notNull(),
  filesSnapshot: jsonb('files_snapshot').notNull(),
  parentCheckpointId: integer('parent_checkpoint_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Time tracking for projects
export const projectTimeTracking = pgTable('project_time_tracking', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id),
  userId: integer('user_id').notNull().references(() => users.id),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time'),
  duration: integer('duration'),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Screenshots for projects
export const projectScreenshots = pgTable('project_screenshots', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id),
  userId: integer('user_id').notNull().references(() => users.id),
  url: text('url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Task summaries
export const taskSummaries = pgTable('task_summaries', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id),
  userId: integer('user_id').notNull().references(() => users.id),
  taskDescription: text('task_description').notNull(),
  summary: text('summary').notNull(),
  filesChanged: integer('files_changed').default(0),
  linesAdded: integer('lines_added').default(0),
  linesDeleted: integer('lines_deleted').default(0),
  timeSpent: integer('time_spent'),
  completed: boolean('completed').default(false),
  screenshotId: integer('screenshot_id').references(() => projectScreenshots.id),
  checkpointId: integer('checkpoint_id').references(() => checkpoints.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

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
export const insertTimeTrackingSchema = createInsertSchema(projectTimeTracking).omit({ id: true, createdAt: true });
export const insertScreenshotSchema = createInsertSchema(projectScreenshots).omit({ id: true, createdAt: true });
export const insertTaskSummarySchema = createInsertSchema(taskSummaries).omit({ id: true, createdAt: true });

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