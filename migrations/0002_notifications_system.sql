ALTER TABLE "push_notifications"
  ADD COLUMN IF NOT EXISTS "type" varchar NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS "action_url" varchar,
  ADD COLUMN IF NOT EXISTS "read" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "read_at" timestamp;

CREATE TABLE IF NOT EXISTS "notification_preferences" (
  -- match users.id integer type to keep the foreign key valid
  "user_id" integer PRIMARY KEY,
  "email" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "push" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "frequency" varchar NOT NULL DEFAULT 'instant',
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id")
    REFERENCES "users" ("id") ON DELETE cascade ON UPDATE no action
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'notification_preferences'
      AND column_name = 'user_id'
      AND data_type <> 'integer'
  ) THEN
    ALTER TABLE "notification_preferences"
      ALTER COLUMN "user_id" TYPE integer USING "user_id"::integer;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'notification_preferences'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE table_name = 'notification_preferences'
        AND constraint_name = 'notification_preferences_user_id_users_id_fk'
    ) THEN
      ALTER TABLE "notification_preferences"
        ADD CONSTRAINT "notification_preferences_user_id_users_id_fk"
          FOREIGN KEY ("user_id") REFERENCES "users" ("id")
          ON DELETE cascade ON UPDATE no action;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE table_name = 'notification_preferences'
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
      ALTER TABLE "notification_preferences"
        ADD PRIMARY KEY ("user_id");
    END IF;
  END IF;
END $$;
