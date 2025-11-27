import { pgTable, uniqueIndex, foreignKey, serial, integer, text, timestamp, boolean, varchar, index, json, unique, jsonb, numeric, bigint, doublePrecision, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const agentMode = pgEnum("agent_mode", ['plan', 'build'])
export const agentOperationType = pgEnum("agent_operation_type", ['file_create', 'file_update', 'file_delete', 'file_rename', 'file_move', 'file_read'])
export const language = pgEnum("language", ['javascript', 'python', 'html', 'css', 'typescript', 'java', 'c', 'cpp', 'go', 'ruby', 'php', 'rust', 'nodejs'])
export const maxAutonomySessionStatus = pgEnum("max_autonomy_session_status", ['pending', 'running', 'paused', 'completed', 'failed', 'cancelled'])
export const operationStatus = pgEnum("operation_status", ['pending', 'in_progress', 'completed', 'failed', 'cancelled', 'rolled_back'])
export const riskThreshold = pgEnum("risk_threshold", ['low', 'medium', 'high', 'critical'])
export const subscriptionTier = pgEnum("subscription_tier", ['free', 'core', 'teams', 'enterprise'])
export const visibility = pgEnum("visibility", ['public', 'private', 'unlisted'])
export const workflowStatus = pgEnum("workflow_status", ['idle', 'planning', 'executing', 'paused', 'completed', 'failed'])


export const projectCollaborators = pgTable("project_collaborators", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	userId: integer("user_id").notNull(),
	role: text().default('editor').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("project_user_idx").using("btree", table.projectId.asc().nullsLast().op("int4_ops"), table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "project_collaborators_project_id_projects_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "project_collaborators_user_id_users_id_fk"
		}),
]);

export const files = pgTable("files", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	content: text().default('),
	isFolder: boolean("is_folder").default(false).notNull(),
	parentId: integer("parent_id"),
	projectId: integer("project_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	path: varchar({ length: 1024 }).default('/'),
	isDirectory: boolean("is_directory").default(false),
	type: text().default('text'),
	size: integer().default(0),
}, (table) => [
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "files_parent_id_files_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "files_project_id_projects_id_fk"
		}),
]);

export const session = pgTable("session", {
	sid: varchar().primaryKey().notNull(),
	sess: json().notNull(),
	expire: timestamp({ precision: 6, mode: 'string' }).notNull(),
}, (table) => [
	index("IDX_session_expire").using("btree", table.expire.asc().nullsLast().op("timestamp_ops")),
]);

export const bounties = pgTable("bounties", {
	id: serial().primaryKey().notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text().notNull(),
	reward: integer().notNull(),
	status: varchar({ length: 50 }).default('open'),
	difficulty: varchar({ length: 50 }).default('intermediate'),
	deadline: timestamp({ mode: 'string' }).notNull(),
	tags: text().array(),
	authorId: integer("author_id").notNull(),
	authorName: varchar("author_name", { length: 255 }).notNull(),
	authorAvatar: varchar("author_avatar", { length: 255 }),
	authorVerified: boolean("author_verified").default(false),
	winnerId: integer("winner_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [users.id],
			name: "bounties_author_id_fkey"
		}),
	foreignKey({
			columns: [table.winnerId],
			foreignColumns: [users.id],
			name: "bounties_winner_id_fkey"
		}),
]);

export const environmentVariables = pgTable("environment_variables", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	key: text().notNull(),
	value: text().notNull(),
	isSecret: boolean("is_secret").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("project_key_idx").using("btree", table.projectId.asc().nullsLast().op("int4_ops"), table.key.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "environment_variables_project_id_fkey"
		}).onDelete("cascade"),
]);

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
	id: serial().primaryKey().notNull(),
	email: text().notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	subscribedAt: timestamp("subscribed_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	unsubscribedAt: timestamp("unsubscribed_at", { mode: 'string' }),
	confirmationToken: text("confirmation_token"),
	confirmedAt: timestamp("confirmed_at", { mode: 'string' }),
}, (table) => [
	uniqueIndex("email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	unique("newsletter_subscribers_email_key").on(table.email),
]);

export const projects = pgTable("projects", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	visibility: visibility().default('private').notNull(),
	language: language().default('javascript'),
	ownerId: integer("owner_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	forkedFromId: integer("forked_from_id"),
	views: integer().default(0).notNull(),
	likes: integer().default(0).notNull(),
	forks: integer().default(0).notNull(),
	runs: integer().default(0).notNull(),
	coverImage: text("cover_image"),
	isPinned: boolean("is_pinned").default(false).notNull(),
	slug: text(),
	framework: text(),
	aiGenerated: boolean("ai_generated").default(false),
	buildProgress: integer("build_progress").default(0),
	previewUrl: text("preview_url"),
	status: text().default('active'),
	currentCheckpointId: integer("current_checkpoint_id"),
}, (table) => [
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [users.id],
			name: "projects_owner_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.forkedFromId],
			foreignColumns: [table.id],
			name: "projects_forked_from_id_fkey"
		}),
	unique("projects_slug_key").on(table.slug),
]);

export const bountySubmissions = pgTable("bounty_submissions", {
	id: serial().primaryKey().notNull(),
	bountyId: integer("bounty_id").notNull(),
	userId: integer("user_id").notNull(),
	status: varchar({ length: 50 }).default('submitted'),
	submissionUrl: text("submission_url").notNull(),
	feedback: text(),
	submittedAt: timestamp("submitted_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	reviewedAt: timestamp("reviewed_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.bountyId],
			foreignColumns: [bounties.id],
			name: "bounty_submissions_bounty_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "bounty_submissions_user_id_fkey"
		}),
]);

export const loginHistory = pgTable("login_history", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	ipAddress: text("ip_address").notNull(),
	userAgent: text("user_agent"),
	successful: boolean().notNull(),
	failureReason: text("failure_reason"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "login_history_user_id_fkey"
		}),
]);

export const apiTokens = pgTable("api_tokens", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	name: text().notNull(),
	token: text().notNull(),
	tokenHash: text("token_hash").notNull(),
	lastUsedAt: timestamp("last_used_at", { mode: 'string' }),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	scopes: json().default(["read","write"]),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "api_tokens_user_id_fkey"
		}),
	unique("api_tokens_token_key").on(table.token),
	unique("api_tokens_token_hash_key").on(table.tokenHash),
]);

export const blogPosts = pgTable("blog_posts", {
	id: serial().primaryKey().notNull(),
	title: varchar({ length: 500 }).notNull(),
	slug: varchar({ length: 500 }).notNull(),
	content: text().notNull(),
	excerpt: text().notNull(),
	author: varchar({ length: 255 }).notNull(),
	authorRole: varchar("author_role", { length: 255 }),
	category: varchar({ length: 100 }).notNull(),
	tags: text().array(),
	published: boolean().default(false),
	featured: boolean().default(false),
	coverImage: varchar("cover_image", { length: 500 }),
	readTime: integer("read_time").notNull(),
	views: integer().default(0),
	publishedAt: timestamp("published_at", { mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("blog_posts_slug_key").on(table.slug),
]);

export const secrets = pgTable("secrets", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	key: text().notNull(),
	value: text().notNull(),
	description: text(),
	projectId: integer("project_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "secrets_user_id_fkey"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "secrets_project_id_fkey"
		}),
	unique("secrets_user_id_key_key").on(table.userId, table.key),
]);

