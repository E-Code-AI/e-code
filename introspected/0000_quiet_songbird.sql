-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."agent_mode" AS ENUM('plan', 'build');--> statement-breakpoint
CREATE TYPE "public"."agent_operation_type" AS ENUM('file_create', 'file_update', 'file_delete', 'file_rename', 'file_move', 'file_read');--> statement-breakpoint
CREATE TYPE "public"."language" AS ENUM('javascript', 'python', 'html', 'css', 'typescript', 'java', 'c', 'cpp', 'go', 'ruby', 'php', 'rust', 'nodejs');--> statement-breakpoint
CREATE TYPE "public"."max_autonomy_session_status" AS ENUM('pending', 'running', 'paused', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."operation_status" AS ENUM('pending', 'in_progress', 'completed', 'failed', 'cancelled', 'rolled_back');--> statement-breakpoint
CREATE TYPE "public"."risk_threshold" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."subscription_tier" AS ENUM('free', 'core', 'teams', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('public', 'private', 'unlisted');--> statement-breakpoint
CREATE TYPE "public"."workflow_status" AS ENUM('idle', 'planning', 'executing', 'paused', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "project_collaborators" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" text DEFAULT 'editor' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"content" text DEFAULT '',
	"is_folder" boolean DEFAULT false NOT NULL,
	"parent_id" integer,
	"project_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"path" varchar(1024) DEFAULT '/',
	"is_directory" boolean DEFAULT false,
	"type" text DEFAULT 'text',
	"size" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" json NOT NULL,
	"expire" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bounties" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"reward" integer NOT NULL,
	"status" varchar(50) DEFAULT 'open',
	"difficulty" varchar(50) DEFAULT 'intermediate',
	"deadline" timestamp NOT NULL,
	"tags" text[],
	"author_id" integer NOT NULL,
	"author_name" varchar(255) NOT NULL,
	"author_avatar" varchar(255),
	"author_verified" boolean DEFAULT false,
	"winner_id" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "environment_variables" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"is_secret" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"subscribed_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"unsubscribed_at" timestamp,
	"confirmation_token" text,
	"confirmed_at" timestamp,
	CONSTRAINT "newsletter_subscribers_email_key" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"visibility" "visibility" DEFAULT 'private' NOT NULL,
	"language" "language" DEFAULT 'javascript',
	"owner_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"forked_from_id" integer,
	"views" integer DEFAULT 0 NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"forks" integer DEFAULT 0 NOT NULL,
	"runs" integer DEFAULT 0 NOT NULL,
	"cover_image" text,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"slug" text,
	"framework" text,
	"ai_generated" boolean DEFAULT false,
	"build_progress" integer DEFAULT 0,
	"preview_url" text,
	"status" text DEFAULT 'active',
	"current_checkpoint_id" integer,
	CONSTRAINT "projects_slug_key" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "bounty_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"bounty_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"status" varchar(50) DEFAULT 'submitted',
	"submission_url" text NOT NULL,
	"feedback" text,
	"submitted_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"reviewed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "login_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"ip_address" text NOT NULL,
	"user_agent" text,
	"successful" boolean NOT NULL,
	"failure_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"token" text NOT NULL,
	"token_hash" text NOT NULL,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"scopes" json DEFAULT '["read","write"]'::json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_tokens_token_key" UNIQUE("token"),
	CONSTRAINT "api_tokens_token_hash_key" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(500) NOT NULL,
	"slug" varchar(500) NOT NULL,
	"content" text NOT NULL,
	"excerpt" text NOT NULL,
	"author" varchar(255) NOT NULL,
	"author_role" varchar(255),
	"category" varchar(100) NOT NULL,
	"tags" text[],
	"published" boolean DEFAULT false,
	"featured" boolean DEFAULT false,
	"cover_image" varchar(500),
	"read_time" integer NOT NULL,
	"views" integer DEFAULT 0,
	"published_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "blog_posts_slug_key" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "secrets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"project_id" integer,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "secrets_user_id_key_key" UNIQUE("user_id","key")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"entity_type" varchar(50),
	"entity_id" integer,
	"from_user_id" integer,
	"read" boolean DEFAULT false,
	"read_at" timestamp,
	"action_url" varchar(500),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"email_enabled" boolean DEFAULT true,
	"push_enabled" boolean DEFAULT true,
	"comment_notifications" boolean DEFAULT true,
	"follow_notifications" boolean DEFAULT true,
	"deployment_notifications" boolean DEFAULT true,
	"star_notifications" boolean DEFAULT true,
	"mention_notifications" boolean DEFAULT true,
	"system_notifications" boolean DEFAULT true,
	"newsletter_enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "notification_preferences_user_id_key" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "project_likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "project_likes_project_id_user_id_key" UNIQUE("project_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "project_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"user_id" integer,
	"ip_address" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"action" text NOT NULL,
	"details" jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(500) NOT NULL,
	"content" text NOT NULL,
	"author_id" integer NOT NULL,
	"category" varchar(50) NOT NULL,
	"tags" text[] DEFAULT '{""}' NOT NULL,
	"project_id" integer,
	"image_url" varchar(500),
	"likes" integer DEFAULT 0 NOT NULL,
	"comments" integer DEFAULT 0 NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"is_pinned" boolean DEFAULT false,
	"is_locked" boolean DEFAULT false,
	"published" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "community_challenges" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text NOT NULL,
	"difficulty" varchar(20) NOT NULL,
	"category" varchar(50) NOT NULL,
	"participants" integer DEFAULT 0 NOT NULL,
	"submissions" integer DEFAULT 0 NOT NULL,
	"prize" varchar(255),
	"deadline" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"rules" text,
	"judge_id" integer,
	"winner_id" integer,
	"tags" text[] DEFAULT '{""}' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "themes" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"type" varchar(20) NOT NULL,
	"preview" jsonb NOT NULL,
	"config" jsonb NOT NULL,
	"author_id" integer,
	"author_name" varchar(255) NOT NULL,
	"downloads" integer DEFAULT 0 NOT NULL,
	"rating" integer DEFAULT 0,
	"is_official" boolean DEFAULT false,
	"is_dark" boolean DEFAULT true,
	"published" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "themes_slug_key" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(500) NOT NULL,
	"content" text,
	"type" varchar(50) NOT NULL,
	"priority" varchar(20) DEFAULT 'normal' NOT NULL,
	"target_audience" varchar(50) DEFAULT 'all' NOT NULL,
	"icon" varchar(100),
	"link" varchar(500),
	"active" boolean DEFAULT true,
	"dismissible" boolean DEFAULT true,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "learning_courses" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(255) NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text NOT NULL,
	"category" varchar(100) NOT NULL,
	"difficulty" varchar(20) NOT NULL,
	"duration" varchar(100),
	"thumbnail" varchar(500),
	"author_id" integer,
	"author_name" varchar(255) NOT NULL,
	"total_lessons" integer DEFAULT 0 NOT NULL,
	"enrollments" integer DEFAULT 0 NOT NULL,
	"rating" integer DEFAULT 0,
	"tags" text[] DEFAULT '{""}' NOT NULL,
	"prerequisites" text[] DEFAULT '{""}' NOT NULL,
	"published" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "learning_courses_slug_key" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_learning_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"course_id" integer NOT NULL,
	"current_lesson" integer DEFAULT 1 NOT NULL,
	"completed_lessons" integer DEFAULT 0 NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"streak" integer DEFAULT 0 NOT NULL,
	"last_activity_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"started_at" timestamp DEFAULT now(),
	CONSTRAINT "user_learning_progress_user_id_course_id_key" UNIQUE("user_id","course_id")
);
--> statement-breakpoint
CREATE TABLE "user_cycles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"total_earned" integer DEFAULT 0 NOT NULL,
	"total_spent" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_cycles_user_id_key" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "cycles_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"related_id" integer,
	"related_type" varchar(50),
	"balance" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "object_storage" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"project_id" integer,
	"name" varchar(255) NOT NULL,
	"path" varchar(1000) NOT NULL,
	"size" integer NOT NULL,
	"type" varchar(20) NOT NULL,
	"mime_type" varchar(100),
	"url" varchar(1000),
	"cdn_url" varchar(1000),
	"is_public" boolean DEFAULT false,
	"metadata" jsonb,
	"parent_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "object_storage_user_id_path_key" UNIQUE("user_id","path")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "teams_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"logo" text,
	"owner_id" integer NOT NULL,
	"plan" varchar(50) DEFAULT 'free' NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"stripe_customer_id" varchar(255),
	"stripe_subscription_id" varchar(255),
	"member_limit" integer DEFAULT 5 NOT NULL,
	"storage_limit" integer DEFAULT '10737418240' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "teams_slug_key" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "team_members_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"team_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" varchar(50) DEFAULT 'member' NOT NULL,
	"permissions" jsonb DEFAULT '{}'::jsonb,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"invited_by" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "team_members_team_id_user_id_key" UNIQUE("team_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "team_invitations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "team_invitations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"team_id" integer NOT NULL,
	"email" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'member' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"invited_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_projects" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "team_projects_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"team_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"added_by" integer NOT NULL,
	"visibility" varchar(50) DEFAULT 'team' NOT NULL,
	"permissions" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "team_projects_team_id_project_id_key" UNIQUE("team_id","project_id")
);
--> statement-breakpoint
CREATE TABLE "team_workspaces" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "team_workspaces_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"team_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_projects" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "workspace_projects_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"workspace_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_projects_workspace_id_project_id_key" UNIQUE("workspace_id","project_id")
);
--> statement-breakpoint
CREATE TABLE "team_activity" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "team_activity_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"team_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_usage_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"operation" text NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"cost" numeric(10, 6) DEFAULT '0' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"service" text NOT NULL,
	"api_key" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"usage_limit" integer,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"provider" varchar(50) NOT NULL,
	"key_name" varchar(255),
	"reset_date" timestamp
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"file_id" integer,
	"author_id" integer NOT NULL,
	"content" text NOT NULL,
	"line_number" integer,
	"resolved" boolean DEFAULT false,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "checkpoints" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"files_snapshot" jsonb NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"type" varchar(50) DEFAULT 'manual' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_time_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"duration" integer,
	"task_description" text,
	"active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "project_screenshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"image_url" text NOT NULL,
	"description" text,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "task_summaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"completed_tasks" jsonb NOT NULL,
	"files_created" integer DEFAULT 0,
	"files_modified" integer DEFAULT 0,
	"lines_added" integer DEFAULT 0,
	"lines_deleted" integer DEFAULT 0,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"user_id" integer NOT NULL,
	"key" varchar(255) NOT NULL,
	"permissions" text[],
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"expires_at" timestamp,
	CONSTRAINT "api_keys_key_key" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "usage_tracking" (
	"id" integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY (sequence name "usage_tracking_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"metric_type" varchar NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	"unit" varchar NOT NULL,
	"timestamp" timestamp DEFAULT now(),
	"billing_period_start" timestamp NOT NULL,
	"billing_period_end" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checkpoint_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"checkpoint_id" integer NOT NULL,
	"file_id" integer NOT NULL,
	"path" text NOT NULL,
	"content" text,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "user_credits" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"monthly_credits" numeric(10, 2) DEFAULT '25.00' NOT NULL,
	"remaining_credits" numeric(10, 2) DEFAULT '25.00' NOT NULL,
	"extra_credits" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"reset_date" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "user_credits_user_id_key" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "budget_limits" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"monthly_limit" numeric(10, 2),
	"alert_threshold" integer DEFAULT 80,
	"hard_stop" boolean DEFAULT true,
	"notification_email" varchar,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "budget_limits_user_id_key" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "usage_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"alert_type" varchar NOT NULL,
	"threshold" integer NOT NULL,
	"sent" boolean DEFAULT false,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "autoscale_deployments" (
	"id" serial PRIMARY KEY NOT NULL,
	"deployment_id" integer NOT NULL,
	"min_instances" integer DEFAULT 1 NOT NULL,
	"max_instances" integer DEFAULT 10 NOT NULL,
	"target_cpu_utilization" integer DEFAULT 70,
	"scale_down_delay" integer DEFAULT 300,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "autoscale_deployments_deployment_id_key" UNIQUE("deployment_id")
);
--> statement-breakpoint
CREATE TABLE "reserved_vm_deployments" (
	"id" serial PRIMARY KEY NOT NULL,
	"deployment_id" integer NOT NULL,
	"vm_size" varchar NOT NULL,
	"cpu_cores" integer NOT NULL,
	"memory_gb" integer NOT NULL,
	"disk_gb" integer NOT NULL,
	"region" varchar NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "reserved_vm_deployments_deployment_id_key" UNIQUE("deployment_id")
);
--> statement-breakpoint
CREATE TABLE "scheduled_deployments" (
	"id" serial PRIMARY KEY NOT NULL,
	"deployment_id" integer NOT NULL,
	"cron_expression" varchar NOT NULL,
	"timezone" varchar DEFAULT 'UTC' NOT NULL,
	"last_run" timestamp,
	"next_run" timestamp,
	"max_runtime" integer DEFAULT 3600,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "scheduled_deployments_deployment_id_key" UNIQUE("deployment_id")
);
--> statement-breakpoint
CREATE TABLE "static_deployments" (
	"id" serial PRIMARY KEY NOT NULL,
	"deployment_id" integer NOT NULL,
	"cdn_enabled" boolean DEFAULT true,
	"build_command" varchar,
	"output_directory" varchar DEFAULT 'dist',
	"headers" jsonb DEFAULT '{}'::jsonb,
	"redirects" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "static_deployments_deployment_id_key" UNIQUE("deployment_id")
);
--> statement-breakpoint
CREATE TABLE "object_storage_buckets" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"bucket_name" varchar NOT NULL,
	"region" varchar DEFAULT 'us-central1' NOT NULL,
	"storage_class" varchar DEFAULT 'STANDARD' NOT NULL,
	"public_access" boolean DEFAULT false,
	"cors_enabled" boolean DEFAULT true,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "object_storage_buckets_bucket_name_key" UNIQUE("bucket_name")
);
--> statement-breakpoint
CREATE TABLE "object_storage_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"bucket_id" integer NOT NULL,
	"file_name" text NOT NULL,
	"file_path" text NOT NULL,
	"content_type" varchar NOT NULL,
	"size" integer NOT NULL,
	"url" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"uploaded_by" integer NOT NULL,
	"uploaded_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "key_value_store" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"key" varchar NOT NULL,
	"value" jsonb NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "key_value_store_project_id_key_key" UNIQUE("project_id","key")
);
--> statement-breakpoint
CREATE TABLE "ai_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"conversation_id" varchar,
	"messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"context" jsonb DEFAULT '{}'::jsonb,
	"total_tokens_used" integer DEFAULT 0,
	"model" varchar DEFAULT 'claude-3-sonnet' NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"agent_mode" "agent_mode" DEFAULT 'build' NOT NULL,
	CONSTRAINT "ai_conversations_conversation_id_key" UNIQUE("conversation_id")
);
--> statement-breakpoint
CREATE TABLE "web_search_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"query" text NOT NULL,
	"results" jsonb NOT NULL,
	"selected_urls" jsonb DEFAULT '[]'::jsonb,
	"timestamp" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "git_repositories" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"provider" varchar NOT NULL,
	"repository_url" text NOT NULL,
	"default_branch" varchar DEFAULT 'main' NOT NULL,
	"is_private" boolean DEFAULT true,
	"deploy_key" text,
	"webhook_secret" varchar,
	"auto_sync" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "git_repositories_project_id_key" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "git_commits" (
	"id" serial PRIMARY KEY NOT NULL,
	"repository_id" integer NOT NULL,
	"commit_hash" varchar NOT NULL,
	"message" text NOT NULL,
	"author" varchar NOT NULL,
	"author_email" varchar NOT NULL,
	"timestamp" timestamp NOT NULL,
	"branch" varchar NOT NULL,
	"synced_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_usage_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"model" varchar NOT NULL,
	"provider" varchar NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"credits_cost" numeric(10, 4) DEFAULT '0' NOT NULL,
	"purpose" varchar,
	"project_id" integer,
	"conversation_id" varchar,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_domains" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"domain" varchar NOT NULL,
	"subdomain" varchar,
	"ssl_status" varchar DEFAULT 'pending' NOT NULL,
	"ssl_certificate" text,
	"verification_status" varchar DEFAULT 'pending' NOT NULL,
	"verification_token" varchar,
	"dns_records" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "custom_domains_domain_key" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "performance_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"value" numeric,
	"unit" varchar(50),
	"timestamp" timestamp DEFAULT CURRENT_TIMESTAMP,
	"user_id" integer,
	"session_id" varchar(255),
	"tags" jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "file_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"filename" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"message" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "project_extensions" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"extension_id" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"installed_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "project_extensions_project_id_extension_id_key" UNIQUE("project_id","extension_id")
);
--> statement-breakpoint
CREATE TABLE "multiplayer_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"session_id" varchar(100) NOT NULL,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"ended_at" timestamp,
	CONSTRAINT "multiplayer_sessions_session_id_key" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "multiplayer_collaborators" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"session_id" varchar(100) NOT NULL,
	"user_id" integer NOT NULL,
	"joined_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"left_at" timestamp,
	"active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "multiplayer_invites" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"email" varchar(255) NOT NULL,
	"invite_code" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	CONSTRAINT "multiplayer_invites_invite_code_key" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "workspace_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"settings" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "workspace_settings_project_id_key" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "project_domains" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"provider" varchar(100),
	"ssl" boolean DEFAULT false,
	"settings" jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "resources_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"cpu_usage" numeric(5, 2),
	"memory_usage" integer,
	"storage_usage" bigint,
	"network_inbound" numeric(10, 2),
	"network_outbound" numeric(10, 2),
	"recorded_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "security_scans" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"score" varchar(10),
	"vulnerabilities" jsonb,
	"total_issues" integer DEFAULT 0,
	"scanned_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "knowledge_graph_nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb,
	"embedding" double precision[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "knowledge_graph_edges" (
	"id" text PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"target_id" text NOT NULL,
	"relationship" text NOT NULL,
	"weight" double precision DEFAULT 1,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "knowledge_graph_edges_source_id_target_id_relationship_key" UNIQUE("source_id","target_id","relationship")
);
--> statement-breakpoint
CREATE TABLE "extended_thinking_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"step_number" integer NOT NULL,
	"type" text NOT NULL,
	"content" text NOT NULL,
	"paths" jsonb,
	"selected_path" text,
	"confidence" integer DEFAULT 0,
	"reasoning" text,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "extended_thinking_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"conversation_id" integer,
	"problem" text NOT NULL,
	"complexity" text NOT NULL,
	"status" text DEFAULT 'active',
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"metadata" jsonb,
	"final_recommendation" text,
	"total_steps" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "marketplace_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"framework" varchar(100),
	"language" varchar(100),
	"author" varchar(255),
	"stars" integer DEFAULT 0,
	"forks" integer DEFAULT 0,
	"downloads" integer DEFAULT 0,
	"tags" text[],
	"featured" boolean DEFAULT false,
	"price" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"author_id" integer,
	"project_id" integer
);
--> statement-breakpoint
CREATE TABLE "sequential_thinking_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"conversation_id" integer,
	"problem_statement" text NOT NULL,
	"initial_approach" text,
	"thinking_steps" jsonb,
	"current_step" integer DEFAULT 0,
	"status" text DEFAULT 'active',
	"solution" text,
	"refinements" jsonb,
	"metrics" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"current_thought" integer DEFAULT 1,
	"total_thoughts" integer DEFAULT 5,
	"thoughts" jsonb DEFAULT '[]'::jsonb,
	"confidence" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "extensions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"author" varchar(255) NOT NULL,
	"author_id" integer,
	"category" varchar(100) NOT NULL,
	"version" varchar(50) DEFAULT '1.0.0',
	"downloads" integer DEFAULT 0,
	"rating" integer DEFAULT 0,
	"reviews" integer DEFAULT 0,
	"verified" boolean DEFAULT false,
	"icon" varchar(50),
	"repository" text,
	"documentation" text,
	"compatible_versions" jsonb DEFAULT '[]'::jsonb,
	"permissions" jsonb DEFAULT '[]'::jsonb,
	"price" integer DEFAULT 0,
	"featured" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "usage_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"date" timestamp NOT NULL,
	"cpu_seconds" integer DEFAULT 0,
	"memory_mb" integer DEFAULT 0,
	"storage_gb" integer DEFAULT 0,
	"bandwidth_gb" integer DEFAULT 0,
	"ai_tokens" integer DEFAULT 0,
	"builds" integer DEFAULT 0,
	"deployments" integer DEFAULT 0,
	"active_projects" integer DEFAULT 0,
	"collaborators" integer DEFAULT 0,
	"api_calls" integer DEFAULT 0,
	"terminal_minutes" integer DEFAULT 0,
	"debugger_sessions" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "community_activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar(100) NOT NULL,
	"target_type" varchar(100),
	"target_id" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"points" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar(255) PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deployments" (
	"id" integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY (sequence name "deployments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_id" integer NOT NULL,
	"deployment_id" varchar NOT NULL,
	"type" varchar NOT NULL,
	"environment" varchar,
	"status" varchar NOT NULL,
	"url" varchar,
	"custom_domain" varchar,
	"build_logs" text,
	"deployment_logs" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"checkpoint_id" integer,
	"config" text DEFAULT '{}',
	"logs" text DEFAULT '',
	"version" text DEFAULT 'v1.0.0',
	"user_id" integer,
	"name" varchar(255),
	"description" text,
	"machine_type" varchar(255) DEFAULT 'standard',
	"regions" jsonb DEFAULT '[]'::jsonb,
	"subdomain" varchar(255),
	"environment_vars" jsonb DEFAULT '{}'::jsonb,
	"build_command" text,
	"run_command" text,
	"port" integer DEFAULT 3000,
	"health_check_path" text,
	"health_check_interval" integer,
	"autoscaling_enabled" boolean DEFAULT false,
	"min_instances" integer DEFAULT 1,
	"max_instances" integer DEFAULT 10,
	"target_cpu" integer DEFAULT 70,
	"target_memory" integer DEFAULT 80,
	"deployed_at" timestamp,
	"custom_url" varchar(255),
	CONSTRAINT "deployments_deployment_id_key" UNIQUE("deployment_id")
);
--> statement-breakpoint
CREATE TABLE "resource_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"cpu_usage" numeric(5, 2),
	"memory_usage" numeric(5, 2),
	"disk_usage" numeric(5, 2),
	"network_io" jsonb,
	"collected_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "deployment_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"deployment_id" integer,
	"message" text,
	"level" varchar(10),
	"metadata" jsonb,
	"timestamp" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "billing_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"amount" numeric(10, 2),
	"currency" varchar(3) DEFAULT 'USD',
	"description" text,
	"status" varchar(20) DEFAULT 'pending',
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "ssh_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"public_key" text NOT NULL,
	"fingerprint" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"user_id" integer,
	"private_key" text,
	"is_active" boolean DEFAULT true,
	"last_used" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text,
	"display_name" text,
	"avatar_url" text,
	"bio" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"email_verification_token" text,
	"email_verification_expiry" timestamp,
	"password_reset_token" text,
	"password_reset_expiry" timestamp,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"account_locked_until" timestamp,
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"two_factor_secret" text,
	"last_login_at" timestamp,
	"last_login_ip" text,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"website" varchar,
	"github_username" varchar,
	"twitter_username" varchar,
	"linkedin_username" varchar,
	"reputation" integer DEFAULT 0,
	"is_mentor" boolean DEFAULT false,
	"stripe_customer_id" varchar,
	"stripe_subscription_id" varchar,
	"stripe_price_id" varchar,
	"subscription_status" varchar,
	"subscription_current_period_end" timestamp,
	"role" text DEFAULT 'user',
	"preferred_ai_model" varchar,
	"subscription_tier" "subscription_tier" DEFAULT 'free',
	"credits_balance" numeric(10, 2) DEFAULT '0.00',
	"credits_monthly_allowance" numeric(10, 2) DEFAULT '0.00',
	"last_credit_refill" timestamp,
	"allowance_vcpus" integer DEFAULT 1,
	"allowance_ram_gb" integer DEFAULT 2,
	"allowance_storage_gb" integer DEFAULT 1,
	"allowance_bandwidth_gb" integer DEFAULT 1,
	"usage_compute_hours" numeric(10, 2) DEFAULT '0.00',
	"usage_storage_gb" numeric(10, 2) DEFAULT '0.00',
	"usage_bandwidth_gb" numeric(10, 2) DEFAULT '0.00',
	"usage_deployments" integer DEFAULT 0,
	"usage_reset_at" timestamp,
	"last_billed_compute_hours" numeric(10, 2) DEFAULT '0.00',
	"last_billed_storage_gb" numeric(10, 2) DEFAULT '0.00',
	"last_billed_bandwidth_gb" numeric(10, 2) DEFAULT '0.00',
	"stripe_connect_account_id" varchar,
	"stripe_connect_onboarded" boolean DEFAULT false,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "pay_as_you_go_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"usage_event_id" integer,
	"idempotency_key" varchar(255) NOT NULL,
	"metric" varchar(50) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"description" text,
	"billing_period" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"stripe_invoice_item_id" varchar,
	"stripe_invoice_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	"next_retry_at" timestamp,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "ai_stripe_usage_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"metering_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"subscription_id" varchar,
	"cost_usd" numeric(10, 6) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"last_error" text,
	"next_retry_at" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" varchar PRIMARY KEY NOT NULL,
	"key" varchar NOT NULL,
	"value" text,
	"description" text,
	"encrypted" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "system_settings_key_key" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "agent_sessions" (
	"id" varchar PRIMARY KEY DEFAULT (gen_random_uuid()) NOT NULL,
	"user_id" integer NOT NULL,
	"project_id" integer,
	"session_token" text NOT NULL,
	"model" text NOT NULL,
	"context" jsonb,
	"is_active" boolean DEFAULT true,
	"total_tokens_used" integer DEFAULT 0,
	"total_operations" integer DEFAULT 0,
	"autonomous_mode" boolean DEFAULT false,
	"risk_threshold" "risk_threshold" DEFAULT 'medium',
	"auto_approve_actions" boolean DEFAULT false,
	"workflow_status" "workflow_status" DEFAULT 'idle',
	"started_at" timestamp DEFAULT now(),
	"ended_at" timestamp,
	"metadata" jsonb,
	CONSTRAINT "agent_sessions_session_token_key" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"icon" varchar(100),
	"category" varchar(50) NOT NULL,
	"tags" text[] DEFAULT '{""}' NOT NULL,
	"author_id" integer,
	"author_name" varchar(255) NOT NULL,
	"author_verified" boolean DEFAULT false,
	"language" varchar(50) NOT NULL,
	"framework" varchar(100),
	"difficulty" varchar(20) NOT NULL,
	"estimated_time" varchar(50),
	"features" text[] DEFAULT '{""}' NOT NULL,
	"files" jsonb NOT NULL,
	"dependencies" jsonb,
	"uses" integer DEFAULT 0 NOT NULL,
	"stars" integer DEFAULT 0 NOT NULL,
	"forks" integer DEFAULT 0 NOT NULL,
	"is_featured" boolean DEFAULT false,
	"is_official" boolean DEFAULT false,
	"published" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"is_community" boolean DEFAULT false,
	"status" varchar,
	"github_url" varchar,
	"demo_url" varchar,
	"live_preview_url" varchar,
	"thumbnail_url" varchar,
	"version" varchar,
	"license" varchar,
	"price" numeric(10, 2) DEFAULT '0',
	"downloads" integer DEFAULT 0,
	"rating" numeric(3, 2) DEFAULT '0',
	"review_count" integer DEFAULT 0,
	CONSTRAINT "templates_slug_key" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "file_operations" (
	"id" varchar PRIMARY KEY DEFAULT (gen_random_uuid()) NOT NULL,
	"session_id" varchar NOT NULL,
	"operation_type" "agent_operation_type" NOT NULL,
	"file_path" text NOT NULL,
	"new_path" text,
	"content" text,
	"previous_content" text,
	"checksum" text,
	"status" "operation_status" DEFAULT 'pending' NOT NULL,
	"error" text,
	"executed_at" timestamp,
	"completed_at" timestamp,
	"rollback_of" varchar,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "autonomous_actions" (
	"id" varchar PRIMARY KEY DEFAULT (gen_random_uuid()) NOT NULL,
	"session_id" varchar NOT NULL,
	"action_type" text NOT NULL,
	"action_data" jsonb,
	"risk_score" integer NOT NULL,
	"risk_factors" jsonb,
	"auto_approved" boolean DEFAULT false NOT NULL,
	"approval_required" boolean DEFAULT true NOT NULL,
	"status" "operation_status" DEFAULT 'pending' NOT NULL,
	"result" jsonb,
	"error" text,
	"rollback_available" boolean DEFAULT true,
	"rollback_data" jsonb,
	"executed_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"rolled_back_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "agent_messages" (
	"id" varchar PRIMARY KEY DEFAULT (gen_random_uuid()) NOT NULL,
	"session_id" varchar,
	"conversation_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" varchar NOT NULL,
	"content" text NOT NULL,
	"model" varchar,
	"extended_thinking" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "testing_session_recordings" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"session_id" varchar NOT NULL,
	"test_name" varchar NOT NULL,
	"test_plan" text,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"video_url" text,
	"video_path" text,
	"thumbnail_url" text,
	"duration" integer,
	"steps" jsonb DEFAULT '[]'::jsonb,
	"summary" jsonb DEFAULT '{}'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_by" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ai_usage_metering" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"endpoint" varchar NOT NULL,
	"model" varchar NOT NULL,
	"provider" varchar NOT NULL,
	"tokens_input" integer DEFAULT 0,
	"tokens_output" integer DEFAULT 0,
	"tokens_total" integer DEFAULT 0,
	"cost_usd" numeric(10, 6) DEFAULT '0',
	"billed" boolean DEFAULT false,
	"billed_at" timestamp,
	"stripe_usage_record_id" varchar,
	"user_tier" varchar DEFAULT 'free',
	"subscription_id" varchar,
	"request_duration_ms" integer,
	"status" varchar DEFAULT 'success',
	"error_message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "max_autonomy_sessions" (
	"id" varchar PRIMARY KEY DEFAULT (gen_random_uuid()) NOT NULL,
	"user_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"agent_session_id" varchar,
	"goal" text NOT NULL,
	"status" "max_autonomy_session_status" DEFAULT 'pending' NOT NULL,
	"max_duration_minutes" integer DEFAULT 240,
	"execution_interval_ms" integer DEFAULT 2000,
	"tasks_total" integer DEFAULT 0,
	"tasks_completed" integer DEFAULT 0,
	"tasks_failed" integer DEFAULT 0,
	"tasks_skipped" integer DEFAULT 0,
	"checkpoints_created" integer DEFAULT 0,
	"rollbacks_performed" integer DEFAULT 0,
	"tests_run" integer DEFAULT 0,
	"tests_passed" integer DEFAULT 0,
	"total_tokens_used" integer DEFAULT 0,
	"total_cost_usd" numeric(10, 6) DEFAULT '0',
	"auto_checkpoint" boolean DEFAULT true,
	"auto_test" boolean DEFAULT true,
	"auto_rollback" boolean DEFAULT true,
	"risk_threshold" "risk_threshold" DEFAULT 'medium',
	"last_checkpoint_id" integer,
	"current_task_id" varchar,
	"started_at" timestamp,
	"paused_at" timestamp,
	"resumed_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"error_message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "dynamic_intelligence" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"extended_thinking" boolean DEFAULT false,
	"high_power_mode" boolean DEFAULT false,
	"auto_web_search" boolean DEFAULT true,
	"preferred_model" varchar DEFAULT 'claude-3-sonnet',
	"custom_instructions" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"improve_prompt_enabled" boolean DEFAULT true,
	"progress_tab_enabled" boolean DEFAULT true,
	"pause_resume_enabled" boolean DEFAULT true,
	"auto_checkpoints" boolean DEFAULT true,
	"workspace_state" jsonb DEFAULT '{}'::jsonb,
	"user_preferences" jsonb DEFAULT '{}'::jsonb,
	"devices" jsonb DEFAULT '[]'::jsonb,
	CONSTRAINT "dynamic_intelligence_user_id_key" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "build_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"build_id" varchar,
	"log_type" varchar DEFAULT 'build' NOT NULL,
	"level" varchar DEFAULT 'info' NOT NULL,
	"message" text NOT NULL,
	"timestamp" timestamp DEFAULT CURRENT_TIMESTAMP,
	"source" varchar,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "push_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" varchar NOT NULL,
	"body" text,
	"type" varchar DEFAULT 'info',
	"action_url" text,
	"data" jsonb DEFAULT '{}'::jsonb,
	"read" boolean DEFAULT false,
	"read_at" timestamp,
	"sent" boolean DEFAULT false,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE "project_collaborators" ADD CONSTRAINT "project_collaborators_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_collaborators" ADD CONSTRAINT "project_collaborators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_parent_id_files_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bounties" ADD CONSTRAINT "bounties_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bounties" ADD CONSTRAINT "bounties_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environment_variables" ADD CONSTRAINT "environment_variables_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_forked_from_id_fkey" FOREIGN KEY ("forked_from_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bounty_submissions" ADD CONSTRAINT "bounty_submissions_bounty_id_fkey" FOREIGN KEY ("bounty_id") REFERENCES "public"."bounties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bounty_submissions" ADD CONSTRAINT "bounty_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "login_history" ADD CONSTRAINT "login_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secrets" ADD CONSTRAINT "secrets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secrets" ADD CONSTRAINT "secrets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_likes" ADD CONSTRAINT "project_likes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_likes" ADD CONSTRAINT "project_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_views" ADD CONSTRAINT "project_views_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_views" ADD CONSTRAINT "project_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_challenges" ADD CONSTRAINT "community_challenges_judge_id_fkey" FOREIGN KEY ("judge_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_challenges" ADD CONSTRAINT "community_challenges_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "themes" ADD CONSTRAINT "themes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_courses" ADD CONSTRAINT "learning_courses_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_learning_progress" ADD CONSTRAINT "user_learning_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_learning_progress" ADD CONSTRAINT "user_learning_progress_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."learning_courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_cycles" ADD CONSTRAINT "user_cycles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycles_transactions" ADD CONSTRAINT "cycles_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "object_storage" ADD CONSTRAINT "object_storage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "object_storage" ADD CONSTRAINT "object_storage_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "object_storage" ADD CONSTRAINT "object_storage_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."object_storage"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_tracking" ADD CONSTRAINT "ai_usage_tracking_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkpoints" ADD CONSTRAINT "checkpoints_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkpoints" ADD CONSTRAINT "checkpoints_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_time_tracking" ADD CONSTRAINT "project_time_tracking_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_time_tracking" ADD CONSTRAINT "project_time_tracking_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_screenshots" ADD CONSTRAINT "project_screenshots_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_screenshots" ADD CONSTRAINT "project_screenshots_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_summaries" ADD CONSTRAINT "task_summaries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_summaries" ADD CONSTRAINT "task_summaries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_tracking" ADD CONSTRAINT "usage_tracking_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkpoint_files" ADD CONSTRAINT "checkpoint_files_checkpoint_id_fkey" FOREIGN KEY ("checkpoint_id") REFERENCES "public"."checkpoints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_credits" ADD CONSTRAINT "user_credits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_limits" ADD CONSTRAINT "budget_limits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_alerts" ADD CONSTRAINT "usage_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "object_storage_buckets" ADD CONSTRAINT "object_storage_buckets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "object_storage_files" ADD CONSTRAINT "object_storage_files_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "public"."object_storage_buckets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "object_storage_files" ADD CONSTRAINT "object_storage_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_value_store" ADD CONSTRAINT "key_value_store_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_search_history" ADD CONSTRAINT "web_search_history_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "git_repositories" ADD CONSTRAINT "git_repositories_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "git_commits" ADD CONSTRAINT "git_commits_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "public"."git_repositories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_records" ADD CONSTRAINT "ai_usage_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_records" ADD CONSTRAINT "ai_usage_records_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_domains" ADD CONSTRAINT "custom_domains_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_graph_edges" ADD CONSTRAINT "knowledge_graph_edges_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "public"."knowledge_graph_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_graph_edges" ADD CONSTRAINT "knowledge_graph_edges_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "public"."knowledge_graph_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extended_thinking_steps" ADD CONSTRAINT "extended_thinking_steps_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."extended_thinking_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extended_thinking_sessions" ADD CONSTRAINT "extended_thinking_sessions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extended_thinking_sessions" ADD CONSTRAINT "extended_thinking_sessions_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_templates" ADD CONSTRAINT "marketplace_templates_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_templates" ADD CONSTRAINT "marketplace_templates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sequential_thinking_sessions" ADD CONSTRAINT "sequential_thinking_sessions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sequential_thinking_sessions" ADD CONSTRAINT "sequential_thinking_sessions_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extensions" ADD CONSTRAINT "extensions_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_analytics" ADD CONSTRAINT "usage_analytics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_activity" ADD CONSTRAINT "community_activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_checkpoint_id_fkey" FOREIGN KEY ("checkpoint_id") REFERENCES "public"."checkpoints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_stats" ADD CONSTRAINT "resource_stats_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_records" ADD CONSTRAINT "billing_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_operations" ADD CONSTRAINT "file_operations_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "autonomous_actions" ADD CONSTRAINT "autonomous_actions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testing_session_recordings" ADD CONSTRAINT "testing_session_recordings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_metering" ADD CONSTRAINT "ai_usage_metering_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "max_autonomy_sessions" ADD CONSTRAINT "max_autonomy_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "max_autonomy_sessions" ADD CONSTRAINT "max_autonomy_sessions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dynamic_intelligence" ADD CONSTRAINT "dynamic_intelligence_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "build_logs" ADD CONSTRAINT "build_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_notifications" ADD CONSTRAINT "push_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_user_idx" ON "project_collaborators" USING btree ("project_id" int4_ops,"user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "session" USING btree ("expire" timestamp_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "project_key_idx" ON "environment_variables" USING btree ("project_id" int4_ops,"key" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "email_idx" ON "newsletter_subscribers" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "idx_notifications_created_at" ON "notifications" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_notifications_read" ON "notifications" USING btree ("read" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_notifications_user_id" ON "notifications" USING btree ("user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_project_likes_project_id" ON "project_likes" USING btree ("project_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_project_views_project_id" ON "project_views" USING btree ("project_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_activity_log_created_at" ON "activity_log" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_activity_log_project_id" ON "activity_log" USING btree ("project_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_team_members_team_id" ON "team_members" USING btree ("team_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_team_members_user_id" ON "team_members" USING btree ("user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_team_invitations_email" ON "team_invitations" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "idx_team_invitations_token" ON "team_invitations" USING btree ("token" text_ops);--> statement-breakpoint
CREATE INDEX "idx_team_projects_project_id" ON "team_projects" USING btree ("project_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_team_projects_team_id" ON "team_projects" USING btree ("team_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_team_workspaces_team_id" ON "team_workspaces" USING btree ("team_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_workspace_projects_workspace_id" ON "workspace_projects" USING btree ("workspace_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_team_activity_created_at" ON "team_activity" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_team_activity_team_id" ON "team_activity" USING btree ("team_id" int4_ops);--> statement-breakpoint
CREATE INDEX "user_credits_user_idx" ON "user_credits" USING btree ("user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ai_usage_created_idx" ON "ai_usage_records" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "ai_usage_project_idx" ON "ai_usage_records" USING btree ("project_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ai_usage_user_idx" ON "ai_usage_records" USING btree ("user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_file_history_created" ON "file_history" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_file_history_project" ON "file_history" USING btree ("project_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_extensions_project" ON "project_extensions" USING btree ("project_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_multiplayer_active" ON "multiplayer_sessions" USING btree ("active" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_multiplayer_project" ON "multiplayer_sessions" USING btree ("project_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_collaborators_project" ON "multiplayer_collaborators" USING btree ("project_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_collaborators_session" ON "multiplayer_collaborators" USING btree ("session_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_collaborators_user" ON "multiplayer_collaborators" USING btree ("user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_invites_code" ON "multiplayer_invites" USING btree ("invite_code" text_ops);--> statement-breakpoint
CREATE INDEX "idx_invites_project" ON "multiplayer_invites" USING btree ("project_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_settings_project" ON "workspace_settings" USING btree ("project_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_domains_project" ON "project_domains" USING btree ("project_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_resources_project" ON "resources_usage" USING btree ("project_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_resources_time" ON "resources_usage" USING btree ("recorded_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_security_project" ON "security_scans" USING btree ("project_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_security_time" ON "security_scans" USING btree ("scanned_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "usage_analytics_user_date_idx" ON "usage_analytics" USING btree ("user_id" int4_ops,"date" int4_ops);--> statement-breakpoint
CREATE INDEX "community_activity_created_at_idx" ON "community_activity" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "community_activity_user_idx" ON "community_activity" USING btree ("user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_session_expire" ON "sessions" USING btree ("expire" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_ssh_keys_fingerprint" ON "ssh_keys" USING btree ("fingerprint" text_ops);--> statement-breakpoint
CREATE INDEX "idx_ssh_keys_project" ON "ssh_keys" USING btree ("project_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_ssh_keys_project_id" ON "ssh_keys" USING btree ("project_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_payg_queue_pending" ON "pay_as_you_go_queue" USING btree ("status" text_ops,"next_retry_at" text_ops);--> statement-breakpoint
CREATE INDEX "idx_payg_queue_user_id" ON "pay_as_you_go_queue" USING btree ("user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ai_stripe_queue_metering_id_idx" ON "ai_stripe_usage_queue" USING btree ("metering_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ai_stripe_queue_next_retry_idx" ON "ai_stripe_usage_queue" USING btree ("next_retry_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "ai_stripe_queue_status_idx" ON "ai_stripe_usage_queue" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "agent_sessions_active_idx" ON "agent_sessions" USING btree ("is_active" bool_ops);--> statement-breakpoint
CREATE INDEX "agent_sessions_project_id_idx" ON "agent_sessions" USING btree ("project_id" int4_ops);--> statement-breakpoint
CREATE INDEX "agent_sessions_user_id_idx" ON "agent_sessions" USING btree ("user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "file_operations_file_path_idx" ON "file_operations" USING btree ("file_path" text_ops);--> statement-breakpoint
CREATE INDEX "file_operations_session_id_idx" ON "file_operations" USING btree ("session_id" text_ops);--> statement-breakpoint
CREATE INDEX "file_operations_status_idx" ON "file_operations" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "autonomous_actions_auto_approved_idx" ON "autonomous_actions" USING btree ("auto_approved" bool_ops);--> statement-breakpoint
CREATE INDEX "autonomous_actions_risk_score_idx" ON "autonomous_actions" USING btree ("risk_score" int4_ops);--> statement-breakpoint
CREATE INDEX "autonomous_actions_session_id_idx" ON "autonomous_actions" USING btree ("session_id" text_ops);--> statement-breakpoint
CREATE INDEX "autonomous_actions_status_idx" ON "autonomous_actions" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "agent_messages_conversation_id_idx" ON "agent_messages" USING btree ("conversation_id" int4_ops);--> statement-breakpoint
CREATE INDEX "agent_messages_project_id_idx" ON "agent_messages" USING btree ("project_id" int4_ops);--> statement-breakpoint
CREATE INDEX "agent_messages_session_id_idx" ON "agent_messages" USING btree ("session_id" text_ops);--> statement-breakpoint
CREATE INDEX "agent_messages_timeline_idx" ON "agent_messages" USING btree ("project_id" timestamp_ops,"created_at" int4_ops);
*/