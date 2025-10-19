ALTER TABLE "push_notifications"
  ADD COLUMN IF NOT EXISTS "type" varchar NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS "action_url" varchar,
  ADD COLUMN IF NOT EXISTS "read" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "read_at" timestamp;

CREATE TABLE IF NOT EXISTS "notification_preferences" (
  "user_id" varchar PRIMARY KEY,
  "email" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "push" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "frequency" varchar NOT NULL DEFAULT 'instant',
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id")
    REFERENCES "users" ("id") ON DELETE cascade ON UPDATE no action
);
