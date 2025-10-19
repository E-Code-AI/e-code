-- Convert notification_preferences.user_id to varchar when users.id is also varchar
DO $$
DECLARE
  constraint_exists BOOLEAN;
  users_id_type TEXT;
BEGIN
  SELECT data_type INTO users_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'id';

  IF users_id_type IS NULL THEN
    RAISE NOTICE 'Skipping conversion of notification_preferences.user_id because users.id column was not found';
  ELSIF users_id_type = 'character varying' THEN
    -- Only run if the column exists and isn't already character varying
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'notification_preferences'
        AND column_name = 'user_id'
        AND data_type <> 'character varying'
    ) THEN
    -- Drop foreign key constraint if it exists to allow type change
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'notification_preferences'
        AND constraint_name = 'notification_preferences_user_id_users_id_fk'
    ) INTO constraint_exists;

    IF constraint_exists THEN
      ALTER TABLE "notification_preferences"
        DROP CONSTRAINT "notification_preferences_user_id_users_id_fk";
    END IF;

    ALTER TABLE "notification_preferences"
      ALTER COLUMN "user_id" TYPE varchar USING "user_id"::text;

    ALTER TABLE "notification_preferences"
      ALTER COLUMN "user_id" SET NOT NULL;

    ALTER TABLE "notification_preferences"
      ADD CONSTRAINT "notification_preferences_user_id_users_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "users" ("id")
        ON DELETE cascade ON UPDATE no action;
    END IF;
  ELSE
    RAISE NOTICE 'Skipping conversion of notification_preferences.user_id because users.id is of type %', users_id_type;
  END IF;
END $$;