export const notifications = pgTable("notifications", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	type: varchar({ length: 50 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	message: text().notNull(),
	entityType: varchar("entity_type", { length: 50 }),
	entityId: integer("entity_id"),
	fromUserId: integer("from_user_id"),
	read: boolean().default(false),
	readAt: timestamp("read_at", { mode: 'string' }),
	actionUrl: varchar("action_url", { length: 500 }),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_notifications_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_notifications_read").using("btree", table.read.asc().nullsLast().op("bool_ops")),
	index("idx_notifications_user_id").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "notifications_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.fromUserId],
			foreignColumns: [users.id],
			name: "notifications_from_user_id_fkey"
		}).onDelete("set null"),
]);

export const notificationPreferences = pgTable("notification_preferences", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	emailEnabled: boolean("email_enabled").default(true),
	pushEnabled: boolean("push_enabled").default(true),
	commentNotifications: boolean("comment_notifications").default(true),
	followNotifications: boolean("follow_notifications").default(true),
	deploymentNotifications: boolean("deployment_notifications").default(true),
	starNotifications: boolean("star_notifications").default(true),
	mentionNotifications: boolean("mention_notifications").default(true),
	systemNotifications: boolean("system_notifications").default(true),
	newsletterEnabled: boolean("newsletter_enabled").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "notification_preferences_user_id_fkey"
		}).onDelete("cascade"),
	unique("notification_preferences_user_id_key").on(table.userId),
]);

export const projectLikes = pgTable("project_likes", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	userId: integer("user_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_project_likes_project_id").using("btree", table.projectId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "project_likes_project_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "project_likes_user_id_fkey"
		}).onDelete("cascade"),
	unique("project_likes_project_id_user_id_key").on(table.projectId, table.userId),
]);

export const projectViews = pgTable("project_views", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	userId: integer("user_id"),
	ipAddress: text("ip_address"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_project_views_project_id").using("btree", table.projectId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "project_views_project_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "project_views_user_id_fkey"
		}).onDelete("cascade"),
]);

export const activityLog = pgTable("activity_log", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	userId: integer("user_id").notNull(),
	action: text().notNull(),
	details: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_activity_log_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_activity_log_project_id").using("btree", table.projectId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "activity_log_project_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "activity_log_user_id_fkey"
		}).onDelete("cascade"),
]);

export const communityPosts = pgTable("community_posts", {
	id: serial().primaryKey().notNull(),
	title: varchar({ length: 500 }).notNull(),
	content: text().notNull(),
	authorId: integer("author_id").notNull(),
	category: varchar({ length: 50 }).notNull(),
	tags: text().array().default([""]).notNull(),
	projectId: integer("project_id"),
	imageUrl: varchar("image_url", { length: 500 }),
	likes: integer().default(0).notNull(),
	comments: integer().default(0).notNull(),
	views: integer().default(0).notNull(),
	isPinned: boolean("is_pinned").default(false),
	isLocked: boolean("is_locked").default(false),
	published: boolean().default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [users.id],
			name: "community_posts_author_id_fkey"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "community_posts_project_id_fkey"
		}),
]);

export const communityChallenges = pgTable("community_challenges", {
	id: serial().primaryKey().notNull(),
	title: varchar({ length: 500 }).notNull(),
	description: text().notNull(),
	difficulty: varchar({ length: 20 }).notNull(),
	category: varchar({ length: 50 }).notNull(),
	participants: integer().default(0).notNull(),
	submissions: integer().default(0).notNull(),
	prize: varchar({ length: 255 }),
	deadline: timestamp({ mode: 'string' }).notNull(),
	status: varchar({ length: 20 }).default('active').notNull(),
	rules: text(),
	judgeId: integer("judge_id"),
	winnerId: integer("winner_id"),
	tags: text().array().default([""]).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.judgeId],
			foreignColumns: [users.id],
			name: "community_challenges_judge_id_fkey"
		}),
	foreignKey({
			columns: [table.winnerId],
			foreignColumns: [users.id],
			name: "community_challenges_winner_id_fkey"
		}),
]);

export const themes = pgTable("themes", {
	id: serial().primaryKey().notNull(),
	slug: varchar({ length: 255 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	type: varchar({ length: 20 }).notNull(),
	preview: jsonb().notNull(),
	config: jsonb().notNull(),
	authorId: integer("author_id"),
	authorName: varchar("author_name", { length: 255 }).notNull(),
	downloads: integer().default(0).notNull(),
	rating: integer().default(0),
	isOfficial: boolean("is_official").default(false),
	isDark: boolean("is_dark").default(true),
	published: boolean().default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [users.id],
			name: "themes_author_id_fkey"
		}),
	unique("themes_slug_key").on(table.slug),
]);

export const announcements = pgTable("announcements", {
	id: serial().primaryKey().notNull(),
	title: varchar({ length: 500 }).notNull(),
	content: text(),
	type: varchar({ length: 50 }).notNull(),
	priority: varchar({ length: 20 }).default('normal').notNull(),
	targetAudience: varchar("target_audience", { length: 50 }).default('all').notNull(),
	icon: varchar({ length: 100 }),
	link: varchar({ length: 500 }),
	active: boolean().default(true),
	dismissible: boolean().default(true),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const learningCourses = pgTable("learning_courses", {
	id: serial().primaryKey().notNull(),
	slug: varchar({ length: 255 }).notNull(),
	title: varchar({ length: 500 }).notNull(),
	description: text().notNull(),
	category: varchar({ length: 100 }).notNull(),
	difficulty: varchar({ length: 20 }).notNull(),
	duration: varchar({ length: 100 }),
	thumbnail: varchar({ length: 500 }),
	authorId: integer("author_id"),
	authorName: varchar("author_name", { length: 255 }).notNull(),
	totalLessons: integer("total_lessons").default(0).notNull(),
	enrollments: integer().default(0).notNull(),
	rating: integer().default(0),
	tags: text().array().default([""]).notNull(),
	prerequisites: text().array().default([""]).notNull(),
	published: boolean().default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [users.id],
			name: "learning_courses_author_id_fkey"
		}),
	unique("learning_courses_slug_key").on(table.slug),
]);

export const userLearningProgress = pgTable("user_learning_progress", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	courseId: integer("course_id").notNull(),
	currentLesson: integer("current_lesson").default(1).notNull(),
	completedLessons: integer("completed_lessons").default(0).notNull(),
	progress: integer().default(0).notNull(),
	streak: integer().default(0).notNull(),
	lastActivityAt: timestamp("last_activity_at", { mode: 'string' }).defaultNow(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	startedAt: timestamp("started_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_learning_progress_user_id_fkey"
		}),
	foreignKey({
			columns: [table.courseId],
			foreignColumns: [learningCourses.id],
			name: "user_learning_progress_course_id_fkey"
		}),
	unique("user_learning_progress_user_id_course_id_key").on(table.userId, table.courseId),
]);

export const userCycles = pgTable("user_cycles", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	balance: integer().default(0).notNull(),
	totalEarned: integer("total_earned").default(0).notNull(),
	totalSpent: integer("total_spent").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_cycles_user_id_fkey"
		}),
	unique("user_cycles_user_id_key").on(table.userId),
]);

export const cyclesTransactions = pgTable("cycles_transactions", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	amount: integer().notNull(),
	type: varchar({ length: 50 }).notNull(),
	description: text().notNull(),
	relatedId: integer("related_id"),
	relatedType: varchar("related_type", { length: 50 }),
	balance: integer().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "cycles_transactions_user_id_fkey"
		}),
]);

export const objectStorage = pgTable("object_storage", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	projectId: integer("project_id"),
	name: varchar({ length: 255 }).notNull(),
	path: varchar({ length: 1000 }).notNull(),
	size: integer().notNull(),
	type: varchar({ length: 20 }).notNull(),
	mimeType: varchar("mime_type", { length: 100 }),
	url: varchar({ length: 1000 }),
	cdnUrl: varchar("cdn_url", { length: 1000 }),
	isPublic: boolean("is_public").default(false),
	metadata: jsonb(),
	parentId: integer("parent_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "object_storage_user_id_fkey"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "object_storage_project_id_fkey"
		}),
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "object_storage_parent_id_fkey"
		}),
	unique("object_storage_user_id_path_key").on(table.userId, table.path),
]);

