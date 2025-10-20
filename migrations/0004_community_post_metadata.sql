-- Ensure community_posts has the extended metadata columns used by the application
ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS project_url text;

ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;

ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;

ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false;

-- Backfill defaults for existing rows to maintain data consistency
UPDATE community_posts SET view_count = 0 WHERE view_count IS NULL;
UPDATE community_posts SET is_pinned = false WHERE is_pinned IS NULL;
UPDATE community_posts SET is_locked = false WHERE is_locked IS NULL;
