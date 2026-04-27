ALTER TABLE "ai_conversations"
  ADD COLUMN IF NOT EXISTS "title" varchar DEFAULT 'Untitled conversation';

CREATE TABLE IF NOT EXISTS "ai_messages" (
  "id" varchar PRIMARY KEY,
  "conversation_id" integer NOT NULL REFERENCES "ai_conversations"("id") ON DELETE cascade,
  "project_id" integer REFERENCES "projects"("id") ON DELETE cascade,
  "user_id" integer REFERENCES "users"("id") ON DELETE set null,
  "role" varchar NOT NULL,
  "content" text NOT NULL,
  "model" varchar,
  "provider" varchar,
  "token_usage" jsonb DEFAULT '{}'::jsonb,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "ai_messages_conversation_id_idx" ON "ai_messages" ("conversation_id");
CREATE INDEX IF NOT EXISTS "ai_messages_project_id_idx" ON "ai_messages" ("project_id");
CREATE INDEX IF NOT EXISTS "ai_messages_user_id_idx" ON "ai_messages" ("user_id");
CREATE INDEX IF NOT EXISTS "ai_messages_created_at_idx" ON "ai_messages" ("created_at");

CREATE TABLE IF NOT EXISTS "ai_plan_tasks" (
  "id" varchar PRIMARY KEY,
  "plan_id" varchar NOT NULL REFERENCES "agent_plans"("id") ON DELETE cascade,
  "project_id" integer NOT NULL REFERENCES "projects"("id") ON DELETE cascade,
  "task_key" varchar NOT NULL,
  "title" text NOT NULL,
  "type" varchar NOT NULL,
  "status" varchar NOT NULL DEFAULT 'pending',
  "dependencies" jsonb DEFAULT '[]'::jsonb,
  "files" jsonb DEFAULT '[]'::jsonb,
  "commands" jsonb DEFAULT '[]'::jsonb,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "started_at" timestamp,
  "completed_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "ai_plan_tasks_plan_task_key_unique" UNIQUE ("plan_id", "task_key")
);

CREATE INDEX IF NOT EXISTS "ai_plan_tasks_plan_id_idx" ON "ai_plan_tasks" ("plan_id");
CREATE INDEX IF NOT EXISTS "ai_plan_tasks_project_id_idx" ON "ai_plan_tasks" ("project_id");
CREATE INDEX IF NOT EXISTS "ai_plan_tasks_status_idx" ON "ai_plan_tasks" ("status");

CREATE TABLE IF NOT EXISTS "themes" (
  "id" varchar PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "project_id" integer REFERENCES "projects"("id") ON DELETE cascade,
  "name" varchar NOT NULL,
  "slug" varchar NOT NULL,
  "scope" varchar NOT NULL DEFAULT 'user',
  "tokens" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "is_default" boolean NOT NULL DEFAULT false,
  "is_public" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "themes_user_slug_unique" UNIQUE ("user_id", "slug")
);

ALTER TABLE "themes"
  ADD COLUMN IF NOT EXISTS "user_id" integer;

CREATE INDEX IF NOT EXISTS "themes_user_id_idx" ON "themes" ("user_id");
CREATE INDEX IF NOT EXISTS "themes_project_id_idx" ON "themes" ("project_id");