export const teams = pgTable("teams", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "teams_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	name: varchar({ length: 255 }).notNull(),
	slug: varchar({ length: 255 }).notNull(),
	description: text(),
	logo: text(),
	ownerId: integer("owner_id").notNull(),
	plan: varchar({ length: 50 }).default('free').notNull(),
	settings: jsonb().default({}),
	stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
	stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
	memberLimit: integer("member_limit").default(5).notNull(),
	storageLimit: integer("storage_limit").default(sql`'10737418240'`).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("teams_slug_key").on(table.slug),
]);

export const teamMembers = pgTable("team_members", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "team_members_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	teamId: integer("team_id").notNull(),
	userId: integer("user_id").notNull(),
	role: varchar({ length: 50 }).default('member').notNull(),
	permissions: jsonb().default({}),
	joinedAt: timestamp("joined_at", { mode: 'string' }).defaultNow().notNull(),
	invitedBy: integer("invited_by"),
	isActive: boolean("is_active").default(true).notNull(),
}, (table) => [
	index("idx_team_members_team_id").using("btree", table.teamId.asc().nullsLast().op("int4_ops")),
	index("idx_team_members_user_id").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	unique("team_members_team_id_user_id_key").on(table.teamId, table.userId),
]);

export const teamInvitations = pgTable("team_invitations", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "team_invitations_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	teamId: integer("team_id").notNull(),
	email: varchar({ length: 255 }).notNull(),
	token: varchar({ length: 255 }).notNull(),
	role: varchar({ length: 50 }).default('member').notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	acceptedAt: timestamp("accepted_at", { mode: 'string' }),
	invitedBy: integer("invited_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_team_invitations_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("idx_team_invitations_token").using("btree", table.token.asc().nullsLast().op("text_ops")),
]);

export const teamProjects = pgTable("team_projects", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "team_projects_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	teamId: integer("team_id").notNull(),
	projectId: integer("project_id").notNull(),
	addedBy: integer("added_by").notNull(),
	visibility: varchar({ length: 50 }).default('team').notNull(),
	permissions: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_team_projects_project_id").using("btree", table.projectId.asc().nullsLast().op("int4_ops")),
	index("idx_team_projects_team_id").using("btree", table.teamId.asc().nullsLast().op("int4_ops")),
	unique("team_projects_team_id_project_id_key").on(table.teamId, table.projectId),
]);

export const teamWorkspaces = pgTable("team_workspaces", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "team_workspaces_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	teamId: integer("team_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	settings: jsonb().default({}),
	isDefault: boolean("is_default").default(false).notNull(),
	createdBy: integer("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_team_workspaces_team_id").using("btree", table.teamId.asc().nullsLast().op("int4_ops")),
]);

export const workspaceProjects = pgTable("workspace_projects", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "workspace_projects_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	workspaceId: integer("workspace_id").notNull(),
	projectId: integer("project_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_workspace_projects_workspace_id").using("btree", table.workspaceId.asc().nullsLast().op("int4_ops")),
	unique("workspace_projects_workspace_id_project_id_key").on(table.workspaceId, table.projectId),
]);

export const teamActivity = pgTable("team_activity", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "team_activity_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	teamId: integer("team_id").notNull(),
	userId: integer("user_id").notNull(),
	action: varchar({ length: 100 }).notNull(),
	entityType: varchar("entity_type", { length: 50 }).notNull(),
	entityId: integer("entity_id"),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_team_activity_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	index("idx_team_activity_team_id").using("btree", table.teamId.asc().nullsLast().op("int4_ops")),
]);

export const aiUsageTracking = pgTable("ai_usage_tracking", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	provider: text().notNull(),
	model: text().notNull(),
	operation: text().notNull(),
	promptTokens: integer("prompt_tokens").default(0).notNull(),
	completionTokens: integer("completion_tokens").default(0).notNull(),
	totalTokens: integer("total_tokens").default(0).notNull(),
	cost: numeric({ precision: 10, scale:  6 }).default('0').notNull(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "ai_usage_tracking_user_id_fkey"
		}),
]);

export const adminApiKeys = pgTable("admin_api_keys", {
	id: serial().primaryKey().notNull(),
	service: text().notNull(),
	apiKey: text("api_key").notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	usageLimit: integer("usage_limit"),
	usageCount: integer("usage_count").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	provider: varchar({ length: 50 }).notNull(),
	keyName: varchar("key_name", { length: 255 }),
	resetDate: timestamp("reset_date", { mode: 'string' }),
});

export const comments = pgTable("comments", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	fileId: integer("file_id"),
	authorId: integer("author_id").notNull(),
	content: text().notNull(),
	lineNumber: integer("line_number"),
	resolved: boolean().default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "comments_project_id_fkey"
		}),
	foreignKey({
			columns: [table.fileId],
			foreignColumns: [files.id],
			name: "comments_file_id_fkey"
		}),
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [users.id],
			name: "comments_author_id_fkey"
		}),
]);

export const checkpoints = pgTable("checkpoints", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	filesSnapshot: jsonb("files_snapshot").notNull(),
	createdBy: integer("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	type: varchar({ length: 50 }).default('manual').notNull(),
	metadata: jsonb().default({}).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "checkpoints_project_id_fkey"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "checkpoints_created_by_fkey"
		}),
]);

export const projectTimeTracking = pgTable("project_time_tracking", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	userId: integer("user_id").notNull(),
	startTime: timestamp("start_time", { mode: 'string' }).notNull(),
	endTime: timestamp("end_time", { mode: 'string' }),
	duration: integer(),
	taskDescription: text("task_description"),
	active: boolean().default(true),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "project_time_tracking_project_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "project_time_tracking_user_id_fkey"
		}),
]);

export const projectScreenshots = pgTable("project_screenshots", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	title: varchar({ length: 255 }).notNull(),
	imageUrl: text("image_url").notNull(),
	description: text(),
	createdBy: integer("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "project_screenshots_project_id_fkey"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "project_screenshots_created_by_fkey"
		}),
]);

export const taskSummaries = pgTable("task_summaries", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text().notNull(),
	completedTasks: jsonb("completed_tasks").notNull(),
	filesCreated: integer("files_created").default(0),
	filesModified: integer("files_modified").default(0),
	linesAdded: integer("lines_added").default(0),
	linesDeleted: integer("lines_deleted").default(0),
	createdBy: integer("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "task_summaries_project_id_fkey"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "task_summaries_created_by_fkey"
		}),
]);

export const apiKeys = pgTable("api_keys", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	userId: integer("user_id").notNull(),
	key: varchar({ length: 255 }).notNull(),
	permissions: text().array(),
	lastUsedAt: timestamp("last_used_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "api_keys_user_id_fkey"
		}),
	unique("api_keys_key_key").on(table.key),
]);

export const usageTracking = pgTable("usage_tracking", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "usage_tracking_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	userId: integer("user_id").notNull(),
	metricType: varchar("metric_type").notNull(),
	value: numeric({ precision: 10, scale:  2 }).notNull(),
	unit: varchar().notNull(),
	timestamp: timestamp({ mode: 'string' }).defaultNow(),
	billingPeriodStart: timestamp("billing_period_start", { mode: 'string' }).notNull(),
	billingPeriodEnd: timestamp("billing_period_end", { mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "usage_tracking_user_id_fkey"
		}),
]);

