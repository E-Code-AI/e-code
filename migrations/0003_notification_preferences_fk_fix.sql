DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'notification_preferences'
      AND table_schema = 'public'
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
      AND table_schema = 'public'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE table_name = 'notification_preferences'
        AND table_schema = 'public'
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
        AND table_schema = 'public'
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
      ALTER TABLE "notification_preferences"
        ADD PRIMARY KEY ("user_id");
    END IF;
  END IF;
END $$;