export const checkpointFiles = pgTable("checkpoint_files", {
	id: serial().primaryKey().notNull(),
	checkpointId: integer("checkpoint_id").notNull(),
	fileId: integer("file_id").notNull(),
	path: text().notNull(),
	content: text(),
	metadata: jsonb().default({}),
}, (table) => [
	foreignKey({
			columns: [table.checkpointId],
			foreignColumns: [checkpoints.id],
			name: "checkpoint_files_checkpoint_id_fkey"
		}).onDelete("cascade"),
]);

export const userCredits = pgTable("user_credits", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	monthlyCredits: numeric("monthly_credits", { precision: 10, scale:  2 }).default('25.00').notNull(),
	remainingCredits: numeric("remaining_credits", { precision: 10, scale:  2 }).default('25.00').notNull(),
	extraCredits: numeric("extra_credits", { precision: 10, scale:  2 }).default('0.00').notNull(),
	resetDate: timestamp("reset_date", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("user_credits_user_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_credits_user_id_fkey"
		}),
	unique("user_credits_user_id_key").on(table.userId),
]);

export const budgetLimits = pgTable("budget_limits", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	monthlyLimit: numeric("monthly_limit", { precision: 10, scale:  2 }),
	alertThreshold: integer("alert_threshold").default(80),
	hardStop: boolean("hard_stop").default(true),
	notificationEmail: varchar("notification_email"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "budget_limits_user_id_fkey"
		}),
	unique("budget_limits_user_id_key").on(table.userId),
]);

export const usageAlerts = pgTable("usage_alerts", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	alertType: varchar("alert_type").notNull(),
	threshold: integer().notNull(),
	sent: boolean().default(false),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "usage_alerts_user_id_fkey"
		}),
]);

export const autoscaleDeployments = pgTable("autoscale_deployments", {
	id: serial().primaryKey().notNull(),
	deploymentId: integer("deployment_id").notNull(),
	minInstances: integer("min_instances").default(1).notNull(),
	maxInstances: integer("max_instances").default(10).notNull(),
	targetCpuUtilization: integer("target_cpu_utilization").default(70),
	scaleDownDelay: integer("scale_down_delay").default(300),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("autoscale_deployments_deployment_id_key").on(table.deploymentId),
]);

export const reservedVmDeployments = pgTable("reserved_vm_deployments", {
	id: serial().primaryKey().notNull(),
	deploymentId: integer("deployment_id").notNull(),
	vmSize: varchar("vm_size").notNull(),
	cpuCores: integer("cpu_cores").notNull(),
	memoryGb: integer("memory_gb").notNull(),
	diskGb: integer("disk_gb").notNull(),
	region: varchar().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("reserved_vm_deployments_deployment_id_key").on(table.deploymentId),
]);

export const scheduledDeployments = pgTable("scheduled_deployments", {
	id: serial().primaryKey().notNull(),
	deploymentId: integer("deployment_id").notNull(),
	cronExpression: varchar("cron_expression").notNull(),
	timezone: varchar().default('UTC').notNull(),
	lastRun: timestamp("last_run", { mode: 'string' }),
	nextRun: timestamp("next_run", { mode: 'string' }),
	maxRuntime: integer("max_runtime").default(3600),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("scheduled_deployments_deployment_id_key").on(table.deploymentId),
]);

export const staticDeployments = pgTable("static_deployments", {
	id: serial().primaryKey().notNull(),
	deploymentId: integer("deployment_id").notNull(),
	cdnEnabled: boolean("cdn_enabled").default(true),
	buildCommand: varchar("build_command"),
	outputDirectory: varchar("output_directory").default('dist'),
	headers: jsonb().default({}),
	redirects: jsonb().default([]),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("static_deployments_deployment_id_key").on(table.deploymentId),
]);

export const objectStorageBuckets = pgTable("object_storage_buckets", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	bucketName: varchar("bucket_name").notNull(),
	region: varchar().default('us-central1').notNull(),
	storageClass: varchar("storage_class").default('STANDARD').notNull(),
	publicAccess: boolean("public_access").default(false),
	corsEnabled: boolean("cors_enabled").default(true),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "object_storage_buckets_project_id_fkey"
		}),
	unique("object_storage_buckets_bucket_name_key").on(table.bucketName),
]);

export const objectStorageFiles = pgTable("object_storage_files", {
	id: serial().primaryKey().notNull(),
	bucketId: integer("bucket_id").notNull(),
	fileName: text("file_name").notNull(),
	filePath: text("file_path").notNull(),
	contentType: varchar("content_type").notNull(),
	size: integer().notNull(),
	url: text().notNull(),
	metadata: jsonb().default({}),
	uploadedBy: integer("uploaded_by").notNull(),
	uploadedAt: timestamp("uploaded_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.bucketId],
			foreignColumns: [objectStorageBuckets.id],
			name: "object_storage_files_bucket_id_fkey"
		}),
	foreignKey({
			columns: [table.uploadedBy],
			foreignColumns: [users.id],
			name: "object_storage_files_uploaded_by_fkey"
		}),
]);

export const keyValueStore = pgTable("key_value_store", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	key: varchar().notNull(),
	value: jsonb().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "key_value_store_project_id_fkey"
		}),
	unique("key_value_store_project_id_key_key").on(table.projectId, table.key),
]);

export const aiConversations = pgTable("ai_conversations", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	userId: integer("user_id").notNull(),
	conversationId: varchar("conversation_id"),
	messages: jsonb().default([]).notNull(),
	context: jsonb().default({}),
	totalTokensUsed: integer("total_tokens_used").default(0),
	model: varchar().default('claude-3-sonnet').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	agentMode: agentMode("agent_mode").default('build').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "ai_conversations_project_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "ai_conversations_user_id_fkey"
		}),
	unique("ai_conversations_conversation_id_key").on(table.conversationId),
]);

export const webSearchHistory = pgTable("web_search_history", {
	id: serial().primaryKey().notNull(),
	conversationId: integer("conversation_id").notNull(),
	query: text().notNull(),
	results: jsonb().notNull(),
	selectedUrls: jsonb("selected_urls").default([]),
	timestamp: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [aiConversations.id],
			name: "web_search_history_conversation_id_fkey"
		}),
]);

export const gitRepositories = pgTable("git_repositories", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	provider: varchar().notNull(),
	repositoryUrl: text("repository_url").notNull(),
	defaultBranch: varchar("default_branch").default('main').notNull(),
	isPrivate: boolean("is_private").default(true),
	deployKey: text("deploy_key"),
	webhookSecret: varchar("webhook_secret"),
	autoSync: boolean("auto_sync").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "git_repositories_project_id_fkey"
		}),
	unique("git_repositories_project_id_key").on(table.projectId),
]);

export const gitCommits = pgTable("git_commits", {
	id: serial().primaryKey().notNull(),
	repositoryId: integer("repository_id").notNull(),
	commitHash: varchar("commit_hash").notNull(),
	message: text().notNull(),
	author: varchar().notNull(),
	authorEmail: varchar("author_email").notNull(),
	timestamp: timestamp({ mode: 'string' }).notNull(),
	branch: varchar().notNull(),
	syncedAt: timestamp("synced_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.repositoryId],
			foreignColumns: [gitRepositories.id],
			name: "git_commits_repository_id_fkey"
		}),
]);

export const aiUsageRecords = pgTable("ai_usage_records", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	model: varchar().notNull(),
	provider: varchar().notNull(),
	inputTokens: integer("input_tokens").default(0).notNull(),
	outputTokens: integer("output_tokens").default(0).notNull(),
	totalTokens: integer("total_tokens").default(0).notNull(),
	creditsCost: numeric("credits_cost", { precision: 10, scale:  4 }).default('0').notNull(),
	purpose: varchar(),
	projectId: integer("project_id"),
	conversationId: varchar("conversation_id"),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("ai_usage_created_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("ai_usage_project_idx").using("btree", table.projectId.asc().nullsLast().op("int4_ops")),
	index("ai_usage_user_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "ai_usage_records_user_id_fkey"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "ai_usage_records_project_id_fkey"
		}),
]);

export const customDomains = pgTable("custom_domains", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	domain: varchar().notNull(),
	subdomain: varchar(),
	sslStatus: varchar("ssl_status").default('pending').notNull(),
	sslCertificate: text("ssl_certificate"),
	verificationStatus: varchar("verification_status").default('pending').notNull(),
	verificationToken: varchar("verification_token"),
	dnsRecords: jsonb("dns_records").default([]),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "custom_domains_project_id_fkey"
		}),
	unique("custom_domains_domain_key").on(table.domain),
]);

export const performanceMetrics = pgTable("performance_metrics", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	value: numeric(),
	unit: varchar({ length: 50 }),
	timestamp: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	userId: integer("user_id"),
	sessionId: varchar("session_id", { length: 255 }),
	tags: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const fileHistory = pgTable("file_history", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	filename: varchar({ length: 255 }).notNull(),
	content: text().notNull(),
	message: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_file_history_created").using("btree", table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	index("idx_file_history_project").using("btree", table.projectId.asc().nullsLast().op("int4_ops")),
]);

export const projectExtensions = pgTable("project_extensions", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	extensionId: varchar("extension_id", { length: 100 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	installedAt: timestamp("installed_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_extensions_project").using("btree", table.projectId.asc().nullsLast().op("int4_ops")),
	unique("project_extensions_project_id_extension_id_key").on(table.projectId, table.extensionId),
]);

export const multiplayerSessions = pgTable("multiplayer_sessions", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	sessionId: varchar("session_id", { length: 100 }).notNull(),
	active: boolean().default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	endedAt: timestamp("ended_at", { mode: 'string' }),
}, (table) => [
	index("idx_multiplayer_active").using("btree", table.active.asc().nullsLast().op("bool_ops")),
	index("idx_multiplayer_project").using("btree", table.projectId.asc().nullsLast().op("int4_ops")),
	unique("multiplayer_sessions_session_id_key").on(table.sessionId),
]);

export const multiplayerCollaborators = pgTable("multiplayer_collaborators", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	sessionId: varchar("session_id", { length: 100 }).notNull(),
	userId: integer("user_id").notNull(),
	joinedAt: timestamp("joined_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	leftAt: timestamp("left_at", { mode: 'string' }),
	active: boolean().default(true),
}, (table) => [
	index("idx_collaborators_project").using("btree", table.projectId.asc().nullsLast().op("int4_ops")),
	index("idx_collaborators_session").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
	index("idx_collaborators_user").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
]);

export const multiplayerInvites = pgTable("multiplayer_invites", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	email: varchar({ length: 255 }).notNull(),
	inviteCode: varchar("invite_code", { length: 100 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	usedAt: timestamp("used_at", { mode: 'string' }),
}, (table) => [
	index("idx_invites_code").using("btree", table.inviteCode.asc().nullsLast().op("text_ops")),
	index("idx_invites_project").using("btree", table.projectId.asc().nullsLast().op("int4_ops")),
	unique("multiplayer_invites_invite_code_key").on(table.inviteCode),
]);

export const workspaceSettings = pgTable("workspace_settings", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	settings: jsonb().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_settings_project").using("btree", table.projectId.asc().nullsLast().op("int4_ops")),
	unique("workspace_settings_project_id_key").on(table.projectId),
]);

export const projectDomains = pgTable("project_domains", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	provider: varchar({ length: 100 }),
	ssl: boolean().default(false),
	settings: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_domains_project").using("btree", table.projectId.asc().nullsLast().op("int4_ops")),
]);

export const resourcesUsage = pgTable("resources_usage", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	cpuUsage: numeric("cpu_usage", { precision: 5, scale:  2 }),
	memoryUsage: integer("memory_usage"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	storageUsage: bigint("storage_usage", { mode: "number" }),
	networkInbound: numeric("network_inbound", { precision: 10, scale:  2 }),
	networkOutbound: numeric("network_outbound", { precision: 10, scale:  2 }),
	recordedAt: timestamp("recorded_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_resources_project").using("btree", table.projectId.asc().nullsLast().op("int4_ops")),
	index("idx_resources_time").using("btree", table.recordedAt.desc().nullsFirst().op("timestamp_ops")),
]);

export const securityScans = pgTable("security_scans", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	score: varchar({ length: 10 }),
	vulnerabilities: jsonb(),
	totalIssues: integer("total_issues").default(0),
	scannedAt: timestamp("scanned_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_security_project").using("btree", table.projectId.asc().nullsLast().op("int4_ops")),
	index("idx_security_time").using("btree", table.scannedAt.desc().nullsFirst().op("timestamp_ops")),
]);

export const knowledgeGraphNodes = pgTable("knowledge_graph_nodes", {
	id: text().primaryKey().notNull(),
	type: text().notNull(),
	content: text().notNull(),
	metadata: jsonb(),
	embedding: doublePrecision().array(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const knowledgeGraphEdges = pgTable("knowledge_graph_edges", {
	id: text().primaryKey().notNull(),
	sourceId: text("source_id").notNull(),
	targetId: text("target_id").notNull(),
	relationship: text().notNull(),
	weight: doublePrecision().default(1),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.sourceId],
			foreignColumns: [knowledgeGraphNodes.id],
			name: "knowledge_graph_edges_source_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.targetId],
			foreignColumns: [knowledgeGraphNodes.id],
			name: "knowledge_graph_edges_target_id_fkey"
		}).onDelete("cascade"),
	unique("knowledge_graph_edges_source_id_target_id_relationship_key").on(table.sourceId, table.targetId, table.relationship),
]);

export const extendedThinkingSteps = pgTable("extended_thinking_steps", {
	id: serial().primaryKey().notNull(),
	sessionId: integer("session_id").notNull(),
	stepNumber: integer("step_number").notNull(),
	type: text().notNull(),
	content: text().notNull(),
	paths: jsonb(),
	selectedPath: text("selected_path"),
	confidence: integer().default(0),
	reasoning: text(),
	timestamp: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [extendedThinkingSessions.id],
			name: "extended_thinking_steps_session_id_fkey"
		}),
]);

export const extendedThinkingSessions = pgTable("extended_thinking_sessions", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	conversationId: integer("conversation_id"),
	problem: text().notNull(),
	complexity: text().notNull(),
	status: text().default('active'),
	startedAt: timestamp("started_at", { mode: 'string' }).defaultNow(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	metadata: jsonb(),
	finalRecommendation: text("final_recommendation"),
	totalSteps: integer("total_steps").default(0),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "extended_thinking_sessions_project_id_fkey"
		}),
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [aiConversations.id],
			name: "extended_thinking_sessions_conversation_id_fkey"
		}),
]);

export const marketplaceTemplates = pgTable("marketplace_templates", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	framework: varchar({ length: 100 }),
	language: varchar({ length: 100 }),
	author: varchar({ length: 255 }),
	stars: integer().default(0),
	forks: integer().default(0),
	downloads: integer().default(0),
	tags: text().array(),
	featured: boolean().default(false),
	price: integer().default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	authorId: integer("author_id"),
	projectId: integer("project_id"),
}, (table) => [
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [users.id],
			name: "marketplace_templates_author_id_fkey"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "marketplace_templates_project_id_fkey"
		}),
]);

export const sequentialThinkingSessions = pgTable("sequential_thinking_sessions", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id"),
	conversationId: integer("conversation_id"),
	problemStatement: text("problem_statement").notNull(),
	initialApproach: text("initial_approach"),
	thinkingSteps: jsonb("thinking_steps"),
	currentStep: integer("current_step").default(0),
	status: text().default('active'),
	solution: text(),
	refinements: jsonb(),
	metrics: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	currentThought: integer("current_thought").default(1),
	totalThoughts: integer("total_thoughts").default(5),
	thoughts: jsonb().default([]),
	confidence: integer().default(0),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "sequential_thinking_sessions_project_id_fkey"
		}),
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [aiConversations.id],
			name: "sequential_thinking_sessions_conversation_id_fkey"
		}),
]);

export const extensions = pgTable("extensions", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text().notNull(),
	author: varchar({ length: 255 }).notNull(),
	authorId: integer("author_id"),
	category: varchar({ length: 100 }).notNull(),
	version: varchar({ length: 50 }).default('1.0.0'),
	downloads: integer().default(0),
	rating: integer().default(0),
	reviews: integer().default(0),
	verified: boolean().default(false),
	icon: varchar({ length: 50 }),
	repository: text(),
	documentation: text(),
	compatibleVersions: jsonb("compatible_versions").default([]),
	permissions: jsonb().default([]),
	price: integer().default(0),
	featured: boolean().default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [users.id],
			name: "extensions_author_id_fkey"
		}),
]);

export const usageAnalytics = pgTable("usage_analytics", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	date: timestamp({ mode: 'string' }).notNull(),
	cpuSeconds: integer("cpu_seconds").default(0),
	memoryMb: integer("memory_mb").default(0),
	storageGb: integer("storage_gb").default(0),
	bandwidthGb: integer("bandwidth_gb").default(0),
	aiTokens: integer("ai_tokens").default(0),
	builds: integer().default(0),
	deployments: integer().default(0),
	activeProjects: integer("active_projects").default(0),
	collaborators: integer().default(0),
	apiCalls: integer("api_calls").default(0),
	terminalMinutes: integer("terminal_minutes").default(0),
	debuggerSessions: integer("debugger_sessions").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("usage_analytics_user_date_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops"), table.date.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "usage_analytics_user_id_fkey"
		}),
]);

export const communityActivity = pgTable("community_activity", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	type: varchar({ length: 100 }).notNull(),
	targetType: varchar("target_type", { length: 100 }),
	targetId: integer("target_id"),
	metadata: jsonb().default({}),
	points: integer().default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("community_activity_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("community_activity_user_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "community_activity_user_id_fkey"
		}),
]);

export const sessions = pgTable("sessions", {
	sid: varchar({ length: 255 }).primaryKey().notNull(),
	sess: jsonb().notNull(),
	expire: timestamp({ mode: 'string' }).notNull(),
}, (table) => [
	index("idx_session_expire").using("btree", table.expire.asc().nullsLast().op("timestamp_ops")),
]);

export const deployments = pgTable("deployments", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "deployments_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	projectId: integer("project_id").notNull(),
	deploymentId: varchar("deployment_id").notNull(),
	type: varchar().notNull(),
	environment: varchar(),
	status: varchar().notNull(),
	url: varchar(),
	customDomain: varchar("custom_domain"),
	buildLogs: text("build_logs"),
	deploymentLogs: text("deployment_logs"),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	checkpointId: integer("checkpoint_id"),
	config: text().default('{}'),
	logs: text().default('),
	version: text().default('v1.0.0'),
	userId: integer("user_id"),
	name: varchar({ length: 255 }),
	description: text(),
	machineType: varchar("machine_type", { length: 255 }).default('standard'),
	regions: jsonb().default([]),
	subdomain: varchar({ length: 255 }),
	environmentVars: jsonb("environment_vars").default({}),
	buildCommand: text("build_command"),
	runCommand: text("run_command"),
	port: integer().default(3000),
	healthCheckPath: text("health_check_path"),
	healthCheckInterval: integer("health_check_interval"),
	autoscalingEnabled: boolean("autoscaling_enabled").default(false),
	minInstances: integer("min_instances").default(1),
	maxInstances: integer("max_instances").default(10),
	targetCpu: integer("target_cpu").default(70),
	targetMemory: integer("target_memory").default(80),
	deployedAt: timestamp("deployed_at", { mode: 'string' }),
	customUrl: varchar("custom_url", { length: 255 }),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "deployments_project_id_fkey"
		}),
	foreignKey({
			columns: [table.checkpointId],
			foreignColumns: [checkpoints.id],
			name: "deployments_checkpoint_id_fkey"
		}),
	unique("deployments_deployment_id_key").on(table.deploymentId),
]);

export const resourceStats = pgTable("resource_stats", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id"),
	cpuUsage: numeric("cpu_usage", { precision: 5, scale:  2 }),
	memoryUsage: numeric("memory_usage", { precision: 5, scale:  2 }),
	diskUsage: numeric("disk_usage", { precision: 5, scale:  2 }),
	networkIo: jsonb("network_io"),
	collectedAt: timestamp("collected_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "resource_stats_project_id_fkey"
		}),
]);

export const deploymentLogs = pgTable("deployment_logs", {
	id: serial().primaryKey().notNull(),
	deploymentId: integer("deployment_id"),
	message: text(),
	level: varchar({ length: 10 }),
	metadata: jsonb(),
	timestamp: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const billingRecords = pgTable("billing_records", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id"),
	amount: numeric({ precision: 10, scale:  2 }),
	currency: varchar({ length: 3 }).default('USD'),
	description: text(),
	status: varchar({ length: 20 }).default('pending'),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "billing_records_user_id_fkey"
		}),
]);

export const sshKeys = pgTable("ssh_keys", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	publicKey: text("public_key").notNull(),
	fingerprint: varchar({ length: 255 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	userId: integer("user_id"),
	privateKey: text("private_key"),
	isActive: boolean("is_active").default(true),
	lastUsed: timestamp("last_used", { mode: 'string' }),
}, (table) => [
	index("idx_ssh_keys_fingerprint").using("btree", table.fingerprint.asc().nullsLast().op("text_ops")),
	index("idx_ssh_keys_project").using("btree", table.projectId.asc().nullsLast().op("int4_ops")),
	index("idx_ssh_keys_project_id").using("btree", table.projectId.asc().nullsLast().op("int4_ops")),
]);

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	username: text().notNull(),
	password: text().notNull(),
	email: text(),
	displayName: text("display_name"),
	avatarUrl: text("avatar_url"),
	bio: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	emailVerificationToken: text("email_verification_token"),
	emailVerificationExpiry: timestamp("email_verification_expiry", { mode: 'string' }),
	passwordResetToken: text("password_reset_token"),
	passwordResetExpiry: timestamp("password_reset_expiry", { mode: 'string' }),
	failedLoginAttempts: integer("failed_login_attempts").default(0).notNull(),
	accountLockedUntil: timestamp("account_locked_until", { mode: 'string' }),
	twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
	twoFactorSecret: text("two_factor_secret"),
	lastLoginAt: timestamp("last_login_at", { mode: 'string' }),
	lastLoginIp: text("last_login_ip"),
	firstName: varchar("first_name"),
	lastName: varchar("last_name"),
	profileImageUrl: varchar("profile_image_url"),
	website: varchar(),
	githubUsername: varchar("github_username"),
	twitterUsername: varchar("twitter_username"),
	linkedinUsername: varchar("linkedin_username"),
	reputation: integer().default(0),
	isMentor: boolean("is_mentor").default(false),
	stripeCustomerId: varchar("stripe_customer_id"),
	stripeSubscriptionId: varchar("stripe_subscription_id"),
	stripePriceId: varchar("stripe_price_id"),
	subscriptionStatus: varchar("subscription_status"),
	subscriptionCurrentPeriodEnd: timestamp("subscription_current_period_end", { mode: 'string' }),
	role: text().default('user'),
	preferredAiModel: varchar("preferred_ai_model"),
	subscriptionTier: subscriptionTier("subscription_tier").default('free'),
	creditsBalance: numeric("credits_balance", { precision: 10, scale:  2 }).default('0.00'),
	creditsMonthlyAllowance: numeric("credits_monthly_allowance", { precision: 10, scale:  2 }).default('0.00'),
	lastCreditRefill: timestamp("last_credit_refill", { mode: 'string' }),
	allowanceVcpus: integer("allowance_vcpus").default(1),
	allowanceRamGb: integer("allowance_ram_gb").default(2),
	allowanceStorageGb: integer("allowance_storage_gb").default(1),
	allowanceBandwidthGb: integer("allowance_bandwidth_gb").default(1),
	usageComputeHours: numeric("usage_compute_hours", { precision: 10, scale:  2 }).default('0.00'),
	usageStorageGb: numeric("usage_storage_gb", { precision: 10, scale:  2 }).default('0.00'),
	usageBandwidthGb: numeric("usage_bandwidth_gb", { precision: 10, scale:  2 }).default('0.00'),
	usageDeployments: integer("usage_deployments").default(0),
	usageResetAt: timestamp("usage_reset_at", { mode: 'string' }),
	lastBilledComputeHours: numeric("last_billed_compute_hours", { precision: 10, scale:  2 }).default('0.00'),
	lastBilledStorageGb: numeric("last_billed_storage_gb", { precision: 10, scale:  2 }).default('0.00'),
	lastBilledBandwidthGb: numeric("last_billed_bandwidth_gb", { precision: 10, scale:  2 }).default('0.00'),
	stripeConnectAccountId: varchar("stripe_connect_account_id"),
	stripeConnectOnboarded: boolean("stripe_connect_onboarded").default(false),
}, (table) => [
	unique("users_username_unique").on(table.username),
	unique("users_email_unique").on(table.email),
]);

export const payAsYouGoQueue = pgTable("pay_as_you_go_queue", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	usageEventId: integer("usage_event_id"),
	idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
	metric: varchar({ length: 50 }).notNull(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	description: text(),
	billingPeriod: varchar("billing_period", { length: 20 }).notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	attempts: integer().default(0).notNull(),
	lastError: text("last_error"),
	stripeInvoiceItemId: varchar("stripe_invoice_item_id"),
	stripeInvoiceId: varchar("stripe_invoice_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	processedAt: timestamp("processed_at", { mode: 'string' }),
	nextRetryAt: timestamp("next_retry_at", { mode: 'string' }),
	metadata: jsonb(),
}, (table) => [
	index("idx_payg_queue_pending").using("btree", table.status.asc().nullsLast().op("text_ops"), table.nextRetryAt.asc().nullsLast().op("text_ops")),
	index("idx_payg_queue_user_id").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
]);

export const aiStripeUsageQueue = pgTable("ai_stripe_usage_queue", {
	id: serial().primaryKey().notNull(),
	meteringId: integer("metering_id").notNull(),
	userId: varchar("user_id").notNull(),
	subscriptionId: varchar("subscription_id"),
	costUsd: numeric("cost_usd", { precision: 10, scale:  6 }).notNull(),
	attempts: integer().default(0).notNull(),
	maxAttempts: integer("max_attempts").default(3).notNull(),
	lastError: text("last_error"),
	nextRetryAt: timestamp("next_retry_at", { mode: 'string' }).notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("ai_stripe_queue_metering_id_idx").using("btree", table.meteringId.asc().nullsLast().op("int4_ops")),
	index("ai_stripe_queue_next_retry_idx").using("btree", table.nextRetryAt.asc().nullsLast().op("timestamp_ops")),
	index("ai_stripe_queue_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
]);

export const systemSettings = pgTable("system_settings", {
	id: varchar().primaryKey().notNull(),
	key: varchar().notNull(),
	value: text(),
	description: text(),
	encrypted: boolean().default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("system_settings_key_key").on(table.key),
]);

export const agentSessions = pgTable("agent_sessions", {
	id: varchar().default((gen_random_uuid())).primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	projectId: integer("project_id"),
	sessionToken: text("session_token").notNull(),
	model: text().notNull(),
	context: jsonb(),
	isActive: boolean("is_active").default(true),
	totalTokensUsed: integer("total_tokens_used").default(0),
	totalOperations: integer("total_operations").default(0),
	autonomousMode: boolean("autonomous_mode").default(false),
	riskThreshold: riskThreshold("risk_threshold").default('medium'),
	autoApproveActions: boolean("auto_approve_actions").default(false),
	workflowStatus: workflowStatus("workflow_status").default('idle'),
	startedAt: timestamp("started_at", { mode: 'string' }).defaultNow(),
	endedAt: timestamp("ended_at", { mode: 'string' }),
	metadata: jsonb(),
}, (table) => [
	index("agent_sessions_active_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("agent_sessions_project_id_idx").using("btree", table.projectId.asc().nullsLast().op("int4_ops")),
	index("agent_sessions_user_id_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "agent_sessions_user_id_fkey"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "agent_sessions_project_id_fkey"
		}),
	unique("agent_sessions_session_token_key").on(table.sessionToken),
]);

export const templates = pgTable("templates", {
	id: serial().primaryKey().notNull(),
	slug: varchar({ length: 255 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text().notNull(),
	icon: varchar({ length: 100 }),
	category: varchar({ length: 50 }).notNull(),
	tags: text().array().default([""]).notNull(),
	authorId: integer("author_id"),
	authorName: varchar("author_name", { length: 255 }).notNull(),
	authorVerified: boolean("author_verified").default(false),
	language: varchar({ length: 50 }).notNull(),
	framework: varchar({ length: 100 }),
	difficulty: varchar({ length: 20 }).notNull(),
	estimatedTime: varchar("estimated_time", { length: 50 }),
	features: text().array().default([""]).notNull(),
	files: jsonb().notNull(),
	dependencies: jsonb(),
	uses: integer().default(0).notNull(),
	stars: integer().default(0).notNull(),
	forks: integer().default(0).notNull(),
	isFeatured: boolean("is_featured").default(false),
	isOfficial: boolean("is_official").default(false),
	published: boolean().default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	isCommunity: boolean("is_community").default(false),
	status: varchar(),
	githubUrl: varchar("github_url"),
	demoUrl: varchar("demo_url"),
	livePreviewUrl: varchar("live_preview_url"),
	thumbnailUrl: varchar("thumbnail_url"),
	version: varchar(),
	license: varchar(),
	price: numeric({ precision: 10, scale:  2 }).default('0'),
	downloads: integer().default(0),
	rating: numeric({ precision: 3, scale:  2 }).default('0'),
	reviewCount: integer("review_count").default(0),
}, (table) => [
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [users.id],
			name: "templates_author_id_fkey"
		}),
	unique("templates_slug_key").on(table.slug),
]);

export const fileOperations = pgTable("file_operations", {
	id: varchar().default((gen_random_uuid())).primaryKey().notNull(),
	sessionId: varchar("session_id").notNull(),
	operationType: agentOperationType("operation_type").notNull(),
	filePath: text("file_path").notNull(),
	newPath: text("new_path"),
	content: text(),
	previousContent: text("previous_content"),
	checksum: text(),
	status: operationStatus().default('pending').notNull(),
	error: text(),
	executedAt: timestamp("executed_at", { mode: 'string' }),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	rollbackOf: varchar("rollback_of"),
	metadata: jsonb(),
}, (table) => [
	index("file_operations_file_path_idx").using("btree", table.filePath.asc().nullsLast().op("text_ops")),
	index("file_operations_session_id_idx").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
	index("file_operations_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [agentSessions.id],
			name: "file_operations_session_id_fkey"
		}),
]);

export const autonomousActions = pgTable("autonomous_actions", {
	id: varchar().default((gen_random_uuid())).primaryKey().notNull(),
	sessionId: varchar("session_id").notNull(),
	actionType: text("action_type").notNull(),
	actionData: jsonb("action_data"),
	riskScore: integer("risk_score").notNull(),
	riskFactors: jsonb("risk_factors"),
	autoApproved: boolean("auto_approved").default(false).notNull(),
	approvalRequired: boolean("approval_required").default(true).notNull(),
	status: operationStatus().default('pending').notNull(),
	result: jsonb(),
	error: text(),
	rollbackAvailable: boolean("rollback_available").default(true),
	rollbackData: jsonb("rollback_data"),
	executedAt: timestamp("executed_at", { mode: 'string' }).defaultNow(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	rolledBackAt: timestamp("rolled_back_at", { mode: 'string' }),
}, (table) => [
	index("autonomous_actions_auto_approved_idx").using("btree", table.autoApproved.asc().nullsLast().op("bool_ops")),
	index("autonomous_actions_risk_score_idx").using("btree", table.riskScore.asc().nullsLast().op("int4_ops")),
	index("autonomous_actions_session_id_idx").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
	index("autonomous_actions_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [agentSessions.id],
			name: "autonomous_actions_session_id_fkey"
		}),
]);

export const agentMessages = pgTable("agent_messages", {
	id: varchar().default((gen_random_uuid())).primaryKey().notNull(),
	sessionId: varchar("session_id"),
	conversationId: integer("conversation_id").notNull(),
	projectId: integer("project_id").notNull(),
	userId: integer("user_id").notNull(),
	role: varchar().notNull(),
	content: text().notNull(),
	model: varchar(),
	extendedThinking: jsonb("extended_thinking"),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("agent_messages_conversation_id_idx").using("btree", table.conversationId.asc().nullsLast().op("int4_ops")),
	index("agent_messages_project_id_idx").using("btree", table.projectId.asc().nullsLast().op("int4_ops")),
	index("agent_messages_session_id_idx").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
	index("agent_messages_timeline_idx").using("btree", table.projectId.asc().nullsLast().op("timestamp_ops"), table.createdAt.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [agentSessions.id],
			name: "agent_messages_session_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [aiConversations.id],
			name: "agent_messages_conversation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "agent_messages_project_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "agent_messages_user_id_fkey"
		}),
]);

export const testingSessionRecordings = pgTable("testing_session_recordings", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	sessionId: varchar("session_id").notNull(),
	testName: varchar("test_name").notNull(),
	testPlan: text("test_plan"),
	status: varchar().default('pending').notNull(),
	videoUrl: text("video_url"),
	videoPath: text("video_path"),
	thumbnailUrl: text("thumbnail_url"),
	duration: integer(),
	steps: jsonb().default([]),
	summary: jsonb().default({}),
	metadata: jsonb().default({}),
	createdBy: integer("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	completedAt: timestamp("completed_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "testing_session_recordings_project_id_fkey"
		}),
]);

export const aiUsageMetering = pgTable("ai_usage_metering", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	endpoint: varchar().notNull(),
	model: varchar().notNull(),
	provider: varchar().notNull(),
	tokensInput: integer("tokens_input").default(0),
	tokensOutput: integer("tokens_output").default(0),
	tokensTotal: integer("tokens_total").default(0),
	costUsd: numeric("cost_usd", { precision: 10, scale:  6 }).default('0'),
	billed: boolean().default(false),
	billedAt: timestamp("billed_at", { mode: 'string' }),
	stripeUsageRecordId: varchar("stripe_usage_record_id"),
	userTier: varchar("user_tier").default('free'),
	subscriptionId: varchar("subscription_id"),
	requestDurationMs: integer("request_duration_ms"),
	status: varchar().default('success'),
	errorMessage: text("error_message"),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "ai_usage_metering_user_id_fkey"
		}),
]);

export const maxAutonomySessions = pgTable("max_autonomy_sessions", {
	id: varchar().default((gen_random_uuid())).primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	projectId: integer("project_id").notNull(),
	agentSessionId: varchar("agent_session_id"),
	goal: text().notNull(),
	status: maxAutonomySessionStatus().default('pending').notNull(),
	maxDurationMinutes: integer("max_duration_minutes").default(240),
	executionIntervalMs: integer("execution_interval_ms").default(2000),
	tasksTotal: integer("tasks_total").default(0),
	tasksCompleted: integer("tasks_completed").default(0),
	tasksFailed: integer("tasks_failed").default(0),
	tasksSkipped: integer("tasks_skipped").default(0),
	checkpointsCreated: integer("checkpoints_created").default(0),
	rollbacksPerformed: integer("rollbacks_performed").default(0),
	testsRun: integer("tests_run").default(0),
	testsPassed: integer("tests_passed").default(0),
	totalTokensUsed: integer("total_tokens_used").default(0),
	totalCostUsd: numeric("total_cost_usd", { precision: 10, scale:  6 }).default('0'),
	autoCheckpoint: boolean("auto_checkpoint").default(true),
	autoTest: boolean("auto_test").default(true),
	autoRollback: boolean("auto_rollback").default(true),
	riskThreshold: riskThreshold("risk_threshold").default('medium'),
	lastCheckpointId: integer("last_checkpoint_id"),
	currentTaskId: varchar("current_task_id"),
	startedAt: timestamp("started_at", { mode: 'string' }),
	pausedAt: timestamp("paused_at", { mode: 'string' }),
	resumedAt: timestamp("resumed_at", { mode: 'string' }),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	errorMessage: text("error_message"),
	metadata: jsonb().default({}),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "max_autonomy_sessions_user_id_fkey"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "max_autonomy_sessions_project_id_fkey"
		}),
]);

export const dynamicIntelligence = pgTable("dynamic_intelligence", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	extendedThinking: boolean("extended_thinking").default(false),
	highPowerMode: boolean("high_power_mode").default(false),
	autoWebSearch: boolean("auto_web_search").default(true),
	preferredModel: varchar("preferred_model").default('claude-3-sonnet'),
	customInstructions: text("custom_instructions"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	improvePromptEnabled: boolean("improve_prompt_enabled").default(true),
	progressTabEnabled: boolean("progress_tab_enabled").default(true),
	pauseResumeEnabled: boolean("pause_resume_enabled").default(true),
	autoCheckpoints: boolean("auto_checkpoints").default(true),
	workspaceState: jsonb("workspace_state").default({}),
	userPreferences: jsonb("user_preferences").default({}),
	devices: jsonb().default([]),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "dynamic_intelligence_user_id_fkey"
		}),
	unique("dynamic_intelligence_user_id_key").on(table.userId),
]);

export const buildLogs = pgTable("build_logs", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id"),
	buildId: varchar("build_id"),
	logType: varchar("log_type").default('build').notNull(),
	level: varchar().default('info').notNull(),
	message: text().notNull(),
	timestamp: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	source: varchar(),
	metadata: jsonb().default({}),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "build_logs_project_id_fkey"
		}),
]);

export const pushNotifications = pgTable("push_notifications", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	title: varchar().notNull(),
	body: text(),
	type: varchar().default('info'),
	actionUrl: text("action_url"),
	data: jsonb().default({}),
	read: boolean().default(false),
	readAt: timestamp("read_at", { mode: 'string' }),
	sent: boolean().default(false),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "push_notifications_user_id_fkey"
		}),
]);
